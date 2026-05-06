-- Auction: item columns, bids table, user breach count, atomic place_bid()

alter table public.users
  add column if not exists auction_breach_count int not null default 0;

alter table public.items
  add column if not exists is_auction boolean not null default false;

alter table public.items
  add column if not exists auction_start_price numeric(10,2);

alter table public.items
  add column if not exists auction_current_price numeric(10,2);

alter table public.items
  add column if not exists auction_end_at timestamptz;

alter table public.items
  add column if not exists auction_step numeric(10,2) not null default 1
    check (auction_step > 0);

alter table public.items
  add column if not exists auction_high_bidder_id uuid references public.users (id) on delete set null;

-- When auction is on, require start + end; current price is null until first bid
alter table public.items
  drop constraint if exists items_auction_fields_check;

alter table public.items
  add constraint items_auction_fields_check check (
    is_auction = false
    or (
      auction_start_price is not null
      and auction_end_at is not null
      and auction_start_price > 0
    )
  );

create index if not exists items_is_auction_idx on public.items (is_auction) where is_auction = true;
create index if not exists items_auction_end_at_idx on public.items (auction_end_at);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  bidder_id uuid not null references public.users (id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists bids_item_id_created_at_idx on public.bids (item_id, created_at desc);
create index if not exists bids_bidder_id_idx on public.bids (bidder_id);

-- Reputation threshold (must match app constant MAX_AUCTION_BREACH)
create or replace function public.place_bid(
  p_item_id uuid,
  p_bidder_id uuid,
  p_amount numeric
) returns jsonb
language plpgsql
as $$
declare
  v_breach int;
  v_item public.items%rowtype;
  v_min numeric;
  v_step numeric;
  v_prev_high uuid;
  v_max_breach int := 5;
begin
  select auction_breach_count into v_breach
  from public.users
  where id = p_bidder_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'user_not_found');
  end if;

  if v_breach >= v_max_breach then
    return jsonb_build_object('ok', false, 'code', 'reputation_blocked', 'max_breach', v_max_breach);
  end if;

  select * into v_item
  from public.items
  where id = p_item_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'item_not_found');
  end if;

  if v_item.seller_id = p_bidder_id then
    return jsonb_build_object('ok', false, 'code', 'cannot_bid_own_item');
  end if;

  if not v_item.is_auction or v_item.status <> 'available' then
    return jsonb_build_object('ok', false, 'code', 'not_auction');
  end if;

  if v_item.auction_end_at is null or v_item.auction_end_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'auction_ended');
  end if;

  v_step := coalesce(v_item.auction_step, 1);
  v_prev_high := v_item.auction_high_bidder_id;

  if v_item.auction_current_price is null then
    v_min := v_item.auction_start_price;
    if p_amount < v_min then
      return jsonb_build_object('ok', false, 'code', 'bid_too_low', 'min', v_min);
    end if;
  else
    v_min := v_item.auction_current_price + v_step;
    if p_amount < v_min then
      return jsonb_build_object('ok', false, 'code', 'bid_too_low', 'min', v_min);
    end if;
  end if;

  insert into public.bids (item_id, bidder_id, amount)
  values (p_item_id, p_bidder_id, p_amount);

  update public.items
  set
    auction_current_price = p_amount,
    auction_high_bidder_id = p_bidder_id,
    price = p_amount
  where id = p_item_id;

  return jsonb_build_object(
    'ok', true,
    'amount', p_amount,
    'previous_high_bidder_id', v_prev_high
  );
end;
$$;
