"use client";

import { useState, useEffect } from "react";

const LOADING_TEXTS = [
  "Menganalisis arsitektur...",
  "Meracik database schema...",
  "Menyiapkan fitur-fitur...",
  "Menulis dokumentasi...",
  "Tunggu ya braiii...",
  "Memproses ide kamu...",
  "Nyari best practices...",
  "Optimizing user flow...",
];

export default function LoadingState() {
  const [textIndex, setTextIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const textInterval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 10;
      });
    }, 300);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="text-center">
        <p className="text-violet-400 font-medium mb-3">
          {LOADING_TEXTS[textIndex]}
        </p>
        <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {Math.min(Math.round(progress), 100)}%
        </p>
      </div>
    </div>
  );
}
