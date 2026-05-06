import type { CampusPickupZoneId } from "@/lib/campus";

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
const HOME_LAYOUT_KEY = "ent:home_layout:v1";
const CAMPUS_PICKUP_ZONE_KEY = "ent:campus_pickup_zone:v1";
const CAMPUS_SAFETY_STRIP_HIDDEN_KEY = "ent:campus_safety_strip_hidden:v1";

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

export type HomeLayoutMode = "grid" | "feed";

export function getHomeLayoutMode(): HomeLayoutMode {
  const v = loadLocal<HomeLayoutMode>(HOME_LAYOUT_KEY, "grid");
  return v === "feed" ? "feed" : "grid";
}

export function setHomeLayoutMode(mode: HomeLayoutMode) {
  saveLocal<HomeLayoutMode>(HOME_LAYOUT_KEY, mode);
}

const campusZoneIds = new Set<CampusPickupZoneId>(["all", "dorm", "library", "teaching", "dining", "gate"]);

export function getCampusPickupZone(): CampusPickupZoneId {
  const v = loadLocal<string>(CAMPUS_PICKUP_ZONE_KEY, "all");
  return campusZoneIds.has(v as CampusPickupZoneId) ? (v as CampusPickupZoneId) : "all";
}

export function setCampusPickupZone(zone: CampusPickupZoneId) {
  saveLocal(CAMPUS_PICKUP_ZONE_KEY, zone);
}

export function isCampusSafetyStripHidden(): boolean {
  return loadLocal<boolean>(CAMPUS_SAFETY_STRIP_HIDDEN_KEY, false);
}

export function setCampusSafetyStripHidden(hidden: boolean) {
  saveLocal(CAMPUS_SAFETY_STRIP_HIDDEN_KEY, hidden);
}

