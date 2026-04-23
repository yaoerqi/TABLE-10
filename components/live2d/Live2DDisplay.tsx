"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";

export type Live2DDisplayHandle = {
  switchModel: (modelPath: string) => Promise<void>;
  setTracking: (enabled: boolean) => void;
  getModel: () => any | null;
};

async function ensureCubismCoreReady(timeoutMs = 8000) {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.Live2DCubismCore) return;

  // Wait for the core script injected by next/script (beforeInteractive).
  const start = Date.now();
  while (!w.Live2DCubismCore && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!w.Live2DCubismCore) {
    throw new Error(
      "Cubism Core not loaded. Make sure live2dcubismcore.min.js is loaded before pixi-live2d-display/cubism4."
    );
  }
}

export const Live2DDisplay = forwardRef<
  Live2DDisplayHandle,
  { modelPath?: string; onReady?: () => void; onError?: (error: unknown) => void }
>(
  function Live2DDisplayInner(props, ref) {
    const pixiContainerRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<any | null>(null);
    const modelRef = useRef<any | null>(null);
    const currentModelPathRef = useRef<string | null>(null);
    const pixiRef = useRef<any | null>(null);
    const live2dRef = useRef<any | null>(null);
    const onReadyRef = useRef<typeof props.onReady>(props.onReady);
    const onErrorRef = useRef<typeof props.onError>(props.onError);

    useEffect(() => {
      onReadyRef.current = props.onReady;
      onErrorRef.current = props.onError;
    }, [props.onReady, props.onError]);

    useImperativeHandle(ref, () => ({
      getModel: () => modelRef.current,
      setTracking: (enabled) => {
        if (!modelRef.current) return;
        modelRef.current.autoInteract = enabled;
        // Some versions of pixi-live2d-display don't type this field.
        (modelRef.current.internalModel.motionManager.settings as any).autoAddRandomMotion =
          enabled;
      },
      switchModel: async (modelPath: string) => {
        if (currentModelPathRef.current === modelPath) return;
        if (!appRef.current) return;
        if (!live2dRef.current) return;

        if (modelRef.current) {
          appRef.current.stage.removeChild(modelRef.current);
          modelRef.current.destroy();
          modelRef.current = null;
        }

        const model = await live2dRef.current.Live2DModel.from(modelPath);
        currentModelPathRef.current = modelPath;
        modelRef.current = model;

        (model.internalModel.motionManager.settings as any).autoAddRandomMotion = true;
        model.autoInteract = false;
        (model as any).draggable = false;

        const scale = Math.min(
          appRef.current.view.width / model.width * 1.5,
          appRef.current.view.height / model.height * 1.5
        );
        model.scale.set(scale);
        model.x = appRef.current.view.width / 2;
        model.y = appRef.current.view.height * 0.9;
        model.anchor.set(0.5, 0.5);

        appRef.current.stage.addChild(model);
      }
    }));

    useLayoutEffect(() => {
      let destroyed = false;

      if (!pixiContainerRef.current) return;

      (async () => {
        try {
          await ensureCubismCoreReady();
          const PIXI = await import("pixi.js");
          const live2d = await import("pixi-live2d-display/cubism4");
          if (destroyed) return;

          pixiRef.current = PIXI;
          live2dRef.current = live2d;
          (window as any).PIXI = PIXI;

          if (appRef.current) {
            appRef.current.destroy(true);
            appRef.current = null;
          }
          while (pixiContainerRef.current?.firstChild) {
            pixiContainerRef.current.removeChild(pixiContainerRef.current.firstChild);
          }

          const app = new PIXI.Application({
            width: pixiContainerRef.current?.clientWidth || window.innerWidth,
            height: pixiContainerRef.current?.clientHeight || window.innerHeight,
            backgroundColor: 0x000000,
            backgroundAlpha: 0,
            antialias: true,
            resizeTo: pixiContainerRef.current ?? window
          });

          appRef.current = app;
          pixiContainerRef.current?.appendChild(app.view as unknown as Node);

          const modelPath = props.modelPath || "/models/Haru/Haru.model3.json";
          currentModelPathRef.current = modelPath;
          const model = await live2d.Live2DModel.from(modelPath);
          if (destroyed || !appRef.current) return;

          modelRef.current = model;
          (model.internalModel.motionManager.settings as any).autoAddRandomMotion = true;
          model.autoInteract = false;
          (model as any).draggable = false;

          const scale = Math.min(
            appRef.current.view.width / model.width * 1.5,
            appRef.current.view.height / model.height * 1.5
          );
          model.scale.set(scale);
          model.x = appRef.current.view.width / 2;
          model.y = appRef.current.view.height * 0.92;
          model.anchor.set(0.5, 0.5);

          appRef.current.stage.addChild(model);
          onReadyRef.current?.();
        } catch (e) {
          // Model assets might not be present yet; show nothing.
          console.warn("Live2D model load failed:", e);
          onErrorRef.current?.(e);
        }
      })();

      const onResize = () => {
        if (!appRef.current || !pixiContainerRef.current) return;
        const w = pixiContainerRef.current.clientWidth || window.innerWidth;
        const h = pixiContainerRef.current.clientHeight || window.innerHeight;
        appRef.current.renderer.resize(w, h);
      };
      window.addEventListener("resize", onResize);

      return () => {
        destroyed = true;
        window.removeEventListener("resize", onResize);
        if (modelRef.current) {
          modelRef.current.destroy();
          modelRef.current = null;
        }
        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
        }
      };
    }, [props.modelPath]);

    return <div ref={pixiContainerRef} className="h-full w-full" />;
  }
);

