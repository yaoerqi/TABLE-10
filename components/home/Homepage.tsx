"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { hasSupabaseEnv, supabase } from "@/lib/supabase/client";
import type { DbItem, DbUser } from "@/lib/supabase/types";

const categoryFilters = ["All", "Textbooks", "Electronics", "Skill Swap"] as const;
type CategoryFilter = (typeof categoryFilters)[number];

export function Homepage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [items, setItems] = useState<DbItem[]>([]);
  const [sellerMap, setSellerMap] = useState<Record<string, DbUser>>({});
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const loadItems = async () => {
    if (!hasSupabaseEnv) {
      setLoading(false);
      setErrorText("未配置 Supabase 环境变量");
      return;
    }
    setLoading(true);
    setErrorText("");
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false });
    if (error) {
      setErrorText(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as DbItem[];
    setItems(rows);
    const sellerIds = [...new Set(rows.map((item) => item.seller_id))];
    if (!sellerIds.length) {
      setSellerMap({});
      setLoading(false);
      return;
    }
    const { data: usersData } = await supabase
      .from("users")
      .select("id,edu_email,nickname,avatar_url,dorm_area")
      .in("id", sellerIds);
    const map: Record<string, DbUser> = {};
    (usersData ?? []).forEach((user) => {
      const row = user as DbUser;
      map[row.id] = row;
    });
    setSellerMap(map);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const matchesKeyword = item.title.toLowerCase().includes(keyword.toLowerCase());
      const categoryUiText =
        item.category === "Books"
          ? "Textbooks"
          : item.category === "Skills"
            ? "Skill Swap"
            : item.category;
      const matchesCategory = category === "All" || categoryUiText === category;
      return matchesKeyword && matchesCategory;
    });
  }, [items, keyword, category]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <AuthPanel onAuthed={loadItems} />
      <header className="sticky top-0 z-20 mb-5 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search textbooks, gadgets, skills..."
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none ring-indigo-200 transition focus:ring-2"
            aria-label="Search items"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryFilter)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none ring-indigo-200 transition focus:ring-2 sm:w-56"
            aria-label="Filter by category"
          >
            {categoryFilters.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading ? <p className="text-sm text-slate-500">加载中...</p> : null}
      {errorText ? <p className="mb-3 text-sm text-red-600">读取失败：{errorText}</p> : null}
      <section className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {visibleItems.map((item) => (
          <article
            key={item.id}
            className="mb-4 break-inside-avoid rounded-2xl border border-slate-200 bg-white p-3 shadow-card"
          >
            <div className="relative mb-3 overflow-hidden rounded-xl">
              <Image
                src={
                  item.images_array?.[0] ||
                  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"
                }
                alt={item.title}
                width={640}
                height={500}
                className="h-auto w-full object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700">
                {item.meetup_location}
              </span>
            </div>

            <h3 className="line-clamp-2 text-sm font-semibold text-slate-800">{item.title}</h3>
            <p className="mt-2 text-lg font-bold text-red-600">CNY {Number(item.price)}</p>

            <div className="mt-3 flex items-center gap-2">
              <Image
                src={sellerMap[item.seller_id]?.avatar_url || "https://i.pravatar.cc/100?img=12"}
                alt="Seller avatar"
                width={28}
                height={28}
                className="rounded-full border border-slate-200"
              />
              <span className="text-xs text-slate-500">
                {sellerMap[item.seller_id]?.nickname || "Verified student seller"}
              </span>
            </div>
          </article>
        ))}
      </section>
      {!loading && !errorText && visibleItems.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">暂无可展示商品，先去发布一条吧。</p>
      ) : null}
    </main>
  );
}
