import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { createSession } from "@/lib/server/session";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (username.length < 3) return bad("账号至少 3 个字符");
  if (password.length < 6) return bad("密码至少 6 位");

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("accounts")
    .select("id,password_hash")
    .eq("username", username)
    .maybeSingle();
  if (error) return bad(error.message, 502);
  if (!data?.id || !data.password_hash) return bad("账号或密码错误", 401);

  const ok = await bcrypt.compare(password, String(data.password_hash));
  if (!ok) return bad("账号或密码错误", 401);

  await createSession(String(data.id));
  return NextResponse.json({ ok: true });
}

