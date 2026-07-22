import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    sessionId: string;
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!body.sessionId || !body.messages?.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Replace the session's history so re-saving the full transcript doesn't
  // accumulate duplicate rows when the session is reopened later.
  await supabase
    .from("aingeprd_chats")
    .delete()
    .eq("user_id", userId)
    .eq("session_id", body.sessionId);

  const rows = body.messages.map((m) => ({
    user_id: userId,
    session_id: body.sessionId,
    role: m.role,
    content: m.content,
  }));

  const { error } = await supabase.from("aingeprd_chats").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
