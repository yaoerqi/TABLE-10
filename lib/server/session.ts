import { cookies } from "next/headers";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

const COOKIE_NAME = "ent_session";
const SESSION_DAYS = 14;

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(accountId: string) {
  const token = newToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const admin = supabaseAdmin();
  const { error } = await admin.from("sessions").insert({
    token_hash: tokenHash,
    account_id: accountId,
    expires_at: expiresAt.toISOString()
  });
  if (error) throw new Error(error.message);

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  jar.delete(COOKIE_NAME);
  if (!token) return;
  const admin = supabaseAdmin();
  await admin.from("sessions").delete().eq("token_hash", hashToken(token));
}

export async function getSessionAccountId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("sessions")
    .select("account_id,expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error || !data?.account_id) return null;

  const expiresMs = Date.parse(String(data.expires_at));
  if (Number.isFinite(expiresMs) && expiresMs < Date.now()) {
    await admin.from("sessions").delete().eq("token_hash", hashToken(token));
    return null;
  }
  return String(data.account_id);
}

