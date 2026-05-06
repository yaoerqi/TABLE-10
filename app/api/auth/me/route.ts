import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ ok: true, user: null });

  const admin = supabaseAdmin();
  // 勿在此处 select auction_breach_count：未跑拍卖迁移时列不存在会导致整站 /me 502，登录无法完成。
  const { data, error } = await admin
    .from("users")
    .select("id,nickname,avatar_url")
    .eq("id", accountId)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true, user: data ?? { id: accountId } });
}

