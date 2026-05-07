"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, MapPin, Send } from "lucide-react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/navigation/BottomNav";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import { bumpItemClick, isFavorited, toggleFavorite } from "@/lib/clientPrefs";
import type { DbItem } from "@/lib/supabase/types";
import { mockItems } from "@/lib/mock/items";
import { demoListingLocation, demoListingTitle } from "@/lib/i18n/demoListing";
import type { Locale } from "@/lib/i18n/locale";
import { firstItemImageUrl } from "@/lib/itemImages";
import { Item3DViewer } from "@/components/viewer/Item3DViewer";
import { useLocale } from "@/components/providers/LocaleProvider";

const SEED_PREFIX = "seed-";

/** Homepage merges mock cards with id `seed-{mockId}` — they are not in Supabase. */
function buildSeedItemDetail(itemId: string, locale: Locale): DbItem | null {
  if (!itemId.startsWith(SEED_PREFIX)) return null;
  const rawId = itemId.slice(SEED_PREFIX.length);
  const m = mockItems.find((x) => x.id === rawId);
  if (!m) return null;
  return {
    id: itemId,
    seller_id: "seed-seller",
    title: demoListingTitle(m.id, locale),
    description: "",
    price: m.price,
    category: m.category,
    images_array: [m.imageUrl],
    meetup_location: demoListingLocation(m.id, locale),
    status: "available"
  };
}

type Comment = {
  id: string;
  user: string;
  content: string;
  createdAt: string;
};

