-- Campus second-hand marketplace core schema
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

-- 1) Users table (maps 1:1 to Supabase Auth user)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  edu_email text not null unique,
  nickname text not null check (char_length(nickname) between 2 and 40),
  avatar_url text,
  dorm_area text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_edu_email_format_check check (edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu\.cn$')
);

-- 2) Items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 3000),
  price numeric(10,2) not null check (price >= 0),
  category text not null check (category in ('Books', 'Electronics', 'Skills', 'Dorms')),
  images_array text[] not null default '{}',
  meetup_location text not null,
  status text not null default 'available' check (status in ('available', 'reserved', 'sold', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_seller_id_idx on public.items (seller_id);
create index if not exists items_category_idx on public.items (category);
create index if not exists items_status_idx on public.items (status);
create index if not exists items_created_at_idx on public.items (created_at desc);

-- 3) Wishlist table
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users (id) on delete cascade,
  requested_item text not null check (char_length(requested_item) between 2 and 120),
  budget numeric(10,2) not null check (budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wishlist_buyer_id_idx on public.wishlist (buyer_id);
create index if not exists wishlist_created_at_idx on public.wishlist (created_at desc);

-- Generic updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_items_set_updated_at on public.items;
create trigger trg_items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

drop trigger if exists trg_wishlist_set_updated_at on public.wishlist;
create trigger trg_wishlist_set_updated_at
before update on public.wishlist
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.users enable row level security;
alter table public.items enable row level security;
alter table public.wishlist enable row level security;

-- Helper predicate: "authenticated student profile exists"
-- We inline this expression in policies to avoid SECURITY DEFINER functions:
-- exists (select 1 from public.users u where u.id = auth.uid() and u.edu_email ~* '...\\.edu\\.cn$')

-- USERS policies
drop policy if exists users_select_authenticated_students on public.users;
create policy users_select_authenticated_students
on public.users
for select
to authenticated
using (
  exists (
    select 1
    from public.users me
    where me.id = auth.uid()
      and me.edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu\.cn$'
  )
);

drop policy if exists users_insert_self_edu_only on public.users;
create policy users_insert_self_edu_only
on public.users
for insert
to authenticated
with check (
  id = auth.uid()
  and edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu\.cn$'
);

drop policy if exists users_update_self_edu_only on public.users;
create policy users_update_self_edu_only
on public.users
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu\.cn$'
);

-- ITEMS policies
drop policy if exists items_select_students_only on public.items;
create policy items_select_students_only
on public.items
for select
to authenticated
using (
  exists (
    select 1
    from public.users me
    where me.id = auth.uid()
      and me.edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu\.cn$'
  )
);

-- Allow anonymous browsing (demo) of available items
-- Needed so the user can enter the homepage without successfully sending OTP email.
drop policy if exists items_select_public_browse on public.items;
create policy items_select_public_browse
on public.items
for select
to public
using (status = 'available');

drop policy if exists items_insert_owner_only on public.items;
create policy items_insert_owner_only
on public.items
for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.users me
    where me.id = auth.uid()
      and me.edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu\.cn$'
  )
);

drop policy if exists items_update_owner_only on public.items;
create policy items_update_owner_only
on public.items
for update
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

drop policy if exists items_delete_owner_only on public.items;
create policy items_delete_owner_only
on public.items
for delete
to authenticated
using (seller_id = auth.uid());

-- WISHLIST policies
drop policy if exists wishlist_select_students_only on public.wishlist;
create policy wishlist_select_students_only
on public.wishlist
for select
to authenticated
using (
  exists (
    select 1
    from public.users me
    where me.id = auth.uid()
      and me.edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu\.cn$'
  )
);

drop policy if exists wishlist_insert_owner_only on public.wishlist;
create policy wishlist_insert_owner_only
on public.wishlist
for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and exists (
    select 1
    from public.users me
    where me.id = auth.uid()
      and me.edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu\.cn$'
  )
);

drop policy if exists wishlist_update_owner_only on public.wishlist;
create policy wishlist_update_owner_only
on public.wishlist
for update
to authenticated
using (buyer_id = auth.uid())
with check (buyer_id = auth.uid());

drop policy if exists wishlist_delete_owner_only on public.wishlist;
create policy wishlist_delete_owner_only
on public.wishlist
for delete
to authenticated
using (buyer_id = auth.uid());
