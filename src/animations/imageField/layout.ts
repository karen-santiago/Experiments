import { createRng } from "../../lib/prng";
import type { ImageFieldAnimationConfig } from "../../types/scene";

export interface ImageFieldSlot {
  imageIndex: number;
  baseX: number;
  baseY: number;
  scale: number;
  rotationBase: number;
  /** 0..1 "closeness" — 1 is nearest/largest, used for depth-fade opacity, parallax speed, and cluster stacking order. */
  depth: number;
  /** Per-slot drift-speed multiplier before parallax is applied (bands rows drift at different base speeds). */
  speedMultiplier: number;
  /** Seed-derived phase offset (radians) for the sway bob. */
  phase: number;
  rotationDriftSign: 1 | -1;
  /** Stable creation order, used for entrance stagger sequencing. */
  order: number;
}

export interface ImageFieldLayout {
  tileWidth: number;
  tileHeight: number;
  slots: ImageFieldSlot[];
}

interface SlotSeed {
  baseX: number;
  baseY: number;
  order: number;
  speedMultiplier?: number;
  depthHint?: number; // 0..1, overrides scale-based depth when present (cluster)
}

function layoutScatter(
  config: ImageFieldAnimationConfig,
  tileW: number,
  tileH: number,
  rng: ReturnType<typeof createRng>,
): SlotSeed[] {
  const cols = Math.max(1, Math.round(config.scatterColumns));
  const rowsN = Math.max(1, Math.round(config.scatterRows));
  const cellW = tileW / cols;
  const cellH = tileH / rowsN;
  const protectRect = config.protectCenter
    ? {
        x0: tileW / 2 - ((config.protectCenterWidthPct / 100) * tileW) / 2,
        x1: tileW / 2 + ((config.protectCenterWidthPct / 100) * tileW) / 2,
        y0: tileH / 2 - ((config.protectCenterHeightPct / 100) * tileH) / 2,
        y1: tileH / 2 + ((config.protectCenterHeightPct / 100) * tileH) / 2,
      }
    : null;

  const seeds: SlotSeed[] = [];
  let order = 0;
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng.next() >= config.scatterDensity) continue;
      const cx = (c + 0.5) * cellW;
      const cy = (r + 0.5) * cellH;
      if (protectRect && cx > protectRect.x0 && cx < protectRect.x1 && cy > protectRect.y0 && cy < protectRect.y1) {
        continue;
      }
      const jitterX = (rng.next() * 2 - 1) * config.scatterJitter * cellW * 0.5;
      const jitterY = (rng.next() * 2 - 1) * config.scatterJitter * cellH * 0.5;
      seeds.push({ baseX: cx + jitterX, baseY: cy + jitterY, order: order++ });
    }
  }
  return seeds;
}

function layoutCluster(
  config: ImageFieldAnimationConfig,
  tileW: number,
  tileH: number,
  rng: ReturnType<typeof createRng>,
  count: number,
): SlotSeed[] {
  const cx = tileW / 2;
  const cy = tileH / 2;
  const arcRad = (config.clusterArc * Math.PI) / 180;
  const seeds: SlotSeed[] = [];
  for (let i = 0; i < count; i++) {
    const tt = count > 1 ? i / (count - 1) : 0.5;
    const angle = (tt - 0.5) * arcRad;
    const radius = config.clusterSpread * (1 - config.clusterOverlap * 0.75);
    const jitterX = (rng.next() - 0.5) * config.clusterSpread * 0.15;
    const jitterY = (rng.next() - 0.5) * config.clusterSpread * 0.1;
    const x = cx + Math.sin(angle) * radius + jitterX;
    const y = cy - Math.cos(angle) * radius * 0.35 + jitterY;
    // Center of the arc reads as "closest" (drawn on top); edges recede.
    const depthHint = 1 - Math.abs(tt - 0.5) * 2;
    seeds.push({ baseX: x, baseY: y, order: i, depthHint });
  }
  return seeds;
}

function layoutRow(
  config: ImageFieldAnimationConfig,
  tileW: number,
  tileH: number,
  rng: ReturnType<typeof createRng>,
  count: number,
): SlotSeed[] {
  const nominal = Math.min(tileW, tileH) * 0.14;
  const spacing = nominal + config.rowGap;
  const seeds: SlotSeed[] = [];
  for (let i = 0; i < count; i++) {
    const x = (i * spacing) % tileW;
    const y = tileH / 2 + (rng.next() * 2 - 1) * config.rowVerticalJitter;
    seeds.push({ baseX: x, baseY: y, order: i });
  }
  return seeds;
}

