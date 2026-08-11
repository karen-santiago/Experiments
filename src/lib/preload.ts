import { ensureImagesLoaded } from "./imageCache";
import { registerFont } from "./fontRegistry";
import { fetchAssetArrayBuffer } from "./assets";
import type { AssetRef, SceneConfig } from "../types/scene";

/**
 * Decodes every asset a scene needs (images, uploaded fonts) before
 * rendering depends on them. Preview can get away with lazy loading — a
 * frame or two pop in once the cache resolves — but export calls this and
 * awaits it up front, since every exported frame has to be correct the
 * first time it's rendered.
 */
export async function preloadSceneAssets(scene: SceneConfig): Promise<void> {
  const jobs: Promise<unknown>[] = [];

  const maxImageWidth = scene.canvas.width * 2;
  const images = collectImageRefs(scene);
  if (images.length > 0) jobs.push(ensureImagesLoaded(images, maxImageWidth));

  const fontIds = new Set<string>();
  if (scene.typography.fontFileId) fontIds.add(scene.typography.fontFileId);
  for (const font of scene.fonts) fontIds.add(font.id);

  for (const fontFileId of fontIds) {
    jobs.push(fetchAssetArrayBuffer("font", fontFileId).then((buffer) => registerFont(fontFileId, buffer)));
  }

  await Promise.all(jobs);
}

function collectImageRefs(scene: SceneConfig): AssetRef[] {
  const anim = scene.animation;
  if (anim.type === "imageField" || anim.type === "imageFlicker") return anim.images;
  if (anim.type === "chat") return [anim.avatarA, anim.avatarB].filter((a): a is AssetRef => a !== null);
  return [];
}
