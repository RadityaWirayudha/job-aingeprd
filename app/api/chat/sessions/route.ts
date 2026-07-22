import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

// GET: daftar sesi chat milik user (terbaru dulu).
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("aingeprd_sessions")
    .select("id, title, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions = (data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    createdAt: new Date(s.created_at).getTime(),
  }));

  return NextResponse.json({ sessions });
}

// POST: buat / rename sesi (upsert berdasarkan id).
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    id: string;
    title?: string;
    createdAt?: number;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const row: Record<string, unknown> = {
    id: body.id,
    user_id: userId,
    title: body.title ?? "Chat Baru",
    updated_at: new Date().toISOString(),
  };
  if (body.createdAt) {
    row.created_at = new Date(body.createdAt).toISOString();
  }

  const { error } = await supabase
    .from("aingeprd_sessions")
    .upsert(row, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: hapus sesi beserta seluruh pesannya.
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  await supabase
    .from("aingeprd_chats")
    .delete()
    .eq("user_id", userId)
    .eq("session_id", id);

  const { error } = await supabase
    .from("aingeprd_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
