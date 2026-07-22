"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-950">
      <div className="text-center space-y-8 px-4">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
          AiNgePRD
        </h1>
        <p className="text-xl text-zinc-400 max-w-md mx-auto">
          AI-powered PRD Generator. Ceritakan ide productmu, biar AI yang urus PRD-nya.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/chat"
            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-semibold transition-colors"
          >
            Mulai Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
