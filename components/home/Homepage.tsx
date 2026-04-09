"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { supabase, hasSupabaseEnv } from "@/lib/supabase/client";
import { ensureStudentProfile } from "@/lib/supabase/studentAuth";
import type { DbItem } from "@/lib/supabase/types";
import { isDemoAuthed } from "@/lib/demo/demoAuth";
import { mockItems } from "@/lib/mock/items";

const uiCategories = ["All", "Textbooks", "Tech", "Dorm", "Skill Swap"] as const;
type UiCategory = (typeof uiCategories)[number];

export function Homepage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<DbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const loadItems = async () => {
    if (isDemoAuthed()) {
      const demoSellerId = "demo-seller";
      const demoItems: DbItem[] = mockItems.map((m) => {
        const dbCategory =
          m.category === "Textbooks"
            ? "Books"
            : m.category === "Electronics"
              ? "Electronics"
              : "Skills";
        return {
          id: `demo-${m.id}`,
          seller_id: demoSellerId,
          title: m.title,
          description: "",
          price: m.price,
          category: dbCategory,
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

  const selectedCategory = useMemo<UiCategory>(() => {
    const raw = sp.get("cat");
    if (!raw) return "All";
    if (uiCategories.includes(raw as UiCategory)) return raw as UiCategory;
    return "All";
  }, [sp]);

  const categoryDbToUi = (dbCategory: DbItem["category"]): UiCategory => {
    if (dbCategory === "Books") return "Textbooks";
    if (dbCategory === "Electronics") return "Tech";
    if (dbCategory === "Dorms") return "Dorm";
    if (dbCategory === "Skills") return "Skill Swap";
    return "All";
  };

  const visibleItems = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const matchesKeyword = kw ? item.title.toLowerCase().includes(kw) : true;
      const matchesCategory =
        selectedCategory === "All" || categoryDbToUi(item.category) === selectedCategory;
      return matchesKeyword && matchesCategory;
    });
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
          <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-3 backdrop-blur-md shadow-[0_10px_30px_-20px_rgba(0,0,0,0.15)]">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search textbooks, tech, dorm..."
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              aria-label="Search items"
            />
          </div>

          <nav className="flex gap-2 overflow-x-auto hide-scrollbar">
            {uiCategories.map((cat) => {
              const isActive = cat === selectedCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => router.push(`/?cat=${encodeURIComponent(cat)}`)}
                  className={[
                    "shrink-0 rounded-full px-4 py-2 text-sm transition",
                    isActive
                      ? "bg-black text-white"
                      : "text-gray-500 hover:text-gray-700"
                  ].join(" ")}
                >
                  {cat}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {loading ? <p className="mt-6 text-sm text-gray-500">Loading...</p> : null}
      {errorText ? <p className="mt-4 text-sm text-red-600">{errorText}</p> : null}

      <section className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {visibleItems.map((item) => {
          const img = item.images_array?.[0];
          const badge = item.meetup_location.split(" ")[0] || item.meetup_location;

          return (
            <article key={item.id} className="mb-4 break-inside-avoid rounded-2xl bg-white/80 backdrop-blur-sm p-0">
              <div className="rounded-2xl overflow-hidden bg-gray-100">
                {/* Approx: product image dominates card */}
                <img
                  src={
                    img ||
                    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={item.title}
                  className="h-full w-full aspect-[4/3] object-cover rounded-2xl"
                />
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
