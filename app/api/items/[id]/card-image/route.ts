import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { firstItemImageUrl } from "@/lib/itemImages";

export const runtime = "nodejs";

/** Never cache this handler as “static”; covers must not reuse expired redirect targets. */
export const dynamic = "force-dynamic";

const BUCKET = "item-images";

const IMAGE_HEADERS = {
  /** Short CDN/browser cache of bytes; URL stays stable so no expired signed links in img.src */
  "Cache-Control": "private, max-age=120, must-revalidate"
} as const;

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
 * Serve listing cover bytes through this URL so `<img src="/api/items/.../card-image">` stays stable.
 * Avoid 302 → Supabase signed URL as the primary path: signed URLs expire (~1h) and cached redirects break images later.
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

    const objectPath = extractItemImagesObjectPath(normalized);

    if (objectPath) {
      const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(objectPath);
      if (!dlErr && blob) {
        const buf = await blob.arrayBuffer();
        const ct = blob.type || "image/jpeg";
        return new NextResponse(buf, {
          headers: {
            "Content-Type": ct,
            ...IMAGE_HEADERS
          }
        });
      }

      // Last resort: signed URL (short-lived). Do not let caches treat redirect as long-lived.
      const { data: signed, error: signErr } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(objectPath, 60 * 60);

      if (!signErr && signed?.signedUrl) {
        return NextResponse.redirect(signed.signedUrl, {
          status: 302,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache"
          }
        });
      }
    }

    // External URL or legacy signed URL stored in DB — redirect but prevent sticky redirect cache.
    return NextResponse.redirect(normalized, {
      status: 302,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache"
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
