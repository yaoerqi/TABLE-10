-- Remove Supabase Auth dependency and introduce custom username/password auth.
-- Run in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- 1) Drop users -> auth.users FK so `public.users` no longer depends on Supabase Auth.
alter table public.users drop constraint if exists users_id_fkey;

-- 2) Accounts table (username + password hash)
create table if not exists public.accounts (
  id uuid primary key references public.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 32),
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_username_idx on public.accounts (username);

drop trigger if exists trg_accounts_set_updated_at on public.accounts;
create trigger trg_accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

-- 3) Sessions table (hashed token stored server-side)
create table if not exists public.sessions (
  token_hash text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_account_id_idx on public.sessions (account_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- 4) Disable RLS for now (simplest; auth is enforced by our API).
do $$
begin
  if to_regclass('public.users') is not null then
    execute 'alter table public.users disable row level security';
  end if;
  if to_regclass('public.items') is not null then
    execute 'alter table public.items disable row level security';
  end if;
  if to_regclass('public.wishlist') is not null then
    execute 'alter table public.wishlist disable row level security';
  end if;
  if to_regclass('public.favorites') is not null then
    execute 'alter table public.favorites disable row level security';
  end if;
  if to_regclass('public.chat_threads') is not null then
    execute 'alter table public.chat_threads disable row level security';
  end if;
  if to_regclass('public.chat_messages') is not null then
    execute 'alter table public.chat_messages disable row level security';
  end if;
end $$;

