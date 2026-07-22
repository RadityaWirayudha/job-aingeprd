-- AiNgePRD Chat Sessions Migration
-- Tabel: aingeprd_sessions
-- Menyimpan daftar sesi chat (judul + waktu) supaya riwayat chat
-- tersinkron penuh di Supabase, tidak hanya di localStorage browser.

create table public.aingeprd_sessions (
  id text primary key,           -- sama dengan aingeprd_chats.session_id
  user_id text not null,
  title text not null default 'Chat Baru',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup by user
create index idx_aingeprd_sessions_user
  on public.aingeprd_sessions(user_id);

-- RLS Policies (API routes pakai service role key; ini untuk akses client langsung)
alter table public.aingeprd_sessions enable row level security;

-- User can view their own sessions
create policy "Users can view own sessions"
on "public"."aingeprd_sessions"
for select
to authenticated
using (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);

-- User can insert their own sessions
create policy "Users can insert own sessions"
on "public"."aingeprd_sessions"
for insert
to authenticated
with check (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);

-- User can update their own sessions
create policy "Users can update own sessions"
on "public"."aingeprd_sessions"
for update
to authenticated
using (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);

-- User can delete their own sessions
create policy "Users can delete own sessions"
on "public"."aingeprd_sessions"
for delete
to authenticated
using (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);
