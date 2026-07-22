"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            AiNgePRD
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/"
            className={`block px-3 py-2 rounded-lg transition-colors ${
              pathname === "/"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/chat"
            className={`block px-3 py-2 rounded-lg transition-colors ${
              pathname === "/chat"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            Chat
          </Link>
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="w-full px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors text-left">
                Login untuk simpan chat
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
