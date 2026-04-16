"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { Live2DDisplay } from "@/components/live2d/Live2DDisplay";

export function AssistantPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-100/80 to-white px-4 pb-10 pt-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-gray-700 backdrop-blur-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-sm font-semibold text-gray-900">Virtual Assistant</h1>
          <div className="w-[72px]" />
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/40 backdrop-blur-lg shadow-[0_20px_60px_-40px_rgba(0,0,0,0.25)]">
            <div className="absolute inset-0">
              <div className="absolute left-1/2 top-0 h-[18rem] w-[26rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-gray-200 to-gray-100 blur-3xl opacity-70" />
            </div>
            <div className="relative h-[520px] w-full">
              <Live2DDisplay modelPath="/models/Haru/Haru.model3.json" />
            </div>
            <div className="relative border-t border-white/30 p-4 text-xs text-gray-600">
              如果模型未显示：把旧项目的 `D:\ent_coursework\nana\frontend\public\models` 复制到本项目
              的 `public/models`（保持同名目录），然后刷新本页。
            </div>
          </section>

          <AssistantPanel />
        </div>
      </div>
    </main>
  );
}

