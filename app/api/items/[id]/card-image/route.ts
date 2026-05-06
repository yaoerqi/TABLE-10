import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { firstItemImageUrl } from "@/lib/itemImages";

export const runtime = "nodejs";

const BUCKET = "item-images";

/** Turn `/storage/...` paths into absolute URLs using the project origin (matches browser uploads). */
function normalizeStoredImageUrl(raw: string): string {
  const t = raw.trim();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  if (base && t.startsWith("/storage/")) {
    return `${base}${t}`;
  }
  return t;
}

/**
 * Extract object path inside bucket `item-images` from common Supabase Storage URL shapes.
 */
function extractItemImagesObjectPath(absoluteUrl: string): string | null {
  const noHashQuery = absoluteUrl.split(/[#?]/)[0];
  const markers = [
    `/storage/v1/object/public/${BUCKET}/`,
    `/storage/v1/object/sign/${BUCKET}/`,
    `/storage/v1/render/image/public/${BUCKET}/`
  ];
  for (const m of markers) {
    const idx = noHashQuery.indexOf(m);
    if (idx >= 0) {
      const tail = noHashQuery.slice(idx + m.length);
      try {
        return decodeURIComponent(tail);
      } catch {
        return tail;
      }
    }
  }
  const needle = `/${BUCKET}/`;
  const j = noHashQuery.indexOf(needle);
  if (j >= 0) {
    const tail = noHashQuery.slice(j + needle.length);
    try {
      return decodeURIComponent(tail);
    } catch {
      return tail;
    }
  }
  return null;
}

/**
 * Redirect to a short-lived signed URL so listing cards can show covers from a private bucket.
 * Public /object/public/... URLs often return 400/403 for private buckets — fallback to streaming download.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = supabaseAdmin();
    const { data: row, error } = await admin
      .from("items")
      .select("images_array")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const raw = firstItemImageUrl((row as { images_array?: string[] }).images_array);
    if (!raw) {
      return NextResponse.json({ error: "No image" }, { status: 404 });
    }

    const normalized = normalizeStoredImageUrl(raw);

    // Already a temporary signed URL — pass through.
    if (normalized.includes("/sign/") && normalized.includes(BUCKET)) {
      return NextResponse.redirect(normalized, 302);
    }

    const objectPath = extractItemImagesObjectPath(normalized);

    if (objectPath) {
      const { data: signed, error: signErr } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(objectPath, 60 * 60);

      if (!signErr && signed?.signedUrl) {
        return NextResponse.redirect(signed.signedUrl, 302);
      }

      const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(objectPath);
      if (!dlErr && blob) {
        const buf = await blob.arrayBuffer();
        const ct = blob.type || "image/jpeg";
        return new NextResponse(buf, {
          headers: {
            "Content-Type": ct,
            "Cache-Control": "public, max-age=300, s-maxage=300"
          }
        });
      }
    }

    return NextResponse.redirect(normalized, 302);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
