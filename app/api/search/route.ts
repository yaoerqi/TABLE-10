import { NextResponse } from "next/server";
import { mockItems } from "@/lib/mock/items";
import { searchItems } from "@/lib/assistant/search";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { query?: string };
    const query = (body.query ?? "").toString().trim();
    if (!query) {
      return NextResponse.json({ ok: false, message: "Missing query" }, { status: 400 });
    }

    const { need, results } = searchItems(query, mockItems);

    return NextResponse.json({
      ok: true,
      query,
      need,
      results: results.map(({ item, score }) => ({
        score,
        id: item.id,
        title: item.title,
        price: item.price,
        meetupLocation: item.meetupLocation,
        imageUrl: item.imageUrl,
        category: item.category
      }))
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

