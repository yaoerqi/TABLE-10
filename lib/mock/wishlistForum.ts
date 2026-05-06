/** Forum-style wishlist cards for homepage「求购」demo + DB row mapping. */

export type WishForumReply = {
  id: string;
  nickname: string;
  avatarUrl: string;
  content: string;
  timeLabel: string;
};

export type WishForumDetail = WishForumPost & {
  /** 楼主完整正文（详情页） */
  body: string;
  replies: WishForumReply[];
};

export type WishForumPost = {
  id: string;
  nickname: string;
  avatarUrl: string;
  title: string;
  excerpt: string;
  budget: number;
  tags: string[];
  timeLabel: string;
  replyCount: number;
  likes: number;
};

export const MOCK_WISH_FORUM_POSTS: WishForumPost[] = [
  {
    id: "seed-wish-1",
    nickname: "北区小陈",
    avatarUrl: "https://i.pravatar.cc/96?img=11",
    title: "求购 Switch OLED + 健身环套装",
    excerpt:
      "成色九成新以上即可，当面验机交易。单出机器也行，环可以后面再收。鸽子勿扰～",
    budget: 2000,
    tags: ["#数码", "#游戏", "#面交"],
    timeLabel: "2 小时前",
    replyCount: 14,
    likes: 26
  },
  {
    id: "seed-wish-2",
    nickname: "考研冲刺中",
    avatarUrl: "https://i.pravatar.cc/96?img=33",
    title: "收一套张宇高数 18 讲 + 真题卷",
    excerpt: "笔记少一点更好，图书馆或食堂门口面交。可加一点点预算换正版习题册。",
    budget: 80,
    tags: ["#图书", "#考研"],
    timeLabel: "昨天 21:16",
    replyCount: 8,
    likes: 12
  },
  {
    id: "seed-wish-3",
    nickname: "宿舍断电侠",
    avatarUrl: "https://i.pravatar.cc/96?img=52",
    title: "急收静音鼠标 + 长续航充电宝",
    excerpt: "晚上赶 ddl 用，最好是罗技 Anywhere 或同级别，充电宝要能上飞机的容量。",
    budget: 350,
    tags: ["#数码", "#急购"],
    timeLabel: "5 小时前",
    replyCount: 6,
    likes: 19
  },
  {
    id: "seed-wish-4",
    nickname: "校外租房ing",
    avatarUrl: "https://i.pravatar.cc/96?img=45",
    title: "求租东门附近单间或合租次卧",
    excerpt: "预算有限，接受短租三个月起。有阳台优先，中介勿扰，谢谢。",
    budget: 1200,
    tags: ["#租房", "#长租"],
    timeLabel: "3 天前",
    replyCount: 31,
    likes: 44
  },
  {
    id: "seed-wish-5",
    nickname: "话剧社道具组",
    avatarUrl: "https://i.pravatar.cc/96?img=28",
    title: "租借 / 收购复古台灯与老式电话道具",
    excerpt: "期末汇演用两周左右，用完完好归还，可付押金。颜色复古黄优先。",
    budget: 150,
    tags: ["#服装道具", "#租借"],
    timeLabel: "1 周前",
    replyCount: 5,
    likes: 9
  }
];

