"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, hasSupabaseEnv } from "@/lib/supabase/client";
import { ensureStudentProfile, isEduCnEmail } from "@/lib/supabase/studentAuth";
import { enableDemoAuthed } from "@/lib/demo/demoAuth";

export function LoginScreen({ onAuthed }: { onAuthed?: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const canSubmit = useMemo(() => isEduCnEmail(email), [email]);

  useEffect(() => {
    if (!hasSupabaseEnv) return;

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) return;
        const res = await ensureStudentProfile();
        if (res.ok) {
          setMessage("");
          onAuthed?.();
        } else {
          setMessage("reason" in res ? res.reason : "Student profile not allowed");
        }
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, [onAuthed]);

  const onGetCode = async () => {
    setMessage("");

    if (!isEduCnEmail(email)) {
      setMessage("请输入以 .edu.cn 结尾的邮箱。");
      return;
    }

    setLoading(true);
    try {
      if (!hasSupabaseEnv) {
        setMessage("尚未配置 Supabase 环境变量。");
        return;
      }

      const redirectTo =
        typeof window !== "undefined" ? window.location.origin : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo }
      });

      if (error) {
        setMessage(`发送失败：${error.message}`);
        return;
      }

      setMessage("访问码已发送。请到邮箱完成验证后返回。");
    } catch (err) {
      setMessage("验证码发送失败（网络/配置问题）。你可以点击下方按钮不发邮件先浏览。");
    } finally {
      setLoading(false);
    }
  };

  const onBrowse = async () => {
    enableDemoAuthed();
    setMessage("");
    onAuthed?.();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-100/80 to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-gray-200 to-gray-100 blur-3xl opacity-70" />
        <div className="absolute -bottom-24 left-1/2 h-[20rem] w-[28rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-gray-100 to-white blur-3xl opacity-60" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-900">
          Exclusive Campus Trading
        </h1>

        <p className="mt-4 text-center text-sm text-gray-500">
          用你的校内邮箱获取访问码
        </p>

        <div className="mt-8 w-full">
          <label className="sr-only" htmlFor="edu-email">
            Edu email
          </label>
          <input
            id="edu-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
            placeholder="you@school.edu.cn"
            className="w-full rounded-full bg-white/70 px-5 py-3 text-gray-900 placeholder:text-gray-400 outline-none border border-transparent focus:border-transparent focus:ring-2 focus:ring-black"
          />

          <button
            type="button"
            onClick={onGetCode}
            disabled={loading}
            className="mt-5 w-full rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Get Access Code"}
          </button>

          <button
            type="button"
            onClick={onBrowse}
            disabled={loading}
            className="mt-3 w-full rounded-full border border-gray-200 bg-white/60 px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Browse Without Access Code
          </button>

          {message ? <p className="mt-3 text-xs text-gray-600">{message}</p> : null}
        </div>
      </section>
    </main>
  );
}

