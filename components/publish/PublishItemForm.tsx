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
import { categoryLabel } from "@/lib/i18n/categoryLabel";
import { MIN_AUCTION_END_LEAD_MS } from "@/lib/auction";
import { useLocale } from "@/components/providers/LocaleProvider";

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
  const { t, locale } = useLocale();
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
          t("publish.wishTemplateTitle", { title: title || t("publish.wishTitleFallback") }),
          t("publish.wishTemplateBudget", { n: Number(price || 0).toFixed(0) }),
          t("publish.wishTemplateLoc", { loc }),
          t("publish.wishTemplateNote")
        ].join("\n");
        setValue("description", next, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [postType, getValues, setValue, t]);

  const triggerMeshyJob = useCallback(async (itemId: string, promptSource: string): Promise<boolean> => {
    setThreeDStatus("processing");
    setThreeDMessage(t("publish.meshySubmitting"));
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
        `${t("publish.meshyFailPrefix")} ${json?.error ? String(json.error) : resp.statusText}${detail}`
      );
      return false;
    }

    setThreeDStatus("processing");
    setThreeDMessage(`${t("publish.meshyCreatedPrefix")} ${json.taskId ?? ""}`.trim());
    return true;
  }, [threeDPrompt, t]);

  const pull3dStatus = useCallback(async (): Promise<"stop" | "continue"> => {
    if (!createdItemId) return "stop";
    const resp = await fetch(`/api/3d/status?itemId=${encodeURIComponent(createdItemId)}`);
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      if (json?.code === "missing_3d_job_id") {
        setThreeDStatus(null);
        setThreeDMessage(t("publish.meshyAutoCreate"));
        const ok = await triggerMeshyJob(createdItemId, getValues("title"));
        return ok ? "continue" : "stop";
      }
      setThreeDMessage(json?.error ? String(json.error) : t("publish.refreshFail"));
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
      setThreeDMessage(t("publish.modelDone"));
      setThreeDProgress(100);
      return "stop";
    }
    if (status === "failed") {
      setThreeDMessage(t("publish.modelFail"));
      return "stop";
    }
    return "continue";
  }, [createdItemId, triggerMeshyJob, getValues, t]);

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
      setSubmitMessage(t("publish.supabaseFirst"));
      return;
    }
    if (!authUserId) {
      setSubmitMessage(t("publish.loginFirst"));
      return;
    }
    if (postType === "item" && files.length === 0) {
      setSubmitMessage(t("publish.imageRequired"));
      return;
    }

    if (postType === "item" && auctionEnabled) {
      const endMs = Date.parse(auctionEndLocal);
      if (!Number.isFinite(endMs) || endMs < Date.now() + MIN_AUCTION_END_LEAD_MS) {
        setSubmitMessage(t("publish.auctionEndTooSoon"));
        return;
      }
      const st = Number(auctionStep);
      if (!Number.isFinite(st) || st <= 0) {
        setSubmitMessage(t("publish.stepPositive"));
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
        setSubmitMessage(`${t("publish.wishFailPrefix")} ${json?.error ? String(json.error) : resp?.statusText || "Network error"}`);
        return;
      }
      setSubmitMessage(t("publish.wishOk"));
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
        setSubmitMessage(`${t("publish.uploadFailPrefix")} ${json?.error ? String(json.error) : resp?.statusText || "Network error"}`);
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
      setSubmitMessage(`${t("publish.createFailPrefix")} ${createJson?.error ? String(createJson.error) : createResp?.statusText || "Network error"}`);
      return;
    }
    const itemId = createJson?.itemId as string | undefined;
    if (!itemId) {
      setSubmitMessage(t("publish.noItemId"));
      setFiles([]);
      return;
    }

    setCreatedItemId(itemId);
    setSubmitMessage(t("publish.publishOk"));
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
      setSubmitMessage(t("publish.fillTitleFirst"));
      return;
    }
    setSubmitMessage("");
    setOptimizing(true);
    try {
      const resp = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: title, locale })
      });
      const json = await resp.json().catch(() => ({}));
      const hint =
        resp.ok && json?.ok && Array.isArray(json?.results) && json.results.length
          ? t("publish.aiHintHot", { title: String(json.results[0]?.title ?? "").slice(0, 40) })
          : "";

      const next = [
        `【${postType === "wishlist" ? t("publish.aiTagWish") : t("publish.aiTagItem")}】${title}`,
        postType === "wishlist"
          ? t("publish.aiLineWish", { n: Number(price || 0).toFixed(0) })
          : t("publish.aiLineItem", { n: Number(price || 0).toFixed(0) }),
        t("publish.aiLineMeta", { cat: category, loc: meetupLocation }),
        t("publish.aiBullet"),
        t("publish.aiBulletDetail"),
        hint ? `- ${hint}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      setValue("description", next, { shouldValidate: true, shouldDirty: true });
    } catch (e: any) {
      setSubmitMessage(e?.message ?? t("publish.aiOptimizeFail"));
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
            {postType === "wishlist" ? t("publish.titleWish") : t("publish.titleItem")}
          </h1>
          <div className="inline-flex shrink-0 rounded-full bg-gray-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setPostType("item")}
              className={["rounded-full px-3 py-1.5 font-semibold", postType === "item" ? "bg-black text-white" : "text-gray-700"].join(" ")}
            >
              {t("publish.sellTab")}
            </button>
            <button
              type="button"
              onClick={() => setPostType("wishlist")}
              className={["rounded-full px-3 py-1.5 font-semibold", postType === "wishlist" ? "bg-black text-white" : "text-gray-700"].join(" ")}
            >
              {t("publish.wishTab")}
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {postType === "wishlist" ? t("publish.subtitleWish") : t("publish.subtitleItem")}
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
              {postType === "wishlist" ? t("publish.labelWishTitle") : t("publish.labelTitleItem")}
            </span>
            <input
              {...register("title")}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
              placeholder={postType === "wishlist" ? t("publish.phWishTitle") : t("publish.phItemTitle")}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between">
              <span className="block text-sm font-medium text-slate-700">{t("publish.labelDescription")}</span>
              <button
                type="button"
                onClick={optimizeCopy}
                disabled={optimizing}
                className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {optimizing ? t("publish.optimizing") : t("publish.aiOptimize")}
              </button>
            </div>
            <textarea
              {...register("description")}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
              placeholder={t("publish.phDescription")}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
            )}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {postType === "wishlist"
                  ? t("publish.labelBudget")
                  : auctionEnabled
                    ? t("publish.labelStartPrice")
                    : t("publish.labelPrice")}
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
              <span className="mb-2 block text-sm font-medium text-slate-700">{t("publish.labelCategory")}</span>
              <select
                {...register("category")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel(category, t)}
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
                <span>{t("publish.auctionCheckbox")}</span>
              </label>
              {auctionEnabled ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">{t("publish.auctionEnd")}</span>
                    <input
                      type="datetime-local"
                      value={auctionEndLocal}
                      onChange={(e) => setAuctionEndLocal(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">{t("publish.minBidStep")}</span>
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
            <span className="mb-2 block text-sm font-medium text-slate-700">{t("publish.meetupTitle")}</span>
            <p className="mb-2 text-[11px] text-slate-500">{t("publish.meetupHint")}</p>
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
                <p className="text-sm font-medium text-slate-700">{t("publish.dragPhotos")}</p>
                <p className="mt-1 text-xs text-slate-500">{t("publish.photoLimit")}</p>
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
                  {t("publish.selectedCount", { n: files.length })}
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
                  <span className="mb-1 block text-sm font-medium text-slate-700">{t("publish.coverTitle")}</span>
                  <p className="mb-3 text-[11px] text-slate-500">{t("publish.coverHint")}</p>
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
                          alt={t("publish.coverAlt", { n: idx + 1 })}
                          className="aspect-square w-full object-cover"
                        />
                        {coverImageIndex === idx ? (
                          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {t("publish.coverBadge")}
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
              <p className="text-sm font-semibold text-slate-900">{t("publish.wishTipsTitle")}</p>
              <p className="mt-1 text-xs text-slate-600">{t("publish.wishTipsBody")}</p>
            </div>
          )}

          {postType === "item" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="mb-2 block text-sm font-medium text-slate-700">{t("publish.optional3dTitle")}</span>
              <p className="mb-3 text-xs text-slate-500">{t("publish.optional3dHint")}</p>
              <input
                value={threeDPrompt}
                onChange={(e) => setThreeDPrompt(e.target.value)}
                placeholder={t("publish.optional3dPh")}
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
              {isSubmitting ? t("publish.publishing") : t("publish.submitWish")}
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
                  {isSubmitting ? t("publish.publishing") : t("publish.publishNormal")}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit((d) => publishItem(d, "3d"))}
                  className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? t("publish.publishing") : t("publish.publish3d")}
                </button>
              </div>
              <p className="text-center text-[11px] text-slate-500">{t("publish.publish3dHint")}</p>
            </div>
          )}
          {submitMessage ? <p className="text-sm text-slate-600">{submitMessage}</p> : null}

          {postType === "item" && createdItemId ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{t("publish.pipelineTitle")}</p>
              <p className="mt-1 text-xs text-slate-600">itemId: {createdItemId}</p>
              <p className="mt-1 text-xs text-slate-600">
                {t("publish.statusLabel")} {threeDStatus ?? "—"}
                {poll3dActive ? t("publish.autoRefresh") : ""}
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
                    {t("publish.meshyWait")}
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
                {t("publish.startMeshy")}
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
          (postType === "wishlist" && submitMessage === t("publish.wishOk")) ? (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-8 h-12 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
            >
              {t("publish.done")}
            </button>
          ) : null}
        </form>
        </section>
      ) : null}
    </main>
  );
}
