import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionAccountId } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // ---- Env ----
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const meshyApiKey = process.env.MESHY_API_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase env vars (need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 }
    );
  }
  if (!meshyApiKey) {
    return NextResponse.json({ error: "Missing MESHY_API_KEY env var" }, { status: 500 });
  }

  // ---- Auth ----
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Note: We no longer enforce .edu.cn here to keep testing friction low.

  // ---- Parse JSON ----
  const body = (await request.json().catch(() => ({}))) as {
    itemId?: string;
    prompt?: string;
  };
  const itemId = (body.itemId ?? "").toString().trim();
  const prompt = (body.prompt ?? "").toString().trim();
  if (!itemId) {
    return NextResponse.json({ error: "Bad request: need itemId" }, { status: 400 });
  }

  // ---- Admin (service role) client ----
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // ---- Ownership check ----
  const { data: itemRow, error: itemFetchError } = await supabaseAdmin
    .from("items")
    .select("id,seller_id,images_array")
    .eq("id", itemId)
    .maybeSingle();
  if (itemFetchError || !itemRow) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (itemRow.seller_id !== accountId) {
    return NextResponse.json({ error: "Forbidden: not item owner" }, { status: 403 });
  }

  const images = (itemRow as any)?.images_array as unknown;
  const imageUrl = Array.isArray(images) && typeof images[0] === "string" ? (images[0] as string) : "";
  if (!imageUrl) {
    return NextResponse.json({ error: "Missing item images: need images_array[0] to generate 3D" }, { status: 400 });
  }

  // Meshy must be able to download the image URL from the public internet.
  // If the bucket is private, `getPublicUrl` is not actually fetchable; generate a short-lived signed URL instead.
  let meshyImageUrl = imageUrl;
  try {
    const marker = "/storage/v1/object/public/item-images/";
    const idx = imageUrl.indexOf(marker);
    if (idx >= 0) {
      const objectPath = decodeURIComponent(imageUrl.slice(idx + marker.length));
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from("item-images")
        .createSignedUrl(objectPath, 60 * 60 * 24 * 7); // 7d
      if (!signErr && signed?.signedUrl) {
        meshyImageUrl = signed.signedUrl;
      }
    }
  } catch {
    // fall back to original URL
  }

  // ---- Trigger Meshy Image -> 3D task ----
  const meshyResp = await fetch("https://api.meshy.ai/openapi/v1/image-to-3d", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${meshyApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      image_url: meshyImageUrl,
      ai_model: "latest",
      should_texture: true,
      enable_pbr: true,
      target_formats: ["glb"],
      ...(prompt ? { texture_prompt: prompt.slice(0, 600) } : {})
    })
  });

  const meshyJson: any = await meshyResp.json().catch(() => ({}));
  if (!meshyResp.ok) {
    return NextResponse.json(
      { error: "Meshy task create failed", status: meshyResp.status, details: meshyJson },
      { status: 502 }
    );
  }

  const result = meshyJson?.result;
  const taskId =
    meshyJson?.id ||
    meshyJson?.task_id ||
    (typeof result === "string" ? result : null) ||
    (result && typeof result === "object" ? (result as any).id : null);
  if (!taskId) {
    return NextResponse.json(
      { error: "Meshy task created but id missing", details: meshyJson },
      { status: 502 }
    );
  }

  // ---- Persist job fields in items ----
  const { error: updateError } = await supabaseAdmin
    .from("items")
    .update({
      "3d_job_id": String(taskId),
      "3d_status": "processing"
    })
    .eq("id", itemId);

  if (updateError) {
    return NextResponse.json({ error: `DB update failed: ${updateError.message}` }, { status: 500 });
  }

  const { data: verify, error: verifyError } = await supabaseAdmin
    .from("items")
    .select('id,"3d_job_id"')
    .eq("id", itemId)
    .maybeSingle();

  if (verifyError) {
    return NextResponse.json({ error: `DB verify failed: ${verifyError.message}` }, { status: 500 });
  }
  const persistedJobId = (verify as any)?.["3d_job_id"] as string | null | undefined;
  if (!persistedJobId) {
    return NextResponse.json(
      {
        error:
          "Meshy task created but DB did not persist 3d_job_id (likely missing column). Run supabase/migrations/20260501200000_items_3d_columns.sql in Supabase SQL Editor."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    itemId,
    taskId: String(taskId),
    status: "processing",
    provider: "meshy"
  });
}

