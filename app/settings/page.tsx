"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, MapPin, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { hasSupabaseEnv, supabase } from "@/lib/supabase/client";
import { ensureStudentProfile } from "@/lib/supabase/studentAuth";
import { isDemoAuthed } from "@/lib/demo/demoAuth";

function Row(props: { icon: React.ReactNode; title: string; right?: React.ReactNode; onClick?: () => void; href?: string }) {
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
        <ChevronRight className="h-4 w-4" />
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

  const logout = async () => {
    try {
      if (isDemoAuthed()) {
        window.localStorage.removeItem("campus_demo_authed");
        router.push("/");
        return;
      }
      if (hasSupabaseEnv) {
        await ensureStudentProfile().catch(() => null);
        await supabase.auth.signOut();
      }
    } finally {
      router.push("/");
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-6 sm:px-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">设置</h1>
        <Link href="/profile" className="text-xs font-semibold text-gray-600 hover:text-gray-900">
          返回个人中心
        </Link>
      </header>

      <section className="mt-4 grid gap-3">
        <Row
          icon={<MapPin className="h-5 w-5" />}
          title="收货地址管理"
          right={<span className="rounded-full bg-gray-100 px-2 py-1 text-[11px]">未配置</span>}
          href="/settings#address"
        />
        <Row
          icon={<ShieldCheck className="h-5 w-5" />}
          title="校园实名认证状态"
          right={<span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">已认证</span>}
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
          退出登录
        </button>
      </section>

      <BottomNav />
    </main>
  );
}

