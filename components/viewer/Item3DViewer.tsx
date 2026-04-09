"use client";

import { useEffect, useMemo, useState } from "react";

export function Item3DViewer({
  modelGlbUrl,
  posterUrl
}: {
  modelGlbUrl: string;
  posterUrl?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">3D Preview</p>
        <span className="text-xs text-slate-500">Drag to rotate</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-slate-50">
        {!viewerReady ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-full bg-white/80 px-4 py-2 text-xs text-slate-600 shadow-sm">
              Initializing viewer...
            </div>
          </div>
        ) : !loaded ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-full bg-white/80 px-4 py-2 text-xs text-slate-600 shadow-sm">
              Loading 3D model...
            </div>
          </div>
        ) : null}

        {viewerReady ? (
          <model-viewer
            src={modelGlbUrl}
            poster={poster}
            ar
            camera-controls
            touch-action="pan-y"
            style={{ width: "100%", height: "360px" }}
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <div style={{ width: "100%", height: "360px" }} />
        )}
      </div>
    </div>
  );
}

