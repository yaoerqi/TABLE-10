import type { Category } from "@/lib/categories";

export interface MockItem {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  sellerAvatar: string;
  meetupLocation: string;
  category: Category;
}

export const mockItems: MockItem[] = [
  {
    id: "1",
    title: "Data Structures Textbook (8th Ed.)",
    price: 68,
    imageUrl:
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=12",
    meetupLocation: "Dorm Building 5",
    category: "图书"
  },
  {
    id: "2",
    title: "iPad 9th Gen with Pencil",
    price: 1800,
    imageUrl:
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=22",
    meetupLocation: "Library Gate",
    category: "数码"
  },
  {
    id: "3",
    title: "Poster Design Help (2h Session)",
    price: 120,
    imageUrl:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=9",
    meetupLocation: "Innovation Hub",
    category: "传达"
  },
  {
    id: "4",
    title: "Wireless Keyboard + Mouse Combo",
    price: 150,
    imageUrl:
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=16",
    meetupLocation: "Dorm Building 2",
    category: "数码"
  },
  {
    id: "5",
    title: "Probability Notes + Exam Cheatsheet",
    price: 30,
    imageUrl:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=27",
    meetupLocation: "Teaching Building A",
    category: "图书"
  },
  {
    id: "6",
    title: "Photography Walk + Editing Tips",
    price: 90,
    imageUrl:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=35",
    meetupLocation: "Campus Lake",
    category: "技能服务"
  },
  {
    id: "7",
    title: "Switch OLED 九成新 + 健身环",
    price: 1950,
    imageUrl:
      "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=3",
    meetupLocation: "东区食堂门口",
    category: "游戏"
  },
  {
    id: "8",
    title: "罗技 MX Master 3S 鼠标",
    price: 420,
    imageUrl:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=18",
    meetupLocation: "计算机学院楼",
    category: "数码"
  },
  {
    id: "9",
    title: "小米 13（12+256）无划痕",
    price: 2299,
    imageUrl:
      "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=44",
    meetupLocation: "南门驿站",
    category: "手机"
  },
  {
    id: "10",
    title: "考研英语黄皮书全套 2025",
    price: 45,
    imageUrl:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=5",
    meetupLocation: "图书馆自习室",
    category: "图书"
  },
  {
    id: "11",
    title: "美的空气炸锅 3.5L 用过两次",
    price: 168,
    imageUrl:
      "https://images.pexels.com/photos/4109138/pexels-photo-4109138.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=32",
    meetupLocation: "女生宿舍楼下",
    category: "家电"
  },
  {
    id: "12",
    title: "懒人沙发 + 小边几 自取",
    price: 220,
    imageUrl:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=60",
    meetupLocation: "研究生公寓 B 座",
    category: "家具"
  },
  {
    id: "13",
    title: "兰蔻小黑瓶 30ml 余量见图",
    price: 280,
    imageUrl:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=47",
    meetupLocation: "校医院附近",
    category: "美妆"
  },
  {
    id: "14",
    title: "校区旁单间转租 可到 8 月底",
    price: 1200,
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=11",
    meetupLocation: "西门商业街",
    category: "租房"
  },
  {
    id: "15",
    title: "PS5《黑神话悟空》光盘 九成新",
    price: 320,
    imageUrl:
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=7",
    meetupLocation: "电竞社活动室",
    category: "游戏"
  },
  {
    id: "16",
    title: "捷安特通勤公路车 XS 码",
    price: 1680,
    imageUrl:
      "https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=53",
    meetupLocation: "自行车棚",
    category: "户外"
  },
  {
    id: "17",
    title: "原神官方立牌 + 镭射票一整套",
    price: 88,
    imageUrl:
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=28",
    meetupLocation: "动漫社团招新处",
    category: "二次元"
  },
  {
    id: "18",
    title: "办公椅（人体工学腰托）毕业季出",
    price: 290,
    imageUrl:
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=64",
    meetupLocation: "理工科实验楼",
    category: "企业用品"
  },
  {
    id: "19",
    title: "手冲咖啡全套（磨豆机+云朵壶）",
    price: 198,
    imageUrl:
      "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=41",
    meetupLocation: "咖啡协会会长室",
    category: "家电"
  },
  {
    id: "20",
    title: "校园摄影约拍（1 小时套餐）",
    price: 199,
    imageUrl:
      "https://images.pexels.com/photos/1983036/pexels-photo-1983036.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=68",
    meetupLocation: "校训石旁",
    category: "技能服务"
  },
  {
    id: "21",
    title: "未拆封蛋白粉 ON 金标 香草味",
    price: 320,
    imageUrl:
      "https://images.pexels.com/photos/1552250/pexels-photo-1552250.jpeg?auto=compress&cs=tinysrgb&w=800",
    sellerAvatar: "https://i.pravatar.cc/100?img=55",
    meetupLocation: "体育馆健身房",
    category: "食品"
  },
  {
    id: "22",
    title: "英伟达 RTX 3060Ti 非公版自用",
    price: 1850,
    imageUrl:
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=14",
    meetupLocation: "理工楼机房",
    category: "数码"
  },
  {
    id: "23",
    title: "尤克里里 21 寸 送背带谱子",
    price: 150,
    imageUrl:
      "https://images.unsplash.com/photo-1544776193-352d25ca82cd?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=36",
    meetupLocation: "艺术教育中心",
    category: "技能服务"
  },
  {
    id: "24",
    title: "电动滑板车 Ninebot E22",
    price: 899,
    imageUrl:
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=62",
    meetupLocation: "北门地铁口",
    category: "数码"
  }
];
