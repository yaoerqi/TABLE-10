"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Globe, LogOut, MapPin, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { useLocale } from "@/components/providers/LocaleProvider";

function Row(props: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  showChevron?: boolean;
}) {
  const showChevron = props.showChevron !== false;
  const content = (
    <div className="flex items-center gap-3 rounded-3xl border border-white/30 bg-white/60 px-4 py-4 backdrop-blur-xl transition hover:bg-white">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{props.title}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {props.right}
        {showChevron ? <ChevronRight className="h-4 w-4" /> : null}
      </div>
    </div>
  );

  if (props.href) return <Link href={props.href}>{content}</Link>;
  return (
    <button type="button" onClick={props.onClick} className="w-full text-left">
      {content}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    } finally {
      router.push("/");
    }
  };

  const langSegment = (active: boolean) =>
    [
      "rounded-full px-3 py-1 text-[11px] font-semibold transition",
      active ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    ].join(" ");

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-6 sm:px-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{t("settings.title")}</h1>
        <Link href="/profile" className="text-xs font-semibold text-gray-600 hover:text-gray-900">
          {t("settings.backToProfile")}
        </Link>
      </header>

      <section className="mt-4 grid gap-3">
        <div className="flex items-center gap-3 rounded-3xl border border-white/30 bg-white/60 px-4 py-4 backdrop-blur-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
            <Globe className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{t("settings.language")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-0.5">
              <button type="button" onClick={() => setLocale("en")} className={langSegment(locale === "en")}>
                English
              </button>
              <button type="button" onClick={() => setLocale("zh")} className={langSegment(locale === "zh")}>
                中文
              </button>
            </span>
          </div>
        </div>
        <Row
          icon={<MapPin className="h-5 w-5" />}
          title={t("settings.addressManagement")}
          right={<span className="rounded-full bg-gray-100 px-2 py-1 text-[11px]">{t("settings.notConfigured")}</span>}
          href="/settings#address"
        />
        <Row
          icon={<ShieldCheck className="h-5 w-5" />}
          title={t("settings.campusVerification")}
          right={
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
              {t("settings.verified")}
            </span>
          }
          href="/settings#verified"
        />
      </section>

      <section className="mt-5">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-3xl bg-black px-4 py-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
        >
          <LogOut className="h-4 w-4" />
          {t("settings.signOut")}
        </button>
      </section>

      <BottomNav />
    </main>
  );
}
