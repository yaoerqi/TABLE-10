import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  const uid = await getSessionAccountId();
  if (!uid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  // 使用 *：未跑拍卖迁移时无 is_auction 等列；显式列名会导致 PostgREST 报错、首页空白。
  const { data, error } = await admin
    .from("items")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(req: Request) {
  const uid = await getSessionAccountId();
  if (!uid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as any;
  const admin = supabaseAdmin();

  const isAuction = Boolean(body?.is_auction);
  const priceNum = Number(body.price ?? 0);
  const auctionEndRaw = body?.auction_end_at != null ? String(body.auction_end_at) : "";
  const auctionEndMs = auctionEndRaw ? Date.parse(auctionEndRaw) : NaN;
  const stepNum = Number(body?.auction_step ?? 1);

  if (isAuction) {
    if (!Number.isFinite(auctionEndMs) || auctionEndMs <= Date.now()) {
      return NextResponse.json({ ok: false, error: "拍卖结束时间无效或未填写" }, { status: 400 });
    }
    if (!Number.isFinite(stepNum) || stepNum <= 0) {
      return NextResponse.json({ ok: false, error: "加价幅度必须大于 0" }, { status: 400 });
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ ok: false, error: "起拍价无效" }, { status: 400 });
    }
  }

  const basePayload = {
    seller_id: uid,
    title: String(body.title ?? ""),
    description: String(body.description ?? ""),
    price: priceNum,
    category: String(body.category ?? ""),
    meetup_location: String(body.meetup_location ?? ""),
    images_array: Array.isArray(body.images_array) ? body.images_array : [],
    status: "available" as const,
    "3d_status": body["3d_status"] ?? null
  };

  // 未迁移拍卖列时，切勿写入 is_auction 等字段，否则普通上架也会失败。
  const payload = (
    isAuction
      ? {
          ...basePayload,
          is_auction: true,
          auction_start_price: priceNum,
          auction_current_price: null,
          auction_end_at: new Date(auctionEndMs).toISOString(),
          auction_step: stepNum
        }
      : basePayload
  ) as Record<string, unknown>;

  const { data, error } = await admin.from("items").insert(payload).select("id").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true, itemId: data?.id });
}

