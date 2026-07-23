"use client";

import { useState, useRef } from "react";
import { marked } from "marked";
import dynamic from "next/dynamic";
import LiveCursors from "./LiveCursors";
import {
  buildMarkdown,
  copyToClipboard,
  downloadPdf,
  downloadMarkdown,
  downloadDocx,
} from "@/lib/export-utils";

const PrdEditor = dynamic(() => import("./PrdEditor"), { ssr: false });

interface PrdSection {
  heading: string;
  content: string;
}

interface PrdData {
  title: string;
  sections: PrdSection[];
}

function IconBtn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
        active
          ? "bg-violet-600/25 text-violet-300"
          : "text-zinc-400 hover:text-white hover:bg-zinc-700/60"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

export default function PrdPanel({
  prd,
  total = 0,
  index = 0,
  onPrev,
  onNext,
  onSelect,
  sessionId,
  userId,
  userName,
}: {
  prd: PrdData | null;
  total?: number;
  index?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onSelect?: (index: number) => void;
  sessionId?: string;
  userId?: string | null;
  userName?: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [dlOpen, setDlOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!prd) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <p>PRD akan muncul di sini</p>
          <p className="text-sm mt-2">Setelah di-generate dari chat</p>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    const ok = await copyToClipboard(buildMarkdown(prd));
    if (ok) {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleExport = async (fmt: "pdf" | "md" | "docx") => {
    setExporting(true);
    setDlOpen(false);
    try {
      if (fmt === "pdf") await downloadPdf(prd);
      else if (fmt === "md") await downloadMarkdown(prd);
      else await downloadDocx(prd);
    } catch {}
    setExporting(false);
  };

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overflow-x-hidden p-6 relative"
    >
      {userId && sessionId && (
        <LiveCursors
          sessionId={sessionId}
          userId={userId}
          userName={userName || "Anonymous"}
          containerRef={containerRef}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {total > 1 && (
          <div className="relative flex items-center justify-center gap-2 mb-4">
            <button
              onClick={onPrev}
              disabled={index === 0}
              className="px-2 py-1 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="px-3 py-1 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Hasil {index + 1} / {total} ▾
            </button>
            <button
              onClick={onNext}
              disabled={index === total - 1}
              className="px-2 py-1 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
            {pickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setPickerOpen(false)}
                />
                <div className="absolute top-full mt-1 z-50 w-40 max-h-64 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1">
                  {Array.from({ length: total }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onSelect?.(i);
                        setPickerOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                        i === index
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      Hasil {i + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-3">{prd.title}</h1>

          <div className="flex items-center gap-0.5 bg-zinc-900/80 border border-zinc-800 rounded-xl px-1.5 py-1 w-fit">
            {/* Edit / View */}
            <IconBtn
              onClick={() => setEditMode(!editMode)}
              active={editMode}
              title={editMode ? "Lihat" : "Edit"}
            >
              {editMode ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              )}
            </IconBtn>

            <div className="w-px h-4 bg-zinc-800 mx-0.5" />

            {/* Copy MD */}
            <IconBtn
              onClick={handleCopy}
              title={copyState === "copied" ? "Tersalin!" : "Copy Markdown"}
            >
              {copyState === "copied" ? (
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </IconBtn>

            <div className="w-px h-4 bg-zinc-800 mx-0.5" />

            {/* Download dropdown */}
            <div className="relative">
              <IconBtn
                onClick={() => setDlOpen(!dlOpen)}
                title="Download"
                active={dlOpen}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </IconBtn>

              {dlOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDlOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-36 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1">
                    <button onClick={() => handleExport("pdf")} disabled={exporting} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer">
                      <span className="w-7 text-center font-bold text-red-400 text-[10px]">PDF</span>
                      <span className="text-zinc-600">.pdf</span>
                    </button>
                    <button onClick={() => handleExport("md")} disabled={exporting} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer">
                      <span className="w-7 text-center font-bold text-blue-400 text-[10px]">MD</span>
                      <span className="text-zinc-600">.md</span>
                    </button>
                    <button onClick={() => handleExport("docx")} disabled={exporting} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer">
                      <span className="w-7 text-center font-bold text-emerald-400 text-[10px]">DOCX</span>
                      <span className="text-zinc-600">.docx</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {editMode ? (
          <PrdEditor prd={prd} />
        ) : (
          <div className="space-y-6">
            {prd.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-lg font-semibold mb-3 text-violet-400 border-b border-zinc-800 pb-2">
                  {section.heading}
                </h2>
                <div
                  className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(section.content) as string,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