export default function ItemDetailPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const itemId = (params?.id ?? "").toString();

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [item, setItem] = useState<DbItem | null>(null);
  const [tick, setTick] = useState(0);
  const seedDemoComments = useMemo<Comment[]>(
    () => [
      {
        id: "c1",
        user: t("item.demoComment1User"),
        content: t("item.demoComment1"),
        createdAt: t("item.demoComment1Time")
      },
      {
        id: "c2",
        user: t("item.demoComment2User"),
        content: t("item.demoComment2"),
        createdAt: t("item.demoComment2Time")
      }
    ],
    [t]
  );

  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    setComments((prev) => {
      const localOnly = prev.filter((c) => c.id.startsWith("local-"));
      return [...seedDemoComments, ...localOnly];
    });
  }, [seedDemoComments]);
  const [draft, setDraft] = useState("");

  const liked = item ? isFavorited(item.id) : false;

  useEffect(() => {
    bumpItemClick(itemId);
  }, [itemId]);

  useEffect(() => {
    (async () => {
      if (!itemId) {
        setErrorText(t("common.missingItemId"));
        setLoading(false);
        return;
      }

      const seedItem = buildSeedItemDetail(itemId, locale);
      if (seedItem) {
        setItem(seedItem);
        setErrorText("");
        setLoading(false);
        return;
      }

      if (!hasSupabaseEnv) {
        setErrorText(t("common.supabaseNotConfigured"));
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorText("");
      const resp = await fetch(`/api/items/${encodeURIComponent(itemId)}`, {
        cache: "no-store"
      });
      const json = (await resp.json().catch(() => ({}))) as {
        ok?: boolean;
        item?: DbItem;
        error?: string;
      };
      if (!resp.ok || !json.ok || !json.item) {
        setErrorText(json?.error ? String(json.error) : t("common.loadFailed"));
        setLoading(false);
        return;
      }
      setItem(json.item as DbItem);
      setLoading(false);
    })();
  }, [itemId, t, locale]);

  const onSend = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setComments((c) => [
      ...c,
      {
        id: `local-${Date.now()}`,
        user: t("item.me"),
        content: text,
        createdAt: t("item.justNow")
      }
    ]);
  };

  const scrollToQa = useCallback(() => {
    document.getElementById("qa")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openPrivateChat = useCallback(async () => {
    if (!itemId) return;
    if (!item) return;
    if (itemId.startsWith(SEED_PREFIX) || item.seller_id === "seed-seller") {
      router.push(
        `/chat/demo?${new URLSearchParams({ title: item.title }).toString()}`
      );
      return;
    }
    const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
    if (!me?.ok || !me?.user?.id) {
      setErrorText(t("item.loginToChat"));
      return;
    }
    const resp = await fetch("/api/dm/thread", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId })
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setErrorText(json?.error ? String(json.error) : t("item.createDmFailed"));
      return;
    }
    setErrorText("");
    router.push(`/chat/${encodeURIComponent(String(json.threadId))}`);
  }, [item, itemId, router, t]);

  const heroFallback =
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80";
  const rawHero = item ? firstItemImageUrl(item.images_array) : "";
  const heroImgSrc =
    !item
      ? heroFallback
      : item.id.startsWith(SEED_PREFIX)
        ? rawHero || heroFallback
        : rawHero
          ? `/api/items/${encodeURIComponent(itemId)}/card-image`
          : heroFallback;
  const has3d =
    item &&
    item["3d_status"] === "completed" &&
    typeof item["3d_job_id"] === "string" &&
    item["3d_job_id"].length > 0;
  const modelSrc = itemId && has3d ? `/api/items/${itemId}/model-glb` : "";

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-44 pt-6 sm:px-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-slate-900 backdrop-blur hover:bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link href="/" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
          {t("item.backHome")}
        </Link>
      </header>

      {loading ? <p className="mt-6 text-sm text-gray-500">{t("item.loading")}</p> : null}
      {errorText ? <p className="mt-4 text-sm text-red-600">{errorText}</p> : null}

      <section className="mt-5 overflow-hidden rounded-3xl border border-white/30 bg-white/60 backdrop-blur-xl shadow-[0_16px_60px_-45px_rgba(0,0,0,0.35)]">
        <div className="relative bg-gray-100">
          <img src={heroImgSrc} alt={item?.title ?? "item"} className="aspect-[4/3] w-full object-cover" />
          {item ? (
            <motion.button
              type="button"
              onClick={() => {
                toggleFavorite(item.id);
                setTick((x) => x + 1);
              }}
              whileTap={{ scale: 0.86 }}
              animate={{ scale: liked ? 1.02 : 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              className={[
                "absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full backdrop-blur",
                liked ? "bg-black/80 text-white" : "bg-white/80 text-gray-700"
              ].join(" ")}
              aria-label={liked ? t("item.unfavorite") : t("item.favorite")}
            >
              <Heart className={liked ? "h-5 w-5 fill-current" : "h-5 w-5"} />
            </motion.button>
          ) : null}
        </div>

        {has3d && modelSrc ? (
          <div className="border-t border-white/40 bg-white/80 px-3 pb-3 pt-3">
            <Item3DViewer modelGlbUrl={modelSrc} posterUrl={heroImgSrc !== heroFallback ? heroImgSrc : undefined} />
          </div>
        ) : null}

        <div className="p-5">
          <h1 className="text-lg font-bold text-slate-900">{item?.title ?? t("item.seedTitlePlaceholder")}</h1>
          <p className="mt-2 text-2xl font-extrabold text-slate-950">
            {item
              ? item.is_auction
                ? item.auction_current_price != null
                  ? t("item.priceCurrent", { p: Number(item.auction_current_price).toFixed(2) })
                  : t("item.priceStart", { p: Number(item.auction_start_price ?? item.price).toFixed(2) })
                : `$${Number(item.price).toFixed(2)}`
              : "$199.00"}
          </p>
          {item?.is_auction ? (
            <Link
              href={`/auction/${encodeURIComponent(itemId)}`}
              className="mt-2 inline-flex text-sm font-semibold text-rose-700 underline-offset-2 hover:underline"
            >
              {t("item.goAuctionBid")}
            </Link>
          ) : null}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
            <MapPin className="h-4 w-4" />
            {item?.meetup_location ?? t("item.defaultMeetup")}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {item && item.id.startsWith(SEED_PREFIX)
              ? t("item.seedDescription")
              : item?.description || t("item.placeholderDescription")}
          </p>
          <Link
            href="/campus"
            className="mt-3 inline-flex text-[12px] font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
          >
            {t("item.tipLink")}
          </Link>
        </div>
      </section>

      <section id="qa" className="mt-5 rounded-3xl border border-white/30 bg-white/60 p-5 backdrop-blur-xl shadow-[0_16px_60px_-45px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{t("item.qaTitle")}</h2>
          <span className="text-xs text-gray-500">{t("item.qaCount", { n: comments.length })}</span>
        </div>

        <div className="mt-4 space-y-3">
          {comments.slice(-10).map((c) => (
            <div key={c.id} className="rounded-2xl bg-white/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-900">{c.user}</p>
                <p className="text-[11px] text-gray-400">{c.createdAt}</p>
              </div>
              <p className="mt-1 text-sm text-gray-700">{c.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("item.commentPlaceholder")}
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              onSend();
            }}
          />
          <button
            type="button"
            onClick={onSend}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white"
            aria-label="Send comment"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>

      {item ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[38] px-4 sm:bottom-28">
          <div className="pointer-events-auto mx-auto flex max-w-3xl gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.15)]">
            <button
              type="button"
              onClick={() => openPrivateChat()}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-900"
            >
              <MessageCircle className="h-4 w-4" />
              {t("item.chatSeller")}
            </button>
            <button
              type="button"
              onClick={scrollToQa}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              {t("item.publicComment")}
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </main>
  );
}

