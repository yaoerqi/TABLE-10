import type { Locale } from "@/lib/i18n/locale";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";

/** Display + search strings for seed demo listings (`seed-{id}`). English is canonical for matching. */
const DEMO_LISTINGS: Record<
  string,
  { en: { title: string; location: string }; zh: { title: string; location: string } }
> = {
  "1": {
    en: {
      title: "Super mints",
      location: "Outside dorm (building # in description) · Pickup"
    },
    zh: {
      title: "super 薄荷糖",
      location: "宿舍楼下（描述里写明楼号）｜Pickup"
    }
  },
  "2": {
    en: { title: "iPad 9th Gen with Pencil", location: "Library Gate" },
    zh: { title: "iPad 第九代含 Apple Pencil", location: "图书馆门口" }
  },
  "3": {
    en: { title: "Poster Design Help (2h Session)", location: "Innovation Hub" },
    zh: { title: "海报设计协助（2 小时）", location: "创新中心" }
  },
  "4": {
    en: { title: "Wireless Keyboard + Mouse Combo", location: "Dorm Building 2" },
    zh: { title: "无线键盘鼠标套装", location: "2 号宿舍楼" }
  },
  "5": {
    en: { title: "Probability Notes + Exam Cheatsheet", location: "Teaching Building A" },
    zh: { title: "概率论笔记 + 考点速查", location: "A 教学楼" }
  },
  "6": {
    en: { title: "Photography Walk + Editing Tips", location: "Campus Lake" },
    zh: { title: "校园摄影漫步 + 修图技巧", location: "校园湖畔" }
  },
  "7": {
    en: {
      title: "Switch OLED + Ring Fit (like new)",
      location: "East cafeteria entrance"
    },
    zh: { title: "Switch OLED 九成新 + 健身环", location: "东区食堂门口" }
  },
  "8": {
    en: { title: "Logitech MX Master 3S Mouse", location: "Computer Science Building" },
    zh: { title: "罗技 MX Master 3S 鼠标", location: "计算机学院楼" }
  },
  "9": {
    en: {
      title: "Xiaomi 13 (12+256) · No scratches",
      location: "South Gate Post Office"
    },
    zh: { title: "小米 13（12+256）无划痕", location: "南门驿站" }
  },
  "10": {
    en: { title: "Postgrad English Yellow Book Set 2025", location: "Library study room" },
    zh: { title: "考研英语黄皮书全套 2025", location: "图书馆自习室" }
  },
  "11": {
    en: {
      title: "Midea Air Fryer 3.5L — used twice",
      location: "Outside women's dorm"
    },
    zh: { title: "美的空气炸锅 3.5L 用过两次", location: "女生宿舍楼下" }
  },
  "12": {
    en: {
      title: "Bean bag chair + side table — pickup",
      location: "Graduate apartments, Block B"
    },
    zh: { title: "懒人沙发 + 小边几 自取", location: "研究生公寓 B 座" }
  },
  "13": {
    en: {
      title: "Lancôme Advanced Génifique 30ml — level as shown",
      location: "Near campus clinic"
    },
    zh: { title: "兰蔻小黑瓶 30ml 余量见图", location: "校医院附近" }
  },
  "14": {
    en: {
      title: "Studio sublet near campus — until end of August",
      location: "West Gate shopping street"
    },
    zh: { title: "校区旁单间转租 可到 8 月底", location: "西门商业街" }
  },
  "15": {
    en: {
      title: "PS5 Black Myth: Wukong disc — like new",
      location: "Esports club room"
    },
    zh: { title: "PS5《黑神话悟空》光盘 九成新", location: "电竞社活动室" }
  },
  "16": {
    en: { title: "Giant commuter road bike — XS", location: "Bike shed" },
    zh: { title: "捷安特通勤公路车 XS 码", location: "自行车棚" }
  },
  "17": {
    en: {
      title: "Genshin official standees + holo ticket set",
      location: "Anime club booth"
    },
    zh: { title: "原神官方立牌 + 镭射票一整套", location: "动漫社团招新处" }
  },
  "18": {
    en: {
      title: "Office chair (ergonomic lumbar) — grad season sale",
      location: "STEM Lab Building"
    },
    zh: { title: "办公椅（人体工学腰托）毕业季出", location: "理工科实验楼" }
  },
  "19": {
    en: {
      title: "Pour-over kit (grinder + gooseneck kettle)",
      location: "Coffee club president's office"
    },
    zh: { title: "手冲咖啡全套（磨豆机+云朵壶）", location: "咖啡协会会长室" }
  },
  "20": {
    en: { title: "Campus photo session (1-hour package)", location: "Next to motto stone" },
    zh: { title: "校园摄影约拍（1 小时套餐）", location: "校训石旁" }
  },
  "21": {
    en: {
      title: "Sealed ON Gold Standard whey — vanilla",
      location: "Campus gym"
    },
    zh: { title: "未拆封蛋白粉 ON 金标 香草味", location: "体育馆健身房" }
  },
  "22": {
    en: {
      title: "NVIDIA RTX 3060 Ti AIB — personal use",
      location: "STEM building computer lab"
    },
    zh: { title: "英伟达 RTX 3060Ti 非公版自用", location: "理工楼机房" }
  },
  "23": {
    en: {
      title: 'Ukulele 21" with strap & sheet music',
      location: "Arts education center"
    },
    zh: { title: "尤克里里 21 寸 送背带谱子", location: "艺术教育中心" }
  },
  "24": {
    en: { title: "Ninebot E22 electric scooter", location: "North gate metro exit" },
    zh: { title: "电动滑板车 Ninebot E22", location: "北门地铁口" }
  }
};

export function demoListingTitle(id: string, locale: Locale): string {
  const row = DEMO_LISTINGS[id];
  if (!row) return "";
  return locale === "zh" ? row.zh.title : row.en.title;
}

export function demoListingLocation(id: string, locale: Locale): string {
  const row = DEMO_LISTINGS[id];
  if (!row) return "";
  return locale === "zh" ? row.zh.location : row.en.location;
}

/** Lowercase string used for keyword scoring (English + Chinese). */
export function demoListingSearchHaystack(id: string): string {
  const row = DEMO_LISTINGS[id];
  if (!row) return "";
  const en = `${row.en.title} ${row.en.location}`.toLowerCase();
  const zh = `${row.zh.title} ${row.zh.location}`.toLowerCase();
  return `${en} ${zh}`;
}

export function demoListingTitleDefault(id: string): string {
  return demoListingTitle(id, DEFAULT_LOCALE);
}

export function demoListingLocationDefault(id: string): string {
  return demoListingLocation(id, DEFAULT_LOCALE);
}
