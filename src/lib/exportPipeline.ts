import { renderFrame } from "../render/renderFrame";
import type { SceneConfig } from "../types/scene";
import { SIDECAR_URL, apiPostJson } from "./api";
import { preloadSceneAssets } from "./preload";
import type { ExportFormatId } from "../shared/exportFormats";

export interface ExportProgress {
  frameIndex: number;
  totalFrames: number;
  etaSeconds: number;
}

export interface ExportOptions {
  scene: SceneConfig;
  format: ExportFormatId;
  outputDir?: string;
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

export interface ExportResult {
  outputPath: string;
}

export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelledError";
  }
}

/**
 * Ignores wall clock entirely: steps t = frameIndex / fps for every frame,
 * calling the same renderFrame() the preview loop uses. This is what makes
 * exports frame-accurate regardless of how slow rendering is.
 */
export async function exportScene({ scene, format, outputDir, onProgress, signal }: ExportOptions): Promise<ExportResult> {
  if (format === "mp4" && scene.canvas.background === "transparent") {
    throw new Error(
      "MP4 (H.264) cannot carry an alpha channel. Use WebM (VP9, alpha) or ProRes 4444 for a transparent background.",
    );
  }

  const { fps, duration, width, height } = scene.canvas;
  const totalFrames = Math.max(1, Math.round(fps * duration));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create an offscreen 2D canvas context");

  // Every exported frame has to be correct the first time it's drawn — no
  // popping in mid-export — so images/fonts are fully decoded up front
  // rather than lazily inside the frame loop.
  await preloadSceneAssets(scene);
  if (signal?.aborted) throw new ExportCancelledError();

  const { sessionId } = await apiPostJson<{ sessionId: string }>("/api/export/session", {});

  const startedAt = performance.now();

  try {
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (signal?.aborted) throw new ExportCancelledError();

      const t = frameIndex / fps;
      renderFrame(ctx, t, scene);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error(`Failed to encode frame ${frameIndex} as PNG`);

      const res = await fetch(`${SIDECAR_URL}/api/export/frame/${sessionId}/${frameIndex}`, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: blob,
        signal,
      });
      if (!res.ok) throw new Error(`Failed to upload frame ${frameIndex}: ${res.status}`);

      const elapsed = (performance.now() - startedAt) / 1000;
      const framesPerSecond = (frameIndex + 1) / Math.max(elapsed, 1e-6);
      const remaining = totalFrames - (frameIndex + 1);
      onProgress?.({
        frameIndex: frameIndex + 1,
        totalFrames,
        etaSeconds: remaining / Math.max(framesPerSecond, 1e-6),
      });
    }

    if (signal?.aborted) throw new ExportCancelledError();

    const result = await apiPostJson<{ ok: true; outputPath: string }>(`/api/export/encode/${sessionId}`, {
      format,
      fps,
      sceneName: scene.name,
      outputDir,
    });

    return { outputPath: result.outputPath };
  } catch (err) {
    await fetch(`${SIDECAR_URL}/api/export/cancel/${sessionId}`, { method: "POST" }).catch(() => {});
    throw err;
  }
}
