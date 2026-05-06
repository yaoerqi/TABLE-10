"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { hasSupabaseEnv, supabase } from "@/lib/supabase/client";

type Msg = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const threadId = (params?.id ?? "").toString();

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => `私聊`, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    (async () => {
      if (!hasSupabaseEnv) {
        setErrorText("未配置 Supabase 环境变量");
        setLoading(false);
        return;
      }
      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      setMyId(me?.ok && me?.user?.id ? String(me.user.id) : null);

      if (!threadId) {
        setErrorText("缺少 threadId");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorText("");
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,thread_id,sender_id,content,created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        setErrorText(error.message);
        setLoading(false);
        return;
      }
      setMessages((data ?? []) as Msg[]);
      setLoading(false);
      setTimeout(scrollToBottom, 50);
    })();
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !hasSupabaseEnv) return;
    const channel = supabase
      .channel(`chat:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const row = payload.new as any;
          if (!row?.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row as Msg];
          });
          setTimeout(scrollToBottom, 30);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    if (!myId) {
      setErrorText("请先登录后再发送。");
      return;
    }
    setDraft("");
    setErrorText("");
    const { error } = await supabase.from("chat_messages").insert({
      thread_id: threadId,
      sender_id: myId,
      content: text
    });
    if (error) setErrorText(error.message);
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
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-800">
              返回首页
            </Link>
          </div>
        </div>
      </header>

      {loading ? <p className="mt-6 text-sm text-gray-500">Loading...</p> : null}
      {errorText ? <p className="mt-4 text-sm text-red-600">{errorText}</p> : null}

      <section className="mt-5 rounded-3xl border border-white/30 bg-white/60 p-4 backdrop-blur-xl shadow-[0_16px_60px_-45px_rgba(0,0,0,0.28)]">
        <div className="max-h-[62vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            {messages.map((m) => {
              const mine = myId && m.sender_id === myId;
              return (
                <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={[
                      "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      mine ? "bg-black text-white" : "bg-white/80 text-slate-900"
                    ].join(" ")}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="和商家聊聊：能否小刀、当面验货..."
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

