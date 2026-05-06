"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import {
  getMockWishDetail,
  wishRowToDetail,
  type WishForumDetail,
  type WishForumReply
} from "@/lib/mock/wishlistForum";

export default function WishDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawId = (params?.id ?? "").toString();
  const id = decodeURIComponent(rawId);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [detail, setDetail] = useState<WishForumDetail | null>(null);

  useEffect(() => {
    if (!id) {
      setErrorText("缺少帖子 ID");
      setLoading(false);
      return;
    }

    if (id.startsWith("seed-wish-")) {
      const d = getMockWishDetail(id);
      if (!d) {
        setErrorText("帖子不存在");
        setLoading(false);
        return;
      }
      setDetail(d);
      setErrorText("");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setErrorText("");
      const resp = await fetch(`/api/wishlist/${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = (await resp.json().catch(() => ({}))) as {
        ok?: boolean;
        wish?: {
          id: string;
          buyer_id: string;
          requested_item: string;
          budget: number;
          created_at?: string | null;
        };
      };
      if (!resp.ok || !json.ok || !json.wish) {
        setErrorText(json && typeof json === "object" && "error" in json ? String((json as any).error) : "加载失败");
        setDetail(null);
        setLoading(false);
        return;
      }
      setDetail(wishRowToDetail(json.wish));
      setLoading(false);
    })();
  }, [id]);

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
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">求购帖</p>
          <Link href="/?top=wishlist" className="text-xs text-slate-500 hover:text-slate-800">
            返回求购列表
          </Link>
        </div>
      </header>

      {loading ? <p className="mt-6 text-sm text-slate-500">加载中…</p> : null}
      {errorText && !loading ? <p className="mt-4 text-sm text-red-600">{errorText}</p> : null}

      {detail ? (
        <>
          <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div className="flex gap-3">
                <img
                  src={detail.avatarUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                      楼主
                    </span>
                    <span className="font-semibold text-slate-900">{detail.nickname}</span>
                    <span className="text-xs text-slate-400">{detail.timeLabel}</span>
                  </div>
                  <h1 className="mt-2 text-lg font-bold leading-snug text-slate-900">{detail.title}</h1>
                </div>
              </div>
            </div>
            <div className="px-4 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{detail.body}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-lg font-extrabold text-indigo-700">
                预算 ￥{Number(detail.budget).toFixed(0)}
              </p>
            </div>
          </article>

          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-900">
                留言
                <span className="ml-2 text-sm font-normal text-slate-400">
                  （{detail.replies.length} 条）
                </span>
              </h2>
            </div>
            <div className="space-y-3">
              {detail.replies.map((r: WishForumReply) => (
                <div
                  key={r.id}
                  className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                >
                  <img
                    src={r.avatarUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900">{r.nickname}</span>
                      <span className="text-[11px] text-slate-400">{r.timeLabel}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <BottomNav />
    </main>
  );
}
