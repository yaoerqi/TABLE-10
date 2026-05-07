import type { Category } from "@/lib/categories";

/** Display label for a canonical Chinese category key stored in DB */
export function categoryLabel(cat: string, t: (key: string) => string): string {
  const key = `category.${cat}`;
  const label = t(key);
  return label === key ? cat : label;
}

export type CategoryTranslator = (key: string) => string;
