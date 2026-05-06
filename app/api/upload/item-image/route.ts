import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionAccountId } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const uid = await getSessionAccountId();
  if (!uid) return bad("Unauthorized", 401);

  const form = await req.formData().catch(() => null);
  if (!form) return bad("Bad form data", 400);

  const file = form.get("file");
  if (!(file instanceof File)) return bad("Missing file", 400);
  if (!file.type.startsWith("image/")) return bad("Only image files are allowed", 400);

  const extFromName = (file.name.split(".").pop() || "").toLowerCase();
  const ext = /^[a-z0-9]{1,6}$/.test(extFromName) ? extFromName : "jpg";
  const path = `${uid}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const admin = supabaseAdmin();
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await admin.storage.from("item-images").upload(path, Buffer.from(arrayBuffer), {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg"
  });
  if (error) return bad(error.message, 502);

  const { data } = admin.storage.from("item-images").getPublicUrl(path);
  const url = data?.publicUrl;
  if (!url) return bad("Upload succeeded but public URL missing", 502);

  return NextResponse.json({ ok: true, url });
}

