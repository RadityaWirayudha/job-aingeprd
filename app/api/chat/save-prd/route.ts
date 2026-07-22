import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

// POST: simpan satu PRD ke aingeprd_tasks lewat server (service role).
// Insert langsung dari browser selalu ditolak RLS karena auth memakai Clerk,
// bukan Supabase Auth — jadi persist harus lewat route ini.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    sessionId: string | null;
    prd: { title: string; sections: { heading: string; content: string }[] };
    createdAt?: number;
  };

  if (!body.prd?.title || !Array.isArray(body.prd.sections)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const row: Record<string, unknown> = {
    user_id: userId,
    session_id: body.sessionId ?? null,
    title: body.prd.title,
    content: body.prd,
    status: "completed",
  };
  // Keep the original timestamp when uploading a PRD generated earlier
  // (e.g. while logged out) so history ordering stays correct.
  if (body.createdAt) {
    row.created_at = new Date(body.createdAt).toISOString();
  }

  const { data, error } = await supabase
    .from("aingeprd_tasks")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
