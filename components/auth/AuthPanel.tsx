"use client";

import { useState } from "react";
import { hasSupabaseEnv, supabase } from "@/lib/supabase/client";

export function AuthPanel({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const isEduEmail = (value: string) => /\.edu$/i.test(value);

  const ensureProfile = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user || !user.email) return;
    if (!isEduEmail(user.email)) {
      setMessage("当前账号不是 .edu 邮箱，无法创建学生档案。");
      return;
    }
    const nickname = user.email.split("@")[0];
    const { error } = await supabase.from("users").upsert(
      {
        id: user.id,
        edu_email: user.email,
        nickname
      },
      { onConflict: "id" }
    );
    if (error) {
      setMessage(`档案创建失败：${error.message}`);
      return;
    }
    setMessage("学生档案已就绪。");
    onAuthed();
  };

  const handleSignup = async () => {
    if (!isEduEmail(email)) {
      setMessage("请使用 .edu 邮箱注册。");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage(`注册失败：${error.message}`);
      return;
    }
    setMessage("注册成功，请去邮箱完成验证后登录。");
  };

  const handleSignin = async () => {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(`登录失败：${error.message}`);
      return;
    }
    await ensureProfile();
  };

  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h2 className="text-sm font-semibold text-slate-800">学生登录 / 注册（Supabase）</h2>
      <p className="mt-1 text-xs text-slate-500">仅支持 .edu 邮箱</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@school.edu"
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || !hasSupabaseEnv}
            onClick={handleSignin}
            className="h-10 flex-1 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white"
          >
            登录
          </button>
          <button
            type="button"
            disabled={loading || !hasSupabaseEnv}
            onClick={handleSignup}
            className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
          >
            注册
          </button>
        </div>
      </div>
      {!hasSupabaseEnv ? (
        <p className="mt-2 text-xs text-amber-600">
          尚未配置 Supabase 环境变量，请先创建 `.env.local`。
        </p>
      ) : null}
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </section>
  );
}
