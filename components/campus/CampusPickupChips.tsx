"use client";

import type { CampusPickupZoneId } from "@/lib/campus";
import { campusPickupZones } from "@/lib/campus";

export function CampusPickupChips({
  value,
  onChange,
  dense
}: {
  value: CampusPickupZoneId;
  onChange: (z: CampusPickupZoneId) => void;
  dense?: boolean;
}) {
  return (
    <div className={dense ? "flex flex-wrap items-center gap-1.5" : "flex flex-wrap items-center gap-2"}>
      <span className="mr-1 text-[11px] font-semibold text-slate-600">面交半径</span>
      {campusPickupZones.map((z) => {
        const active = value === z.id;
        return (
          <button
            key={z.id}
            type="button"
            title={z.shortHint}
            onClick={() => onChange(z.id)}
            className={[
              dense ? "rounded-full px-2.5 py-1 text-[10px]" : "rounded-full px-3 py-1 text-xs",
              "font-semibold transition",
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            ].join(" ")}
          >
            {z.label}
          </button>
        );
      })}
    </div>
  );
}
