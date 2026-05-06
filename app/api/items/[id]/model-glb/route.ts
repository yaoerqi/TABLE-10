import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Stream GLB from Supabase Storage so <model-viewer> works when the bucket is private.
 * Public Supabase URLs (/object/public/...) return 400 for private buckets.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const itemId = params.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: item, error } = await admin
    .from("items")
    .select("3d_job_id,3d_status")
    .eq("id", itemId)
    .maybeSingle();

  if (error || !item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const jobId = item["3d_job_id"] as string | null | undefined;
  const status = item["3d_status"] as string | null | undefined;
  if (!jobId || status !== "completed") {
    return NextResponse.json({ error: "Model not ready" }, { status: 404 });
  }

  const path = `${itemId}/model/${jobId}.glb`;
  const { data: blob, error: dlError } = await admin.storage.from("item-images").download(path);

  if (dlError || !blob) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const buf = await blob.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
