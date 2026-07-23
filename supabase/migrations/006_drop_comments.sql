-- AiNgePRD: Hapus tabel komentar
-- Jalankan ini di Supabase Dashboard > SQL Editor jika sudah pernah menjalankan migration sebelumnya.

drop policy if exists "Users can view comments" on public.aingeprd_comments;
drop policy if exists "Users can insert comments" on public.aingeprd_comments;
drop policy if exists "Users can delete own comments" on public.aingeprd_comments;

drop table if exists public.aingeprd_comments;
