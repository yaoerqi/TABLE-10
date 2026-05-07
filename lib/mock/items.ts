import type { Category } from "@/lib/categories";

/** Seed demo rows (shown as `seed-{id}`). Titles/locations: `lib/i18n/demoListing.ts`. */
export interface MockItem {
  id: string;
  price: number;
  imageUrl: string;
  sellerAvatar: string;
  category: Category;
}

export const mockItems: MockItem[] = [
  {
    id: "1",
    price: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=12",
    category: "食品"
  },
  {
    id: "2",
    price: 1800,
    imageUrl:
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=22",
    category: "数码"
  },
  {
    id: "3",
    price: 120,
    imageUrl:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=9",
    category: "传达"
  },
  {
    id: "4",
    price: 150,
    imageUrl:
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=16",
    category: "数码"
  },
  {
    id: "5",
    price: 30,
    imageUrl:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=27",
    category: "图书"
  },
  {
    id: "6",
    price: 90,
    imageUrl:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=35",
    category: "技能服务"
  },
  {
    id: "7",
    price: 1950,
    imageUrl:
      "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=3",
    category: "游戏"
  },
  {
    id: "8",
    price: 420,
    imageUrl:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=18",
    category: "数码"
  },
  {
    id: "9",
    price: 2299,
    imageUrl:
      "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=44",
    category: "手机"
  },
  {
    id: "10",
    price: 45,
    imageUrl:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=5",
    category: "图书"
  },
  {
    id: "11",
    price: 168,
    imageUrl:
      "https://images.pexels.com/photos/4109138/pexels-photo-4109138.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=32",
    category: "家电"
  },
  {
    id: "12",
    price: 220,
    imageUrl:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=60",
    category: "家具"
  },
  {
    id: "13",
    price: 280,
    imageUrl:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=47",
    category: "美妆"
  },
  {
    id: "14",
    price: 1200,
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=11",
    category: "租房"
  },
  {
    id: "15",
    price: 320,
    imageUrl:
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=7",
    category: "游戏"
  },
  {
    id: "16",
    price: 1680,
    imageUrl:
      "https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=53",
    category: "户外"
  },
  {
    id: "17",
    price: 88,
    imageUrl:
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=28",
    category: "二次元"
  },
  {
    id: "18",
    price: 290,
    imageUrl:
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=64",
    category: "企业用品"
  },
  {
    id: "19",
    price: 198,
    imageUrl:
      "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=41",
    category: "家电"
  },
  {
    id: "20",
    price: 199,
    imageUrl:
      "https://images.pexels.com/photos/1983036/pexels-photo-1983036.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=68",
    category: "技能服务"
  },
  {
    id: "21",
    price: 320,
    imageUrl:
      "https://images.pexels.com/photos/1552250/pexels-photo-1552250.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=55",
    category: "食品"
  },
  {
    id: "22",
    price: 1850,
    imageUrl:
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=14",
    category: "数码"
  },
  {
    id: "23",
    price: 150,
    imageUrl:
      "https://images.unsplash.com/photo-1544776193-352d25ca82cd?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=36",
    category: "技能服务"
  },
  {
    id: "24",
    price: 899,
    imageUrl:
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=62",
    category: "数码"
  }
];
