/** 校内面交半径：用于首页筛选 listings 的 meetup_location 文案 */
export type CampusPickupZoneId = "all" | "dorm" | "library" | "teaching" | "dining" | "gate";

export const campusPickupZones: readonly {
  id: CampusPickupZoneId;
  label: string;
  shortHint: string;
}[] = [
  { id: "all", label: "全校", shortHint: "不按地点筛选" },
  {
    id: "dorm",
    label: "宿舍区",
    shortHint: "宿舍、寝室、公寓楼附近"
  },
  {
    id: "library",
    label: "图书馆",
    shortHint: "图书馆、阅览室、自习区"
  },
  {
    id: "teaching",
    label: "教学楼",
    shortHint: "教学楼、机房、院系楼附近"
  },
  {
    id: "dining",
    label: "食堂商超",
    shortHint: "食堂、商超、咖啡店取货柜"
  },
  {
    id: "gate",
    label: "校门驿站",
    shortHint: "校门口、地铁口、驿站、商业街"
  }
] as const;

export function itemMatchesPickupZone(meetupLocation: string, zone: Exclude<CampusPickupZoneId, "all">): boolean {
  const s = meetupLocation;
  switch (zone) {
    case "dorm":
      return /dorm|building|宿舍楼|寝室|公寓|宿舍|研究生|南区|北区|西区|东区|栋|座/i.test(s);
    case "library":
      return /library|图书馆|阅览室|自习室|自习/i.test(s);
    case "teaching":
      return /teaching|教学楼|院系|机房|实验楼|comput|学院/i.test(s);
    case "dining":
      return /cafeteria|食堂|coffee|咖啡厅|商业中心|商超|西餐/i.test(s);
    case "gate":
      return /gate|北门|南门|东门|西门|校门|驿站|地铁|metro|商业街|接驳|驿站|南门|门口/i.test(s);
    default:
      return true;
  }
}

/** 站内「校园帮手」短文，用于指引页与安全条 */
export const campusTradeReminderBullets = [
  {
    title: "优先当面验货",
    body: "图书馆门口、宿舍楼前等公共场所完成交易更安心；贵重物品建议白天面交。"
  },
  {
    title: "防诈骗口令",
    body: "不向陌生链接付款，不提前支付「运费/保证金」，不走学校外的陌生账号。"
  },
  {
    title: "学生证与校园邮箱",
    body: "你已是 .edu.cn 核验用户时，可多问一句年级学院，校内成交更可追溯。"
  }
] as const;
