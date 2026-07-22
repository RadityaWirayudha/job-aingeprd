import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

// GET: seluruh PRD milik user (terlama dulu), lewat server (service role).
// Select langsung dari browser selalu balik 0 baris karena RLS + Clerk auth.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("aingeprd_tasks")
    .select("id, session_id, title, content, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}
