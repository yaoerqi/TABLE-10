export type Locale = "en" | "zh";

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "ent-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
