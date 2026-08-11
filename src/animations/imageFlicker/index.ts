import { createRng } from "../../lib/prng";
import { getImageBitmap } from "../../lib/imageCache";
import { drawCover, drawContain } from "../../lib/canvasDraw";
import type { ImageFlickerAnimationConfig, ImageFlickerOrder } from "../../types/scene";
import type { AnimationModule } from "../types";
import { ImageFlickerParamsPanel } from "./ImageFlickerParamsPanel";

function buildOrder(order: ImageFlickerOrder, count: number, seed: number): number[] {
  const sequential = Array.from({ length: count }, (_, i) => i);
  switch (order) {
    case "sequential":
      return sequential;
    case "reverse":
      return sequential.slice().reverse();
    case "randomBySeed":
      return createRng(seed).shuffle(sequential);
    case "pingpong": {
      if (count <= 2) return sequential;
      const forward = sequential;
      const backward = sequential.slice(1, count - 1).reverse();
      return [...forward, ...backward];
    }
  }
}

// Memoized like image field's layout — order only needs rebuilding when
// count/order/seed actually change, not every frame.
let cacheKey = "";
let cachedOrder: number[] = [];

function getOrBuildOrder(order: ImageFlickerOrder, count: number, seed: number): number[] {
  const key = `${order}:${count}:${seed}`;
  if (key !== cacheKey) {
    cachedOrder = buildOrder(order, count, seed);
    cacheKey = key;
  }
  return cachedOrder;
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  width: number,
  height: number,
  fit: ImageFlickerAnimationConfig["fit"],
  opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  if (fit === "cover") drawCover(ctx, bitmap, 0, 0, width, height);
  else if (fit === "contain") drawContain(ctx, bitmap, 0, 0, width, height);
  else ctx.drawImage(bitmap, 0, 0, width, height); // fill (stretch)
  ctx.restore();
}

export const imageFlickerModule: AnimationModule<ImageFlickerAnimationConfig> = {
  id: "imageFlicker",
  label: "Image flicker",
  defaults: {
    type: "imageFlicker",
    images: [],
    intervalMs: 120,
    order: "sequential",
    seed: 1,
    transition: "cut",
    crossfadeDurationMs: 80,
    fit: "cover",
    background: "#000000",
  },
  ParamsPanel: ImageFlickerParamsPanel,
  renderFrame(rc, config) {
    const { ctx, t, width, height } = rc;
    const count = config.images.length;
    if (count === 0) {
      ctx.save();
      ctx.fillStyle = rc.palette.secondary;
      ctx.font = "24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.6;
      ctx.fillText("Add images in the panel on the left", width / 2, height / 2);
      ctx.restore();
      return;
    }

    if (config.background !== "transparent") {
      ctx.save();
      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    const sequence = getOrBuildOrder(config.order, count, config.seed);
    const intervalSec = Math.max(config.intervalMs / 1000, 1 / 1000);
    const stepIndex = Math.floor(t / intervalSec) % sequence.length;
    const localT = t - Math.floor(t / intervalSec) * intervalSec;

    const currentImage = config.images[sequence[stepIndex]];
    const currentBitmap = currentImage && getImageBitmap(currentImage.id);

    if (config.transition === "crossfade") {
      const crossfadeSec = config.crossfadeDurationMs / 1000;
      const prevStepIndex = (stepIndex - 1 + sequence.length) % sequence.length;
      const prevImage = config.images[sequence[prevStepIndex]];
      const prevBitmap = prevImage && getImageBitmap(prevImage.id);

      if (localT < crossfadeSec && prevBitmap) {
        const blend = localT / crossfadeSec;
        drawImage(ctx, prevBitmap, width, height, config.fit, 1 - blend);
        if (currentBitmap) drawImage(ctx, currentBitmap, width, height, config.fit, blend);
        return;
      }
    }

    if (currentBitmap) drawImage(ctx, currentBitmap, width, height, config.fit, 1);
  },
};
