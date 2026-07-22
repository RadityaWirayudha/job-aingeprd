"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, AingeprdTask } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const { user } = useUser();
  const [tasks, setTasks] = useState<AingeprdTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const userId = user.id;

    async function fetchTasks() {
      const { data } = await supabase
        .from("aingeprd_tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setTasks(data || []);
      setLoading(false);
    }

    fetchTasks();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My PRDs</h1>
        <Link
          href="/chat"
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
        >
          + New PRD
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg mb-4">Belum ada PRD</p>
          <Link href="/chat" className="text-violet-400 hover:text-violet-300">
            Mulai buat PRD baru
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="text-sm text-zinc-500">
                    {new Date(task.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-zinc-800 text-zinc-400">
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
