-- AiNgePRD Chat Messages Migration
-- Tabel: aingeprd_chats

create table public.aingeprd_chats (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Index for fast lookup by user + session
create index idx_aingeprd_chats_user_session
  on public.aingeprd_chats(user_id, session_id);

-- RLS Policies (API routes use service role key, these are for direct client access if needed)
alter table public.aingeprd_chats enable row level security;

-- User can view their own messages
create policy "Users can view own messages"
on "public"."aingeprd_chats"
for select
to authenticated
using (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);

-- User can insert their own messages
create policy "Users can insert own messages"
on "public"."aingeprd_chats"
for insert
to authenticated
with check (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);
