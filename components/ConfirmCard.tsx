"use client";

interface Summary {
  title: string;
  description: string;
  targetUser: string;
  mainFeatures: string[];
  readyToGenerate: boolean;
}

export default function ConfirmCard({
  summary,
  onGenerate,
  onDismiss,
}: {
  summary: Summary;
  onGenerate: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-6 mx-4 my-2">
      <h3 className="text-lg font-semibold text-white mb-4">
        🚀 Siap Generate PRD Sekarang?
      </h3>

      <div className="space-y-3 mb-6 text-sm">
        <div>
          <span className="text-zinc-500">Judul:</span>
          <p className="text-zinc-200 font-medium">{summary.title}</p>
        </div>
        <div>
          <span className="text-zinc-500">Deskripsi:</span>
          <p className="text-zinc-300">{summary.description}</p>
        </div>
        <div>
          <span className="text-zinc-500">Target User:</span>
          <p className="text-zinc-300">{summary.targetUser}</p>
        </div>
        <div>
          <span className="text-zinc-500">Fitur Utama:</span>
          <ul className="list-disc list-inside text-zinc-300 mt-1">
            {summary.mainFeatures.map((feature, i) => (
              <li key={i}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        Dokumen akan langsung terisi di panel sebelah kanan.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onDismiss}
          className="flex-1 px-4 py-3 border border-zinc-700 hover:border-zinc-500 rounded-xl text-sm transition-colors"
        >
          Koreksi dulu
        </button>
        <button
          onClick={onGenerate}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 rounded-xl text-sm font-semibold transition-all"
        >
          Gaskeun, Generate!
        </button>
      </div>
    </div>
  );
}
