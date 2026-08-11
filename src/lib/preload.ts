import { ensureImagesLoaded } from "./imageCache";
import { registerFont } from "./fontRegistry";
import { fetchAssetArrayBuffer } from "./assets";
import type { SceneConfig } from "../types/scene";

/**
 * Decodes every asset a scene needs (images, the uploaded font) before
 * rendering depends on them. Preview can get away with lazy loading — a
 * frame or two pop in once the cache resolves — but export calls this and
 * awaits it up front, since every exported frame has to be correct the
 * first time it's rendered.
 */
export async function preloadSceneAssets(scene: SceneConfig): Promise<void> {
  const jobs: Promise<unknown>[] = [];

  const maxImageWidth = scene.canvas.width * 2;
  if (scene.animation.type === "imageField" || scene.animation.type === "imageFlicker") {
    if (scene.animation.images.length > 0) {
      jobs.push(ensureImagesLoaded(scene.animation.images, maxImageWidth));
    }
  }

  if (scene.typography.fontFileId) {
    const fontFileId = scene.typography.fontFileId;
    jobs.push(
      fetchAssetArrayBuffer("font", fontFileId).then((buffer) => registerFont(fontFileId, buffer)),
    );
  }

  await Promise.all(jobs);
}
