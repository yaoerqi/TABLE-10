"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Heart, Search } from "lucide-react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/navigation/BottomNav";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { supabase, hasSupabaseEnv } from "@/lib/supabase/client";
import { ensureStudentProfile } from "@/lib/supabase/studentAuth";
import type { DbItem } from "@/lib/supabase/types";
import { isDemoAuthed } from "@/lib/demo/demoAuth";
import { mockItems } from "@/lib/mock/items";
import { ALL_CATEGORIES, DEFAULT_VISIBLE_CATEGORIES, isCategory, type FeedTab } from "@/lib/categories";
import { bumpCategoryPref, bumpItemClick, getCategoryPrefs, getClicks, isFavorited, toggleFavorite } from "@/lib/clientPrefs";

type UiCategory = (typeof ALL_CATEGORIES)[number];
type HomeTopTab = "recommend" | "discover" | "wishlist";

type WishlistRow = {
  id: string;
  buyer_id: string;
  requested_item: string;
  budget: number;
  created_at?: string;
};

const campusHotTags = ["#考研资料", "#宿舍火锅", "#单车代步", "#急售", "#租房", "#转专业资料"];

export function Homepage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<DbItem[]>([]);
  const [wish, setWish] = useState<WishlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [catsExpanded, setCatsExpanded] = useState(false);
  const [favoritesTick, setFavoritesTick] = useState(0);

  const loadItems = async () => {
    if (isDemoAuthed()) {
      const demoSellerId = "demo-seller";
      const demoItems: DbItem[] = mockItems.map((m) => {
        return {
          id: `demo-${m.id}`,
          seller_id: demoSellerId,
          title: m.title,
          description: "",
          price: m.price,
          category: m.category,
          images_array: [m.imageUrl],
          meetup_location: m.meetupLocation,
          status: "available"
        };
      });

      setItems(demoItems);
      setLoading(false);
      setErrorText("");
      return;
    }

    if (!hasSupabaseEnv) {
      setLoading(false);
      setErrorText("未配置 Supabase 环境变量");
      return;
    }

    setLoading(true);
    setErrorText("");
    const { data, error } = await supabase
      .from("items")
      .select("id,title,price,category,images_array,meetup_location,seller_id")
      .eq("status", "available")
      .order("created_at", { ascending: false });
    if (error) {
      setErrorText(error.message);
      setLoading(false);
      return;
    }
    setItems((data ?? []) as DbItem[]);
    setLoading(false);
  };

  const loadWishlist = async () => {
    if (isDemoAuthed()) {
      setWish([
        { id: "w1", buyer_id: "demo-user", requested_item: "求购：二手 iPad（带笔更好）", budget: 1800 },
        { id: "w2", buyer_id: "demo-user", requested_item: "求购：考研数学一资料（近两年）", budget: 80 },
        { id: "w3", buyer_id: "demo-user", requested_item: "求购：公路车通勤（身高175左右）", budget: 1200 }
      ]);
      return;
    }
    if (!hasSupabaseEnv) return;
    const { data, error } = await supabase
      .from("wishlist")
      .select("id,buyer_id,requested_item,budget,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error) setWish((data ?? []) as WishlistRow[]);
  };

  useEffect(() => {
    (async () => {
      if (isDemoAuthed()) {
        setAuthChecked(true);
        setIsAuthed(true);
        setLoading(false);
        setErrorText("");
        await loadItems();
        return;
      }

      if (!hasSupabaseEnv) {
        setAuthChecked(true);
        setIsAuthed(false);
        setLoading(false);
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setAuthChecked(true);
        setIsAuthed(false);
        setLoading(false);
        return;
      }

      const res = await ensureStudentProfile();
      if (res.ok) {
        setIsAuthed(true);
        await Promise.all([loadItems(), loadWishlist()]);
      } else {
        setIsAuthed(false);
        setLoading(false);
      }

      setAuthChecked(true);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isDemoAuthed()) {
        setIsAuthed(true);
        setAuthChecked(true);
        return;
      }

      if (!session?.user) {
        setIsAuthed(false);
        setAuthChecked(true);
        return;
      }
      const res = await ensureStudentProfile();
      if (res.ok) {
        setIsAuthed(true);
        await Promise.all([loadItems(), loadWishlist()]);
      } else {
        setIsAuthed(false);
      }
      setAuthChecked(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const activeTab = useMemo<FeedTab>(() => {
    const raw = sp.get("tab");
    return raw === "hot" ? "hot" : "recommend";
  }, [sp]);

  const topTab = useMemo<HomeTopTab>(() => {
    const top = (sp.get("top") ?? "").toString();
    if (top === "discover") return "discover";
    if (top === "wishlist") return "wishlist";
    // Backward-compat: map old tab=hot to discover.
    if (sp.get("tab") === "hot") return "discover";
    return "recommend";
  }, [sp]);

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
      const matchesKeyword = kw ? item.title.toLowerCase().includes(kw) : true;
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesKeyword && matchesCategory;
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
  }, [items, keyword, selectedCategory, activeTab]);

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-white px-4 py-16">
        <p className="text-center text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <LoginScreen
        onAuthed={async () => {
          setIsAuthed(true);
          setAuthChecked(true);
          await loadItems();
        }}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <header className="sticky top-4 z-30">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button
              type="button"
              onClick={() => router.push("/following")}
              className="chip shrink-0"
            >
              <Heart className="h-4 w-4" />
              关注
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/?top=recommend&tab=recommend${selectedCategory ? `&cat=${encodeURIComponent(selectedCategory)}` : ""}`
                )
              }
              className={[
                "chip shrink-0",
                topTab === "recommend" ? "chip-active" : ""
              ].join(" ")}
            >
              推荐
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/?top=discover&tab=hot${selectedCategory ? `&cat=${encodeURIComponent(selectedCategory)}` : ""}`
                )
              }
              className={[
                "chip shrink-0",
                topTab === "discover" ? "chip-active" : ""
              ].join(" ")}
            >
              发现
            </button>
            <button
              type="button"
              onClick={() => router.push(`/?top=wishlist&tab=recommend${selectedCategory ? `&cat=${encodeURIComponent(selectedCategory)}` : ""}`)}
              className={[
                "chip shrink-0",
                topTab === "wishlist" ? "chip-active" : ""
              ].join(" ")}
            >
              求购
            </button>
          </div>

          <div className="surface flex items-center gap-2 rounded-full px-4 py-3">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索你想要的，比如：手机 / 游戏 / 租房..."
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              aria-label="Search items"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <span className="shrink-0 text-xs font-semibold text-gray-600">校园热搜</span>
            {campusHotTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setKeyword(t.replace(/^#/, ""))}
                className="chip shrink-0"
                aria-label={t}
              >
                {t}
              </button>
            ))}
          </div>

          <nav className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button
              type="button"
              onClick={() => router.push(`/?tab=${activeTab}`)}
              className={[
                "chip shrink-0",
                selectedCategory === null ? "chip-active" : ""
              ].join(" ")}
            >
              全部
            </button>
            {categoryOrder.visible.map((cat) => {
              const isActive = cat === selectedCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    bumpCategoryPref(cat, 2);
                    router.push(`/?tab=${activeTab}&cat=${encodeURIComponent(cat)}`);
                  }}
                  className={[
                    "chip shrink-0",
                    isActive ? "chip-active" : ""
                  ].join(" ")}
                >
                  {cat}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCatsExpanded((v) => !v)}
              className="chip shrink-0 gap-1 px-3"
              aria-label="展开全部分类"
            >
              更多
              <ChevronDown className={catsExpanded ? "h-4 w-4 rotate-180 transition" : "h-4 w-4 transition"} />
            </button>
          </nav>

          {catsExpanded ? (
            <div className="surface p-3">
              <div className="flex flex-wrap gap-2">
                {categoryOrder.allSorted.map((cat) => {
                  const isActive = cat === selectedCategory;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        bumpCategoryPref(cat, 3);
                        router.push(`/?tab=${activeTab}&cat=${encodeURIComponent(cat)}`);
                        setCatsExpanded(false);
                      }}
                      className={[
                        "chip px-3 py-1.5",
                        isActive ? "chip-active" : ""
                      ].join(" ")}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {loading ? <p className="mt-6 text-sm text-gray-500">Loading...</p> : null}
      {errorText ? <p className="mt-4 text-sm text-red-600">{errorText}</p> : null}

      {topTab === "wishlist" ? (
        <section className="mt-6 grid gap-3">
          {wish.length ? (
            wish.map((w) => (
              <article
                key={w.id}
                className="rounded-3xl border border-white/30 bg-white/55 p-5 backdrop-blur-xl shadow-[0_16px_50px_-38px_rgba(0,0,0,0.32)]"
              >
                <p className="text-sm font-bold text-slate-900">{w.requested_item}</p>
                <p className="mt-2 text-xs text-gray-500">预算</p>
                <p className="mt-1 text-lg font-extrabold text-slate-950">￥{Number(w.budget).toFixed(0)}</p>
                <div className="mt-3 text-xs text-gray-500">想出手的同学可以在详情里留言联系</div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-white/30 bg-white/60 p-6 backdrop-blur-xl">
              <p className="text-sm font-semibold text-slate-900">暂无求购信息</p>
              <p className="mt-1 text-xs text-gray-500">去发布一个“求购需求”，让同学们来找你。</p>
              <button
                type="button"
                onClick={() => router.push("/publish")}
                className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
              >
                去发布
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {visibleItems.map((item) => {
            const img = item.images_array?.[0];
            const badge = item.meetup_location.split(" ")[0] || item.meetup_location;
            const liked = isFavorited(item.id);

            return (
              <article
                key={item.id}
                className="mb-4 break-inside-avoid rounded-3xl border border-white/30 bg-white/55 backdrop-blur-xl p-0 shadow-[0_16px_50px_-38px_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5"
              >
                <div
                  className="relative overflow-hidden rounded-3xl bg-gray-100"
                  onClick={() => {
                    bumpItemClick(item.id);
                    bumpCategoryPref(item.category, 1);
                    setFavoritesTick((x) => x + 1);
                    router.push(`/item/${encodeURIComponent(item.id)}`);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <img
                    src={
                      img ||
                      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={item.title}
                    className="aspect-[4/3] h-full w-full rounded-3xl object-cover"
                  />
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const res = toggleFavorite(item.id);
                      setFavoritesTick((x) => x + 1);
                      // small positive signal for preference learning
                      bumpCategoryPref(item.category, res.isFavorited ? 3 : -2);
                    }}
                    whileTap={{ scale: 0.86 }}
                    animate={{ scale: liked ? 1.02 : 1 }}
                    transition={{ type: "spring", stiffness: 600, damping: 30 }}
                    className={[
                      "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur",
                      liked ? "bg-black/80 text-white" : "bg-white/80 text-gray-700"
                    ].join(" ")}
                    aria-label={liked ? "取消关注" : "关注"}
                  >
                    <Heart className={liked ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                  </motion.button>
                </div>

                <div className="px-3 pb-3 pt-3">
                  <h3 className="line-clamp-2 text-sm font-medium text-gray-800">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-lg font-bold text-black">
                    ${Number(item.price).toFixed(2)}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500">
                    {badge}
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!loading && !errorText && topTab !== "wishlist" && visibleItems.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">No items yet. Publish one!</p>
      ) : null}

      <BottomNav />
    </main>
  );
}
