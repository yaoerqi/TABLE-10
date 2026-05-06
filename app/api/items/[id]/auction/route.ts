import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { MAX_AUCTION_BREACH } from "@/lib/auction";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

function minNextBid(args: {
  start: number;
  current: number | null;
  step: number;
}): number {
  if (args.current == null) return args.start;
  return args.current + args.step;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data: item, error: itemErr } = await admin
      .from("items")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (itemErr || !item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    const row = item as Record<string, unknown>;
    if (row.is_auction !== true) {
      return NextResponse.json({ ok: false, error: "Not an auction" }, { status: 400 });
    }

    const { data: bidRows, error: bidErr } = await admin
      .from("bids")
      .select("id,amount,created_at,bidder_id")
      .eq("item_id", id)
      .order("created_at", { ascending: false })
      .limit(40);

    let bids = bidRows ?? [];
    if (bidErr) {
      const msg = bidErr.message ?? "";
      if (msg.includes("does not exist") || msg.includes("schema cache")) {
        bids = [];
      } else {
        return NextResponse.json({ ok: false, error: bidErr.message }, { status: 502 });
      }
    }
    const bidderIds = [...new Set(bids.map((b) => String(b.bidder_id)))];
    let nickMap = new Map<string, { nickname: string; avatar_url: string | null }>();
    if (bidderIds.length) {
      const { data: users } = await admin
        .from("users")
        .select("id,nickname,avatar_url")
        .in("id", bidderIds);
      nickMap = new Map(
        (users ?? []).map((u) => [
          String(u.id),
          { nickname: String(u.nickname ?? "用户"), avatar_url: u.avatar_url ?? null }
        ])
      );
    }

    const uid = await getSessionAccountId();
    let breachCount = 0;
    if (uid) {
      const { data: urow, error: breachErr } = await admin
        .from("users")
        .select("auction_breach_count")
        .eq("id", uid)
        .maybeSingle();
      if (!breachErr && urow) {
        breachCount = Number(urow.auction_breach_count ?? 0) || 0;
      }
      // 列不存在（未跑拍卖迁移）时忽略，视为 0，避免拍卖详情整页 502。
    }

    const start = Number(item.auction_start_price ?? item.price ?? 0);
    const current =
      item.auction_current_price != null ? Number(item.auction_current_price) : null;
    const step = Number(item.auction_step ?? 1) || 1;
    const endAt = item.auction_end_at ? String(item.auction_end_at) : null;
    const ended = endAt ? Date.parse(endAt) <= Date.now() : true;

    const bidsOut = bids.map((b) => {
      const meta = nickMap.get(String(b.bidder_id));
      return {
        id: b.id,
        amount: Number(b.amount),
        created_at: b.created_at,
        bidder_id: b.bidder_id,
        nickname: meta?.nickname ?? "同学",
        avatar_url: meta?.avatar_url ?? null
      };
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: item.id,
        title: item.title,
        description: item.description,
        seller_id: item.seller_id,
        category: item.category,
        images_array: item.images_array,
        meetup_location: item.meetup_location,
        status: item.status,
        price: Number(item.price),
        is_auction: true,
        auction_start_price: start,
        auction_current_price: current,
        auction_end_at: endAt,
        auction_step: step,
        auction_high_bidder_id: item.auction_high_bidder_id
      },
      minNextBid: minNextBid({ start, current, step }),
      breachCount,
      maxBreach: MAX_AUCTION_BREACH,
      ended,
      bids: bidsOut,
      meId: uid
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
