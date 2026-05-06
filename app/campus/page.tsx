import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { campusPickupZones, campusTradeReminderBullets } from "@/lib/campus";

export default function CampusGuidePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-40 pt-6 sm:px-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50"
          aria-label="返回首页"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">校内二手 · 小指南</h1>
          <p className="text-xs text-slate-500">给校园同学用的速查项，安全、省心、少踩坑。</p>
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">安全与习惯</h2>
        <ul className="mt-3 space-y-3">
          {campusTradeReminderBullets.map((b) => (
            <li key={b.title} className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{b.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{b.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">面交地点怎么选？</h2>
        <p className="mt-1 text-xs text-slate-500">
          首页「面交半径」筛选项会按下面几类去匹配商品里的取货说明，发布时记得写清楚具体门/楼号。
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {campusPickupZones
            .filter((z) => z.id !== "all")
            .map((z) => (
              <div key={z.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                <p className="text-xs font-bold text-slate-900">{z.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-600">{z.shortHint}</p>
              </div>
            ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">什么时候面交更舒服？</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-600">
          <li>午休前 11:40–12:20、傍晚 17:00–18:30 食堂门口人流大、照面方便。</li>
          <li>晚自习后 20:30 以后尽量约灯光好的室内场所（图书馆闭馆口、宿舍区大厅）。</li>
          <li>期末周建议提前约 10 分钟，避免双方赶课误点。</li>
        </ul>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-indigo-50/60 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-indigo-950">还可以怎么用本站？</h2>
        <ul className="mt-2 space-y-1.5 text-xs text-indigo-950/85">
          <li>
            <Link className="font-semibold underline underline-offset-2" href="/?top=wishlist">
              求购墙
            </Link>
            ：发布需求，让有货的同学主动来找你。
          </li>
          <li>
            <Link className="font-semibold underline underline-offset-2" href="/following">
              关注
            </Link>
            ：在首页左上角进入，收藏你常逛的「心动」宝贝。
          </li>
          <li>私聊走站内线程，减少把微信号留在公开留言区。</li>
        </ul>
      </section>

      <BottomNav />
    </main>
  );
}
