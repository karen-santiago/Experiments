import type { TextWallAnimationConfig } from "../../types/scene";
import type { AnimationModule, RenderContext } from "../types";
import { getOrComputeWordStyles, computeReveal, type WordStyle } from "./wordStyle";
import { TextWallParamsPanel } from "./TextWallParamsPanel";

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function drawWord(rc: RenderContext, fontFamily: string, style: WordStyle, x: number, y: number, opacity: number, scale: number) {
  if (opacity <= 0.002) return;
  const { ctx } = rc;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.rotate((style.rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.font = `${style.fontSize}px ${fontFamily}`;
  ctx.fillStyle = style.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.text, 0, 0);
  ctx.restore();
}

function measureWidth(rc: RenderContext, fontFamily: string, style: WordStyle): number {
  rc.ctx.save();
  rc.ctx.font = `${style.fontSize}px ${fontFamily}`;
  const w = rc.ctx.measureText(style.text).width;
  rc.ctx.restore();
  return w;
}

function renderGrid(rc: RenderContext, config: TextWallAnimationConfig, fontFamily: string, styles: WordStyle[]) {
  const { width, height } = rc;
  const n = styles.length;
  if (n === 0) return;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cellW = width / cols;
  const cellH = height / rows;

  styles.forEach((style, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col + 0.5) * cellW;
    const y = (row + 0.5) * cellH;
    const reveal = computeReveal(config, style.order, rc.t);
    drawWord(rc, fontFamily, style, x, y, reveal.opacity, reveal.scale);
  });
}

/**
 * All marquee rows share one tile width (the widest row's natural content
 * width, or the canvas width, whichever is larger) instead of each row
 * wrapping at its own natural width. That's what makes the whole layout
 * loop seamlessly at a single duration — see computeMarqueeTileWidth,
 * which the params panel's "snap duration to loop" button also calls.
 */
export function computeMarqueeTileWidth(
  ctx: CanvasRenderingContext2D,
  fontFamily: string,
  styles: WordStyle[],
  rowCount: number,
  canvasWidth: number,
  gap: number,
): number {
  const rows: WordStyle[][] = Array.from({ length: rowCount }, () => []);
  styles.forEach((s, i) => rows[i % rowCount].push(s));
  let maxWidth = canvasWidth;
  for (const rowWords of rows) {
    ctx.save();
    let rowWidth = 0;
    for (const s of rowWords) {
      ctx.font = `${s.fontSize}px ${fontFamily}`;
      rowWidth += ctx.measureText(s.text).width + gap;
    }
    ctx.restore();
    if (rowWidth > maxWidth) maxWidth = rowWidth;
  }
  return maxWidth;
}

function renderMarqueeRows(rc: RenderContext, config: TextWallAnimationConfig, fontFamily: string, styles: WordStyle[]) {
  const { width, height, t } = rc;
  const n = styles.length;
  if (n === 0) return;
  const rowCount = Math.max(2, Math.min(6, Math.round(Math.sqrt(n))));
  const rows: WordStyle[][] = Array.from({ length: rowCount }, () => []);
  styles.forEach((s, i) => rows[i % rowCount].push(s));

  const gap = Math.min(width, height) * 0.06;
  const rowHeight = height / rowCount;
  const sharedTileWidth = computeMarqueeTileWidth(rc.ctx, fontFamily, styles, rowCount, width, gap);

  rows.forEach((rowWords, rowIndex) => {
    if (rowWords.length === 0) return;
    const widths = rowWords.map((s) => measureWidth(rc, fontFamily, s) + gap);

    const direction = rowIndex % 2 === 0 ? 1 : -1;
    // Offset each row's starting position so rows don't line up into a grid.
    const startOffset = (rowIndex / rowCount) * sharedTileWidth * 0.37;
    const scrollOffset = mod(config.scrollSpeed * t * direction + startOffset, sharedTileWidth);

    const y = (rowIndex + 0.5) * rowHeight;
    let cursor = -scrollOffset;
    // Draw enough repeats to cover the full canvas width plus one extra tile on each side.
    while (cursor < width + sharedTileWidth) {
      let x = cursor;
      for (let i = 0; i < rowWords.length; i++) {
        const w = widths[i];
        const wordCenterX = x + w / 2 - gap / 2;
        if (wordCenterX > -sharedTileWidth && wordCenterX < width + sharedTileWidth) {
          const reveal = computeReveal(config, rowWords[i].order, t);
          drawWord(rc, fontFamily, rowWords[i], wordCenterX, y, reveal.opacity, reveal.scale);
        }
        x += w;
      }
      cursor += sharedTileWidth;
    }
  });
}

export function computeVerticalScrollTileHeight(styles: WordStyle[], gap: number): number {
  return styles.reduce((sum, s) => sum + s.fontSize + gap, 0);
}

function renderVerticalScroll(rc: RenderContext, config: TextWallAnimationConfig, fontFamily: string, styles: WordStyle[]) {
  const { width, height, t } = rc;
  const n = styles.length;
  if (n === 0) return;

  const gap = Math.min(width, height) * 0.03;
  const lineHeights = styles.map((s) => s.fontSize + gap);
  const tileHeight = computeVerticalScrollTileHeight(styles, gap);
  if (tileHeight <= 0) return;

  const scrollOffset = mod(config.scrollSpeed * t, tileHeight);
  const x = width / 2;

  let cursor = -scrollOffset;
  while (cursor < height + tileHeight) {
    let y = cursor;
    for (let i = 0; i < styles.length; i++) {
      const h = lineHeights[i];
      const centerY = y + h / 2 - gap / 2;
      if (centerY > -tileHeight && centerY < height + tileHeight) {
        const reveal = computeReveal(config, styles[i].order, t);
        drawWord(rc, fontFamily, styles[i], x, centerY, reveal.opacity, reveal.scale);
      }
      y += h;
    }
    cursor += tileHeight;
  }
}

export const textWallModule: AnimationModule<TextWallAnimationConfig> = {
  id: "textWall",
  label: "Text wall",
  defaults: {
    type: "textWall",
    words: ["Design", "Motion", "Craft", "Detail", "Rhythm", "Contrast", "Space", "Form", "Light", "Texture", "Balance", "Scale"],
    layout: "grid",
    reveal: "staggered",
    staggerIntervalMs: 60,
    scrollSpeed: 80,
    colorMode: "alternating",
    fontSizeVariance: 0,
    rotationVariance: 0,
    seed: 1,
    fontId: null,
  },
  ParamsPanel: TextWallParamsPanel,
  renderFrame(rc, config) {
    if (config.words.length === 0) {
      const { ctx, width, height } = rc;
      ctx.save();
      ctx.fillStyle = rc.palette.secondary;
      ctx.font = "24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.6;
      ctx.fillText("Add words in the panel on the left", width / 2, height / 2);
      ctx.restore();
      return;
    }

    const fontFamily = rc.resolveFont(config.fontId).family;
    const styles = getOrComputeWordStyles(config, rc.typography.fontSize, rc.palette);
    if (config.layout === "grid") renderGrid(rc, config, fontFamily, styles);
    else if (config.layout === "marqueeRows") renderMarqueeRows(rc, config, fontFamily, styles);
    else renderVerticalScroll(rc, config, fontFamily, styles);
  },
};
