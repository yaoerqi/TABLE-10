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

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const REALI3_API_KEY = process.env.REALI3_API_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase env vars" },
      { status: 500 }
    );
  }
  if (!REALI3_API_KEY) {
    return NextResponse.json({ error: "Missing REALI3_API_KEY" }, { status: 500 });
  }

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  // ---- Auth (optional, but recommended) ----
  // If Authorization is provided, we verify the caller is the seller owner.
  const token = getBearerToken(request.headers);
  const supabaseAnon = createClient(supabaseUrl, anonKey);

  if (token) {
    const {
      data: { user },
      error: authError
    } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: itemRow, error: itemFetchError } = await supabaseAnon
      .from("items")
      .select("seller_id")
      .eq("id", itemId)
      .maybeSingle();
    if (itemFetchError || !itemRow) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (itemRow.seller_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // ---- Admin client to update DB + upload model ----
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const bucket = "item-images";

  const { data: item, error: itemError } = await supabaseAdmin
    .from("items")
    .select("id,3d_job_id,3d_status")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const jobId = item["3d_job_id"];
  if (!jobId) {
    return NextResponse.json({ error: "Missing 3d_job_id" }, { status: 400 });
  }

  // ---- Poll Reali3 status ----
  // Docs indicate tracking via reconstruction id endpoints.
  const statusResp = await fetch(`https://api.reali3.net/v1/reconstruction/${jobId}`, {
    headers: { Authorization: `Bearer ${REALI3_API_KEY}` }
  });

  if (!statusResp.ok) {
    const text = await statusResp.text().catch(() => "");
    return NextResponse.json(
      { error: "Failed to fetch Reali3 status", details: text },
      { status: 502 }
    );
  }

  const statusJson: any = await statusResp.json().catch(() => ({}));
  const remoteStatus: string =
    statusJson.status || statusJson.state || statusJson.phase || "";

  // Normalize remote statuses to our DB statuses.
  let nextStatus: "pending" | "processing" | "completed" | "failed" = "processing";
  const s = remoteStatus.toLowerCase();
  if (s.includes("complete") || s.includes("success") || s === "done") nextStatus = "completed";
  if (s.includes("fail") || s.includes("error")) nextStatus = "failed";
  if (s.includes("pending") || s.includes("queued")) nextStatus = "pending";

  // If completed, download GLB and upload it.
  if (nextStatus === "completed") {
    const downloadResp = await fetch(
      `https://api.reali3.net/v1/reconstruction/${jobId}/download/glb`,
      { headers: { Authorization: `Bearer ${REALI3_API_KEY}` } }
    );

    if (!downloadResp.ok) {
      const text = await downloadResp.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to download GLB", details: text },
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

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(modelPath);
    const modelGlbUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from("items")
      .update({
        "3d_status": "completed",
        model_glb_url: modelGlbUrl
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
      modelGlbUrl
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
    remote: remoteStatus
  });
}

