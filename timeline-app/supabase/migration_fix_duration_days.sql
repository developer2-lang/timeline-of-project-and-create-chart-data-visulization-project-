-- ============================================================
-- Migration: make stages fully persistent and database-driven
--
-- This migration ensures the stages table has ALL columns the
-- application reads and writes:
--   stage_name, description, duration_days, dependency_type,
--   offset_days, fixed_start, fixed_ref, start_date, end_date,
--   stage_order
--
-- It also fixes column name mismatches between the original
-- schema.sql and the actual code (name→stage_name,
-- manager→prepared_by in projects).
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- PHASE 0: Drop ALL triggers first so no UPDATE/INSERT fires
--          the set_updated_at() function while columns are missing.
-- ============================================================
drop trigger if exists trg_projects_updated on public.projects;
drop trigger if exists trg_stages_updated on public.stages;
drop trigger if exists trg_holidays_updated on public.holidays;

-- ============================================================
-- PHASE 1: Ensure updated_at exists on ALL tables so triggers
--          can reference it later without error.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects'
      and column_name = 'updated_at'
  ) then
    alter table public.projects
      add column updated_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'updated_at'
  ) then
    alter table public.stages
      add column updated_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'holidays'
      and column_name = 'updated_at'
  ) then
    alter table public.holidays
      add column updated_at timestamptz not null default now();
  end if;
end $$;

-- ============================================================
-- PHASE 2: Add/fix columns on PROJECTS
-- ============================================================
do $$
begin
  -- Ensure prepared_by exists; migrate from manager if needed.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects'
      and column_name = 'manager'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects'
      and column_name = 'prepared_by'
  ) then
    alter table public.projects add column prepared_by text not null default '';
    update public.projects set prepared_by = manager;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects'
      and column_name = 'prepared_by'
  ) then
    alter table public.projects add column prepared_by text not null default '';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects'
      and column_name = 'version'
  ) then
    alter table public.projects add column version text not null default 'R0';
  end if;
end $$;

-- ============================================================
-- PHASE 3: Add/fix columns on STAGES (no UPDATEs yet — just ALTER)
-- ============================================================
do $$
begin
  -- Ensure stage_name exists; migrate from name if needed.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'stage_name'
  ) then
    alter table public.stages add column stage_name text not null default 'New stage';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'stage_name'
  ) then
    alter table public.stages add column stage_name text not null default 'New stage';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'duration_days'
  ) then
    alter table public.stages add column duration_days integer;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'dependency_type'
  ) then
    alter table public.stages add column dependency_type text not null default 'after';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'offset_days'
  ) then
    alter table public.stages add column offset_days integer not null default 2;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'fixed_start'
  ) then
    alter table public.stages add column fixed_start date;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'fixed_ref'
  ) then
    alter table public.stages add column fixed_ref date;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'start_date'
  ) then
    alter table public.stages add column start_date date;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'end_date'
  ) then
    alter table public.stages add column end_date date;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'stage_order'
  ) then
    alter table public.stages add column stage_order integer not null default 0;
  end if;
end $$;

-- ============================================================
-- PHASE 4: Data migration (safe now — updated_at exists on stages)
-- ============================================================

-- Migrate stage_name from legacy 'name' column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'name'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'stage_name'
  ) then
    update public.stages set stage_name = name
      where stage_name = 'New stage' or stage_name is null or stage_name = '';
  end if;
end $$;

-- Migrate from legacy duration_weeks if it exists.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'duration_weeks'
  ) then
    update public.stages
       set duration_days = duration_weeks * 7
     where duration_days is null;
  end if;
end $$;

-- Ensure no nulls remain in duration_days.
update public.stages
   set duration_days = 5
 where duration_days is null or duration_days < 1;

-- Enforce NOT NULL with default.
alter table public.stages
  alter column duration_days set not null,
  alter column duration_days set default 5;

-- ============================================================
-- PHASE 5: Drop legacy column
-- ============================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stages'
      and column_name = 'duration_weeks'
  ) then
    alter table public.stages drop column duration_weeks;
  end if;
end $$;

-- ============================================================
-- PHASE 6: Recreate the updated_at trigger function + triggers
-- ============================================================
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
-- PHASE 7: Row Level Security
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
