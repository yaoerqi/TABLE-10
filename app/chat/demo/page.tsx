"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";

type Row = { id: string; role: "hint" | "me"; content: string };

function DemoChatContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const itemTitle = sp.get("title")?.trim() || "演示商品";

  const [draft, setDraft] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRows([
      {
        id: "welcome",
        role: "hint",
        content:
          "演示模式：界面与真实私聊一致。你的消息仅保存在本页内存中，刷新后会清空；虚拟卖家不会自动回复，便于向评委展示操作流程。"
      }
    ]);
  }, []);

  const heading = useMemo(() => `私聊 · ${itemTitle}`, [itemTitle]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 50);
  }, [rows.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setRows((r) => [
      ...r,
      { id: `me-${Date.now()}`, role: "me", content: text }
    ]);
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-6 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-slate-900 backdrop-blur hover:bg-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-bold text-slate-900">{heading}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                演示会话
              </span>
              <Link href="/" className="hover:text-slate-800">
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-5 rounded-3xl border border-white/30 bg-white/60 p-4 backdrop-blur-xl shadow-[0_16px_60px_-45px_rgba(0,0,0,0.28)]">
        <div className="max-h-[62vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            {rows.map((m) => (
              <div
                key={m.id}
                className={m.role === "me" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "me"
                      ? "bg-black text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700"
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="输入消息并发送（演示）…"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              send();
            }}
          />
          <button
            type="button"
            onClick={send}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

export default function DemoChatPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 pt-6">
          <p className="text-sm text-slate-500">加载演示私聊…</p>
        </main>
      }
    >
      <DemoChatContent />
    </Suspense>
  );
}
