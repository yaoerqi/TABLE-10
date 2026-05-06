"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Shield, X } from "lucide-react";
import { campusTradeReminderBullets } from "@/lib/campus";
import { isCampusSafetyStripHidden, setCampusSafetyStripHidden } from "@/lib/clientPrefs";

export function CampusSafetyBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isCampusSafetyStripHidden());
  }, []);

  if (dismissed) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-white to-amber-50/80 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-bold leading-tight text-amber-950">校园交易的三个小默契</p>
            <button
              type="button"
              aria-label="不再显示校内提示条"
              onClick={() => {
                setCampusSafetyStripHidden(true);
                setDismissed(true);
              }}
              className="shrink-0 rounded-full p-1 text-amber-800/70 hover:bg-amber-100 hover:text-amber-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {campusTradeReminderBullets.slice(0, 2).map((b) => (
              <li key={b.title} className="text-[11px] leading-snug text-amber-950/85">
                <span className="font-semibold text-amber-900">{b.title}：</span>
                {b.body}
              </li>
            ))}
          </ul>
          <Link
            href="/campus"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
          >
            <GraduationCap className="h-3 w-3" />
            打开「校内交易指南」（课表空隙面交时段、避雷清单）
          </Link>
        </div>
      </div>
    </div>
  );
}
