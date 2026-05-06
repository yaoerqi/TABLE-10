"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { hasSupabaseEnv, supabase } from "@/lib/supabase/client";
import {
  campusLocations,
  campusMeetupQuickPicks,
  publishItemSchema,
  type PublishItemInput
} from "@/lib/validation/publish-item";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { Item3DViewer } from "@/components/viewer/Item3DViewer";
import { ALL_CATEGORIES } from "@/lib/categories";
import { MIN_AUCTION_END_LEAD_MS } from "@/lib/auction";

function defaultAuctionEndLocal(): string {
  const d = new Date(Date.now() + 26 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const categoryOptions = ALL_CATEGORIES;

function reorderWithCover<T>(items: T[], coverIdx: number): T[] {
  if (!items.length) return items;
  const i = Math.min(Math.max(0, coverIdx), items.length - 1);
  const pick = items[i];
  return [pick, ...items.filter((_, j) => j !== i)];
}

export function PublishItemForm() {
  const router = useRouter();
  const [postType, setPostType] = useState<"item" | "wishlist">("item");
  const [isDragging, setIsDragging] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [threeDPrompt, setThreeDPrompt] = useState("");
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [threeDStatus, setThreeDStatus] = useState<
    "pending" | "processing" | "completed" | "failed" | null
  >(null);
  const [modelGlbUrl, setModelGlbUrl] = useState<string | null>(null);
  const [threeDMessage, setThreeDMessage] = useState<string>("");
  const [threeDProgress, setThreeDProgress] = useState<number | null>(null);
  const [poll3dActive, setPoll3dActive] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [auctionEnabled, setAuctionEnabled] = useState(false);
  const [auctionEndLocal, setAuctionEndLocal] = useState(defaultAuctionEndLocal);
  const [auctionStep, setAuctionStep] = useState("5");

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<PublishItemInput>({
    resolver: zodResolver(publishItemSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      category: ALL_CATEGORIES[0],
      meetupLocation: campusLocations[0]
    }
  });

  const dragAreaClasses = useMemo(() => {
    return isDragging
      ? "border-indigo-500 bg-indigo-50"
      : "border-slate-300 bg-slate-50 hover:border-slate-400";
  }, [isDragging]);

  const previewUrls = useMemo(() => {
    return files.map((file) => URL.createObjectURL(file));
  }, [files]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const onSelectFiles = (selected: FileList | null) => {
    if (!selected) return;
    const incoming = Array.from(selected).filter((file) => file.type.startsWith("image/"));
    if (!incoming.length) return;
    const merged = [...files, ...incoming].slice(0, 6);
    setFiles(merged);
    setCoverImageIndex((prev) =>
      merged.length ? Math.min(prev, merged.length - 1) : 0
    );
  };

  const refreshAuth = async () => {
    if (!hasSupabaseEnv) {
      setAuthUserId(null);
      return;
    }
    const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
    setAuthUserId(me?.ok && me?.user?.id ? String(me.user.id) : null);
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    // Poll once on mount; session is cookie-based.
    void refreshAuth();
  }, []);

  useEffect(() => {
    setSubmitMessage("");
    setCreatedItemId(null);
    setThreeDStatus(null);
    setThreeDMessage("");
    setModelGlbUrl(null);
    setThreeDProgress(null);
    setPoll3dActive(false);
    setCoverImageIndex(0);

    if (postType === "wishlist") {
      setAuctionEnabled(false);
      setFiles([]);
      setThreeDPrompt("");
      const d = getValues("description").trim();
      if (!d) {
        const title = getValues("title").trim();
        const price = getValues("price");
        const loc = getValues("meetupLocation");
        const next = [
          `【求购】${title || "（请补充需求标题）"}`,
          `预算：￥${Number(price || 0).toFixed(0)}，校内自提优先。`,
          `地点：${loc}`,
          "补充说明：成色/型号/附件要求欢迎留言沟通。"
        ].join("\n");
        setValue("description", next, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [postType, getValues, setValue]);

  const triggerMeshyJob = useCallback(async (itemId: string, promptSource: string): Promise<boolean> => {
    setThreeDStatus("processing");
    setThreeDMessage("正在向 Meshy 提交 3D 任务...");
    const resp = await fetch("/api/3d/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        itemId,
        prompt: (threeDPrompt || promptSource || "").toString().slice(0, 600)
      })
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setThreeDStatus("failed");
      const detail =
        json?.details !== undefined ? `（${JSON.stringify(json.details)}）` : "";
      setThreeDMessage(
        `Meshy 任务创建失败：${json?.error ? String(json.error) : resp.statusText}${detail}`
      );
      return false;
    }

    setThreeDStatus("processing");
    setThreeDMessage(`3D 任务已创建：${json.taskId ?? ""}`.trim());
    return true;
  }, [threeDPrompt]);

  const pull3dStatus = useCallback(async (): Promise<"stop" | "continue"> => {
    if (!createdItemId) return "stop";
    const resp = await fetch(`/api/3d/status?itemId=${encodeURIComponent(createdItemId)}`);
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      if (json?.code === "missing_3d_job_id") {
        setThreeDStatus(null);
        setThreeDMessage("正在自动创建 Meshy 任务…");
        const ok = await triggerMeshyJob(createdItemId, getValues("title"));
        return ok ? "continue" : "stop";
      }
      setThreeDMessage(json?.error ? String(json.error) : "刷新失败");
      return "stop";
    }
    const status = (json.status ?? null) as
      | "pending"
      | "processing"
      | "completed"
      | "failed"
      | null;
    setThreeDStatus(status);

    if (typeof json.progress === "number") {
      const p = json.progress;
      setThreeDProgress(
        p >= 0 && p <= 1 ? Math.round(p * 100) : Math.min(Math.round(p), 100)
      );
    }

    if (status === "completed" && createdItemId) {
      setModelGlbUrl(`/api/items/${createdItemId}/model-glb`);
      setThreeDMessage("3D 模型已完成，可预览。");
      setThreeDProgress(100);
      return "stop";
    }
    if (status === "failed") {
      setThreeDMessage("3D 生成失败，可尝试下方「重试创建 3D 任务」。");
      return "stop";
    }
    return "continue";
  }, [createdItemId, triggerMeshyJob, getValues]);

  useEffect(() => {
    if (!poll3dActive || !createdItemId) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const outcome = await pull3dStatus();
      if (outcome === "stop" && !cancelled) {
        setPoll3dActive(false);
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [poll3dActive, createdItemId, pull3dStatus]);

  const publishItem = async (data: PublishItemInput, mode: "wishlist" | "normal" | "3d") => {
    if (!hasSupabaseEnv) {
      setSubmitMessage("请先配置 Supabase 环境变量。");
      return;
    }
    if (!authUserId) {
      setSubmitMessage("请先登录后再发布。");
      return;
    }
    if (postType === "item" && files.length === 0) {
      setSubmitMessage("请至少上传 1 张商品图片。");
      return;
    }

    if (postType === "item" && auctionEnabled) {
      const endMs = Date.parse(auctionEndLocal);
      if (!Number.isFinite(endMs) || endMs < Date.now() + MIN_AUCTION_END_LEAD_MS) {
        setSubmitMessage("拍卖结束时间需至少比当前晚 1 小时。");
        return;
      }
      const st = Number(auctionStep);
      if (!Number.isFinite(st) || st <= 0) {
        setSubmitMessage("加价幅度必须大于 0。");
        return;
      }
    }

    setSubmitMessage("");
    setThreeDMessage("");
    setCreatedItemId(null);
    setThreeDStatus(null);
    setModelGlbUrl(null);
    setThreeDProgress(null);
    setPoll3dActive(false);
    // Category is stored as-is (Chinese categories) for richer filtering.

    if (postType === "wishlist") {
      const resp = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requested_item: data.title, budget: data.price })
      }).catch(() => null);
      const json = (await resp?.json().catch(() => null)) as null | { ok?: boolean; error?: string };
      if (!resp || !resp.ok || !json?.ok) {
        setSubmitMessage(`发布求购失败：${json?.error ? String(json.error) : resp?.statusText || "Network error"}`);
        return;
      }
      setSubmitMessage("求购发布成功！");
      setFiles([]);
      setThreeDPrompt("");
      return;
    }

    const uploadedUrls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.set("file", file);
      const resp = await fetch("/api/upload/item-image", { method: "POST", body: fd }).catch(() => null);
      const json = (await resp?.json().catch(() => null)) as null | { ok?: boolean; url?: string; error?: string };
      if (!resp || !resp.ok || !json?.ok || !json.url) {
        setSubmitMessage(`图片上传失败：${json?.error ? String(json.error) : resp?.statusText || "Network error"}`);
        return;
      }
      uploadedUrls.push(String(json.url));
    }

    const imagesForDb = reorderWithCover(uploadedUrls, coverImageIndex);
    const use3d = mode === "3d";

    const createResp = await fetch("/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        meetup_location: data.meetupLocation,
        images_array: imagesForDb,
        "3d_status": use3d ? "pending" : "failed",
        ...(auctionEnabled
          ? {
              is_auction: true,
              auction_end_at: new Date(Date.parse(auctionEndLocal)).toISOString(),
              auction_step: Number(auctionStep)
            }
          : {})
      })
    }).catch(() => null);
    const createJson = (await createResp?.json().catch(() => null)) as
      | null
      | { ok?: boolean; itemId?: string; error?: string };
    if (!createResp || !createResp.ok || !createJson?.ok) {
      setSubmitMessage(`发布失败：${createJson?.error ? String(createJson.error) : createResp?.statusText || "Network error"}`);
      return;
    }
    const itemId = createJson?.itemId as string | undefined;
    if (!itemId) {
      setSubmitMessage("发布成功，但未获取到 itemId。");
      setFiles([]);
      return;
    }

    setCreatedItemId(itemId);
    setSubmitMessage("发布成功！");
    setFiles([]);

    if (use3d) {
      setThreeDProgress(0);
      const meshyOk = await triggerMeshyJob(itemId, data.title);
      if (meshyOk) setPoll3dActive(true);
    }
  };

  const optimizeCopy = async () => {
    const title = getValues("title").trim();
    const category = getValues("category");
    const meetupLocation = getValues("meetupLocation");
    const price = getValues("price");
    if (!title) {
      setSubmitMessage("请先填写标题，再用 AI 优化文案。");
      return;
    }
    setSubmitMessage("");
    setOptimizing(true);
    try {
      const resp = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: title })
      });
      const json = await resp.json().catch(() => ({}));
      const hint =
        resp.ok && json?.ok && Array.isArray(json?.results) && json.results.length
          ? `参考热度：同类热门 ${String(json.results[0]?.title ?? "").slice(0, 40)}`
          : "";

      const next = [
        `【${postType === "wishlist" ? "求购" : "闲置转让"}】${title}`,
        postType === "wishlist"
          ? `预算：￥${Number(price || 0).toFixed(0)}，最好校内自提，急的话可当面看货/验机。`
          : `价格：￥${Number(price || 0).toFixed(0)}，同学爽快可小刀。`,
        `分类：${category}｜交易地点：${meetupLocation}`,
        "亮点：",
        "- 走闲鱼同款“信息清晰”写法：成色/附件/瑕疵/使用时长都欢迎留言问我",
        hint ? `- ${hint}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      setValue("description", next, { shouldValidate: true, shouldDirty: true });
    } catch (e: any) {
      setSubmitMessage(e?.message ?? "AI 优化失败");
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6">
      {!authUserId ? <LoginScreen onAuthed={refreshAuth} /> : null}
      {authUserId ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900">
            {postType === "wishlist" ? "发布求购" : "发布宝贝"}
          </h1>
          <div className="inline-flex shrink-0 rounded-full bg-gray-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setPostType("item")}
              className={["rounded-full px-3 py-1.5 font-semibold", postType === "item" ? "bg-black text-white" : "text-gray-700"].join(" ")}
            >
              出售宝贝
            </button>
            <button
              type="button"
              onClick={() => setPostType("wishlist")}
              className={["rounded-full px-3 py-1.5 font-semibold", postType === "wishlist" ? "bg-black text-white" : "text-gray-700"].join(" ")}
            >
              求购需求
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {postType === "wishlist"
            ? "把你的需求说清楚，同学们会来留言联系你。"
            : "Create a clean listing so students can find your item quickly."}
        </p>

        <form
          onSubmit={
            postType === "wishlist"
              ? handleSubmit((data) => publishItem(data, "wishlist"))
              : (e) => e.preventDefault()
          }
          className="mt-6 space-y-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {postType === "wishlist" ? "需求标题" : "Title"}
            </span>
            <input
              {...register("title")}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
              placeholder={postType === "wishlist" ? "例如：求购 二手 iPad 9 代 64G" : "e.g. Calculus Textbook 9th Edition"}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between">
              <span className="block text-sm font-medium text-slate-700">Description</span>
              <button
                type="button"
                onClick={optimizeCopy}
                disabled={optimizing}
                className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {optimizing ? "优化中..." : "AI 优化文案"}
              </button>
            </div>
            <textarea
              {...register("description")}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
              placeholder="Condition, purchase time, included accessories..."
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
            )}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {postType === "wishlist" ? "预算" : auctionEnabled ? "起拍价" : "Price"}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register("price")}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Category</span>
              <select
                {...register("category")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {postType === "item" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <label className="flex cursor-pointer items-start gap-2 text-sm font-semibold text-slate-900">
                <input
                  type="checkbox"
                  checked={auctionEnabled}
                  onChange={(e) => setAuctionEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>以拍卖出售（上方价格为起拍价，需填写结束时间与加价幅度）</span>
              </label>
              {auctionEnabled ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">拍卖结束时间</span>
                    <input
                      type="datetime-local"
                      value={auctionEndLocal}
                      onChange={(e) => setAuctionEndLocal(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">每次最少加价（元）</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={auctionStep}
                      onChange={(e) => setAuctionStep(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">校门面交点</span>
            <p className="mb-2 text-[11px] text-slate-500">
              选常用热点更利于同学在首页「面交半径」里筛到你；也可在下拉里选英文旧版占位。
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {campusMeetupQuickPicks.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setValue("meetupLocation", preset.value, { shouldValidate: true, shouldDirty: true })}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <select
              {...register("meetupLocation")}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
            >
              {campusLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          {postType === "item" ? (
            <>
              <div
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${dragAreaClasses}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  onSelectFiles(event.dataTransfer.files);
                }}
              >
                <p className="text-sm font-medium text-slate-700">Drag and drop photos here</p>
                <p className="mt-1 text-xs text-slate-500">
                  最多 6 张，提交后会上传到 Supabase Storage `item-images` 桶
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => onSelectFiles(event.target.files)}
                  className="mt-3 block w-full text-xs text-slate-600"
                />
                <button
                  type="button"
                  className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                >
                  已选择 {files.length} 张
                </button>
              </div>
              {previewUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {previewUrls.map((url, idx) => (
                    <img
                      key={`${url}-${idx}`}
                      src={url}
                      alt={`preview-${idx}`}
                      className="h-20 w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              ) : null}
              {previewUrls.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-1 block text-sm font-medium text-slate-700">封面图</span>
                  <p className="mb-3 text-[11px] text-slate-500">
                    选一张作为列表与详情页顶部展示图；也会作为 3D 生成所用的参考图（排在第一张）。
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {previewUrls.map((url, idx) => (
                      <button
                        key={`cover-${url}-${idx}`}
                        type="button"
                        onClick={() => setCoverImageIndex(idx)}
                        className={[
                          "relative overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-slate-50 transition",
                          coverImageIndex === idx
                            ? "ring-indigo-600"
                            : "ring-transparent hover:ring-slate-300"
                        ].join(" ")}
                      >
                        <img
                          src={url}
                          alt={`封面候选 ${idx + 1}`}
                          className="aspect-square w-full object-cover"
                        />
                        {coverImageIndex === idx ? (
                          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            封面
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">求购提示</p>
              <p className="mt-1 text-xs text-slate-600">
                求购需求通常不需要上传图片。发布后同学们会在“留言问答”里联系你。
              </p>
            </div>
          )}

          {postType === "item" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="mb-2 block text-sm font-medium text-slate-700">3D 生成（可选）</span>
              <p className="mb-3 text-xs text-slate-500">
                点击下方「3D 发布」时使用封面图排队生成模型；选「普通发布」则只上架图文，不触发 Meshy。
              </p>
              <input
                value={threeDPrompt}
                onChange={(e) => setThreeDPrompt(e.target.value)}
                placeholder="可选：3D 补充提示词（例如：一双白色运动鞋，干净背景）"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
              />
            </div>
          ) : null}

          {postType === "wishlist" ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Publishing..." : "发布求购"}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit((d) => publishItem(d, "normal"))}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "发布中…" : "普通发布"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit((d) => publishItem(d, "3d"))}
                  className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "发布中…" : "3D 发布"}
                </button>
              </div>
              <p className="text-center text-[11px] text-slate-500">
                普通发布更快；3D 发布会自动生成预览（通常几分钟，下方可看进度）。
              </p>
            </div>
          )}
          {submitMessage ? <p className="text-sm text-slate-600">{submitMessage}</p> : null}

          {postType === "item" && createdItemId ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">3D Pipeline</p>
              <p className="mt-1 text-xs text-slate-600">itemId: {createdItemId}</p>
              <p className="mt-1 text-xs text-slate-600">
                status: {threeDStatus ?? "—"}
                {poll3dActive ? " · 自动刷新中" : ""}
              </p>
              {poll3dActive &&
              threeDStatus !== "completed" &&
              threeDStatus !== "failed" ? (
                <div className="mt-3 space-y-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full bg-indigo-600 transition-[width] duration-700 ease-out ${
                        threeDProgress == null ? "animate-pulse" : ""
                      }`}
                      style={{
                        width:
                          threeDProgress != null ? `${threeDProgress}%` : "38%"
                      }}
                    />
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {threeDProgress != null ? `${threeDProgress}% · ` : ""}
                    Meshy 正在生成 3D，请稍候（通常几分钟）。进度来自服务商接口，部分阶段可能无百分比。
                  </p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (!createdItemId) return;
                  void (async () => {
                    setThreeDProgress(0);
                    const ok = await triggerMeshyJob(createdItemId, getValues("title"));
                    if (ok) setPoll3dActive(true);
                  })();
                }}
                className="mt-3 h-10 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
              >
                开始创建 3D 任务
              </button>
              {threeDMessage ? <p className="mt-2 text-xs text-slate-600">{threeDMessage}</p> : null}
            </div>
          ) : null}

          {postType === "item" && modelGlbUrl ? (
            <Item3DViewer
              modelGlbUrl={modelGlbUrl}
              posterUrl={previewUrls[coverImageIndex] ?? previewUrls[0]}
            />
          ) : null}

          {(postType === "item" && createdItemId) ||
          (postType === "wishlist" && submitMessage.includes("成功")) ? (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-8 h-12 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
            >
              完成
            </button>
          ) : null}
        </form>
        </section>
      ) : null}
    </main>
  );
}
