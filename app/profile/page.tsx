"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { hasSupabaseEnv, supabase } from "@/lib/supabase/client";
import { ensureStudentProfile } from "@/lib/supabase/studentAuth";
import { isDemoAuthed } from "@/lib/demo/demoAuth";
import type { DbItem } from "@/lib/supabase/types";

type ProfileTab = "published" | "sold" | "bought";

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("published");
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("同学");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [credit, setCredit] = useState(680);
  const [items, setItems] = useState<DbItem[]>([]);
  const [errorText, setErrorText] = useState("");

  const creditLevel = useMemo(() => {
    if (credit >= 760) return "极好";
    if (credit >= 700) return "良好";
    if (credit >= 650) return "一般";
    return "待提升";
  }, [credit]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorText("");

      if (isDemoAuthed()) {
        setNickname("演示用户");
        setAvatarUrl(null);
        setCredit(720);
        setItems([]);
        setLoading(false);
        return;
      }

      if (!hasSupabaseEnv) {
        setErrorText("未配置 Supabase 环境变量");
        setLoading(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const res = await ensureStudentProfile();
      if (!res.ok) {
        router.push("/");
        return;
      }

      const { data: me } = await supabase
        .from("users")
        .select("nickname,avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (me?.nickname) setNickname(me.nickname);
      if (me?.avatar_url) setAvatarUrl(me.avatar_url);

      const { data: myItems, error } = await supabase
        .from("items")
        .select("id,title,price,category,images_array,meetup_location,seller_id,status")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setErrorText(error.message);
      } else {
        setItems((myItems ?? []) as DbItem[]);
      }

      setLoading(false);
    })();
  }, [router]);

  const logout = async () => {
    try {
      if (isDemoAuthed()) {
        window.localStorage.removeItem("campus_demo_authed");
        router.push("/");
        return;
      }
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  const tabClass = (active: boolean) =>
    [
      "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition",
      active ? "bg-black text-white" : "bg-white/70 text-gray-700 hover:bg-white"
    ].join(" ");

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-6 sm:px-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">个人中心</h1>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-semibold text-slate-800 backdrop-blur hover:bg-white"
        >
          <Settings className="h-4 w-4" />
          设置
        </Link>
      </header>

      <section className="mt-4 rounded-3xl border border-white/30 bg-white/60 p-5 backdrop-blur-xl shadow-[0_16px_60px_-45px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 overflow-hidden rounded-2xl bg-gray-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-500">
                <UserRound className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-slate-900">{nickname}</p>
            <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
              <ShieldCheck className="h-4 w-4" />
              信用分 {credit} · {creditLevel}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-900"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>
      </section>

      <section className="mt-5">
        <div className="inline-flex w-full rounded-full bg-gray-100 p-1">
          <button type="button" onClick={() => setTab("published")} className={tabClass(tab === "published")}>
            我发布的
          </button>
          <button type="button" onClick={() => setTab("sold")} className={tabClass(tab === "sold")}>
            我卖出的
          </button>
          <button type="button" onClick={() => setTab("bought")} className={tabClass(tab === "bought")}>
            我买到的
          </button>
        </div>

        <div className="mt-4">
          {loading ? <p className="text-sm text-gray-500">Loading...</p> : null}
          {errorText ? <p className="text-sm text-red-600">{errorText}</p> : null}

          {tab !== "published" ? (
            <div className="rounded-3xl border border-white/30 bg-white/60 p-5 backdrop-blur-xl">
              <p className="text-sm font-semibold text-slate-900">功能建设中</p>
              <p className="mt-1 text-xs text-gray-500">后续可接入订单/成交记录，这里先预留结构。</p>
            </div>
          ) : items.length ? (
            <div className="grid gap-3">
              {items.slice(0, 10).map((it) => {
                const img = it.images_array?.[0];
                return (
                  <Link
                    key={it.id}
                    href={`/item/${encodeURIComponent(it.id)}`}
                    className="flex items-center gap-3 rounded-3xl border border-white/30 bg-white/60 p-3 backdrop-blur-xl transition hover:bg-white"
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-2xl bg-gray-100">
                      <img
                        src={
                          img ||
                          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80"
                        }
                        alt={it.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{it.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {it.category} · {it.meetup_location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">${Number(it.price).toFixed(2)}</p>
                      <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/30 bg-white/60 p-5 backdrop-blur-xl">
              <p className="text-sm font-semibold text-slate-900">还没有发布记录</p>
              <p className="mt-1 text-xs text-gray-500">去发布一个宝贝，开始你的校园闲置之旅。</p>
              <Link
                href="/publish"
                className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
              >
                一键发布
              </Link>
            </div>
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

