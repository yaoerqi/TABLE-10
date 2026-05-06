"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import { AUCTION_POLL_MS, MAX_AUCTION_BREACH } from "@/lib/auction";
import {
  getSeedAuctionBids,
  getSeedAuctionItem,
  isSeedAuctionItemId
} from "@/lib/mock/auctionSeed";
import { firstItemImageUrl } from "@/lib/itemImages";
import type { DbItem } from "@/lib/supabase/types";

type BidRow = {
  id: string;
  amount: number;
  created_at: string;
  bidder_id: string;
  nickname: string;
  avatar_url: string | null;
};

type AuctionPayload = {
  ok: boolean;
  item?: DbItem;
  minNextBid?: number;
  breachCount?: number;
  maxBreach?: number;
  ended?: boolean;
  bids?: BidRow[];
  meId?: string | null;
  error?: string;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "已结束";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}天 ${h}小时 ${m}分`;
  if (h > 0) return `${h}小时 ${m}分 ${sec}秒`;
  if (m > 0) return `${m}分 ${sec}秒`;
  return `${sec}秒`;
}

function AuctionCountdown({ endIso }: { endIso: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const msLeft = useMemo(() => {
    if (!endIso) return 0;
    const t = Date.parse(endIso);
    if (!Number.isFinite(t)) return 0;
    return t - now;
  }, [endIso, now]);

  const ended = msLeft <= 0;

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold",
        ended ? "border-slate-200 bg-slate-100 text-slate-600" : "border-indigo-200 bg-indigo-50 text-indigo-900"
      ].join(" ")}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>{ended ? "拍卖已结束" : `剩余 ${formatRemaining(msLeft)}`}</span>
    </div>
  );
}

export default function AuctionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const itemId = (params?.id ?? "").toString();

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [item, setItem] = useState<DbItem | null>(null);
  const [minNext, setMinNext] = useState(0);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [ended, setEnded] = useState(false);
  const [breachCount, setBreachCount] = useState(0);
  const [maxBreach, setMaxBreach] = useState(MAX_AUCTION_BREACH);
  const [meId, setMeId] = useState<string | null>(null);
  const [bidDraft, setBidDraft] = useState("");
  const [bidBusy, setBidBusy] = useState(false);
  const [bidHint, setBidHint] = useState("");
  const [isSeed, setIsSeed] = useState(false);

  const loadSeed = useCallback(() => {
    const row = getSeedAuctionItem();
    setItem(row);
    setMinNext(
      row.auction_current_price != null
        ? Number(row.auction_current_price) + Number(row.auction_step ?? 1)
        : Number(row.auction_start_price ?? row.price)
    );
    setBids(getSeedAuctionBids());
    const end = row.auction_end_at ? Date.parse(String(row.auction_end_at)) : 0;
    setEnded(!Number.isFinite(end) || end <= Date.now());
    setIsSeed(true);
    setLoading(false);
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (me?.ok && me?.user?.id) setMeId(String(me.user.id));
        const b = Number(me?.user?.auction_breach_count);
        if (Number.isFinite(b)) setBreachCount(b);
      })
      .catch(() => {});
  }, []);

  const refreshAuction = useCallback(async () => {
    if (!itemId || isSeedAuctionItemId(itemId)) return;
    const resp = await fetch(`/api/items/${encodeURIComponent(itemId)}/auction`, {
      cache: "no-store"
    });
    const json = (await resp.json().catch(() => ({}))) as AuctionPayload;
    if (!resp.ok || !json.ok || !json.item) {
      setErrorText(json.error ?? "加载失败");
      return;
    }
    const it = json.item as DbItem;
    setItem(it);
    setMinNext(Number(json.minNextBid ?? 0));
    setBids(Array.isArray(json.bids) ? json.bids : []);
    setEnded(Boolean(json.ended));
    setBreachCount(Number(json.breachCount ?? 0));
    setMaxBreach(Number(json.maxBreach ?? MAX_AUCTION_BREACH));
    setMeId(json.meId ?? null);
    setBidDraft(
      String(Number(json.minNextBid ?? 0) || "").length
        ? Number(json.minNextBid).toFixed(2)
        : ""
    );
    setErrorText("");
  }, [itemId]);

  useEffect(() => {
    if (!itemId) {
      setErrorText("缺少商品 ID");
      setLoading(false);
      return;
    }
    if (isSeedAuctionItemId(itemId)) {
      loadSeed();
      return;
    }
    if (!hasSupabaseEnv) {
      setErrorText("未配置 Supabase 环境变量");
      setLoading(false);
      return;
    }
    setLoading(true);
    void refreshAuction().finally(() => setLoading(false));
  }, [itemId, loadSeed, refreshAuction]);

  useEffect(() => {
    if (!itemId || isSeedAuctionItemId(itemId)) return;
    const id = window.setInterval(() => {
      void refreshAuction();
    }, AUCTION_POLL_MS);
    return () => window.clearInterval(id);
  }, [itemId, refreshAuction]);

  const reputationBlocked = breachCount >= maxBreach;
  const isSeller = item && meId && item.seller_id === meId;
  const canBid =
    !isSeed &&
    item &&
    !ended &&
    !reputationBlocked &&
    !isSeller &&
    item.status === "available";

  const onBid = async () => {
    setBidHint("");
    if (isSeed) {
      setBidHint("演示商品无法真实出价，请发布真实拍卖商品体验。");
      return;
    }
    const n = Number(bidDraft.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setBidHint("请输入有效金额");
      return;
    }
    setBidBusy(true);
    const resp = await fetch(`/api/items/${encodeURIComponent(itemId)}/bid`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: n })
    });
    const json = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      min?: number;
    };
    setBidBusy(false);
    if (!resp.ok || !json.ok) {
      setBidHint(json.error ?? "出价失败");
      if (json.min != null) setBidDraft(Number(json.min).toFixed(2));
      return;
    }
    setBidHint("出价成功！");
    await refreshAuction();
  };

  const heroFallback =
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80";
  const rawHero = item ? firstItemImageUrl(item.images_array) : "";
  const heroImgSrc =
    !item
      ? heroFallback
      : item.id.startsWith("seed-") || isSeed
        ? rawHero || heroFallback
        : rawHero
          ? `/api/items/${encodeURIComponent(itemId)}/card-image`
          : heroFallback;

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-40 pt-6 sm:px-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-slate-900 shadow-sm hover:bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link href="/?top=auction&tab=recommend" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
          拍卖大厅
        </Link>
      </header>

      {loading ? <p className="mt-6 text-sm text-gray-500">加载中…</p> : null}
      {errorText ? <p className="mt-4 text-sm text-red-600">{errorText}</p> : null}

      {item ? (
        <>
          <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <img src={heroImgSrc} alt="" className="aspect-[4/3] w-full object-cover" />
            <div className="space-y-4 p-5">
              <h1 className="text-lg font-bold text-slate-900">{item.title}</h1>

              <AuctionCountdown endIso={item.auction_end_at ? String(item.auction_end_at) : null} />

              <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">起拍价</span>
                  <span className="font-bold tabular-nums text-slate-900">
                    ￥{Number(item.auction_start_price ?? item.price).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">当前价</span>
                  <span className="font-extrabold tabular-nums text-indigo-700">
                    {item.auction_current_price != null
                      ? `￥${Number(item.auction_current_price).toFixed(2)}`
                      : "尚无出价"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">加价幅度</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    ￥{Number(item.auction_step ?? 1).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-200 pt-3">
                  <span className="text-slate-500">下次出价至少</span>
                  <span className="font-bold tabular-nums text-emerald-700">￥{minNext.toFixed(2)}</span>
                </div>
              </div>

              {reputationBlocked ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  你的历史拍卖违约次数过多（{breachCount}/{maxBreach}），暂时无法出价。如有疑问请联系客服申诉。
                </p>
              ) : null}
              {isSeller ? (
                <p className="text-xs text-slate-500">你是卖家，无需对自己的拍卖出价。</p>
              ) : null}

              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={bidDraft}
                  onChange={(e) => setBidDraft(e.target.value)}
                  disabled={!canBid || bidBusy}
                  placeholder={`最低 ￥${minNext.toFixed(2)}`}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold tabular-nums outline-none ring-indigo-200 focus:ring-2 disabled:bg-slate-100"
                />
                <button
                  type="button"
                  disabled={!canBid || bidBusy || ended}
                  onClick={() => void onBid()}
                  className="h-12 shrink-0 rounded-xl bg-black px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {ended ? "已结束" : bidBusy ? "提交中…" : "出价"}
                </button>
              </div>
              {bidHint ? <p className="text-xs text-slate-600">{bidHint}</p> : null}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">出价记录</h2>
            <p className="mt-1 text-[11px] text-slate-500">页面每 {AUCTION_POLL_MS / 1000}s 自动刷新当前价与列表（演示种子除外）。</p>
            <ul className="mt-4 space-y-3">
              {bids.length === 0 ? (
                <li className="text-sm text-slate-500">暂无出价</li>
              ) : (
                bids.map((b) => (
                  <li
                    key={b.id}
                    className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                  >
                    <img
                      src={b.avatar_url ?? `https://i.pravatar.cc/96?u=${encodeURIComponent(b.bidder_id)}`}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{b.nickname}</span>
                        <span className="text-sm font-extrabold tabular-nums text-indigo-700">
                          ￥{Number(b.amount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {new Date(b.created_at).toLocaleString("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </>
      ) : null}

      <BottomNav />
    </main>
  );
}
