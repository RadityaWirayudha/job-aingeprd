"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { marked } from "marked";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Choices {
  question: string;
  options: string[];
  allowCustom: boolean;
}

interface Summary {
  title: string;
  description: string;
  targetUser: string;
  mainFeatures: string[];
  readyToGenerate: boolean;
}

interface PrdData {
  title: string;
  sections: { heading: string; content: string }[];
}

function formatCount(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return String(n);
}

function localStorageKey(sessionId: string) {
  return `chat_${sessionId}`;
}

// Remove our special fenced blocks (choices/prd/summary) from displayed text.
// Complete blocks are stripped first; a trailing block that is still being
// streamed (not yet closed) is also stripped so raw JSON never shows in chat.
function stripBlocks(content: string): string {
  return content
    .replace(/```choices\n[\s\S]*?\n```/g, "")
    .replace(/```prd\n[\s\S]*?\n```/g, "")
    .replace(/```summary\n[\s\S]*?\n```/g, "")
    .replace(/```(?:choices|prd|summary)[\s\S]*$/g, "")
    .trim();
}

function loadCachedMessages(sessionId: string): Message[] {
  try {
    const raw = localStorage.getItem(localStorageKey(sessionId));
    if (raw) {
      const parsed = JSON.parse(raw) as Message[];
      if (parsed.length) return parsed;
    }
  } catch {}
  return [];
}

export default function ChatPanel({
  userId,
  userName,
  sessionId,
  onPrdGenerated,
  onShowChoices,
  onShowSummary,
  isBlurred,
  pendingMessage,
  onMessageSent,
  onFirstUserMessage,
}: {
  userId: string | null;
  userName?: string | null;
  sessionId: string;
  onPrdGenerated: (prd: PrdData) => void;
  onShowChoices: (choices: Choices) => void;
  onShowSummary: (summary: Summary) => void;
  isBlurred: boolean;
  pendingMessage: string | null;
  onMessageSent: () => void;
  onFirstUserMessage?: (text: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{ userCount: number; prdCount: number }>({
    userCount: 0,
    prdCount: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessageRef = useRef<(text: string) => void>(() => {});
  const hydratedRef = useRef(false);

  // Only follow new content when the user is already near the bottom, so
  // scrolling up to read older messages during streaming isn't interrupted.
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 100;
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats({ userCount: d.userCount, prdCount: d.prdCount }))
      .catch(() => {});
  }, []);

  const persistMessages = useCallback(
    async (msgs: Message[]) => {
      try {
        localStorage.setItem(localStorageKey(sessionId), JSON.stringify(msgs));
      } catch {}

      if (!userId || msgs.length === 0) return;

      try {
        await fetch("/api/chat/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, messages: msgs }),
        });
      } catch {}
    },
    [userId, sessionId]
  );

  const parseResponse = useCallback(
    (content: string) => {
      const choicesMatch = content.match(/```choices\n([\s\S]*?)\n```/);
      if (choicesMatch) {
        try {
          const choices = JSON.parse(choicesMatch[1]) as Choices;
          onShowChoices(choices);
        } catch (e) {
          console.error("Failed to parse choices:", e);
        }
      }

      const prdMatch = content.match(/```prd\n([\s\S]*?)\n```/);
      if (prdMatch) {
        try {
          const prd = JSON.parse(prdMatch[1]) as PrdData;
          onPrdGenerated(prd);
        } catch (e) {
          console.error("Failed to parse PRD:", e);
        }
      }

      const summaryMatch = content.match(/```summary\n([\s\S]*?)\n```/);
      if (summaryMatch) {
        try {
          const summary = JSON.parse(summaryMatch[1]) as Summary;
          onShowSummary(summary);
        } catch (e) {
          console.error("Failed to parse summary:", e);
        }
      }
    },
    [onShowChoices, onPrdGenerated, onShowSummary]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      if (messages.length === 0) onFirstUserMessage?.(text);

      const userMessage: Message = { role: "user", content: text };
      const updated = [...messages, userMessage];
      setMessages(updated);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updated.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    assistantContent += content;
                    setMessages((prev) => {
                      const snapshot = [...prev];
                      const lastMsg = snapshot[snapshot.length - 1];
                      if (lastMsg?.role === "assistant") {
                        lastMsg.content = assistantContent;
                      } else {
                        snapshot.push({
                          role: "assistant",
                          content: assistantContent,
                        });
                      }
                      return snapshot;
                    });
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }

          if (assistantContent) {
            parseResponse(assistantContent);
          }

          setMessages((final) => {
            persistMessages(final);
            return final;
          });
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, parseResponse, persistMessages, onFirstUserMessage]
  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const cached = loadCachedMessages(sessionId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration localStorage load
    if (cached.length) setMessages(cached);

    const key = localStorageKey(sessionId);

    async function loadFromServer() {
      try {
        const res = await fetch(
          `/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`
        );
        if (res.ok) {
          const data = (await res.json()) as {
            messages: { role: string; content: string }[];
          };
          if (data.messages?.length) {
            const restored: Message[] = data.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }));
            setMessages(restored);
            localStorage.setItem(key, JSON.stringify(restored));
          }
        }
      } catch {}
    }

    if (userId) loadFromServer();
  }, [userId, sessionId]);

  useEffect(() => {
    if (pendingMessage) {
      sendMessageRef.current(pendingMessage);
      onMessageSent();
    }
  }, [pendingMessage, onMessageSent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      className={`flex flex-col h-full transition-all duration-300 ${
        isBlurred ? "blur-sm pointer-events-none" : ""
      }`}
    >
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full px-6 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-gradient-to-r from-orange-500/10 to-purple-500/10 blur-[100px] pointer-events-none rounded-full" />
            <div className="text-center max-w-4xl relative z-10">
              <h1 className="text-5xl md:text-[64px] font-bold text-white mb-6 tracking-tighter leading-[1.1]">
                Hai, {userName ?? "Sobat"}. Mau buat<br className="hidden md:block" /> produk apa hari ini?
              </h1>
              <p className="text-zinc-400 text-lg md:text-[20px] max-w-2xl mx-auto font-normal leading-relaxed">
                Ceritakan ide produk yang ingin kamu wujudkan. AI bantu susun<br className="hidden md:block" /> PRD-nya secara lengkap dari nol.
              </p>
              <div className="mt-8 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  <span className="font-semibold text-zinc-200">{formatCount(stats.userCount)}</span> User
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="font-semibold text-zinc-200">{formatCount(stats.prdCount)}</span> PRD
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] overflow-hidden rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {msg.role === "assistant" && (
                <span className="text-xs text-violet-400 block mb-1 font-medium">
                  AiNgePRD
                </span>
              )}
              {msg.role === "assistant" ? (
                <div
                  className="prose prose-invert prose-sm max-w-none leading-relaxed break-words overflow-hidden [&_pre]:whitespace-pre-wrap [&_pre]:break-words"
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(stripBlocks(msg.content)) as string,
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse delay-100" />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik ide kamu..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors"
            rows={1}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