function layoutBands(config: ImageFieldAnimationConfig, tileW: number, tileH: number, count: number): SlotSeed[] {
  const rowsN = Math.max(2, Math.min(5, Math.round(config.bandsRowCount)));
  const nominal = Math.min(tileW, tileH) * 0.14;
  const perRow: number[] = Array.from({ length: rowsN }, () => 0);
  for (let i = 0; i < count; i++) perRow[i % rowsN]++;

  const seeds: SlotSeed[] = [];
  let order = 0;
  for (let row = 0; row < rowsN; row++) {
    const n = perRow[row];
    const spacing = n > 0 ? Math.max(nominal, tileW / n) : tileW;
    const y = (row + 0.5) * (tileH / rowsN);
    const speedMultiplier = rowsN > 1 ? 0.6 + (row / (rowsN - 1)) * 0.8 : 1;
    for (let i = 0; i < n; i++) {
      const x = (i * spacing + spacing / 2) % tileW;
      seeds.push({ baseX: x, baseY: y, order: order++, speedMultiplier });
    }
  }
  return seeds;
}

function finalizeSlots(
  seeds: SlotSeed[],
  config: ImageFieldAnimationConfig,
  rng: ReturnType<typeof createRng>,
  imageCount: number,
): ImageFieldSlot[] {
  const assignmentOrder =
    config.assignment === "shuffled"
      ? rng.shuffle(Array.from({ length: Math.max(imageCount, 1) }, (_, i) => i))
      : Array.from({ length: Math.max(imageCount, 1) }, (_, i) => i);

  return seeds.map((seed, i) => {
    const scale = rng.range(config.scaleMin, config.scaleMax);
    const rotationBase = rng.range(config.rotationMin, config.rotationMax);
    const scaleDepth = config.scaleMax > config.scaleMin ? (scale - config.scaleMin) / (config.scaleMax - config.scaleMin) : 0.5;
    const depth = seed.depthHint ?? scaleDepth;
    const phase = rng.next() * Math.PI * 2;
    const rotationDriftSign: 1 | -1 = rng.next() < 0.5 ? -1 : 1;
    const imageIndex = imageCount > 0 ? assignmentOrder[i % assignmentOrder.length] % imageCount : 0;
    return {
      imageIndex,
      baseX: seed.baseX,
      baseY: seed.baseY,
      scale,
      rotationBase,
      depth,
      speedMultiplier: seed.speedMultiplier ?? 1,
      phase,
      rotationDriftSign,
      order: seed.order,
    };
  });
}

/**
 * Pure function of config (no time). Slot count for `scatter` comes from
 * the density/grid; for cluster/row/bands each image gets one slot,
 * cycling through the image list if there are more slots than images.
 */
export function computeImageFieldLayout(config: ImageFieldAnimationConfig, tileWidth: number, tileHeight: number): ImageFieldLayout {
  const rng = createRng(config.seed);
  const imageCount = config.images.length;
  const count = Math.max(imageCount, 1);

  let seeds: SlotSeed[];
  switch (config.layoutMode) {
    case "scatter":
      seeds = layoutScatter(config, tileWidth, tileHeight, rng);
      break;
    case "cluster":
      seeds = layoutCluster(config, tileWidth, tileHeight, rng, count);
      break;
    case "row":
      seeds = layoutRow(config, tileWidth, tileHeight, rng, count);
      break;
    case "bands":
      seeds = layoutBands(config, tileWidth, tileHeight, count);
      break;
  }

  let slots = finalizeSlots(seeds, config, rng, imageCount);
  if (config.layoutMode === "cluster") {
    slots = slots.slice().sort((a, b) => a.depth - b.depth);
  }

  return { tileWidth, tileHeight, slots };
}

// Memoized by config object identity + tile size: renderFrame calls this
// every frame, but the scene's animation config is only a new object when a
// param actually changes (see App.tsx), so this recomputes at most once per
// edit rather than once per frame — "computed once when parameters change,
// cached, and reused for every frame" (spec section 5.3).
let cachedConfig: ImageFieldAnimationConfig | null = null;
let cachedTileWidth = 0;
let cachedTileHeight = 0;
let cachedLayout: ImageFieldLayout | null = null;

export function getOrComputeImageFieldLayout(
  config: ImageFieldAnimationConfig,
  tileWidth: number,
  tileHeight: number,
): ImageFieldLayout {
  if (cachedLayout && cachedConfig === config && cachedTileWidth === tileWidth && cachedTileHeight === tileHeight) {
    return cachedLayout;
  }
  const layout = computeImageFieldLayout(config, tileWidth, tileHeight);
  cachedConfig = config;
  cachedTileWidth = tileWidth;
  cachedTileHeight = tileHeight;
  cachedLayout = layout;
  return layout;
}
