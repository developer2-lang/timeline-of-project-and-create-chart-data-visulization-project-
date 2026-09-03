-- ============================================================
-- IUOVA Client Timeline — Supabase schema
-- Run this in the Supabase SQL Editor once, after creating your
-- project. It creates the tables, indexes, timestamps and Row
-- Level Security policies used by the app.
-- ============================================================

-- ---------- projects ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null default 'Untitled project',
  client_name text not null default '',
  project_code text not null default '',
  start_date date not null,
  prepared_by text not null default '',
  version text not null default 'R0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- stages ----------
create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage_name text not null default 'New stage',
  description text not null default '',
  duration_days integer not null default 5,
  dependency_type text not null default 'after',   -- after | with | into
  offset_days integer not null default 2,
  fixed_start date,
  fixed_ref date,
  start_date date,
  end_date date,
  stage_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- holidays ----------
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null,
  holiday_name text not null default 'Holiday',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index if not exists idx_stages_project on public.stages (project_id);
create index if not exists idx_stages_order on public.stages (project_id, stage_order);
create index if not exists idx_holidays_date on public.holidays (holiday_date);

-- ---------- triggers to keep updated_at fresh ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_stages_updated on public.stages;
create trigger trg_stages_updated before update on public.stages
  for each row execute function public.set_updated_at();

drop trigger if exists trg_holidays_updated on public.holidays;
create trigger trg_holidays_updated before update on public.holidays
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security (public anon access — adjust to taste,
-- e.g. add authentication if you want per-user data).
-- ============================================================
alter table public.projects enable row level security;
alter table public.stages enable row level security;
alter table public.holidays enable row level security;

drop policy if exists "public read projects" on public.projects;
create policy "public read projects" on public.projects
  for select using (true);
drop policy if exists "public insert projects" on public.projects;
create policy "public insert projects" on public.projects
  for insert with check (true);
drop policy if exists "public update projects" on public.projects;
create policy "public update projects" on public.projects
  for update using (true) with check (true);
drop policy if exists "public delete projects" on public.projects;
create policy "public delete projects" on public.projects
  for delete using (true);

drop policy if exists "public read stages" on public.stages;
create policy "public read stages" on public.stages
  for select using (true);
drop policy if exists "public insert stages" on public.stages;
create policy "public insert stages" on public.stages
  for insert with check (true);
drop policy if exists "public update stages" on public.stages;
create policy "public update stages" on public.stages
  for update using (true) with check (true);
drop policy if exists "public delete stages" on public.stages;
create policy "public delete stages" on public.stages
  for delete using (true);

drop policy if exists "public read holidays" on public.holidays;
create policy "public read holidays" on public.holidays
  for select using (true);
drop policy if exists "public insert holidays" on public.holidays;
create policy "public insert holidays" on public.holidays
  for insert with check (true);
drop policy if exists "public update holidays" on public.holidays;
create policy "public update holidays" on public.holidays
  for update using (true) with check (true);
drop policy if exists "public delete holidays" on public.holidays;
create policy "public delete holidays" on public.holidays
  for delete using (true);
