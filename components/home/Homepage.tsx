"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Heart, MessageCircle, Search } from "lucide-react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/navigation/BottomNav";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { supabase, hasSupabaseEnv } from "@/lib/supabase/client";
import type { DbItem } from "@/lib/supabase/types";
import { mockItems } from "@/lib/mock/items";
import {
  getMockWishForumPosts,
  mapWishlistRowToForumPost,
  type WishForumPost
} from "@/lib/mock/wishlistForum";
import { ALL_CATEGORIES, DEFAULT_VISIBLE_CATEGORIES, isCategory, type FeedTab } from "@/lib/categories";
import {
  bumpCategoryPref,
  bumpItemClick,
  getCampusPickupZone,
  getCategoryPrefs,
  getClicks,
  getHomeLayoutMode,
  isFavorited,
  setCampusPickupZone,
  toggleFavorite,
  type HomeLayoutMode
} from "@/lib/clientPrefs";
import type { CampusPickupZoneId } from "@/lib/campus";
import { itemMatchesPickupZone } from "@/lib/campus";
import { CampusPickupChips } from "@/components/campus/CampusPickupChips";
import { CampusSafetyBanner } from "@/components/campus/CampusSafetyBanner";
import { firstItemImageUrl } from "@/lib/itemImages";
import { getSeedAuctionItem } from "@/lib/mock/auctionSeed";
import { useLocale } from "@/components/providers/LocaleProvider";
import { categoryLabel } from "@/lib/i18n/categoryLabel";
import { formatCompactCount } from "@/lib/i18n/formatCompact";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { demoListingLocation, demoListingTitle } from "@/lib/i18n/demoListing";

type UiCategory = (typeof ALL_CATEGORIES)[number];
type HomeTopTab = "recommend" | "discover" | "wishlist" | "auction";

type WishlistRow = {
  id: string;
  buyer_id: string;
  requested_item: string;
  budget: number;
  created_at?: string;
};

