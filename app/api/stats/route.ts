import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = createServerSupabase();

  const [userResult, prdResult] = await Promise.all([
    supabase
      .from("aingeprd_tasks")
      .select("user_id", { count: "exact", head: true }),
    supabase
      .from("aingeprd_tasks")
      .select("id", { count: "exact", head: true }),
  ]);

  const userCount = userResult.count ?? 0;
  const prdCount = prdResult.count ?? 0;

  return NextResponse.json({ userCount, prdCount });
}
