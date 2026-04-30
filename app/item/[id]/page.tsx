"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, MapPin, Send } from "lucide-react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/navigation/BottomNav";
import { hasSupabaseEnv, supabase } from "@/lib/supabase/client";
import { isDemoAuthed } from "@/lib/demo/demoAuth";
import { bumpItemClick, isFavorited, toggleFavorite } from "@/lib/clientPrefs";
import type { DbItem } from "@/lib/supabase/types";

type Comment = {
  id: string;
  user: string;
  content: string;
  createdAt: string;
};

const demoComments: Comment[] = [
  { id: "c1", user: "小王", content: "还在吗？可以小刀吗？", createdAt: "刚刚" },
  { id: "c2", user: "小李", content: "宿舍楼下自提可以吗？", createdAt: "10 分钟前" }
];

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const itemId = (params?.id ?? "").toString();

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [item, setItem] = useState<DbItem | null>(null);
  const [tick, setTick] = useState(0);
  const [comments, setComments] = useState<Comment[]>(demoComments);
  const [draft, setDraft] = useState("");

  const liked = item ? isFavorited(item.id) : false;

  useEffect(() => {
    bumpItemClick(itemId);
  }, [itemId]);

  useEffect(() => {
    (async () => {
      if (!itemId) {
        setErrorText("缺少 itemId");
        setLoading(false);
        return;
      }
      if (isDemoAuthed()) {
        setErrorText("");
        setLoading(false);
        setItem(null);
        return;
      }
      if (!hasSupabaseEnv) {
        setErrorText("未配置 Supabase 环境变量");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorText("");
      const { data, error } = await supabase
        .from("items")
        .select("id,title,price,category,images_array,meetup_location,seller_id,description,status")
        .eq("id", itemId)
        .maybeSingle();
      if (error) {
        setErrorText(error.message);
        setLoading(false);
        return;
      }
      setItem((data ?? null) as DbItem | null);
      setLoading(false);
    })();
  }, [itemId]);

  const onSend = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setComments((c) => [
      ...c,
      { id: `local-${Date.now()}`, user: "我", content: text, createdAt: "刚刚" }
    ]);
  };

  const img = item?.images_array?.[0];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-6 sm:px-6">
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
          返回首页
        </Link>
      </header>

      {loading ? <p className="mt-6 text-sm text-gray-500">Loading...</p> : null}
      {errorText ? <p className="mt-4 text-sm text-red-600">{errorText}</p> : null}

      <section className="mt-5 overflow-hidden rounded-3xl border border-white/30 bg-white/60 backdrop-blur-xl shadow-[0_16px_60px_-45px_rgba(0,0,0,0.35)]">
        <div className="relative bg-gray-100">
          <img
            src={
              img ||
              "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80"
            }
            alt={item?.title ?? "item"}
            className="aspect-[4/3] w-full object-cover"
          />
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
              aria-label={liked ? "取消收藏" : "收藏"}
            >
              <Heart className={liked ? "h-5 w-5 fill-current" : "h-5 w-5"} />
            </motion.button>
          ) : null}
        </div>

        <div className="p-5">
          <h1 className="text-lg font-bold text-slate-900">{item?.title ?? "演示宝贝（详情页占位）"}</h1>
          <p className="mt-2 text-2xl font-extrabold text-slate-950">
            {item ? `$${Number(item.price).toFixed(2)}` : "$199.00"}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
            <MapPin className="h-4 w-4" />
            {item?.meetup_location ?? "校内自提"}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {item?.description ??
              "这里是宝贝详情页的占位内容。后续可以接入更多字段（成色、交易方式、发布时间等）。"}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-white/30 bg-white/60 p-5 backdrop-blur-xl shadow-[0_16px_60px_-45px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">留言问答</h2>
          <span className="text-xs text-gray-500">{comments.length} 条</span>
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
            placeholder="问问更多细节：比如成色、可否小刀、能否自提..."
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

      <BottomNav />
    </main>
  );
}

