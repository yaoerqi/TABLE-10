"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Flame, Grid2X2, Home, Plus, UserRound } from "lucide-react";
import { setHomeLayoutMode } from "@/lib/clientPrefs";
import { Suspense } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";

const leftTabDefs = [
  { key: "recommend", labelKey: "nav.recommend" as const, href: "/?tab=recommend", Icon: Home },
  { key: "hot", labelKey: "nav.hot" as const, href: "/?tab=hot", Icon: Flame }
] as const;

const rightTabDefs = [
  { key: "layout", labelKey: "nav.layout" as const, Icon: Grid2X2 },
  { key: "profile", labelKey: "nav.profile" as const, href: "/profile", Icon: UserRound }
] as const;

function BottomNavInner() {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const activeTab = sp.get("tab") ?? "recommend";
  const layout = (sp.get("layout") ?? "").toString();

  const isFeed = layout === "feed";

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-40">
      <div className="mx-auto relative grid grid-cols-5 items-center rounded-3xl border border-white/25 bg-white/60 backdrop-blur-xl shadow-[0_24px_70px_-50px_rgba(0,0,0,0.55)]">
        {leftTabDefs.map((tab) => {
          const isActive =
            pathname === "/" && (tab.key === "recommend" ? activeTab === "recommend" : activeTab === "hot");
          const Icon = tab.Icon;
          const label = t(tab.labelKey);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={[
                "flex h-12 w-full items-center justify-center transition",
                isActive ? "text-slate-950" : "text-slate-500 hover:text-slate-700"
              ].join(" ")}
              aria-label={label}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}

        <div className="h-12 shrink-0" aria-hidden />

        {rightTabDefs.map((tab) => {
          const Icon = tab.Icon;
          if (tab.key === "layout") {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  const current = layout === "feed" ? "feed" : "grid";
                  const next = current === "feed" ? "grid" : "feed";
                  setHomeLayoutMode(next);

                  const qp = new URLSearchParams(sp.toString());
                  qp.delete("openCats");
                  if (next === "feed") qp.set("layout", "feed");
                  else qp.delete("layout");
                  router.push(`/?${qp.toString()}`);
                }}
                className={[
                  "flex h-12 w-full items-center justify-center transition",
                  pathname === "/" && isFeed ? "text-slate-950" : "text-slate-500 hover:text-slate-700"
                ].join(" ")}
                aria-label={t("nav.toggleLayout")}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          }

          const isActive = pathname === "/profile" || pathname === "/settings";
          return (
            <Link
              key={tab.key}
              href={tab.href!}
              className={[
                "flex h-12 w-full items-center justify-center transition",
                isActive ? "text-slate-950" : "text-slate-500 hover:text-slate-700"
              ].join(" ")}
              aria-label={t(tab.labelKey)}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center">
          <Link
            href="/publish"
            className="pointer-events-auto flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-slate-950 shadow-[0_24px_70px_-45px_rgba(2,6,23,0.8)] transition hover:bg-slate-900"
            aria-label={t("nav.publish")}
          >
            <Plus className="h-6 w-6 text-white" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  );
}

