-- Campus second-hand marketplace core schema
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

-- 1) Users table (maps 1:1 to Supabase Auth user)
create table if not exists public.users (
  id uuid primary key,
  edu_email text not null unique,
  nickname text not null check (char_length(nickname) between 2 and 40),
  avatar_url text,
  dorm_area text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- NOTE: previously enforced .edu.cn only; relaxed to any email for simpler testing.
  constraint users_email_format_check check (edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 2) Items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 3000),
  price numeric(10,2) not null check (price >= 0),
  category text not null check (category in (
    '游戏','数码','玩车','手机','户外','传达','母婴','宠物','植物','技能服务','企业用品','家电','小配饰','二次元','图书','影视','美妆','家具','温婉','时尚首饰','租房','食品','农用物品'
  )),
  images_array text[] not null default '{}',
  meetup_location text not null,
  status text not null default 'available' check (status in ('available', 'reserved', 'sold', 'inactive')),
  "3d_job_id" text,
  "3d_status" text,
  model_glb_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_seller_id_idx on public.items (seller_id);
create index if not exists items_category_idx on public.items (category);
create index if not exists items_status_idx on public.items (status);
create index if not exists items_created_at_idx on public.items (created_at desc);

-- Auction (optional columns; see migrations for full constraints)
-- is_auction, auction_start_price, auction_current_price, auction_end_at,
-- auction_step, auction_high_bidder_id on items; table bids; users.auction_breach_count; place_bid()

-- 3) Wishlist table
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users (id) on delete cascade,
  requested_item text not null check (char_length(requested_item) between 2 and 120),
  budget numeric(10,2) not null check (budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Favorites / Following (user follows an item)
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists favorites_item_id_idx on public.favorites (item_id);

create index if not exists wishlist_buyer_id_idx on public.wishlist (buyer_id);
create index if not exists wishlist_created_at_idx on public.wishlist (created_at desc);

-- 5) Direct messages (buyer <-> seller per item)
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  buyer_id uuid not null references public.users (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, buyer_id, seller_id)
);

create index if not exists chat_threads_buyer_id_idx on public.chat_threads (buyer_id);
create index if not exists chat_threads_seller_id_idx on public.chat_threads (seller_id);
create index if not exists chat_threads_item_id_idx on public.chat_threads (item_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  is_read boolean not null default false
);

create index if not exists chat_messages_thread_id_idx on public.chat_messages (thread_id, created_at desc);
create index if not exists chat_messages_sender_id_idx on public.chat_messages (sender_id);

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
-- We no longer use Supabase Auth (`auth.uid()`), so RLS is disabled.
alter table public.users disable row level security;
alter table public.items disable row level security;
alter table public.wishlist disable row level security;
alter table public.favorites disable row level security;
alter table public.chat_threads disable row level security;
alter table public.chat_messages disable row level security;
