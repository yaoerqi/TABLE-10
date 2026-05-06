import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { createSession } from "@/lib/server/session";
import crypto from "crypto";

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
  if (username.length > 32) return bad("账号最多 32 个字符");
  if (!/^[a-z0-9._-]+$/i.test(username)) return bad("账号只允许字母数字以及 . _ -");
  if (password.length < 6) return bad("密码至少 6 位");

  const admin = supabaseAdmin();

  // Pre-check username
  const { data: exist } = await admin.from("accounts").select("id").eq("username", username).maybeSingle();
  if (exist?.id) return bad("该账号已存在，请直接登录。", 409);

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  // Create public.users row (keeps existing foreign keys intact)
  const { error: userErr } = await admin.from("users").insert({
    id,
    edu_email: `${username}@local.invalid`,
    nickname: username.slice(0, 40),
    avatar_url: null,
    dorm_area: null
  });
  if (userErr) return bad(userErr.message, 502);

  const { error: accErr } = await admin.from("accounts").insert({
    id,
    username,
    password_hash: passwordHash
  });
  if (accErr) {
    await admin.from("users").delete().eq("id", id);
    if (/duplicate/i.test(accErr.message)) return bad("该账号已存在，请直接登录。", 409);
    return bad(accErr.message, 502);
  }

  await createSession(id);
  return NextResponse.json({ ok: true });
}
