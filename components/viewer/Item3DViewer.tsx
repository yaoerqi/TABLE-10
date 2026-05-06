"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function Item3DViewer({
  modelGlbUrl,
  posterUrl
}: {
  modelGlbUrl: string;
  posterUrl?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const mvRef = useRef<HTMLElement | null>(null);

  const poster = useMemo(() => {
    return posterUrl || "";
  }, [posterUrl]);

  useEffect(() => {
    setLoaded(false);
  }, [modelGlbUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await import("@google/model-viewer/dist/model-viewer");
        if (!cancelled) setViewerReady(true);
      } catch {
        if (!cancelled) setViewerReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // React's onLoad on custom elements is unreliable; use the native `load` event.
  useEffect(() => {
    const el = mvRef.current as HTMLElement & { loaded?: boolean } | null;
    if (!el || !viewerReady) return;

    const markLoaded = () => setLoaded(true);
    el.addEventListener("load", markLoaded);
    el.addEventListener("error", markLoaded);

    queueMicrotask(() => {
      if (el.loaded) markLoaded();
    });

    return () => {
      el.removeEventListener("load", markLoaded);
      el.removeEventListener("error", markLoaded);
    };
  }, [modelGlbUrl, viewerReady]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">3D Preview</p>
        <span className="text-xs text-slate-500">Drag to rotate</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-slate-50">
        {!viewerReady ? (
          <div className="absolute inset-0 z-20 grid place-items-center bg-slate-50/90">
            <div className="rounded-full bg-white/90 px-4 py-2 text-xs text-slate-600 shadow-sm">
              Initializing viewer...
            </div>
          </div>
        ) : !loaded ? (
          <div className="absolute inset-0 z-20 grid place-items-center bg-slate-50/90">
            <div className="rounded-full bg-white/90 px-4 py-2 text-xs text-slate-600 shadow-sm">
              Loading 3D model...
            </div>
          </div>
        ) : null}

        {viewerReady ? (
          <model-viewer
            ref={(node: HTMLElement | null) => {
              mvRef.current = node;
            }}
            src={modelGlbUrl}
            poster={poster}
            ar
            camera-controls
            touch-action="pan-y"
            style={{ width: "100%", height: "360px" }}
          />
        ) : (
          <div style={{ width: "100%", height: "360px" }} />
        )}
      </div>
    </div>
  );
}

