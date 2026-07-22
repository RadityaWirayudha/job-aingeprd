-- AiNgePRD Task Session Migration
-- Menambah kolom session_id ke aingeprd_tasks supaya tiap PRD terikat ke
-- sesi chat asalnya. Dengan ini LIVE PRD OUTPUT hanya menampilkan PRD milik
-- chat yang sedang dibuka, bukan ikut dari chat lain.

alter table public.aingeprd_tasks
  add column if not exists session_id text;

-- Index for fast lookup by user + session
create index if not exists idx_aingeprd_tasks_user_session
  on public.aingeprd_tasks(user_id, session_id);
