import { supabase } from "@/lib/supabase/client";

export function isEduCnEmail(email?: string | null) {
  if (!email) return false;
  return /\.edu\.cn$/i.test(email.trim());
}

export type EnsureStudentProfileResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function ensureStudentProfile(): Promise<EnsureStudentProfileResult> {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { ok: false, reason: "Missing auth user" };
  }

  if (!isEduCnEmail(user.email)) {
    return { ok: false, reason: "Only .edu.cn allowed" };
  }

  const nickname = user.email.split("@")[0];
  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      edu_email: user.email,
      nickname,
      avatar_url: null,
      dorm_area: null
    },
    { onConflict: "id" }
  );

  if (error) {
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}

