"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { hasSupabaseEnv, supabase } from "@/lib/supabase/client";
import {
  campusLocations,
  publishItemSchema,
  type PublishItemInput
} from "@/lib/validation/publish-item";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { ensureStudentProfile } from "@/lib/supabase/studentAuth";
import { isDemoAuthed } from "@/lib/demo/demoAuth";
import { Item3DViewer } from "@/components/viewer/Item3DViewer";

const categoryOptions = ["Textbooks", "Tech", "Dorm", "Skill Swap"] as const;

export function PublishItemForm() {
  const [isDragging, setIsDragging] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [threeDStatus, setThreeDStatus] = useState<
    "pending" | "processing" | "completed" | "failed" | null
  >(null);
  const [modelGlbUrl, setModelGlbUrl] = useState<string | null>(null);
  const [threeDMessage, setThreeDMessage] = useState<string>("");
  const [refreshing3d, setRefreshing3d] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<PublishItemInput>({
    resolver: zodResolver(publishItemSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      category: "Textbooks",
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
  };

  const onSelectVideo = (file: File | null) => {
    if (!file) {
      setVideoFile(null);
      return;
    }
    if (!file.type.startsWith("video/")) {
      setSubmitMessage("请选择视频文件（mp4/mov）。");
      return;
    }
    setVideoFile(file);
  };

  const refreshAuth = async () => {
    if (isDemoAuthed()) {
      setAuthUserId("demo-user");
      return;
    }
    if (!hasSupabaseEnv) {
      setAuthUserId(null);
      return;
    }
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setAuthUserId(null);
      return;
    }
    const res = await ensureStudentProfile();
    setAuthUserId(res.ok ? user.id : null);
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const onSubmit = async (data: PublishItemInput) => {
    if (!hasSupabaseEnv) {
      setSubmitMessage("请先配置 Supabase 环境变量。");
      return;
    }
    if (!authUserId) {
      setSubmitMessage("请先登录后再发布。");
      return;
    }
    if (files.length === 0) {
      setSubmitMessage("请至少上传 1 张商品图片。");
      return;
    }

    if (isDemoAuthed()) {
      setSubmitMessage(`演示模式：已生成发布草稿（${files.length} 张图片未上传）。`);
      setFiles([]);
      return;
    }

    setSubmitMessage("");
    setThreeDMessage("");
    setCreatedItemId(null);
    setThreeDStatus(null);
    setModelGlbUrl(null);
    const categoryMap: Record<
      PublishItemInput["category"],
      "Books" | "Electronics" | "Skills" | "Dorms"
    > = {
      Textbooks: "Books",
      Tech: "Electronics",
      Dorm: "Dorms",
      "Skill Swap": "Skills"
    };

    const uploadedUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${authUserId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setSubmitMessage(`图片上传失败：${uploadError.message}`);
        return;
      }
      const { data: publicData } = supabase.storage.from("item-images").getPublicUrl(path);
      uploadedUrls.push(publicData.publicUrl);
    }

    const { data: inserted, error } = await supabase
      .from("items")
      .insert({
      seller_id: authUserId,
      title: data.title,
      description: data.description,
      price: data.price,
      category: categoryMap[data.category],
      meetup_location: data.meetupLocation,
      images_array: uploadedUrls,
      status: "available",
      "3d_status": videoFile ? "pending" : "pending"
    })
      .select("id")
      .single();
    if (error) {
      setSubmitMessage(`发布失败：${error.message}`);
      return;
    }
    const itemId = inserted?.id as string | undefined;
    if (!itemId) {
      setSubmitMessage("发布成功，但未获取到 itemId。");
      setFiles([]);
      return;
    }

    setCreatedItemId(itemId);
    setSubmitMessage("发布成功！");
    setFiles([]);

    // If a video was provided, trigger the 3D job.
    if (videoFile) {
      setThreeDStatus("processing");
      setThreeDMessage("已提交 3D 生成任务（processing）。");
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setThreeDStatus("failed");
        setThreeDMessage("无法获取登录 token，无法触发 3D 生成。");
        return;
      }

      const fd = new FormData();
      fd.append("itemId", itemId);
      fd.append("video", videoFile);

      const resp = await fetch("/api/3d/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setThreeDStatus("failed");
        setThreeDMessage(json?.error ? String(json.error) : "3D 任务创建失败");
        return;
      }

      setThreeDStatus("processing");
      setThreeDMessage(`3D 任务已创建：${json.reconstructionId ?? ""}`.trim());
    }
  };

  const refresh3d = async () => {
    if (!createdItemId) {
      setThreeDMessage("请先发布（并生成 itemId）后再刷新。");
      return;
    }
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    setRefreshing3d(true);
    try {
      const resp = await fetch(`/api/3d/status?itemId=${encodeURIComponent(createdItemId)}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setThreeDMessage(json?.error ? String(json.error) : "刷新失败");
        return;
      }
      const status = (json.status ?? null) as
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | null;
      setThreeDStatus(status);
      if (status === "completed" && json.modelGlbUrl) {
        setModelGlbUrl(String(json.modelGlbUrl));
        setThreeDMessage("3D 模型已完成，可预览。");
      } else {
        setThreeDMessage(`当前状态：${status ?? "unknown"}`);
      }
    } finally {
      setRefreshing3d(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6">
      {!authUserId ? <LoginScreen onAuthed={refreshAuth} /> : null}
      {authUserId ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <h1 className="text-xl font-bold text-slate-900">Publish Item</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a clean listing so students can find your item quickly.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Title</span>
            <input
              {...register("title")}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-indigo-200 focus:ring-2"
              placeholder="e.g. Calculus Textbook 9th Edition"
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
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
              <span className="mb-2 block text-sm font-medium text-slate-700">Price</span>
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

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Meetup Location</span>
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

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              3D Video (optional, 10–15s orbit)
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={(event) => onSelectVideo(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-700"
            />
            {videoFile ? (
              <p className="mt-1 text-xs text-slate-500">已选择视频：{videoFile.name}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">不上传视频也可正常发布（不生成 3D）。</p>
            )}
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Publishing..." : "Publish Item"}
          </button>
          {submitMessage ? <p className="text-sm text-slate-600">{submitMessage}</p> : null}

          {createdItemId ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">3D Pipeline</p>
              <p className="mt-1 text-xs text-slate-600">itemId: {createdItemId}</p>
              <p className="mt-1 text-xs text-slate-600">
                status: {threeDStatus ?? "—"}
              </p>
              <button
                type="button"
                onClick={refresh3d}
                disabled={refreshing3d}
                className="mt-3 h-10 w-full rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 disabled:opacity-60"
              >
                {refreshing3d ? "Refreshing..." : "刷新 3D 模型状态"}
              </button>
              {threeDMessage ? <p className="mt-2 text-xs text-slate-600">{threeDMessage}</p> : null}
            </div>
          ) : null}

          {modelGlbUrl ? (
            <Item3DViewer modelGlbUrl={modelGlbUrl} posterUrl={previewUrls[0]} />
          ) : null}
        </form>
        </section>
      ) : null}
    </main>
  );
}
