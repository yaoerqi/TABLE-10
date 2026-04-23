import { z } from "zod";
import { ALL_CATEGORIES } from "@/lib/categories";

export const campusLocations = [
  "Dorm Building 1",
  "Dorm Building 5",
  "Main Library",
  "Teaching Building A",
  "Cafeteria East Gate",
  "Innovation Hub"
] as const;

export const publishItemSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(15, "Description must be at least 15 characters"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  category: z.enum(ALL_CATEGORIES),
  meetupLocation: z.enum(campusLocations)
});

export type PublishItemInput = z.infer<typeof publishItemSchema>;
