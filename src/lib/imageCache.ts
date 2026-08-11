import { assetUrl } from "./assets";
import type { AssetRef } from "../types/scene";

// Decoded-image cache shared by every module that draws photos (image
// field, image flicker). Decoding happens once, outside renderFrame —
// "never decode inside renderFrame" — and renderFrame just does a
// synchronous Map lookup, drawing nothing for an id that hasn't resolved
// yet (the preload effect below issues a redraw once it has).
const bitmaps = new Map<string, ImageBitmap>();
const inFlight = new Map<string, Promise<ImageBitmap>>();
const listeners = new Set<() => void>();

export function subscribeImageCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const l of listeners) l();
}

export function getImageBitmap(id: string): ImageBitmap | undefined {
  return bitmaps.get(id);
}

/**
 * Loads any images in `refs` that aren't cached yet. Anything wider than
 * `maxWidth` (2x canvas width, per spec) is downscaled at decode time so
 * renderFrame never has to resize.
 */
export async function ensureImagesLoaded(refs: AssetRef[], maxWidth: number): Promise<void> {
  const missing = refs.filter((r) => !bitmaps.has(r.id) && !inFlight.has(r.id));
  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (ref) => {
      const promise = loadOne(ref, maxWidth);
      inFlight.set(ref.id, promise);
      try {
        const bitmap = await promise;
        bitmaps.set(ref.id, bitmap);
        notify();
      } finally {
        inFlight.delete(ref.id);
      }
    }),
  );
}

async function loadOne(ref: AssetRef, maxWidth: number): Promise<ImageBitmap> {
  const res = await fetch(assetUrl("image", ref.id));
  if (!res.ok) throw new Error(`Failed to load image ${ref.name}: ${res.status}`);
  const blob = await res.blob();
  const full = await createImageBitmap(blob);
  if (full.width <= maxWidth) return full;
  const scale = maxWidth / full.width;
  const resized = await createImageBitmap(full, {
    resizeWidth: Math.round(full.width * scale),
    resizeHeight: Math.round(full.height * scale),
    resizeQuality: "high",
  });
  full.close();
  return resized;
}
