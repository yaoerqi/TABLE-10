import type { Locale } from "./locale";

/** Compact like-count / engagement numbers for listing cards */
export function formatCompactCount(n: number, locale: Locale): string {
  if (locale === "en") {
    if (n >= 1_000_000) {
      const v = n / 1_000_000;
      const rounded = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
      return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}M`;
    }
    if (n >= 10_000) {
      const k = n / 1000;
      const rounded = k >= 100 ? Math.round(k) : Math.round(k * 10) / 10;
      return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}k`;
    }
    if (n >= 1000) {
      const k = n / 1000;
      const rounded = Math.round(k * 10) / 10;
      return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}k`;
    }
    return String(n);
  }

  if (n >= 10000) {
    const w = n / 10000;
    const rounded = w >= 10 ? Math.round(w) : Math.round(w * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}万`;
  }
  if (n >= 1000) {
    const k = Math.round((n / 1000) * 10) / 10;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}千`;
  }
  return String(n);
}
