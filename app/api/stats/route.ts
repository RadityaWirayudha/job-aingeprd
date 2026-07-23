import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// Angka ini dipakai untuk badge "X User / Y PRD" di halaman chat.
// - prdCount  : jumlah total baris di aingeprd_tasks (setiap PRD = 1 baris)
// - userCount : jumlah user UNIK (distinct user_id), BUKAN jumlah baris.
//
// Cara utama: RPC get_aingeprd_stats() yang menghitung COUNT(DISTINCT ...) di
// sisi database (lihat migrasi 005). Kalau fungsi itu belum di-apply, kita
// fallback menghitung distinct user_id di sisi server.
export async function GET() {
  const supabase = createServerSupabase();

  const { data, error } = await supabase.rpc("get_aingeprd_stats").single();

  if (!error && data) {
    return NextResponse.json({
      userCount: Number((data as { user_count: number }).user_count) || 0,
      prdCount: Number((data as { prd_count: number }).prd_count) || 0,
    });
  }

  // Fallback: RPC belum tersedia — hitung manual.
  const [{ count: prdCount }, { data: rows }] = await Promise.all([
    supabase.from("aingeprd_tasks").select("id", { count: "exact", head: true }),
    supabase.from("aingeprd_tasks").select("user_id"),
  ]);

  const userCount = new Set((rows ?? []).map((r) => r.user_id)).size;

  return NextResponse.json({
    userCount,
    prdCount: prdCount ?? 0,
  });
}
