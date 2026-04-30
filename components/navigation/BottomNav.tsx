"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Flame, Grid2X2, Heart, Home, Plus, UserRound } from "lucide-react";

const tabs = [
  { key: "recommend", label: "推荐", href: "/?tab=recommend", Icon: Home },
  { key: "hot", label: "热点", href: "/?tab=hot", Icon: Flame },
  { key: "following", label: "关注", href: "/following", Icon: Heart },
  { key: "categories", label: "分类", href: "/?tab=recommend&openCats=1", Icon: Grid2X2 },
  { key: "profile", label: "我的", href: "/profile", Icon: UserRound }
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const activeTab = sp.get("tab") ?? "recommend";
  const openCats = sp.get("openCats") ?? "0";

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-40">
      <div className="mx-auto relative grid grid-cols-6 items-center rounded-3xl border border-white/25 bg-white/60 backdrop-blur-xl shadow-[0_24px_70px_-50px_rgba(0,0,0,0.55)]">
        {tabs.map((t) => {
          const isActive =
            (t.key === "following" && pathname === "/following") ||
            (t.key === "profile" && pathname === "/profile") ||
            (t.key === "profile" && pathname === "/settings") ||
            (pathname === "/" &&
              t.key !== "following" &&
              t.key !== "profile" &&
              (t.key === "categories" ? openCats === "1" : t.key === activeTab));
          const Icon = t.Icon;

          return (
            <Link
              key={t.key}
              href={t.href}
              className={[
                "flex h-12 w-full items-center justify-center transition",
                isActive ? "text-slate-950" : "text-slate-500 hover:text-slate-700"
              ].join(" ")}
              aria-label={t.label}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center">
          <Link
            href="/publish"
            className="pointer-events-auto flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-slate-950 shadow-[0_24px_70px_-45px_rgba(2,6,23,0.8)] transition hover:bg-slate-900"
            aria-label="Publish"
          >
            <Plus className="h-6 w-6 text-white" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

