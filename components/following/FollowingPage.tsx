"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { supabase, hasSupabaseEnv } from "@/lib/supabase/client";
import type { DbItem } from "@/lib/supabase/types";
import { getFavorites, toggleFavorite } from "@/lib/clientPrefs";
import { useLocale } from "@/components/providers/LocaleProvider";

export function FollowingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<DbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const load = async () => {
    const favs = getFavorites();
    setFavoriteIds(favs);

    if (!hasSupabaseEnv) {
      setLoading(false);
      setErrorText(t("common.supabaseNotConfigured"));
      return;
    }

    if (favs.length === 0) {
      setItems([]);
      setLoading(false);
      setErrorText("");
      return;
    }

    setLoading(true);
    setErrorText("");
    const { data, error } = await supabase
      .from("items")
      .select("id,title,price,category,images_array,meetup_location,seller_id")
      .in("id", favs);
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
      await load();
    })();

    return;
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const visible = useMemo(() => items.filter((it) => favoriteSet.has(it.id)), [items, favoriteSet]);

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
          await load();
        }}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <header className="sticky top-4 z-30 rounded-3xl">
        <div className="flex items-center justify-between rounded-full bg-white/80 px-4 py-3 backdrop-blur-md shadow-[0_10px_30px_-20px_rgba(0,0,0,0.15)]">
          <h1 className="text-sm font-semibold text-gray-900">{t("following.title")}</h1>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {t("following.backRecommend")}
          </button>
        </div>
      </header>

      {loading ? <p className="mt-6 text-sm text-gray-500">{t("common.loading")}</p> : null}
      {errorText ? <p className="mt-4 text-sm text-red-600">{errorText}</p> : null}

      {!loading && !errorText && visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">{t("following.empty")}</p>
      ) : null}

      <section className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {visible.map((item) => {
          const img = item.images_array?.[0];
          const badge = item.meetup_location.split(" ")[0] || item.meetup_location;
          const liked = favoriteSet.has(item.id);

          return (
            <article key={item.id} className="mb-4 break-inside-avoid rounded-2xl bg-white/80 backdrop-blur-sm p-0">
              <div className="relative rounded-2xl overflow-hidden bg-gray-100">
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
                  onClick={() => {
                    const res = toggleFavorite(item.id);
                    setFavoriteIds(res.next);
                  }}
                  className={[
                    "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur",
                    liked ? "bg-black/80 text-white" : "bg-white/80 text-gray-700"
                  ].join(" ")}
                  aria-label={liked ? t("following.unfollow") : t("following.follow")}
                >
                  <Heart className={liked ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                </button>
              </div>

              <div className="px-3 pb-3 pt-3">
                <h3 className="line-clamp-2 text-sm font-medium text-gray-800">{item.title}</h3>
                <p className="mt-2 text-lg font-bold text-black">${Number(item.price).toFixed(2)}</p>
                <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500">
                  {badge}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}

