"use client";

import { useState } from "react";

export interface Session {
  id: string;
  title: string;
  createdAt: number;
}

export default function ChatSessionBar({
  sessions,
  activeId,
  activeIndex,
  onNew,
  onSelect,
  onDelete,
}: {
  sessions: Session[];
  activeId: string;
  activeIndex: number;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-3 border-b border-zinc-800">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
        <span className="text-sm font-medium text-zinc-300 truncate">ROOM CHATBOT</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1.5 text-xs whitespace-nowrap rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Riwayat ({sessions.length - activeIndex})
        </button>
        <button
          onClick={onNew}
          className="px-3 py-1.5 text-xs whitespace-nowrap rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          + Chat Baru
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-4 top-full mt-1 z-50 w-72 max-w-[calc(100%-2rem)] max-h-80 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1">
            {sessions.length === 0 && (
              <div className="px-3 py-2 text-xs text-zinc-500">
                Belum ada chat
              </div>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelect(s.id);
                  setOpen(false);
                }}
                className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  s.id === activeId ? "bg-zinc-800" : "hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{s.title}</p>
                  <p className="text-[11px] text-zinc-500">
                    {new Date(s.createdAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.id);
                  }}
                  title="Hapus chat"
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all p-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
