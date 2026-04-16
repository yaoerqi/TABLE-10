import type { MockItem } from "@/lib/mock/items";

export type AssistantNeed = {
  keywords: string[];
  category?: "Textbooks" | "Tech" | "Dorm" | "Skill Swap";
  brand?: string;
  sizeInch?: number;
  isUsed?: boolean;
};

const brandWords = ["apple", "mac", "lenovo", "thinkpad", "dell", "hp", "asus", "acer", "huawei", "xiaomi"];

export function parseNeed(input: string): AssistantNeed {
  const text = input.trim().toLowerCase();
  const keywords = text.split(/[\s,，。；;]+/).filter(Boolean);

  let category: AssistantNeed["category"];
  if (/(电脑|笔记本|laptop|macbook)/i.test(input)) category = "Tech";
  else if (/(教材|课本|book|textbook)/i.test(input)) category = "Textbooks";
  else if (/(宿舍|dorm)/i.test(input)) category = "Dorm";
  else if (/(技能|swap|skill)/i.test(input)) category = "Skill Swap";

  const inch = text.match(/(\d{2})\s*(inch|in|寸)/);
  const sizeInch = inch ? Number(inch[1]) : undefined;

  const brand = brandWords.find((b) => text.includes(b));

  const isUsed = /(二手|used|second[-\s]?hand)/i.test(input) ? true : undefined;

  return { keywords, category, brand, sizeInch, isUsed };
}

export function scoreItem(item: MockItem, need: AssistantNeed): number {
  let score = 0;
  const title = item.title.toLowerCase();

  if (need.category) {
    if (need.category === item.category) score += 20;
    else score -= 5;
  }

  if (need.brand) {
    if (title.includes(need.brand)) score += 18;
  }

  if (need.sizeInch) {
    if (title.includes(String(need.sizeInch))) score += 10;
  }

  for (const kw of need.keywords) {
    if (kw.length < 2) continue;
    if (title.includes(kw)) score += 3;
  }

  return score;
}

export function searchItems(input: string, items: MockItem[]) {
  const need = parseNeed(input);
  const results = items
    .map((item) => ({ item, score: scoreItem(item, need) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  return { need, results };
}

