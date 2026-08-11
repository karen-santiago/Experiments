import { getAnimationModule } from "../animations/registry";
import type { SceneConfig } from "../types/scene";

/**
 * The one architectural rule (spec section 3): rendering is a pure function
 * of time. `t` is seconds elapsed, 0..duration. Nothing reachable from here
 * may read Date.now(), performance.now(), rAF timestamps, or mutate
 * persistent state — preview (rAF loop) and export (frame-stepped loop)
 * both call this exact function and must produce identical output for the
 * same t.
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
    { ctx, t, width, height, fps, duration, palette: config.palette },
    config.animation,
  );
}
