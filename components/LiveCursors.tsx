"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface PresenceUser {
  user_id: string;
  user_name: string;
  color: string;
  cursor_x: number;
  cursor_y: number;
  last_seen: number;
}

const CURSOR_COLORS = [
  "#f43f5e", "#8b5cf6", "#06b6d4", "#f97316", "#10b981",
  "#eab308", "#ec4899", "#3b82f6", "#14b8a6", "#a855f7",
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export default function LiveCursors({
  sessionId,
  userId,
  userName,
  containerRef,
}: {
  sessionId: string;
  userId: string;
  userName: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [cursors, setCursors] = useState<Map<string, PresenceUser>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const throttleRef = useRef(0);

  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`presence:${sessionId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const map = new Map<string, PresenceUser>();
        for (const [key, presences] of Object.entries(state)) {
          if (key !== userId && presences.length > 0) {
            map.set(key, presences[0]);
          }
        }
        setCursors(map);
      })
      .on("presence", { event: "join" }, () => {})
      .on("presence", { event: "leave" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            user_name: userName || "Anonymous",
            color: getColorForUser(userId),
            cursor_x: 0,
            cursor_y: 0,
            last_seen: Date.now(),
          } satisfies PresenceUser);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId, userId, userName]);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container || !channelRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - throttleRef.current < 50) return;
      throttleRef.current = now;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      channelRef.current?.track({
        user_id: userId,
        user_name: userName || "Anonymous",
        color: getColorForUser(userId),
        cursor_x: Math.round(x * 10) / 10,
        cursor_y: Math.round(y * 10) / 10,
        last_seen: Date.now(),
      });
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [containerRef, userId, userName]);

  const now = Date.now();
  const activeCursors = Array.from(cursors.values()).filter(
    (c) => now - c.last_seen < 10000
  );

  if (activeCursors.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {activeCursors.map((cursor) => (
        <div
          key={cursor.user_id}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: `${cursor.cursor_x}%`,
            top: `${cursor.cursor_y}%`,
          }}
        >
          <svg
            width="16"
            height="20"
            viewBox="0 0 16 20"
            fill="none"
            className="drop-shadow-lg"
            style={{ filter: `drop-shadow(0 1px 2px ${cursor.color}40)` }}
          >
            <path
              d="M0 0L16 12L8 12L5 20L0 0Z"
              fill={cursor.color}
            />
          </svg>
          <span
            className="absolute left-4 top-4 text-[10px] font-medium px-1.5 py-0.5 rounded-md text-white whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.user_name}
          </span>
        </div>
      ))}
    </div>
  );
}
