"use client";

import { useMemo, useRef, useState } from "react";
import { Mic, Search } from "lucide-react";
import { mockItems } from "@/lib/mock/items";
import { searchItems } from "@/lib/assistant/search";
import { demoListingLocation, demoListingTitle } from "@/lib/i18n/demoListing";
import { useLocale } from "@/components/providers/LocaleProvider";

export function AssistantPanel() {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const recognitionRef = useRef<any>(null);
  const { locale } = useLocale();

  const { need, results } = useMemo(() => {
    if (!lastQuery) return { need: null as any, results: [] as any[] };
    return searchItems(lastQuery, mockItems);
  }, [lastQuery]);

  const runSearch = () => setLastQuery(query.trim());

  const startVoice = () => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert("当前浏览器不支持语音识别（建议用 Chrome）。");
      return;
    }
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

  return (
    <section className="w-full">
      <div className="rounded-3xl border border-white/30 bg-white/70 p-4 backdrop-blur-lg shadow-[0_20px_60px_-40px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-3 backdrop-blur-md">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：我想买二手电脑，13寸，预算3000，苹果/联想都可以"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
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
          <button
            type="button"
            onClick={runSearch}
            className="h-9 rounded-full bg-black px-4 text-xs font-semibold text-white"
          >
            Search
          </button>
        </div>

        {lastQuery ? (
          <div className="mt-4 text-xs text-gray-500">
            解析结果：
            <span className="ml-2 text-gray-900">
              {need?.category ? `类别=${need.category} ` : ""}
              {need?.brand ? `品牌=${need.brand} ` : ""}
              {need?.sizeInch ? `尺寸≈${need.sizeInch}寸 ` : ""}
            </span>
          </div>
        ) : (
          <p className="mt-4 text-xs text-gray-500">
            提示：你可以直接说需求（品牌/尺寸/用途/预算），助手会优先匹配相关商品。
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {results.map(({ item, score }) => (
            <article key={item.id} className="rounded-2xl bg-white p-3">
              <div className="overflow-hidden rounded-2xl bg-gray-100">
                <img
                  src={item.imageUrl}
                  alt={demoListingTitle(item.id, locale)}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-medium text-gray-800">
                {demoListingTitle(item.id, locale)}
              </h3>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-bold text-black">${item.price.toFixed(2)}</p>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500">
                  {demoListingLocation(item.id, locale)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">match score: {score}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

