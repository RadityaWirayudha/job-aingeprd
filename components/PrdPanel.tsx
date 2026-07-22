"use client";

import { useState } from "react";
import { marked } from "marked";

interface PrdSection {
  heading: string;
  content: string;
}

interface PrdData {
  title: string;
  sections: PrdSection[];
}

function buildMarkdown(prd: PrdData): string {
  let md = `# ${prd.title}\n\n`;
  for (const s of prd.sections) {
    md += `## ${s.heading}\n\n${s.content}\n\n`;
  }
  return md.trim();
}

export default function PrdPanel({
  prd,
  total = 0,
  index = 0,
  onPrev,
  onNext,
  onSelect,
}: {
  prd: PrdData | null;
  total?: number;
  index?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onSelect?: (index: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleCopy = async () => {
    if (!prd) return;
    await navigator.clipboard.writeText(buildMarkdown(prd));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-6">
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

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">{prd.title}</h1>
          <button
            onClick={handleCopy}
            className="shrink-0 ml-4 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? "✓ Tersalin" : "Copy"}
          </button>
        </div>
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
      </div>
    </div>
  );
}
