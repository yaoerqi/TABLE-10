import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const uid = await getSessionAccountId();
  if (!uid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as any;
  const admin = supabaseAdmin();
  const { error } = await admin.from("wishlist").insert({
    buyer_id: uid,
    requested_item: String(body.requested_item ?? ""),
    budget: Number(body.budget ?? 0)
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}

