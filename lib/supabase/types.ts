import type { Category } from "@/lib/categories";

export interface DbUser {
  id: string;
  edu_email: string;
  nickname: string;
  avatar_url: string | null;
  dorm_area: string | null;
}

export interface DbItem {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  images_array: string[];
  meetup_location: string;
  status: "available" | "reserved" | "sold" | "inactive";

  // 3D pipeline fields
  video_url?: string | null;
  "3d_job_id"?: string | null;
  "3d_status"?: "pending" | "processing" | "completed" | "failed" | null;
  model_glb_url?: string | null;
}
