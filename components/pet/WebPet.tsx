"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Mic, Send } from "lucide-react";
import { Live2DDisplay } from "@/components/live2d/Live2DDisplay";

type SearchResult = {
  score: number;
  id: string;
  title: string;
  price: number;
  meetupLocation: string;
  imageUrl: string;
  category: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

export function WebPet() {
  const [open, setOpen] = useState(true); // default enabled
  const [petHidden, setPetHidden] = useState<"none" | "left" | "right">("none");
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<"chat" | "search">("chat");
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: "assistant", content: "我在这！你可以问我怎么挑选、砍价技巧，或直接描述你想要的商品～" }
  ]);
  const recognitionRef = useRef<any>(null);
  const [modelOk, setModelOk] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);

  const canVoice = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pos.x !== -1 || pos.y !== -1) return;
    // Default position: right bottom, but leave room for bottom nav
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPos({ x: Math.max(12, w - 220 - 12), y: Math.max(12, h - 260 - 92) });
  }, [pos.x, pos.y]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      const resp = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) {
        setError(json?.message ? String(json.message) : "搜索失败");
        setResults([]);
        return;
      }
      setResults((json.results ?? []) as SearchResult[]);
    } catch (e: any) {
      setError(e?.message ?? "网络错误");
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    setQuery("");
    const next = [...chat, { role: "user", content: trimmed }] as ChatMsg[];
    setChat(next);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) {
        setError(json?.message ? String(json.message) : "聊天失败");
        setChat((c) => [...c, { role: "assistant", content: "我这边出错了，稍后再试试～" }]);
        return;
      }
      const reply = (json.text ?? "").toString().trim() || "（我暂时没有想法，可以换个问法）";
      setChat((c) => [...c, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(e?.message ?? "网络错误");
      setChat((c) => [...c, { role: "assistant", content: "网络好像不太行，我先待命～" }]);
    } finally {
      setBusy(false);
    }
  };

  const startVoice = () => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) return;

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "zh-CN";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (event: any) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0]?.transcript ?? "")
        .join("")
        .trim();
      setQuery(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    setListening(true);
    rec.start();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-5 z-[60] rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-xl"
      >
        打开桌宠
      </button>
    );
  }

  if (petHidden !== "none") {
    const edge = petHidden === "left" ? "left-0" : "right-0";
    return (
      <button
        type="button"
        onClick={() => setPetHidden("none")}
        className={[
          "fixed top-1/2 z-[60] -translate-y-1/2 rounded-full bg-black/90 px-3 py-2 text-xs font-semibold text-white shadow-xl",
          edge
        ].join(" ")}
        aria-label="唤醒桌宠"
      >
        唤醒
      </button>
    );
  }

  const petW = 220;
  const petH = 260;
  const snap = 24;

  return (
    <div
      className="fixed z-[60] select-none"
      style={{
        left: pos.x === -1 ? undefined : `${pos.x}px`,
        top: pos.y === -1 ? undefined : `${pos.y}px`,
        width: `${petW}px`
      }}
    >
      {panelOpen ? (
        <div className="absolute -top-2 right-0 translate-x-[calc(100%+10px)] w-[320px]">
          <div className="rounded-3xl bg-white/85 backdrop-blur-xl shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)] border border-white/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("chat")}
                  className={["rounded-full px-3 py-1", mode === "chat" ? "bg-black text-white" : "text-gray-600"].join(" ")}
                >
                  聊天
                </button>
                <button
                  type="button"
                  onClick={() => setMode("search")}
                  className={["rounded-full px-3 py-1", mode === "search" ? "bg-black text-white" : "text-gray-600"].join(" ")}
                >
                  搜商品
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                收起
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === "chat" ? "和我聊聊：比如怎么选二手手机？" : "例如：二手iPhone 预算2000"}
                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (mode === "chat") sendChat(query);
                  else runSearch(query);
                }}
              />
              {canVoice ? (
                <button
                  type="button"
                  onClick={startVoice}
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full transition",
                    listening ? "bg-black text-white" : "bg-gray-100 text-gray-700"
                  ].join(" ")}
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => (mode === "chat" ? sendChat(query) : runSearch(query))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white disabled:opacity-60"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

            {mode === "chat" ? (
              <div className="mt-3 max-h-[260px] space-y-2 overflow-auto pr-1">
                {chat.slice(-12).map((m, idx) => (
                  <div
                    key={`${m.role}-${idx}`}
                    className={[
                      "rounded-2xl px-3 py-2 text-xs leading-relaxed",
                      m.role === "user" ? "bg-black text-white ml-10" : "bg-gray-100 text-gray-800 mr-10"
                    ].join(" ")}
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            ) : results.length ? (
              <div className="mt-3 grid gap-2">
                {results.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
                    <img src={r.imageUrl} alt={r.title} className="h-12 w-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-900">{r.title}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {r.category} · ${Number(r.price).toFixed(0)} · {r.meetupLocation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-gray-500">
                我可以帮你快速搜商品，也支持语音输入。
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div
        className="relative"
        style={{ width: `${petW}px`, height: `${petH}px` }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          dragRef.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            originX: pos.x,
            originY: pos.y
          };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current?.dragging) return;
          if (typeof window === "undefined") return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          const maxX = window.innerWidth - petW;
          const maxY = window.innerHeight - petH - 72;
          const nx = Math.min(Math.max(0, dragRef.current.originX + dx), Math.max(0, maxX));
          const ny = Math.min(Math.max(0, dragRef.current.originY + dy), Math.max(0, maxY));
          pendingPosRef.current = { x: nx, y: ny };
          if (rafRef.current == null) {
            rafRef.current = requestAnimationFrame(() => {
              rafRef.current = null;
              if (pendingPosRef.current) setPos(pendingPosRef.current);
            });
          }
        }}
        onPointerUp={() => {
          if (typeof window !== "undefined") {
            const maxX = window.innerWidth - petW;
            if (pos.x <= snap) {
              setPetHidden("left");
              setPanelOpen(false);
              return;
            }
            if (pos.x >= maxX - snap) {
              setPetHidden("right");
              setPanelOpen(false);
              return;
            }
          }
          if (dragRef.current) dragRef.current.dragging = false;
        }}
        onDoubleClick={() => setPanelOpen((v) => !v)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPanelOpen((v) => !v);
          }}
          className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-800 backdrop-blur shadow-sm"
          aria-label="打开聊天"
          title="打开聊天/咨询"
        >
          <MessageCircle className="h-4 w-4" />
        </button>

        <div className="h-full w-full">
          <Live2DDisplay
            modelPath="/models/Haru/Haru.model3.json"
            onReady={() => setModelOk(true)}
            onError={() => setModelOk(false)}
          />
        </div>

        {!modelOk ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-white/80 px-3 py-2 text-[11px] text-gray-700 backdrop-blur">
              模型加载失败（请检查控制台 / 资源路径）
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

