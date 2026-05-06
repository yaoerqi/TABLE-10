import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { notifyUserOutbid } from "@/lib/server/notifyOutbid";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

type RpcResult = {
  ok?: boolean;
  code?: string;
  min?: number;
  max_breach?: number;
  amount?: number;
  previous_high_bidder_id?: string | null;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const uid = await getSessionAccountId();
    if (!uid) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const itemId = params.id;
    const body = (await request.json().catch(() => ({}))) as { amount?: unknown };
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "出价金额无效" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin.rpc("place_bid", {
      p_item_id: itemId,
      p_bidder_id: uid,
      p_amount: amount
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }

    const res = data as RpcResult | null;
    if (!res?.ok) {
      const code = res?.code ?? "unknown";
      const min = res?.min;
      if (code === "bid_too_low") {
        return NextResponse.json(
          {
            ok: false,
            code,
            error: min != null ? `出价过低，至少需 ￥${Number(min).toFixed(2)}` : "出价过低",
            min
          },
          { status: 409 }
        );
      }
      if (code === "reputation_blocked") {
        return NextResponse.json(
          {
            ok: false,
            code,
            error: `历史违约次数过多（≥${res?.max_breach ?? "?"}），暂时无法参与拍卖出价`
          },
          { status: 403 }
        );
      }
      if (code === "auction_ended") {
        return NextResponse.json({ ok: false, code, error: "拍卖已结束" }, { status: 409 });
      }
      if (code === "cannot_bid_own_item") {
        return NextResponse.json({ ok: false, code, error: "不能给自己的商品出价" }, { status: 403 });
      }
      if (code === "not_auction") {
        return NextResponse.json({ ok: false, code, error: "该商品不是拍卖" }, { status: 400 });
      }
      return NextResponse.json({ ok: false, code, error: "出价失败" }, { status: 400 });
    }

    const prev = res.previous_high_bidder_id ? String(res.previous_high_bidder_id) : null;
    if (prev && prev !== uid) {
      const { data: itemRow } = await admin
        .from("items")
        .select("title")
        .eq("id", itemId)
        .maybeSingle();
      const title = itemRow?.title ? String(itemRow.title) : "商品";
      void notifyUserOutbid({
        outbidUserId: prev,
        itemId,
        itemTitle: title,
        newHighAmount: Number(res.amount ?? amount)
      });
    }

    return NextResponse.json({ ok: true, amount: Number(res.amount ?? amount) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
