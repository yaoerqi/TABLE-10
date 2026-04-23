export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeJsonParse<T>(window.localStorage.getItem(key), fallback);
}

export function saveLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const FAV_KEY = "ent:favorites:v1";
const CLICK_KEY = "ent:clicks:v1";
const CAT_PREF_KEY = "ent:catpref:v1";

export function getFavorites(): string[] {
  return loadLocal<string[]>(FAV_KEY, []);
}

export function toggleFavorite(itemId: string): { next: string[]; isFavorited: boolean } {
  const prev = new Set(getFavorites());
  if (prev.has(itemId)) prev.delete(itemId);
  else prev.add(itemId);
  const next = Array.from(prev);
  saveLocal(FAV_KEY, next);
  return { next, isFavorited: prev.has(itemId) };
}

export function isFavorited(itemId: string): boolean {
  return new Set(getFavorites()).has(itemId);
}

export type ClickState = Record<string, number>;

export function bumpItemClick(itemId: string) {
  const clicks = loadLocal<ClickState>(CLICK_KEY, {});
  clicks[itemId] = (clicks[itemId] ?? 0) + 1;
  saveLocal(CLICK_KEY, clicks);
}

export function getClicks(): ClickState {
  return loadLocal<ClickState>(CLICK_KEY, {});
}

export type CategoryPrefState = Record<string, number>;

export function bumpCategoryPref(category: string, delta = 1) {
  const prefs = loadLocal<CategoryPrefState>(CAT_PREF_KEY, {});
  prefs[category] = (prefs[category] ?? 0) + delta;
  saveLocal(CAT_PREF_KEY, prefs);
}

export function getCategoryPrefs(): CategoryPrefState {
  return loadLocal<CategoryPrefState>(CAT_PREF_KEY, {});
}

