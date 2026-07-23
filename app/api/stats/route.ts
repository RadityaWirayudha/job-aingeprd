import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// - userCount : Clerk registered + Supabase distinct user_id
// - prdCount  : jumlah total baris di aingeprd_tasks (setiap PRD = 1 baris)
export async function GET() {
  const supabase = createServerSupabase();

  const [userRes, prdRes, { data: rows }] = await Promise.all([
    fetch("https://api.clerk.com/v1/users/count", {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }),
    supabase
      .from("aingeprd_tasks")
      .select("id", { count: "exact", head: true }),
    supabase.from("aingeprd_tasks").select("user_id"),
  ]);

  const { total_count: clerkCount } = await userRes.json();
  const supabaseUserCount = new Set((rows ?? []).map((r) => r.user_id)).size;
  const userCount = (clerkCount ?? 0) + supabaseUserCount;
  const prdCount = prdRes.count ?? 0;

  return NextResponse.json({
    userCount: userCount ?? 0,
    prdCount,
  });
}
