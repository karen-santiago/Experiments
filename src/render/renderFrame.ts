import { getAnimationModule } from "../animations/registry";
import { getFontFamily, getParsedFont } from "../lib/fontRegistry";
import type { SceneConfig } from "../types/scene";
import { getEasing } from "./easing";

/**
 * The one architectural rule (spec section 3): rendering is a pure function
 * of time. `t` is seconds elapsed, 0..duration. Nothing reachable from here
 * may read Date.now(), performance.now(), rAF timestamps, or mutate
 * persistent state — preview (rAF loop) and export (frame-stepped loop)
 * both call this exact function and must produce identical output for the
 * same t.
 *
 * Modules MAY read from caches that are populated asynchronously outside
 * renderFrame (decoded images, registered fonts, precomputed morph
 * interpolators) — those are keyed by config, not by time, so they don't
 * break frame-accuracy. See src/lib/imageCache.ts and src/lib/fontRegistry.ts.
 */
export function renderFrame(ctx: CanvasRenderingContext2D, t: number, config: SceneConfig): void {
  const { width, height, background, fps, duration } = config.canvas;

  ctx.clearRect(0, 0, width, height);

  if (background !== "transparent") {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }

  const module = getAnimationModule(config.animation.type);
  module.renderFrame(
    {
      ctx,
      t,
      width,
      height,
      fps,
      duration,
      palette: config.palette,
      typography: config.typography,
      easing: getEasing(config.easing),
      fontFamily: getFontFamily(config.typography.fontFileId),
      parsedFont: getParsedFont(config.typography.fontFileId),
    },
    config.animation,
  );
}
