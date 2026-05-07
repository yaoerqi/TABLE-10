"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function RegisterPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(() => {
    const a = account.trim();
    return a.length >= 3 && password.length >= 6 && password === password2;
  }, [account, password, password2]);

  useEffect(() => {}, []);

  const onSignUp = async () => {
    setMessage("");
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: account.trim(), password })
      });
      const json = (await resp.json().catch(() => ({}))) as { error?: string };
      if (!resp.ok) {
        setMessage(`${t("register.failPrefix")} ${json?.error ? String(json.error) : resp.statusText}`);
        return;
      }

      setMessage(t("register.success"));
      setTimeout(() => router.push("/"), 350);
    } catch {
      setMessage(t("register.failNetwork"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[30rem] w-[38rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/70 via-slate-200/60 to-emerald-200/60 blur-3xl opacity-70" />
        <div className="absolute -bottom-28 left-1/2 h-[22rem] w-[30rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-slate-100/60 via-white/60 to-rose-100/50 blur-3xl opacity-70" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-gray-900">{t("register.title")}</h1>
        <p className="mt-3 text-center text-sm text-gray-500">{t("register.subtitle")}</p>

        <div className="mt-8 w-full rounded-3xl border border-white/30 bg-white/50 p-5 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(0,0,0,0.28)]">
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            inputMode="text"
            autoComplete="username"
            placeholder={t("register.accountPlaceholder")}
            className="input-pill"
          />

          <div className="mt-3 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={t("register.passwordPlaceholder")}
              className="input-pill"
            />
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
              placeholder={t("register.passwordAgainPlaceholder")}
              className="input-pill"
            />
          </div>

          <button
            type="button"
            onClick={onSignUp}
            disabled={loading || !canSubmit}
            className="btn-primary mt-5 w-full"
          >
            {loading ? t("register.signingUp") : t("register.signUp")}
          </button>

          <Link
            href="/"
            className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            {t("register.backLogin")}
          </Link>

          {message ? <p className="mt-3 text-xs text-gray-600">{message}</p> : null}
        </div>
      </section>
    </main>
  );
}
