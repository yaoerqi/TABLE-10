import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getBearerToken(headers: Headers) {
  const auth = headers.get("authorization") || headers.get("Authorization");
  if (!auth) return null;
  const parts = auth.split(" ");
  if (parts.length !== 2) return null;
  if (parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

export async function POST(request: Request) {
  // ---- Env ----
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase env vars (need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 }
    );
  }
  if (!process.env.REALI3_API_KEY) {
    return NextResponse.json({ error: "Missing REALI3_API_KEY env var" }, { status: 500 });
  }

  // ---- Auth ----
  const token = getBearerToken(request.headers);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized: missing Bearer token" }, { status: 401 });
  }

  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError
  } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: invalid token" },
      { status: 401 }
    );
  }

  // Optional: enforce student email here (server-side hardening)
  const email = user.email ?? null;
  if (!email || !/\.edu\.cn$/i.test(email)) {
    return NextResponse.json({ error: "Only .edu.cn accounts allowed" }, { status: 403 });
  }

  // ---- Parse form-data ----
  const form = await request.formData();
  const itemId = form.get("itemId");
  const video = form.get("video");
  if (typeof itemId !== "string" || !video || !(video instanceof File)) {
    return NextResponse.json(
      { error: "Bad request: need itemId (string) and video (file)" },
      { status: 400 }
    );
  }
  if (!video.type.startsWith("video/")) {
    return NextResponse.json({ error: "Uploaded file must be a video" }, { status: 400 });
  }

  // ---- Admin (service role) client ----
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const bucket = "item-images";

  // ---- Ownership check ----
  const { data: itemRow, error: itemFetchError } = await supabaseAdmin
    .from("items")
    .select("id,seller_id")
    .eq("id", itemId)
    .maybeSingle();
  if (itemFetchError || !itemRow) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (itemRow.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: not item owner" }, { status: 403 });
  }

  // ---- Upload video to Supabase Storage ----
  const originalName = video.name || "upload.mp4";
  const ext = originalName.split(".").pop() || "mp4";
  const storagePath = `${itemId}/video/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, video, {
      contentType: video.type || "video/mp4",
      upsert: false
    });

  if (uploadError) {
    return NextResponse.json({ error: `Video upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  const videoPublicUrl = publicUrlData.publicUrl;

  // ---- Trigger Reali3 reconstruction (video to GLB) ----
  // Reali3 docs mention POST /v1/reconstruction with multipart/form-data.
  const reali3Resp = await fetch("https://api.reali3.net/v1/reconstruction", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REALI3_API_KEY}`
    },
    body: (() => {
      const fd = new FormData();
      // API expects field name "files" per their docs.
      fd.append("files", video, originalName);
      return fd;
    })()
  });

  if (!reali3Resp.ok) {
    const text = await reali3Resp.text().catch(() => "");
    return NextResponse.json(
      { error: "Reali3 job create failed", status: reali3Resp.status, details: text },
      { status: 502 }
    );
  }

  const reali3Json: any = await reali3Resp.json().catch(() => ({}));
  const reconstructionId =
    reali3Json.id ||
    reali3Json.reconstruction_id ||
    reali3Json.reconstructionId ||
    reali3Json.rec_id ||
    reali3Json.recId;

  if (!reconstructionId) {
    return NextResponse.json(
      { error: "Reali3 job created but reconstructionId missing", details: reali3Json },
      { status: 502 }
    );
  }

  // ---- Persist job fields in items ----
  const { error: updateError } = await supabaseAdmin
    .from("items")
    .update({
      video_url: videoPublicUrl,
      "3d_job_id": String(reconstructionId),
      "3d_status": "processing"
    })
    .eq("id", itemId);

  if (updateError) {
    return NextResponse.json({ error: `DB update failed: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    itemId,
    reconstructionId,
    videoPublicUrl,
    status: "processing"
  });
}

