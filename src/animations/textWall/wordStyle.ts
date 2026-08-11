import { createRng } from "../../lib/prng";
import type { PaletteConfig, TextWallAnimationConfig } from "../../types/scene";

export interface WordStyle {
  text: string;
  color: string;
  fontSize: number;
  rotation: number;
  order: number;
}

let cacheKey = "";
let cachedStyles: WordStyle[] = [];

/** Pure function of config + palette + base font size — memoized by a string key so it isn't recomputed every frame. */
export function getOrComputeWordStyles(config: TextWallAnimationConfig, baseFontSize: number, palette: PaletteConfig): WordStyle[] {
  const key = `${config.words.join("")}::${config.seed}::${config.fontSizeVariance}::${config.rotationVariance}::${config.colorMode}::${baseFontSize}::${palette.primary}${palette.secondary}${palette.accent}`;
  if (key === cacheKey) return cachedStyles;

  const rng = createRng(config.seed);
  const paletteChoices = [palette.primary, palette.secondary, palette.accent];
  cachedStyles = config.words.map((text, i) => {
    const fontSize = Math.max(4, baseFontSize * (1 + (rng.next() * 2 - 1) * config.fontSizeVariance));
    const rotation = (rng.next() * 2 - 1) * config.rotationVariance;
    let color = palette.primary;
    if (config.colorMode === "alternating") color = i % 2 === 0 ? palette.primary : palette.secondary;
    else if (config.colorMode === "random") color = rng.pick(paletteChoices);
    return { text, color, fontSize, rotation, order: i };
  });
  cacheKey = key;
  return cachedStyles;
}

export interface RevealState {
  opacity: number;
  scale: number;
}

export function computeReveal(config: TextWallAnimationConfig, order: number, t: number): RevealState {
  if (config.reveal === "all") return { opacity: 1, scale: 1 };

  const startTime = (order * config.staggerIntervalMs) / 1000;
  if (config.reveal === "typewriter") {
    return { opacity: t >= startTime ? 1 : 0, scale: 1 };
  }

  // staggered: fade + scale in over a fixed 0.4s window
  const progress = Math.max(0, Math.min(1, (t - startTime) / 0.4));
  const eased = progress * progress * (3 - 2 * progress); // smoothstep
  return { opacity: eased, scale: 0.7 + 0.3 * eased };
}