/** Demo thread replies under each seed post（详情页留言） */
export const SEED_WISH_REPLIES: Record<string, WishForumReply[]> = {
  "seed-wish-1": [
    {
      id: "r1-1",
      nickname: "机电小张",
      avatarUrl: "https://i.pravatar.cc/96?img=5",
      content: "我有 OLED 日版，健身环也在，箱说全。周二下午图书馆门口可以吗？",
      timeLabel: "1 小时前"
    },
    {
      id: "r1-2",
      nickname: "路过萌新",
      avatarUrl: "https://i.pravatar.cc/96?img=18",
      content: "蹲一下价格还能小刀吗，我只有主机想出……",
      timeLabel: "48 分钟前"
    },
    {
      id: "r1-3",
      nickname: "北区小陈",
      avatarUrl: "https://i.pravatar.cc/96?img=11",
      content: "楼主回复：可以当面看成色再谈，私信你了～",
      timeLabel: "30 分钟前"
    }
  ],
  "seed-wish-2": [
    {
      id: "r2-1",
      nickname: "数院老哥",
      avatarUrl: "https://i.pravatar.cc/96?img=44",
      content: "我有去年的全套，笔记很少，封面有一点点卷角可以接受吗？",
      timeLabel: "昨天 22:01"
    },
    {
      id: "r2-2",
      nickname: "考研冲刺中",
      avatarUrl: "https://i.pravatar.cc/96?img=33",
      content: "可以的！周四中午教学楼 A 门口见？",
      timeLabel: "昨天 22:18"
    }
  ],
  "seed-wish-3": [
    {
      id: "r3-1",
      nickname: "数码摊主",
      avatarUrl: "https://i.pravatar.cc/96?img=60",
      content: "有个九成新 MX Master 3，鼠标静音没问题；充电宝有小米 20000mAh 能上飞机。",
      timeLabel: "3 小时前"
    },
    {
      id: "r3-2",
      nickname: "宿舍断电侠",
      avatarUrl: "https://i.pravatar.cc/96?img=52",
      content: "太好啦！两样一起多少合适？我寝室在东区 7 栋。",
      timeLabel: "2 小时前"
    },
    {
      id: "r3-3",
      nickname: "数码摊主",
      avatarUrl: "https://i.pravatar.cc/96?img=60",
      content: "私信细聊～",
      timeLabel: "1 小时前"
    }
  ],
  "seed-wish-4": [
    {
      id: "r4-1",
      nickname: "东门房东代理",
      avatarUrl: "https://i.pravatar.cc/96?img=8",
      content: "有一套合租次卧下周空出来，非中介，只长租可以吗？",
      timeLabel: "2 天前"
    },
    {
      id: "r4-2",
      nickname: "校友转租",
      avatarUrl: "https://i.pravatar.cc/96?img=37",
      content: "我下个月搬走，可以短租接盘两周过渡你要吗？",
      timeLabel: "1 天前"
    }
  ],
  "seed-wish-5": [
    {
      id: "r5-1",
      nickname: "美工学姐",
      avatarUrl: "https://i.pravatar.cc/96?img=24",
      content: "社团有这种台灯我帮你问问库房，周一给你答复。",
      timeLabel: "6 天前"
    },
    {
      id: "r5-2",
      nickname: "话剧社道具组",
      avatarUrl: "https://i.pravatar.cc/96?img=28",
      content: "谢谢学姐！电话道具我也有朋友在戏剧社可以借～",
      timeLabel: "5 天前"
    }
  ]
};

export function getMockWishDetail(id: string): WishForumDetail | null {
  const post = MOCK_WISH_FORUM_POSTS.find((p) => p.id === id);
  if (!post) return null;
  const replies = SEED_WISH_REPLIES[id] ?? [];
  const body = `${post.excerpt}\n\n欢迎带图带价留言；鸽子勿扰，确定意向后再约时间面交。`;
  return { ...post, body, replies };
}

/** 数据库暂无留言表时，用稳定伪留言演示详情页 */
export function buildSyntheticReplies(wishId: string): WishForumReply[] {
  const h = hashStable(wishId);
  const nick = (i: number) => `同学_${String((h + i * 131) % 997).padStart(3, "0")}`;
  const av = (i: number) => `https://i.pravatar.cc/96?img=${1 + ((h + i * 7) % 69)}`;
  return [
    {
      id: `${wishId}-s1`,
      nickname: nick(1),
      avatarUrl: av(1),
      content: "我有符合条件的，可以哪天校内当面看一下吗？",
      timeLabel: "32 分钟前"
    },
    {
      id: `${wishId}-s2`,
      nickname: nick(2),
      avatarUrl: av(2),
      content: "价格还可以商量吗？我只有周末有空～",
      timeLabel: "1 小时前"
    },
    {
      id: `${wishId}-s3`,
      nickname: nick(3),
      avatarUrl: av(3),
      content: "蹲一下，同求类似的～",
      timeLabel: "昨天"
    }
  ];
}

function hashStable(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function timeAgoFromIso(iso?: string | null): string {
  if (!iso) return "刚刚";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "刚刚";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export function wishRowToDetail(row: {
  id: string;
  buyer_id: string;
  requested_item: string;
  budget: number;
  created_at?: string | null;
}): WishForumDetail {
  const card = mapWishlistRowToForumPost(row);
  const budgetNum = Number(row.budget) || 0;
  const body = `【求购】${row.requested_item}\n\n预算：￥${budgetNum.toFixed(0)}（可小幅商量）\n校内面交优先，欢迎留言联系～`;
  return {
    ...card,
    body,
    replies: buildSyntheticReplies(row.id)
  };
}

export function mapWishlistRowToForumPost(row: {
  id: string;
  buyer_id: string;
  requested_item: string;
  budget: number;
  created_at?: string | null;
}): WishForumPost {
  const h = hashStable(row.buyer_id);
  const img = 1 + (h % 69);
  return {
    id: row.id,
    nickname: `求购_${String(h).slice(-4)}`,
    avatarUrl: `https://i.pravatar.cc/96?img=${img}`,
    title: row.requested_item,
    excerpt: "预算可小幅商量，校内面交优先，欢迎评论区留言或私聊联系～",
    budget: Number(row.budget) || 0,
    tags: ["#求购"],
    timeLabel: timeAgoFromIso(row.created_at),
    replyCount: 3 + (h % 15),
    likes: 5 + (h % 28)
  };
}
