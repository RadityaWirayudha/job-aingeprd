"use client";

import { useState } from "react";

interface Choices {
  question: string;
  options: string[];
  allowCustom: boolean;
}

export default function BlurOverlay({
  choices,
  onSelect,
  onClose,
}: {
  choices: Choices;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState("");

  const handleContinue = () => {
    if (selected === "custom" && customValue.trim()) {
      onSelect(customValue.trim());
    } else if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl overflow-hidden">
        <h3 className="text-lg font-semibold mb-4 text-white break-words">
          🎯 {choices.question}
        </h3>

        <div className="space-y-3 mb-6">
          {choices.options.map((option, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selected === option
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="choice"
                value={option}
                checked={selected === option}
                onChange={() => setSelected(option)}
                className="w-4 h-4 text-violet-500"
              />
              <span className="text-sm text-zinc-200">{option}</span>
            </label>
          ))}

          {choices.allowCustom && (
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selected === "custom"
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="choice"
                value="custom"
                checked={selected === "custom"}
                onChange={() => setSelected("custom")}
                className="w-4 h-4 text-violet-500"
              />
              <span className="text-sm text-zinc-200">Tulis opsi sendiri...</span>
            </label>
          )}

          {selected === "custom" && (
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Tulis jawaban kamu..."
              className="w-full mt-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-violet-500"
            />
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleContinue}
            disabled={!selected || (selected === "custom" && !customValue.trim())}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            Lanjutkan →
          </button>
        </div>
      </div>
    </div>
  );
}
