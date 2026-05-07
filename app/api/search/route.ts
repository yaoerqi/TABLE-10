import { NextResponse } from "next/server";
import { mockItems } from "@/lib/mock/items";
import { searchItems } from "@/lib/assistant/search";
import { demoListingLocation, demoListingTitle } from "@/lib/i18n/demoListing";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locale";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { query?: string; locale?: unknown };
    const query = (body.query ?? "").toString().trim();
    const locale: Locale = isLocale(body.locale) ? body.locale : DEFAULT_LOCALE;
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
        title: demoListingTitle(item.id, locale),
        price: item.price,
        meetupLocation: demoListingLocation(item.id, locale),
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

