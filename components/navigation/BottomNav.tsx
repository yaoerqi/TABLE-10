"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, BookOpen, Cpu, HandHeart, Home, Plus } from "lucide-react";

const tabs = [
  { key: "All", label: "All", href: "/?cat=All", Icon: Home },
  { key: "Textbooks", label: "Textbooks", href: "/?cat=Textbooks", Icon: BookOpen },
  { key: "Tech", label: "Tech", href: "/?cat=Tech", Icon: Cpu },
  { key: "Dorm", label: "Dorm", href: "/?cat=Dorm", Icon: Building2 },
  { key: "Skill Swap", label: "Skill Swap", href: "/?cat=Skill Swap", Icon: HandHeart }
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const cat = sp.get("cat") ?? "All";

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-40">
      <div className="mx-auto relative grid grid-cols-5 items-center rounded-3xl border border-white/20 bg-white/70 backdrop-blur-lg shadow-xl">
        {tabs.map((tab) => {
          const isActive = pathname === "/" && tab.key === cat;
          const Icon = tab.Icon;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={[
                "flex h-12 w-full items-center justify-center transition",
                isActive ? "text-black" : "text-gray-500"
              ].join(" ")}
              aria-label={tab.label}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center">
          <Link
            href="/publish"
            className="pointer-events-auto flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-black shadow-lg transition hover:bg-gray-900"
            aria-label="Publish"
          >
            <Plus className="h-6 w-6 text-white" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

