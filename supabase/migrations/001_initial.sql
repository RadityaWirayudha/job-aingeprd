-- AiNgePRD Supabase Migration
-- Tabel: aingeprd_tasks

create table public.aingeprd_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  title text not null default 'Untitled PRD',
  content jsonb default '{}'::jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index
create index idx_aingeprd_tasks_user_id on public.aingeprd_tasks(user_id);

-- RLS Policies
alter table public.aingeprd_tasks enable row level security;

-- User can view their own tasks
create policy "User can view their own tasks"
on "public"."aingeprd_tasks"
for select
to authenticated
using (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);

-- User can insert their own tasks
create policy "User can insert their own tasks"
on "public"."aingeprd_tasks"
for insert
to authenticated
with check (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);

-- User can update their own tasks
create policy "User can update their own tasks"
on "public"."aingeprd_tasks"
for update
to authenticated
using (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);

-- User can delete their own tasks
create policy "User can delete their own tasks"
on "public"."aingeprd_tasks"
for delete
to authenticated
using (
  ((select auth.jwt()->>'sub') = (user_id)::text)
);
