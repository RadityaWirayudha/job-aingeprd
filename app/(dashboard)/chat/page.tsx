"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import ChatPanel from "@/components/ChatPanel";
import PrdPanel from "@/components/PrdPanel";
import BlurOverlay from "@/components/BlurOverlay";
import ConfirmCard from "@/components/ConfirmCard";
import ChatSessionBar, { Session } from "@/components/ChatSessionBar";

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

interface PrdItem {
  id: string;
  sessionId: string | null;
  prd: PrdData;
  createdAt: number;
}

const SESSIONS_KEY = "aingeprd_sessions";
const ACTIVE_KEY = "aingeprd_active_session";
const LEGACY_KEY = "aingeprd_session_id";
const PRDS_KEY = "aingeprd_prds";
// Timestamp of the last visit stored in localStorage. Used to detect fresh
// visits: if the last visit was more than 30 min ago (or never), treat as a
// fresh visit. This replaces the old sessionStorage marker which some browsers
// (Chrome "Continue where you left off") persist across restarts.
const LAST_VISIT_KEY = "aingeprd_last_visit";
const FRESH_VISIT_THRESHOLD_MS = 30 * 60 * 1000;
const DEFAULT_TITLE = "Chat Baru";

// Load the saved PRD history from localStorage (cache for instant reload).
function loadPrds(): PrdItem[] {
  try {
    const raw = localStorage.getItem(PRDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PrdItem[];
      // Backfill sessionId for PRDs cached before sessions were tracked.
      if (Array.isArray(parsed)) {
        return parsed.map((p) => ({ ...p, sessionId: p.sessionId ?? null }));
      }
    }
  } catch {}
  return [];
}

function newSession(): Session {
  return { id: crypto.randomUUID(), title: DEFAULT_TITLE, createdAt: Date.now() };
}

// A session is "empty" (clutter) when it still has the default title and no
// cached messages — such chats are pruned so they don't pile up in the list.
function isEmptySession(s: Session): boolean {
  if (s.title !== DEFAULT_TITLE) return false;
  try {
    const raw = localStorage.getItem(`chat_${s.id}`);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return !Array.isArray(parsed) || parsed.length === 0;
  } catch {
    return true;
  }
}

// Load the saved session list (or migrate a legacy single session / create a fresh one).
function loadSessions(): { sessions: Session[]; activeId: string } {
  try {
    const rawSessions = localStorage.getItem(SESSIONS_KEY);
    if (rawSessions) {
      const parsed = JSON.parse(rawSessions) as Session[];
      const rawActive = localStorage.getItem(ACTIVE_KEY);
      // Drop leftover empty chats so they don't accumulate across reloads, but
      // keep the one the user last had open — even if it's still an empty "Chat
      // Baru" — so reopening restores their spot instead of jumping elsewhere.
      const sessions = parsed.filter(
        (s) => s.id === rawActive || !isEmptySession(s)
      );
      if (sessions.length) {
        const activeId =
          rawActive && sessions.some((s) => s.id === rawActive)
            ? rawActive
            : sessions[0].id;
        return { sessions, activeId };
      }
    }

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const sessions: Session[] = [
        { id: legacy, title: "Chat Lama", createdAt: Date.now() },
      ];
      return { sessions, activeId: legacy };
    }
  } catch {}

  const fresh = newSession();
  return { sessions: [fresh], activeId: fresh.id };
}

