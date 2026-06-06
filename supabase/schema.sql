create extension if not exists "pgcrypto";

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  order_date date not null,
  analysis_window text,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_plan_meals (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  position integer not null default 0,
  name text not null,
  type text not null,
  note text not null,
  recipe_url text
);

create table if not exists public.weekly_plan_cadence_items (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  position integer not null default 0,
  cadence text not null check (cadence in ('weekly', 'fortnightly', 'monthly')),
  name text not null,
  qty text not null,
  note text not null
);

create table if not exists public.weekly_plan_items (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  position integer not null default 0,
  name text not null,
  qty text not null,
  reason text not null,
  meal text not null,
  "group" text not null
);

alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_meals enable row level security;
alter table public.weekly_plan_cadence_items enable row level security;
alter table public.weekly_plan_items enable row level security;

drop policy if exists "Public can read weekly plans" on public.weekly_plans;
create policy "Public can read weekly plans"
on public.weekly_plans
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read weekly plan meals" on public.weekly_plan_meals;
create policy "Public can read weekly plan meals"
on public.weekly_plan_meals
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read weekly cadence items" on public.weekly_plan_cadence_items;
create policy "Public can read weekly cadence items"
on public.weekly_plan_cadence_items
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read weekly plan items" on public.weekly_plan_items;
create policy "Public can read weekly plan items"
on public.weekly_plan_items
for select
to anon, authenticated
using (true);
