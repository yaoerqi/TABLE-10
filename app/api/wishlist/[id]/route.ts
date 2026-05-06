import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

/** Public read single wish row for detail page (RLS off / admin). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("wishlist")
      .select("id,buyer_id,requested_item,budget,created_at")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, wish: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
