import { createRng } from "../../lib/prng";
import { getEasing } from "../../render/easing";
import { layoutCharacters } from "../shared/charLayout";
import type { TextMorphAnimationConfig } from "../../types/scene";
import type { RenderContext } from "../types";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const DIRECTION_VECTORS: Record<Exclude<TextMorphAnimationConfig["direction"], "random">, [number, number]> = {
  up: [0, 1],
  down: [0, -1],
  left: [1, 0],
  right: [-1, 0],
};

function directionFor(config: TextMorphAnimationConfig, index: number): [number, number] {
  if (config.direction !== "random") return DIRECTION_VECTORS[config.direction];
  const rng = createRng(config.seed + index * 7919);
  const options = Object.values(DIRECTION_VECTORS);
  return options[Math.floor(rng.next() * options.length)];
}

function drawChar(
  rc: RenderContext,
  config: TextMorphAnimationConfig,
  ch: string,
  x: number,
  y: number,
  opacity: number,
  scale: number,
  blurPx: number,
  offsetPx: number,
  dir: [number, number],
) {
  if (opacity <= 0.002 || !ch.trim()) return;
  const { ctx } = rc;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x + dir[0] * offsetPx, y + dir[1] * offsetPx);
  ctx.scale(scale, scale);
  if (blurPx > 0.01) ctx.filter = `blur(${blurPx}px)`;
  ctx.font = `${rc.typography.fontSize}px ${rc.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (config.strokeEnabled) {
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = config.strokeWidth;
    ctx.strokeText(ch, 0, 0);
  }
  ctx.fillStyle = config.color;
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}

/** Mode B: no outline interpolation — each character crossfades/slides/scales/blurs into the next. */
export function renderCharacterTransition(rc: RenderContext, config: TextMorphAnimationConfig, progress: number) {
  const { ctx, width, height, typography } = rc;
  const fontSize = typography.fontSize;
  const anchorX = width / 2;
  const anchorY = height / 2;

  const layoutA = layoutCharacters(ctx, config.textA, fontSize, rc.fontFamily, typography.letterSpacing, anchorX, typography.textAlign);
  const layoutB = layoutCharacters(ctx, config.textB, fontSize, rc.fontFamily, typography.letterSpacing, anchorX, typography.textAlign);
  const maxLen = Math.max(layoutA.length, layoutB.length);

  const staggerFrac = maxLen > 1 ? Math.min(0.9 / maxLen, config.staggerMs / 1000 / Math.max(config.transitionDuration, 1e-6)) : 0;
  const spanFrac = Math.max(0.15, 1 - (maxLen - 1) * staggerFrac);
  const opacityEase = getEasing(config.opacityEasing);
  const offsetMax = fontSize * 0.6;

  for (let i = 0; i < maxLen; i++) {
    const startFrac = i * staggerFrac;
    const charProgress = Math.max(0, Math.min(1, (progress - startFrac) / spanFrac));
    const eased = opacityEase(charProgress);
    const dir = directionFor(config, i);

    const posA = layoutA[i];
    const posB = layoutB[i];
    const y = anchorY + fontSize * 0.35; // baseline offset so text optically centers

    if (posA && posB) {
      const x = lerp(posA.x, posB.x, eased);
      drawChar(rc, config, posA.ch, x, y, 1 - eased, lerp(config.scaleTo, config.scaleFrom, eased), lerp(0, config.blurAmount, eased), -offsetMax * eased, dir);
      drawChar(rc, config, posB.ch, x, y, eased, lerp(config.scaleFrom, config.scaleTo, eased), lerp(config.blurAmount, 0, eased), offsetMax * (1 - eased), dir);
    } else if (posA) {
      drawChar(rc, config, posA.ch, posA.x, y, 1 - eased, lerp(1, config.scaleFrom, eased), lerp(0, config.blurAmount, eased), -offsetMax * eased, dir);
    } else if (posB) {
      drawChar(rc, config, posB.ch, posB.x, y, eased, lerp(config.scaleFrom, 1, eased), lerp(config.blurAmount, 0, eased), offsetMax * (1 - eased), dir);
    }
  }
}
