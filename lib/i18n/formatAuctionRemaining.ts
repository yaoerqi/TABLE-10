import type { Locale } from "./locale";
import { translate } from "./messages";

export function formatAuctionRemaining(ms: number, locale: Locale): string {
  if (ms <= 0) return translate(locale, "auction.timeEnded");
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return translate(locale, "auction.remainDhm", { d, h, m });
  if (h > 0) return translate(locale, "auction.remainHms", { h, m, s: sec });
  if (m > 0) return translate(locale, "auction.remainMs", { m, s: sec });
  return translate(locale, "auction.remainS", { s: sec });
}
