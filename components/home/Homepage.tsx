"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Heart, Search } from "lucide-react";
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

export function Homepage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<DbItem[]>([]);
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
        await loadItems();
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
        await loadItems();
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

  const selectedCategory = useMemo<UiCategory | null>(() => {
    const raw = sp.get("cat");
    if (!raw) return null;
    if (isCategory(raw)) return raw;
    return null;
  }, [sp]);

  useEffect(() => {
    if (sp.get("openCats") === "1") setCatsExpanded(true);
  }, [sp]);

  const categoryOrder = useMemo(() => {
    const prefs = getCategoryPrefs();
    const base = Array.from(DEFAULT_VISIBLE_CATEGORIES);
    const sorted = [...ALL_CATEGORIES].sort((a, b) => (prefs[b] ?? 0) - (prefs[a] ?? 0));
    const rest = sorted.filter((c) => !base.includes(c));
    return { visible: base, allSorted: [...base, ...rest] };
  }, [favoritesTick]);

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
  }, [items, keyword, selectedCategory]);

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
      <header className="sticky top-4 z-30 rounded-3xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button
              type="button"
              onClick={() => router.push("/following")}
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.15)] backdrop-blur-md"
            >
              <Heart className="h-4 w-4" />
              关注
            </button>
            <button
              type="button"
              onClick={() => router.push(`/?tab=recommend${selectedCategory ? `&cat=${encodeURIComponent(selectedCategory)}` : ""}`)}
              className={[
                "shrink-0 rounded-full px-4 py-2 text-sm transition",
                activeTab === "recommend" ? "bg-black text-white" : "bg-white/70 text-gray-600 hover:text-gray-800"
              ].join(" ")}
            >
              推荐
            </button>
            <button
              type="button"
              onClick={() => router.push(`/?tab=hot${selectedCategory ? `&cat=${encodeURIComponent(selectedCategory)}` : ""}`)}
              className={[
                "shrink-0 rounded-full px-4 py-2 text-sm transition",
                activeTab === "hot" ? "bg-black text-white" : "bg-white/70 text-gray-600 hover:text-gray-800"
              ].join(" ")}
            >
              热点
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-3 backdrop-blur-md shadow-[0_10px_30px_-20px_rgba(0,0,0,0.15)]">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索你想要的，比如：手机 / 游戏 / 租房..."
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              aria-label="Search items"
            />
          </div>

          <nav className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button
              type="button"
              onClick={() => router.push(`/?tab=${activeTab}`)}
              className={[
                "shrink-0 rounded-full px-4 py-2 text-sm transition",
                selectedCategory === null ? "bg-black text-white" : "text-gray-500 hover:text-gray-700"
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
                    "shrink-0 rounded-full px-4 py-2 text-sm transition",
                    isActive ? "bg-black text-white" : "text-gray-500 hover:text-gray-700"
                  ].join(" ")}
                >
                  {cat}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCatsExpanded((v) => !v)}
              className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              aria-label="展开全部分类"
            >
              更多
              <ChevronDown className={catsExpanded ? "h-4 w-4 rotate-180 transition" : "h-4 w-4 transition"} />
            </button>
          </nav>

          {catsExpanded ? (
            <div className="rounded-3xl bg-white/70 backdrop-blur-md p-3 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.15)]">
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
                        "rounded-full px-3 py-1.5 text-sm transition",
                        isActive ? "bg-black text-white" : "bg-white text-gray-600 hover:text-gray-800"
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

      <section className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {visibleItems.map((item) => {
          const img = item.images_array?.[0];
          const badge = item.meetup_location.split(" ")[0] || item.meetup_location;
          const liked = isFavorited(item.id);

          return (
            <article key={item.id} className="mb-4 break-inside-avoid rounded-2xl bg-white/80 backdrop-blur-sm p-0">
              <div
                className="relative rounded-2xl overflow-hidden bg-gray-100"
                onClick={() => {
                  bumpItemClick(item.id);
                  bumpCategoryPref(item.category, 1);
                  setFavoritesTick((x) => x + 1);
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
                  className="h-full w-full aspect-[4/3] object-cover rounded-2xl"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const res = toggleFavorite(item.id);
                    setFavoritesTick((x) => x + 1);
                    // small positive signal for preference learning
                    bumpCategoryPref(item.category, res.isFavorited ? 3 : -2);
                  }}
                  className={[
                    "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur",
                    liked ? "bg-black/80 text-white" : "bg-white/80 text-gray-700"
                  ].join(" ")}
                  aria-label={liked ? "取消关注" : "关注"}
                >
                  <Heart className={liked ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                </button>
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

      {!loading && !errorText && visibleItems.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">No items yet. Publish one!</p>
      ) : null}

      <BottomNav />
    </main>
  );
}
