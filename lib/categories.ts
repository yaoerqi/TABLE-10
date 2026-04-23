export const ALL_CATEGORIES = [
  "游戏",
  "数码",
  "玩车",
  "手机",
  "户外",
  "传达",
  "母婴",
  "宠物",
  "植物",
  "技能服务",
  "企业用品",
  "家电",
  "小配饰",
  "二次元",
  "图书",
  "影视",
  "美妆",
  "家具",
  "温婉",
  "时尚首饰",
  "租房",
  "食品",
  "农用物品"
] as const;

export type Category = (typeof ALL_CATEGORIES)[number];

export const DEFAULT_VISIBLE_CATEGORIES: readonly Category[] = [
  "游戏",
  "数码",
  "手机",
  "图书",
  "家电",
  "家具",
  "美妆",
  "租房"
] as const;

export type FeedTab = "recommend" | "hot";

export function isCategory(x: string | null | undefined): x is Category {
  return !!x && (ALL_CATEGORIES as readonly string[]).includes(x);
}