function hashStable(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** XHS-like fake engagement; stable per item while session lives. */
function gridCardLikeHint(itemId: string): number {
  const clicks = getClicks()[itemId] ?? 0;
  const h = hashStable(itemId);
  return Math.min(99000, Math.max(8, clicks * 3 + 20 + (h % 920)));
}

const FALLBACK_CARD_IMG =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80";

/** Listing card src: demo seeds use direct URLs; real items use signed redirect for private Storage. */
function listingCardImageSrc(item: DbItem, firstUrl: string): string {
  if (!firstUrl) return FALLBACK_CARD_IMG;
  if (item.id.startsWith("seed-")) return firstUrl;
  return `/api/items/${encodeURIComponent(item.id)}/card-image`;
}

function itemDetailPath(item: DbItem): string {
  return item.is_auction
    ? `/auction/${encodeURIComponent(item.id)}`
    : `/item/${encodeURIComponent(item.id)}`;
}

function gridCardSellerRow(
  item: DbItem,
  t: (key: string, vars?: Record<string, string | number>) => string
): { label: string; avatarUrl: string } {
  const h = hashStable(item.seller_id);
  if (item.seller_id === "demo-seller") {
    return { label: t("home.sellerDemo"), avatarUrl: `https://i.pravatar.cc/96?img=${1 + (h % 69)}` };
  }
  return {
    label: t("home.sellerPeer", { id: String(h).slice(-3) }),
    avatarUrl: `https://i.pravatar.cc/96?img=${1 + (hashStable(item.id) % 69)}`
  };
}

export function Homepage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t, locale } = useLocale();

  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<DbItem[]>([]);
  const [wishPosts, setWishPosts] = useState<WishForumPost[]>(() =>
    getMockWishForumPosts(DEFAULT_LOCALE)
  );
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [catsExpanded, setCatsExpanded] = useState(false);
  const [favoritesTick, setFavoritesTick] = useState(0);
  const [pickupZone, setPickupZone] = useState<CampusPickupZoneId>("all");

  useEffect(() => {
    setPickupZone(getCampusPickupZone());
  }, []);

  useEffect(() => {
    setCampusPickupZone(pickupZone);
  }, [pickupZone]);

  const loadItems = useCallback(async () => {
    if (!hasSupabaseEnv) {
      setErrorText(t("common.supabaseNotConfigured"));
      return;
    }

    setErrorText("");
    const resp = await fetch("/api/items").catch(() => null);
    const json = (await resp?.json().catch(() => null)) as null | { ok?: boolean; items?: any[]; error?: string };
    const rows = resp?.ok && json?.ok && Array.isArray(json.items) ? (json.items as DbItem[]) : [];

    if (resp && !resp.ok) {
      setErrorText(json?.error ? String(json.error) : resp.statusText);
      setLoading(false);
      return;
    }

    const demoSellerId = "seed-seller";
    const demoItems: DbItem[] = mockItems.map((m) => ({
      id: `seed-${m.id}`,
      seller_id: demoSellerId,
      title: demoListingTitle(m.id, locale),
      description: "",
      price: m.price,
      category: m.category,
      images_array: [m.imageUrl],
      meetup_location: demoListingLocation(m.id, locale),
      status: "available"
    }));

    const seedAuction = getSeedAuctionItem(locale);
    // Always show seed demos first; append real listings when the DB has rows.
    const merged = rows.length
      ? [seedAuction, ...demoItems, ...rows]
      : [seedAuction, ...demoItems];
    setItems(merged);
  }, [locale, t]);

  const loadWishlist = useCallback(async () => {
    if (!hasSupabaseEnv) return;
    const { data, error } = await supabase
      .from("wishlist")
      .select("id,buyer_id,requested_item,budget,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    const rows = (data ?? []) as WishlistRow[];
    const mapped = rows.map((r) => mapWishlistRowToForumPost(r, locale));
    setWishPosts([...getMockWishForumPosts(locale), ...mapped]);
  }, [locale]);

  useEffect(() => {
    (async () => {
      if (!hasSupabaseEnv) {
        setAuthChecked(true);
        setIsAuthed(false);
        setLoading(false);
        return;
      }

      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      if (!me?.ok || !me?.user?.id) {
        setAuthChecked(true);
        setIsAuthed(false);
        setLoading(false);
        return;
      }

      setIsAuthed(true);
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (!isAuthed || !hasSupabaseEnv) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([loadItems(), loadWishlist()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthed, locale, loadItems, loadWishlist]);

  const activeTab = useMemo<FeedTab>(() => {
    const raw = sp.get("tab");
    return raw === "hot" ? "hot" : "recommend";
  }, [sp]);

  const topTab = useMemo<HomeTopTab>(() => {
    const top = (sp.get("top") ?? "").toString();
    if (top === "discover") return "discover";
    if (top === "wishlist") return "wishlist";
    if (top === "auction") return "auction";
    // Backward-compat: map old tab=hot to discover.
    if (sp.get("tab") === "hot") return "discover";
    return "recommend";
  }, [sp]);

  /** Preserve 首页顶部 Tab（含拍卖）在切换分类时不变 */
  const topSearchPrefix = useMemo(() => {
    if (topTab === "discover") return "top=discover&tab=hot";
    if (topTab === "wishlist") return "top=wishlist&tab=recommend";
    if (topTab === "auction") return "top=auction&tab=recommend";
    return "top=recommend&tab=recommend";
  }, [topTab]);

  const selectedCategory = useMemo<UiCategory | null>(() => {
    const raw = sp.get("cat");
    if (!raw) return null;
    if (isCategory(raw)) return raw;
    return null;
  }, [sp]);

  useEffect(() => {
    if (sp.get("openCats") === "1") setCatsExpanded(true);
  }, [sp]);

  const categoryOrder = (() => {
    const prefs = getCategoryPrefs();
    const base = Array.from(DEFAULT_VISIBLE_CATEGORIES);
    const sorted = [...ALL_CATEGORIES].sort((a, b) => (prefs[b] ?? 0) - (prefs[a] ?? 0));
    const rest = sorted.filter((c) => !base.includes(c));
    return { visible: base, allSorted: [...base, ...rest] };
  })();

  const visibleItems = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const auctionTabOk = topTab !== "auction" || Boolean(item.is_auction);
      const matchesKeyword = kw ? item.title.toLowerCase().includes(kw) : true;
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      const meetsPickup =
        pickupZone === "all" || itemMatchesPickupZone(item.meetup_location, pickupZone);
      return auctionTabOk && matchesKeyword && matchesCategory && meetsPickup;
    });
    if (activeTab === "recommend") {
      // Light-weight "推荐": shuffle by day so it feels fresh but stable
      const seed = Number(new Date().toISOString().slice(0, 10).replaceAll("-", ""));
      const rand = (x: number) => {
        // xorshift32-ish
        let t = (x + seed) | 0;
        t ^= t << 13;
        t ^= t >> 17;
        t ^= t << 5;
        return (t >>> 0) / 4294967296;
      };
      return [...filtered].sort((a, b) => rand(Number(a.id.length)) - rand(Number(b.id.length)));
    }
    const clicks = getClicks();
    return [...filtered].sort((a, b) => (clicks[b.id] ?? 0) - (clicks[a.id] ?? 0));
  }, [items, keyword, selectedCategory, activeTab, pickupZone, topTab]);

  const layoutMode = useMemo<HomeLayoutMode>(() => {
    const raw = (sp.get("layout") ?? "").toString();
    if (raw === "feed") return "feed";
    return getHomeLayoutMode();
  }, [sp]);

  const visibleWishPosts = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return wishPosts;
    return wishPosts.filter((p) => {
      const hay = `${p.title} ${p.excerpt} ${p.nickname} ${p.tags.join(" ")}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [wishPosts, keyword]);

  const hotTags = useMemo(
    () => [
      t("home.hotTag1"),
      t("home.hotTag2"),
      t("home.hotTag3"),
      t("home.hotTag4"),
      t("home.hotTag5"),
      t("home.hotTag6")
    ],
    [t]
  );

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-white px-4 py-16">
        <p className="text-center text-sm text-gray-500">{t("common.loading")}</p>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <LoginScreen
        onAuthed={async () => {
          const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
          if (!me?.ok || !me?.user?.id) return;
          setIsAuthed(true);
          setErrorText("");
        }}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-8">
      <header className="mb-4 [&_.chip:not(.chip-active)]:border-slate-200 [&_.chip:not(.chip-active)]:bg-white [&_.chip:not(.chip-active)]:backdrop-blur-none [&_.chip:not(.chip-active)]:shadow-sm">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-50px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <button
                  type="button"
                  onClick={() => router.push("/following")}
                  className="chip shrink-0"
                >
                  <Heart className="h-4 w-4" />
                  {t("home.follow")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/?top=recommend&tab=recommend${selectedCategory ? `&cat=${encodeURIComponent(selectedCategory)}` : ""}${
                        layoutMode === "feed" ? "&layout=feed" : ""
                      }`
                    )
                  }
                  className={[
                    "chip shrink-0",
                    topTab === "recommend" ? "chip-active" : ""
                  ].join(" ")}
                >
                  {t("home.recommend")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/?top=discover&tab=hot${selectedCategory ? `&cat=${encodeURIComponent(selectedCategory)}` : ""}${
                        layoutMode === "feed" ? "&layout=feed" : ""
                      }`
                    )
                  }
                  className={[
                    "chip shrink-0",
                    topTab === "discover" ? "chip-active" : ""
                  ].join(" ")}
                >
                  {t("home.discover")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/?top=wishlist&tab=recommend${
                        selectedCategory ? `&cat=${encodeURIComponent(selectedCategory)}` : ""
                      }${layoutMode === "feed" ? "&layout=feed" : ""}`
                    )
                  }
                  className={[
                    "chip shrink-0",
                    topTab === "wishlist" ? "chip-active" : ""
                  ].join(" ")}
                >
                  {t("home.wishlist")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/?top=auction&tab=recommend${
                        selectedCategory ? `&cat=${encodeURIComponent(selectedCategory)}` : ""
                      }${layoutMode === "feed" ? "&layout=feed" : ""}`
                    )
                  }
                  className={[
                    "chip shrink-0",
                    topTab === "auction" ? "chip-active" : ""
                  ].join(" ")}
                >
                  {t("home.auction")}
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                  aria-label={t("home.searchPlaceholder")}
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <span className="shrink-0 text-xs font-semibold text-gray-600">{t("home.hotSearch")}</span>
                {hotTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setKeyword(tag.replace(/^#/, ""))}
                    className="chip shrink-0"
                    aria-label={tag}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <nav className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/?${topSearchPrefix}${layoutMode === "feed" ? "&layout=feed" : ""}`)
                  }
                  className={[
                    "chip shrink-0",
                    selectedCategory === null ? "chip-active" : ""
                  ].join(" ")}
                >
                  {t("home.all")}
                </button>
                {categoryOrder.visible.map((cat) => {
                  const isActive = cat === selectedCategory;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        bumpCategoryPref(cat, 2);
                        router.push(
                          `/?${topSearchPrefix}&cat=${encodeURIComponent(cat)}${layoutMode === "feed" ? "&layout=feed" : ""}`
                        );
                      }}
                      className={[
                        "chip shrink-0",
                        isActive ? "chip-active" : ""
                      ].join(" ")}
                    >
                      {categoryLabel(cat, t)}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCatsExpanded((v) => !v)}
                  className="chip shrink-0 gap-1 px-3"
                  aria-label={t("home.expandCategoriesAria")}
                >
                  {t("home.more")}
                  <ChevronDown className={catsExpanded ? "h-4 w-4 rotate-180 transition" : "h-4 w-4 transition"} />
                </button>
              </nav>

              {catsExpanded ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {categoryOrder.allSorted.map((cat) => {
                      const isActive = cat === selectedCategory;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            bumpCategoryPref(cat, 3);
                            router.push(
                          `/?${topSearchPrefix}&cat=${encodeURIComponent(cat)}${layoutMode === "feed" ? "&layout=feed" : ""}`
                        );
                            setCatsExpanded(false);
                          }}
                          className={[
                            "chip px-3 py-1.5",
                            isActive ? "chip-active" : ""
                          ].join(" ")}
                        >
                          {categoryLabel(cat, t)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
      </header>

      <CampusSafetyBanner />

      {topTab !== "wishlist" ? (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <CampusPickupChips dense value={pickupZone} onChange={setPickupZone} />
        </div>
      ) : null}

      {loading ? <p className="mt-6 text-sm text-gray-500">{t("home.loading")}</p> : null}
      {errorText ? <p className="mt-4 text-sm text-red-600">{errorText}</p> : null}

      {topTab === "wishlist" ? (
        <section className="mt-6 grid gap-4 pb-6">
          {visibleWishPosts.length ? (
            visibleWishPosts.map((post) => (
              <article
                key={post.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/wish/${encodeURIComponent(post.id)}`)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  router.push(`/wish/${encodeURIComponent(post.id)}`);
                }}
                className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-28px_rgba(0,0,0,0.25)] transition hover:border-indigo-300 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex gap-3 p-4 sm:p-5">
                  <img
                    src={post.avatarUrl}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-semibold text-slate-900">{post.nickname}</span>
                      <span className="text-[11px] text-slate-400">{post.timeLabel}</span>
                    </div>
                    <h3 className="mt-2 text-[15px] font-bold leading-snug text-slate-900">{post.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={`${post.id}-${tag}`}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <p className="text-lg font-extrabold tabular-nums text-indigo-700">
                        {t("home.budget", { amount: Number(post.budget).toFixed(0) })}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {post.replyCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          {post.likes}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-white/30 bg-white/60 p-6 backdrop-blur-xl">
              <p className="text-sm font-semibold text-slate-900">{t("home.emptyWish")}</p>
              <p className="mt-1 text-xs text-gray-500">{t("home.emptyWishHint")}</p>
              <button
                type="button"
                onClick={() => router.push("/publish")}
                className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
              >
                {t("home.goPublish")}
              </button>
            </div>
          )}
        </section>
      ) : (
        layoutMode === "feed" ? (
          <section className="mt-6 columns-1 gap-4 pb-6 sm:columns-2 lg:columns-3">
            {visibleItems.map((item) => {
              const img = listingCardImageSrc(item, firstItemImageUrl(item.images_array));
              const badge = item.meetup_location.split(" ")[0] || item.meetup_location;
              const liked = isFavorited(item.id);

              return (
                <article
                  key={item.id}
                  className="mb-4 break-inside-avoid overflow-hidden rounded-3xl border border-white/30 bg-white/55 p-0 shadow-[0_16px_50px_-38px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:-translate-y-0.5"
                >
                  <div
                    className="relative overflow-hidden rounded-3xl bg-gray-100"
                    onClick={() => {
                      bumpItemClick(item.id);
                      bumpCategoryPref(item.category, 1);
                      setFavoritesTick((x) => x + 1);
                      router.push(itemDetailPath(item));
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <img src={img} alt={item.title} className="aspect-[4/3] h-full w-full rounded-3xl object-cover" />
                    {item.is_auction ? (
                      <span className="absolute left-3 top-3 rounded-full bg-rose-600/95 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        {t("home.auctionBadge")}
                      </span>
                    ) : null}
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const res = toggleFavorite(item.id);
                        setFavoritesTick((x) => x + 1);
                        bumpCategoryPref(item.category, res.isFavorited ? 3 : -2);
                      }}
                      whileTap={{ scale: 0.86 }}
                      animate={{ scale: liked ? 1.02 : 1 }}
                      transition={{ type: "spring", stiffness: 600, damping: 30 }}
                      className={[
                        "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur",
                        liked ? "bg-black/80 text-white" : "bg-white/80 text-gray-700"
                      ].join(" ")}
                      aria-label={liked ? t("home.ariaUnfollow") : t("home.ariaFollow")}
                    >
                      <Heart className={liked ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                    </motion.button>
                  </div>

                  <div className="px-3 pb-3 pt-3">
                    <h3 className="line-clamp-2 text-sm font-medium text-gray-800">{item.title}</h3>
                    <p className="mt-2 text-lg font-bold text-black">
                      {item.is_auction ? (
                        <>
                          {item.auction_current_price != null
                            ? t("home.currentYuan", { p: Number(item.auction_current_price).toFixed(0) })
                            : t("home.startYuan", {
                                p: Number(item.auction_start_price ?? item.price).toFixed(0)
                              })}
                        </>
                      ) : (
                        `$${Number(item.price).toFixed(2)}`
                      )}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500">
                      {badge}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 pb-6">
            {visibleItems.map((item) => {
              const img = listingCardImageSrc(item, firstItemImageUrl(item.images_array));
              const liked = isFavorited(item.id);
              const seller = gridCardSellerRow(item, t);
              const likeBase = gridCardLikeHint(item.id);
              const likeShown = liked ? likeBase + 1 : likeBase;

              return (
                <article
                  key={item.id}
                  className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition active:opacity-95"
                  onClick={() => {
                    bumpItemClick(item.id);
                    bumpCategoryPref(item.category, 1);
                    router.push(itemDetailPath(item));
                  }}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    bumpItemClick(item.id);
                    bumpCategoryPref(item.category, 1);
                    router.push(itemDetailPath(item));
                  }}
                >
                  <div className="relative bg-slate-100">
                    <img src={img} alt={item.title} className="aspect-[3/4] w-full object-cover" />
                    {item.is_auction ? (
                      <span className="absolute left-2 top-2 rounded-full bg-rose-600/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        {t("home.bidShort")}
                      </span>
                    ) : null}
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const res = toggleFavorite(item.id);
                        setFavoritesTick((x) => x + 1);
                        bumpCategoryPref(item.category, res.isFavorited ? 3 : -2);
                      }}
                      whileTap={{ scale: 0.86 }}
                      animate={{ scale: liked ? 1.02 : 1 }}
                      transition={{ type: "spring", stiffness: 600, damping: 30 }}
                      className={[
                        "absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full shadow-sm",
                        liked ? "bg-black/75 text-white" : "bg-white/90 text-gray-600"
                      ].join(" ")}
                      aria-label={liked ? t("home.ariaUnlike") : t("home.ariaLike")}
                    >
                      <Heart className={liked ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
                    </motion.button>
                  </div>

                  <div className="p-2.5">
                    <p className="line-clamp-2 text-left text-[13px] font-medium leading-snug text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-left text-[12px] font-semibold text-slate-600">
                      {item.is_auction ? (
                        <>
                          {item.auction_current_price != null
                            ? t("home.currentYuan", { p: Number(item.auction_current_price).toFixed(0) })
                            : t("home.startYuan", {
                                p: Number(item.auction_start_price ?? item.price).toFixed(0)
                              })}
                        </>
                      ) : (
                        <>￥{Number(item.price).toFixed(0)}</>
                      )}
                      <span className="ml-1.5 font-normal text-slate-400">
                        · {categoryLabel(item.category, t)}
                      </span>
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <img
                          src={seller.avatarUrl}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                        />
                        <span className="truncate text-[11px] text-slate-500">{seller.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const res = toggleFavorite(item.id);
                          setFavoritesTick((x) => x + 1);
                          bumpCategoryPref(item.category, res.isFavorited ? 3 : -2);
                        }}
                        className="inline-flex shrink-0 items-center gap-0.5 text-slate-400"
                        aria-label={liked ? t("home.ariaUnlike") : t("home.ariaLike")}
                      >
                        <Heart
                          className={[
                            "h-3.5 w-3.5",
                            liked ? "fill-rose-500 text-rose-500" : "text-slate-400"
                          ].join(" ")}
                        />
                        <span className="text-[11px] tabular-nums text-slate-500">
                          {formatCompactCount(likeShown, locale)}
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )
      )}

      {!loading && !errorText && topTab !== "wishlist" && visibleItems.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">
          {topTab === "auction" ? t("home.emptyAuction") : t("home.noItems")}
        </p>
      ) : null}

      <BottomNav />
    </main>
  );
}
