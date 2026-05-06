import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

/** Public read for listing detail (feed cards link here without requiring Supabase anon policies). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("items")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** Seller-only: take listing off the marketplace (`inactive` → hidden from feed). */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const uid = await getSessionAccountId();
    if (!uid) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { status?: string };
    if (body.status !== "inactive") {
      return NextResponse.json(
        { ok: false, error: "Only status: inactive is supported for withdraw" },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();
    const { data: row, error: fetchErr } = await admin
      .from("items")
      .select("seller_id")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    if (row.seller_id !== uid) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { error: updateErr } = await admin
      .from("items")
      .update({ status: "inactive" })
      .eq("id", params.id);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