export default function ChatPage() {
  const { user } = useUser();
  // Depend on the stable id, not the Clerk user object (whose reference churns
  // on unrelated re-renders), so the sync effects below don't re-fire endlessly.
  const userId = user?.id;
  // Start empty so server and first client render match; localStorage is read
  // after mount (in the effect below) to avoid a hydration mismatch.
  const [{ sessions, activeId }, setSessionState] = useState<{
    sessions: Session[];
    activeId: string;
  }>({ sessions: [], activeId: "" });
  // Latest activeId, readable inside effects that shouldn't re-run on switch.
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  // Tracks whether the current load is a genuine fresh visit (browser reopened)
  // vs. a simple page refresh. The sync effect uses this to avoid overriding
  // the new empty session with an old server session.
  const freshVisitRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [choices, setChoices] = useState<Choices | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prds, setPrds] = useState<PrdItem[]>([]);
  const [prdIndex, setPrdIndex] = useState(0);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Only PRDs that belong to the currently open chat are shown in LIVE PRD OUTPUT.
  const sessionPrds = prds.filter((p) => p.sessionId === activeId);
  const safeIndex = Math.min(prdIndex, Math.max(0, sessionPrds.length - 1));
  const prd = sessionPrds[safeIndex]?.prd ?? null;

  // Find the index of active session in the sessions list
  const activeIndex = sessions.findIndex((s) => s.id === activeId);

  // Client-only: load saved sessions + PRD history once, after hydration.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- post-hydration localStorage load */
    const loaded = loadSessions();

    // Fresh visit = first ever, or last visit > 30 min ago (covers browser
    // close/reopen reliably even when the browser restores sessionStorage across
    // restarts).
    let isFresh = false;
    try {
      const last = localStorage.getItem(LAST_VISIT_KEY);
      const now = Date.now();
      isFresh = !last || now - parseInt(last, 10) > FRESH_VISIT_THRESHOLD_MS;
      localStorage.setItem(LAST_VISIT_KEY, String(now));
    } catch {}
    freshVisitRef.current = isFresh;

    let initial = loaded;
    if (isFresh) {
      // Reuse an existing empty chat if there is one, otherwise start a new one,
      // and prune leftover empty chats so they don't accumulate across reopens.
      const nonEmpty = loaded.sessions.filter((s) => !isEmptySession(s));
      const target = loaded.sessions.find(isEmptySession) ?? newSession();
      initial = { sessions: [target, ...nonEmpty], activeId: target.id };
    }

    setSessionState(initial);
    const cachedPrds = loadPrds();
    setPrds(cachedPrds);
    // Point to the last PRD of the active chat (index is within that chat).
    const count = cachedPrds.filter((p) => p.sessionId === initial.activeId).length;
    setPrdIndex(count ? count - 1 : 0);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist PRD history to localStorage.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PRDS_KEY, JSON.stringify(prds));
    } catch {}
  }, [hydrated, prds]);

  // Ensure prdIndex is always pointing to the correct PRD for the active session
  useEffect(() => {
    if (!hydrated) return;
    const count = prds.filter((p) => p.sessionId === activeId).length;
    setPrdIndex(count ? count - 1 : 0);
  }, [hydrated, activeId, prds]);

  // When signed in, merge PRD history with Supabase: keep local-only PRDs
  // (e.g. generated while logged out) and upload them so nothing is lost.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      let data: {
        id: string;
        session_id: string | null;
        content: unknown;
        created_at: string;
      }[];
      try {
        const res = await fetch("/api/chat/load-prds");
        if (!res.ok) return;
        data = ((await res.json()) as { tasks: typeof data }).tasks;
      } catch {
        return;
      }

      if (cancelled || !data) return;

      const serverItems: PrdItem[] = data
        .filter((t) => t.content && typeof t.content === "object")
        .map((t) => ({
          id: t.id,
          sessionId: t.session_id ?? null,
          prd: t.content as PrdData,
          createdAt: new Date(t.created_at).getTime(),
        }));

      // Read the current local list without depending on it (avoids re-running).
      const localItems = loadPrds();
      const serverIds = new Set(serverItems.map((s) => s.id));
      const localOnly = localItems.filter((l) => !serverIds.has(l.id));

      // Upload local-only PRDs and swap in their server-assigned ids.
      const uploaded = await Promise.all(
        localOnly.map(async (item) => {
          try {
            const res = await fetch("/api/chat/save-prd", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: item.sessionId,
                prd: item.prd,
                createdAt: item.createdAt,
              }),
            });
            if (!res.ok) return item;
            const row = (await res.json()) as { id?: string };
            return row.id ? { ...item, id: row.id } : item;
          } catch {
            return item;
          }
        })
      );

      if (cancelled) return;

      const merged = [...serverItems, ...uploaded].sort(
        (a, b) => a.createdAt - b.createdAt
      );

      if (merged.length) {
        setPrds(merged);
        // Keep the index within the active chat's PRDs.
        const count = merged.filter(
          (p) => p.sessionId === activeIdRef.current
        ).length;
        setPrdIndex(count ? count - 1 : 0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {}
  }, [hydrated, sessions, activeId]);

  // When signed in, sync the session list from Supabase (server is the source
  // of truth); keep any local-only session that hasn't been saved yet.
  // Keyed on the user *id* (a stable string) rather than the Clerk user object,
  // whose reference changes on unrelated re-renders — depending on the object
  // made this re-fetch (and reorder the list) repeatedly, which could reshuffle
  // the history right as the user was clicking it and made switching feel stuck.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/chat/sessions");
        if (!res.ok) return;
        const data = (await res.json()) as { sessions: Session[] };
        if (cancelled || !data.sessions) return;

        setSessionState((prev) => {
          const serverById = new Map(data.sessions.map((s) => [s.id, s]));
          const prevIds = new Set(prev.sessions.map((s) => s.id));

          // Update sessions we already show in place (the server owns the
          // title) WITHOUT reordering — the list the user is navigating must
          // stay stable so a click always lands on the row they're looking at.
          const updated = prev.sessions.map((s) => {
            const server = serverById.get(s.id);
            return server ? { ...s, title: server.title } : s;
          });

          // Append sessions that exist only on the server (e.g. created on
          // another device), newest first, so nothing jumps ahead of the
          // order already on screen.
          const newFromServer = data.sessions
            .filter((s) => !prevIds.has(s.id))
            .sort((a, b) => b.createdAt - a.createdAt);

          const merged = [...updated, ...newFromServer];

          // On a fresh visit, keep the new empty session active so the
          // greeting is shown — don't let the sync jump to an old session.
          const activeId = freshVisitRef.current
            ? prev.activeId
            : merged.some((s) => s.id === prev.activeId)
              ? prev.activeId
              : merged[0]?.id ?? prev.activeId;
          return { sessions: merged, activeId };
        });
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Clear the transient chat overlays when switching or starting a chat.
  // PRD history is intentionally kept — it persists across chats and refreshes.
  const resetPanels = () => {
    setChoices(null);
    setSummary(null);
    setIsBlurred(false);
    setPendingMessage(null);
  };

  const handleNewChat = () => {
    const session = newSession();
    setSessionState((prev) => {
      // Reuse instead of stacking: prune any empty chats before adding a new one.
      const kept = prev.sessions.filter((s) => !isEmptySession(s));
      return { sessions: [session, ...kept], activeId: session.id };
    });
    setPrdIndex(0); // brand-new chat has no PRD yet
    resetPanels();
  };

  const handleSelectChat = (id: string) => {
    if (id === activeId) return;
    // Only switch the active chat here — never prune or reorder the list while
    // navigating. Mutating the list mid-switch shifts the rows under the user
    // (and could strand the highlight), which is what made the open chat and the
    // selected history fall out of sync. Empty chats are still collapsed when a
    // new chat is created (handleNewChat) and on reload (loadSessions).
    setSessionState((prev) => ({ ...prev, activeId: id }));
    // Point to the target chat's latest PRD.
    const count = prds.filter((p) => p.sessionId === id).length;
    setPrdIndex(count ? count - 1 : 0);
    resetPanels();
  };

  const handleDeleteChat = (id: string) => {
    try {
      localStorage.removeItem(`chat_${id}`);
    } catch {}

    if (user) {
      void fetch(`/api/chat/sessions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).catch(() => {});
    }

    setSessionState((prev) => {
      const remaining = prev.sessions.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = newSession();
        return { sessions: [fresh], activeId: fresh.id };
      }
      const activeId =
        id === prev.activeId ? remaining[0].id : prev.activeId;
      return { sessions: remaining, activeId };
    });

    if (id === activeId) resetPanels();
  };

  // Use the first user message as the chat title (only while still default),
  // and persist the session to Supabase when signed in.
  const handleFirstUserMessage = (text: string) => {
    const title = text.trim().slice(0, 40) || DEFAULT_TITLE;

    setSessionState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === prev.activeId && s.title === DEFAULT_TITLE
          ? { ...s, title }
          : s
      ),
    }));

    if (user) {
      const session = sessions.find((s) => s.id === activeId);
      void fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeId,
          title,
          createdAt: session?.createdAt,
        }),
      }).catch(() => {});
    }
  };

  const handleShowChoices = (newChoices: Choices) => {
    setChoices(newChoices);
    setIsBlurred(true);
  };

  const handleSelectChoice = (value: string) => {
    setChoices(null);
    setIsBlurred(false);
    setPendingMessage(value);
  };

  const handleShowSummary = (newSummary: Summary) => {
    setSummary(newSummary);
  };

  const handleGeneratePrd = async (prdData: PrdData) => {
    setSummary(null);

    const sessionId = activeId;
    const localId = crypto.randomUUID();
    const item: PrdItem = {
      id: localId,
      sessionId,
      prd: prdData,
      createdAt: Date.now(),
    };
    setPrds((prev) => {
      const next = [...prev, item];
      // Point to the new PRD's position within its own chat.
      setPrdIndex(next.filter((p) => p.sessionId === sessionId).length - 1);
      return next;
    });

    if (user) {
      try {
        const res = await fetch("/api/chat/save-prd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            prd: prdData,
            createdAt: item.createdAt,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { id?: string };
          // Reconcile the local id with the server-assigned id.
          if (data.id) {
            setPrds((prev) =>
              prev.map((p) => (p.id === localId ? { ...p, id: data.id! } : p))
            );
          }
        }
      } catch {}
    }
  };

  if (!hydrated || !activeId) {
    return (
      <div className="flex items-center justify-center h-screen text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      <div className="flex flex-col flex-1 min-w-0 min-h-0 border-b lg:border-b-0 lg:border-r border-zinc-800 relative">
        <ChatSessionBar
          sessions={sessions}
          activeId={activeId}
          activeIndex={activeIndex}
          onNew={handleNewChat}
          onSelect={handleSelectChat}
          onDelete={handleDeleteChat}
        />

        <div className="relative flex-1 min-h-0">
          <ChatPanel
            key={activeId}
            userId={user?.id ?? null}
            userName={user?.firstName ?? null}
            sessionId={activeId}
            onPrdGenerated={handleGeneratePrd}
            onShowChoices={handleShowChoices}
            onShowSummary={handleShowSummary}
            isBlurred={isBlurred}
            pendingMessage={pendingMessage}
            onMessageSent={() => setPendingMessage(null)}
            onFirstUserMessage={handleFirstUserMessage}
          />

          {choices && (
            <BlurOverlay
              choices={choices}
              onSelect={handleSelectChoice}
              onClose={() => {
                setChoices(null);
                setIsBlurred(false);
              }}
            />
          )}

          {summary && (
            <div className="absolute bottom-0 left-0 right-0 z-40">
              <ConfirmCard
                summary={summary}
                onGenerate={() => {
                  const prdData: PrdData = {
                    title: summary.title,
                    sections: [
                      {
                        heading: "Overview",
                        content: `**Deskripsi:** ${summary.description}\n\n**Target User:** ${summary.targetUser}`,
                      },
                      {
                        heading: "Fitur-fitur Utama",
                        content: summary.mainFeatures
                          .map((f) => `- ${f}`)
                          .join("\n"),
                      },
                      {
                        heading: "Requirements",
                        content: `- **Platform:** Web / Mobile (belum ditentukan)\n- **Tech Stack:** Belum ditentukan (akan diperjelas setelah diskusi lebih lanjut)\n- **Browser Support:** Chrome, Firefox, Safari, Edge (latest 2 versions)\n- **Dependencies:** Akan ditentukan berdasarkan tech stack yang dipilih`,
                      },
                      {
                        heading: "Alur Aplikasi",
                        content: `1. User membuka aplikasi\n2. User melakukan registrasi / login\n3. User mengakses dashboard utama\n4. User memilih fitur yang ingin digunakan\n5. User melakukan aksi pada fitur tersebut\n6. Sistem memproses dan menampilkan hasil\n7. User dapat logout atau menggunakan fitur lainnya`,
                      },
                      {
                        heading: "Design / Frontend",
                        content: `- **Color Scheme:** Belum ditentukan\n- **Typography:** Belum ditentukan\n- **Layout:** Responsive design, mobile-first\n- **Components:** Navbar, Sidebar, Cards, Forms, Modals\n- **UI Framework:** Akan ditentukan (Tailwind / Bootstrap / lainnya)`,
                      },
                      {
                        heading: "Database Schema",
                        content: `**Tabel: users**\n| Kolom | Tipe | Keterangan |\n|-------|------|------------|\n| id | UUID | Primary Key |\n| email | TEXT | Unique, Not Null |\n| created_at | TIMESTAMP | Default now() |\n\n**Tabel: [akan ditentukan berdasarkan fitur]**\n| Kolom | Tipe | Keterangan |\n|-------|------|------------|\n| id | UUID | Primary Key |\n| user_id | UUID | Foreign Key -> users.id |\n| created_at | TIMESTAMP | Default now() |`,
                      },
                    ],
                  };
                  handleGeneratePrd(prdData);
                }}
                onDismiss={() => setSummary(null)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-zinc-950">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 font-bold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full text-[10px] tracking-widest uppercase shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            LIVE PRD OUTPUT
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <PrdPanel
            prd={prd}
            total={sessionPrds.length}
            index={safeIndex}
            onPrev={() => setPrdIndex(Math.max(0, safeIndex - 1))}
            onNext={() =>
              setPrdIndex(Math.min(sessionPrds.length - 1, safeIndex + 1))
            }
            onSelect={setPrdIndex}
            sessionId={activeId}
            userId={user?.id ?? null}
            userName={user?.firstName ?? null}
          />
        </div>
      </div>
    </div>
  );
}
