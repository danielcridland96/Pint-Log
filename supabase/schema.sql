-- Pint Log: already applied to the "pint-log" Supabase project (London). Kept here for reference or to recreate it.
-- Each signed-in person can only see and change their own drinks (Row Level Security).

create table if not exists public.drinks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null,
  label       text not null,
  size        text not null default '',
  ml          numeric not null check (ml >= 0),
  abv         numeric not null check (abv >= 0 and abv <= 100),
  units       numeric not null check (units >= 0),
  price       numeric not null default 0 check (price >= 0),
  note        text not null default '',
  at          timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists drinks_user_at_idx on public.drinks (user_id, at desc);

alter table public.drinks enable row level security;

drop policy if exists "read own drinks"   on public.drinks;
drop policy if exists "add own drinks"    on public.drinks;
drop policy if exists "edit own drinks"   on public.drinks;
drop policy if exists "delete own drinks" on public.drinks;

create policy "read own drinks"   on public.drinks for select to authenticated using ((select auth.uid()) = user_id);
create policy "add own drinks"    on public.drinks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "edit own drinks"   on public.drinks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own drinks" on public.drinks for delete to authenticated using ((select auth.uid()) = user_id);
