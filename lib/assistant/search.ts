import type { MockItem } from "@/lib/mock/items";
import type { Category } from "@/lib/categories";

export type AssistantNeed = {
  keywords: string[];
  category?: Category;
  brand?: string;
  sizeInch?: number;
  isUsed?: boolean;
};

const brandWords = ["apple", "mac", "lenovo", "thinkpad", "dell", "hp", "asus", "acer", "huawei", "xiaomi"];

export function parseNeed(input: string): AssistantNeed {
  const text = input.trim().toLowerCase();
  const keywords = text.split(/[\s,，。；;]+/).filter(Boolean);

  let category: AssistantNeed["category"];
  if (/(游戏|steam|switch|ps5|xbox)/i.test(input)) category = "游戏";
  else if (/(手机|iphone|huawei|xiaomi|oppo|vivo)/i.test(input)) category = "手机";
  else if (/(数码|相机|摄影|镜头|耳机|键盘|鼠标|ipad|平板|laptop|macbook|电脑|笔记本)/i.test(input))
    category = "数码";
  else if (/(玩车|汽车|摩托|电动车|自行车)/i.test(input)) category = "玩车";
  else if (/(户外|露营|登山|徒步|钓鱼)/i.test(input)) category = "户外";
  else if (/(传达|海报|设计|ps|ai|pr|剪辑)/i.test(input)) category = "传达";
  else if (/(母婴|婴儿|奶瓶|尿不湿)/i.test(input)) category = "母婴";
  else if (/(宠物|猫|狗|鱼|鸟)/i.test(input)) category = "宠物";
  else if (/(植物|多肉|绿植|花盆)/i.test(input)) category = "植物";
  else if (/(技能服务|家教|代课|跑腿|维修|服务)/i.test(input)) category = "技能服务";
  else if (/(企业用品|办公|耗材|打印)/i.test(input)) category = "企业用品";
  else if (/(家电|冰箱|洗衣机|空调|小家电)/i.test(input)) category = "家电";
  else if (/(小配饰|配饰|挂件|钥匙扣)/i.test(input)) category = "小配饰";
  else if (/(二次元|动漫|手办|周边)/i.test(input)) category = "二次元";
  else if (/(图书|教材|课本|book|textbook)/i.test(input)) category = "图书";
  else if (/(影视|电影|电视剧|投影|蓝光)/i.test(input)) category = "影视";
  else if (/(美妆|化妆|护肤|口红|香水)/i.test(input)) category = "美妆";
  else if (/(家具|桌|椅|床|柜)/i.test(input)) category = "家具";
  else if (/(温婉)/i.test(input)) category = "温婉";
  else if (/(时尚首饰|首饰|项链|戒指|耳环)/i.test(input)) category = "时尚首饰";
  else if (/(租房|租|房|合租)/i.test(input)) category = "租房";
  else if (/(食品|零食|饮料|特产)/i.test(input)) category = "食品";
  else if (/(农用|农具|种子|肥料)/i.test(input)) category = "农用物品";

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

