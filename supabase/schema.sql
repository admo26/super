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

create table if not exists public.pending_ad_hoc_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qty text not null default '1',
  target_order_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  source text not null,
  cook_frequency text not null,
  serving_pattern text not null,
  rotation_notes text not null,
  ingredients_to_map text[] not null default '{}'
);

create table if not exists public.order_history_items (
  id uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),
  order_date date,
  item_name text not null,
  quantity text,
  unit text,
  category text,
  notes text,
  source_type text not null default 'manual_import',
  source_name text
);

alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_meals enable row level security;
alter table public.weekly_plan_cadence_items enable row level security;
alter table public.weekly_plan_items enable row level security;
alter table public.pending_ad_hoc_items enable row level security;
alter table public.recipes enable row level security;
alter table public.order_history_items enable row level security;

drop policy if exists "Public can read weekly plans" on public.weekly_plans;
create policy "Public can read weekly plans"
on public.weekly_plans
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage weekly plans" on public.weekly_plans;
create policy "Authenticated can manage weekly plans"
on public.weekly_plans
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update weekly plans" on public.weekly_plans;
create policy "Authenticated can update weekly plans"
on public.weekly_plans
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete weekly plans" on public.weekly_plans;
create policy "Authenticated can delete weekly plans"
on public.weekly_plans
for delete
to authenticated
using (true);

drop policy if exists "Public can read weekly plan meals" on public.weekly_plan_meals;
create policy "Public can read weekly plan meals"
on public.weekly_plan_meals
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage weekly plan meals" on public.weekly_plan_meals;
create policy "Authenticated can manage weekly plan meals"
on public.weekly_plan_meals
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update weekly plan meals" on public.weekly_plan_meals;
create policy "Authenticated can update weekly plan meals"
on public.weekly_plan_meals
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete weekly plan meals" on public.weekly_plan_meals;
create policy "Authenticated can delete weekly plan meals"
on public.weekly_plan_meals
for delete
to authenticated
using (true);

drop policy if exists "Public can read weekly cadence items" on public.weekly_plan_cadence_items;
create policy "Public can read weekly cadence items"
on public.weekly_plan_cadence_items
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage weekly cadence items" on public.weekly_plan_cadence_items;
create policy "Authenticated can manage weekly cadence items"
on public.weekly_plan_cadence_items
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update weekly cadence items" on public.weekly_plan_cadence_items;
create policy "Authenticated can update weekly cadence items"
on public.weekly_plan_cadence_items
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete weekly cadence items" on public.weekly_plan_cadence_items;
create policy "Authenticated can delete weekly cadence items"
on public.weekly_plan_cadence_items
for delete
to authenticated
using (true);

drop policy if exists "Public can read weekly plan items" on public.weekly_plan_items;
create policy "Public can read weekly plan items"
on public.weekly_plan_items
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage weekly plan items" on public.weekly_plan_items;
create policy "Authenticated can manage weekly plan items"
on public.weekly_plan_items
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update weekly plan items" on public.weekly_plan_items;
create policy "Authenticated can update weekly plan items"
on public.weekly_plan_items
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete weekly plan items" on public.weekly_plan_items;
create policy "Authenticated can delete weekly plan items"
on public.weekly_plan_items
for delete
to authenticated
using (true);

drop policy if exists "Public can read pending ad hoc items" on public.pending_ad_hoc_items;
create policy "Public can read pending ad hoc items"
on public.pending_ad_hoc_items
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage pending ad hoc items" on public.pending_ad_hoc_items;
create policy "Authenticated can manage pending ad hoc items"
on public.pending_ad_hoc_items
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update pending ad hoc items" on public.pending_ad_hoc_items;
create policy "Authenticated can update pending ad hoc items"
on public.pending_ad_hoc_items
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete pending ad hoc items" on public.pending_ad_hoc_items;
create policy "Authenticated can delete pending ad hoc items"
on public.pending_ad_hoc_items
for delete
to authenticated
using (true);

drop policy if exists "Public can read recipes" on public.recipes;
create policy "Public can read recipes"
on public.recipes
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read order history items" on public.order_history_items;
create policy "Public can read order history items"
on public.order_history_items
for select
to anon, authenticated
using (true);
