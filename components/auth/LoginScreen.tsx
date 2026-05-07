"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";

const REQUEST_TIMEOUT_MS = 25_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMsg: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMsg));
    }, ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export function LoginScreen({ onAuthed }: { onAuthed?: () => void | Promise<void> }) {
  const { t } = useLocale();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const onAuthedRef = useRef(onAuthed);
  onAuthedRef.current = onAuthed;

  const canSubmit = useMemo(() => {
    const a = account.trim();
    return a.length >= 3 && password.length >= 6;
  }, [account, password]);

  const onSignIn = async () => {
    setMessage("");

    setLoading(true);
    try {
      const resp = await withTimeout(
        fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: account.trim(), password })
        }),
        REQUEST_TIMEOUT_MS,
        t("auth.timeoutExceeded", { seconds: Math.round(REQUEST_TIMEOUT_MS / 1000) })
      );

      const json = (await resp.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!resp.ok || !json?.ok) {
        setMessage(`${t("auth.signInFailedPrefix")} ${json?.error ? String(json.error) : resp.statusText}`);
        return;
      }
      onAuthedRef.current?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("auth.signInNetwork"));
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
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-900">
          Exclusive Campus Trading
        </h1>

        <p className="mt-4 text-center text-sm text-gray-500">{t("auth.subtitle")}</p>

        <form
          className="mt-8 w-full rounded-3xl border border-white/30 bg-white/50 p-5 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(0,0,0,0.28)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading && canSubmit) void onSignIn();
          }}
        >
          <label className="sr-only" htmlFor="account">
            Account
          </label>
          <input
            id="account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            inputMode="text"
            autoComplete="username"
            placeholder={t("auth.accountPlaceholder")}
            className="input-pill"
          />

          <div className="mt-3">
            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder={t("auth.passwordPlaceholder")}
              className="input-pill"
            />
          </div>

          {!canSubmit && (account.trim().length > 0 || password.length > 0) ? (
            <p className="mt-3 text-[11px] text-amber-700">{t("auth.requirementsHint")}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </button>

          <Link
            href="/register"
            className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            {t("auth.goRegister")}
          </Link>

          {message ? <p className="mt-3 text-xs text-gray-600">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}

