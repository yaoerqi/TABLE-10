import { z } from "zod";
import { ALL_CATEGORIES } from "@/lib/categories";

export const campusLocations = [
  "宿舍楼下（描述里写明楼号）｜Pickup near dorms",
  "图书馆正门阶前｜Main Library Gate",
  "教学楼 A 栋拐角｜Teaching Building A Corner",
  "东区食堂东门口｜Cafeteria East Gate",
  "菜鸟驿站 / 接驳柜侧面｜Campus lockers",
  "校园北门接驳点｜North Campus Gate",
  "创新中心大厅｜Innovation Hub",
  "体育场 / 游泳馆前台｜Gym Lobby",
  "Dorm Building 1",
  "Dorm Building 5",
  "Main Library",
  "Teaching Building A",
  "Cafeteria East Gate",
  "Innovation Hub"
] as const;

/** 一键写进下拉框的常用校门面交接点（需与 campusLocations 成员完全一致） */
export const campusMeetupQuickPicks: readonly {
  label: string;
  value: (typeof campusLocations)[number];
}[] = [
  { label: "宿舍楼下", value: "宿舍楼下（描述里写明楼号）｜Pickup near dorms" },
  { label: "图书馆", value: "图书馆正门阶前｜Main Library Gate" },
  { label: "教学楼", value: "教学楼 A 栋拐角｜Teaching Building A Corner" },
  { label: "东食堂门口", value: "东区食堂东门口｜Cafeteria East Gate" },
  { label: "菜鸟驿站", value: "菜鸟驿站 / 接驳柜侧面｜Campus lockers" },
  { label: "北门接驳", value: "校园北门接驳点｜North Campus Gate" }
];

export const publishItemSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(15, "Description must be at least 15 characters"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  category: z.enum(ALL_CATEGORIES),
  meetupLocation: z.enum(campusLocations)
});

export type PublishItemInput = z.infer<typeof publishItemSchema>;
