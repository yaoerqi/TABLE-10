"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { useLocale } from "@/components/providers/LocaleProvider";
import { readStoredLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { hasSupabaseEnv, supabase } from "@/lib/supabase/client";
import type { DbItem } from "@/lib/supabase/types";
import { firstItemImageUrl } from "@/lib/itemImages";

type ProfileTab = "published" | "sold" | "bought";

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLocale();
  const [tab, setTab] = useState<ProfileTab>("published");
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [credit, setCredit] = useState(680);
  const [items, setItems] = useState<DbItem[]>([]);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");

  const creditLevel = useMemo(() => {
    if (credit >= 760) return t("profile.creditExcellent");
    if (credit >= 700) return t("profile.creditGood");
    if (credit >= 650) return t("profile.creditFair");
    return t("profile.creditNeedsWork");
  }, [credit, t]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorText("");

      if (!hasSupabaseEnv) {
        setErrorText(translate(readStoredLocale(), "profile.supabaseNotConfigured"));
        setLoading(false);
        return;
      }

      const meResp = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      const userId = meResp?.ok && meResp?.user?.id ? String(meResp.user.id) : null;
      if (!userId) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("nickname,avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.nickname) setNickname(profile.nickname);
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);

      const { data: myItems, error } = await supabase
        .from("items")
        .select("id,title,price,category,images_array,meetup_location,seller_id,status")
        .eq("seller_id", userId)
        .eq("status", "available")
        .order("created_at", { ascending: false });
      if (error) {
        setErrorText(error.message);
      } else {
        setItems((myItems ?? []) as DbItem[]);
      }

      setLoading(false);
    })();
  }, [router]);

  const withdrawListing = async (itemId: string) => {
    if (!confirm(t("profile.withdrawConfirm"))) return;
    setWithdrawingId(itemId);
    setErrorText("");
    try {
      const resp = await fetch(`/api/items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "inactive" })
      });
      const json = (await resp.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!resp.ok || !json.ok) {
        setErrorText(json.error ? String(json.error) : t("profile.withdrawFailed"));
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== itemId));
    } finally {
      setWithdrawingId(null);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
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
        <h1 className="text-lg font-bold text-slate-900">{t("profile.title")}</h1>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-semibold text-slate-800 backdrop-blur hover:bg-white"
        >
          <Settings className="h-4 w-4" />
          {t("profile.settings")}
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
            <p className="truncate text-base font-bold text-slate-900">
              {nickname || t("profile.defaultNickname")}
            </p>
            <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
              <ShieldCheck className="h-4 w-4" />
              {t("profile.creditLine", { credit, level: creditLevel })}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-900"
          >
            <LogOut className="h-4 w-4" />
            {t("profile.logout")}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-emerald-200/70 bg-emerald-50/70 p-4 backdrop-blur-sm">
        <Link
          href="/campus"
          className="flex items-center justify-between gap-2 text-sm font-semibold text-emerald-950 hover:text-emerald-900"
        >
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {t("profile.campusGuide")}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
        </Link>
      </section>

      <section className="mt-5">
        <div className="inline-flex w-full rounded-full bg-gray-100 p-1">
          <button type="button" onClick={() => setTab("published")} className={tabClass(tab === "published")}>
            {t("profile.tabPublished")}
          </button>
          <button type="button" onClick={() => setTab("sold")} className={tabClass(tab === "sold")}>
            {t("profile.tabSold")}
          </button>
          <button type="button" onClick={() => setTab("bought")} className={tabClass(tab === "bought")}>
            {t("profile.tabBought")}
          </button>
        </div>

        <div className="mt-4">
          {loading ? <p className="text-sm text-gray-500">{t("profile.loading")}</p> : null}
          {errorText ? <p className="text-sm text-red-600">{errorText}</p> : null}

          {tab !== "published" ? (
            <div className="rounded-3xl border border-white/30 bg-white/60 p-5 backdrop-blur-xl">
              <p className="text-sm font-semibold text-slate-900">{t("profile.featureWIP")}</p>
              <p className="mt-1 text-xs text-gray-500">{t("profile.featureWIPDesc")}</p>
            </div>
          ) : items.length ? (
            <div className="grid gap-3">
              {items.slice(0, 10).map((it) => {
                const hasImg = Boolean(firstItemImageUrl(it.images_array));
                const thumbSrc = hasImg
                  ? `/api/items/${encodeURIComponent(it.id)}/card-image`
                  : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80";
                return (
                  <div
                    key={it.id}
                    className="flex items-stretch gap-2 rounded-3xl border border-white/30 bg-white/60 p-2 pl-3 backdrop-blur-xl"
                  >
                    <Link
                      href={`/item/${encodeURIComponent(it.id)}`}
                      className="flex min-w-0 flex-1 items-center gap-3 py-1 transition hover:opacity-90"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                        <img src={thumbSrc} alt={it.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{it.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {it.category} · {it.meetup_location}
                        </p>
                      </div>
                      <div className="shrink-0 self-center pr-1 text-right">
                        <p className="text-sm font-bold text-slate-900">${Number(it.price).toFixed(2)}</p>
                        <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void withdrawListing(it.id)}
                      disabled={withdrawingId === it.id}
                      className="shrink-0 self-center rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      {withdrawingId === it.id ? t("profile.processing") : t("profile.withdraw")}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/30 bg-white/60 p-5 backdrop-blur-xl">
              <p className="text-sm font-semibold text-slate-900">{t("profile.emptyPublished")}</p>
              <p className="mt-1 text-xs text-gray-500">{t("profile.emptyPublishedDesc")}</p>
              <Link
                href="/publish"
                className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
              >
                {t("profile.publishNow")}
              </Link>
            </div>
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

