import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionAccountId } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const meshyApiKey = process.env.MESHY_API_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase env vars" },
      { status: 500 }
    );
  }
  if (!meshyApiKey) {
    return NextResponse.json({ error: "Missing MESHY_API_KEY" }, { status: 500 });
  }

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  // ---- Auth (cookie session) ----
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const { data: itemRow, error: itemFetchError } = await supabaseAnon
    .from("items")
    .select("seller_id")
    .eq("id", itemId)
    .maybeSingle();
  if (itemFetchError || !itemRow) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (itemRow.seller_id !== accountId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ---- Admin client to update DB + upload model ----
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const bucket = "item-images";

  const { data: item, error: itemError } = await supabaseAdmin
    .from("items")
    .select("id,3d_job_id,3d_status,model_glb_url")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const jobId = item["3d_job_id"];
  const viewerGlbUrl = `/api/items/${itemId}/model-glb`;

  if (item["3d_status"] === "completed" && jobId) {
    if (item.model_glb_url !== viewerGlbUrl) {
      await supabaseAdmin.from("items").update({ model_glb_url: viewerGlbUrl }).eq("id", itemId);
    }
    return NextResponse.json({
      ok: true,
      itemId,
      jobId,
      status: "completed" as const,
      modelGlbUrl: viewerGlbUrl,
      provider: "meshy"
    });
  }

  if (!jobId) {
    return NextResponse.json(
      {
        error:
          "还没有 Meshy 任务 ID（数据库里缺少 3d_job_id）。请先在创建任务成功后刷新；如果创建失败，需要先点『重试创建 3D 任务』（或重新发布并勾选 3D）。你也可以先执行 migrations 补齐 items 的 3d 字段。",
        code: "missing_3d_job_id",
        itemId
      },
      { status: 409 }
    );
  }

  // ---- Poll Meshy Image -> 3D status ----
  const statusResp = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${jobId}`, {
    headers: { Authorization: `Bearer ${meshyApiKey}` }
  });

  const statusJson: any = await statusResp.json().catch(() => ({}));
  if (!statusResp.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Meshy status", status: statusResp.status, details: statusJson },
      { status: 502 }
    );
  }

  const remoteStatus: string = (statusJson.status ?? "").toString();

  // Normalize remote statuses to our DB statuses.
  let nextStatus: "pending" | "processing" | "completed" | "failed" = "processing";
  if (remoteStatus === "PENDING") nextStatus = "pending";
  if (remoteStatus === "IN_PROGRESS") nextStatus = "processing";
  if (remoteStatus === "FAILED") nextStatus = "failed";
  if (remoteStatus === "SUCCEEDED") nextStatus = "completed";

  // If completed, download GLB and upload it.
  if (nextStatus === "completed") {
    const glbUrl = statusJson?.model_urls?.glb;
    if (!glbUrl || typeof glbUrl !== "string") {
      return NextResponse.json(
        { error: "Meshy task succeeded but model_urls.glb missing", details: statusJson },
        { status: 502 }
      );
    }

    const downloadResp = await fetch(glbUrl);
    if (!downloadResp.ok) {
      const text = await downloadResp.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to download GLB from Meshy", details: text },
        { status: 502 }
      );
    }

    const modelArrayBuffer = await downloadResp.arrayBuffer();
    const modelPath = `${itemId}/model/${jobId}.glb`;

    const modelUpload = await supabaseAdmin.storage
      .from(bucket)
      .upload(modelPath, modelArrayBuffer as any, {
        contentType: "model/gltf-binary",
        upsert: true
      });

    if (modelUpload.error) {
      return NextResponse.json(
        { error: "Failed to upload GLB to Supabase", details: modelUpload.error.message },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("items")
      .update({
        "3d_status": "completed",
        model_glb_url: viewerGlbUrl
      })
      .eq("id", itemId);

    if (updateError) {
      return NextResponse.json(
        { error: "DB update failed", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      itemId,
      jobId,
      status: "completed",
      modelGlbUrl: viewerGlbUrl,
      provider: "meshy"
    });
  }

  // For non-completed states, just update status if needed.
  if (nextStatus !== item["3d_status"]) {
    await supabaseAdmin
      .from("items")
      .update({ "3d_status": nextStatus })
      .eq("id", itemId);
  }

  return NextResponse.json({
    ok: true,
    itemId,
    jobId,
    status: nextStatus,
    remote: remoteStatus,
    provider: "meshy",
    progress: typeof statusJson.progress === "number" ? statusJson.progress : undefined
  });
}

