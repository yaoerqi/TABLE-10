import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { getSessionAccountId } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const buyerId = await getSessionAccountId();
  if (!buyerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { itemId?: string };
  const itemId = (body.itemId ?? "").toString().trim();
  if (!itemId) {
    return NextResponse.json({ error: "Bad request: missing itemId" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: item, error: itemErr } = await admin
    .from("items")
    .select("id,seller_id")
    .eq("id", itemId)
    .maybeSingle();

  if (itemErr || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const sellerId = (item as any).seller_id as string;
  if (!sellerId) {
    return NextResponse.json({ error: "Item seller_id missing" }, { status: 500 });
  }
  if (sellerId === buyerId) {
    return NextResponse.json({ error: "You cannot chat with yourself" }, { status: 400 });
  }

  const { data: upserted, error: upsertErr } = await admin
    .from("chat_threads")
    .upsert(
      { item_id: itemId, buyer_id: buyerId, seller_id: sellerId },
      { onConflict: "item_id,buyer_id,seller_id" }
    )
    .select("id")
    .single();

  if (upsertErr || !upserted?.id) {
    return NextResponse.json(
      { error: "Failed to create chat thread", details: upsertErr?.message ?? upsertErr },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, threadId: upserted.id });
}

