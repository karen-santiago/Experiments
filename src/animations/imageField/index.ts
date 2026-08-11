import { getImageBitmap } from "../../lib/imageCache";
import { drawImageTile } from "../../lib/canvasDraw";
import { drawWrappedText } from "../shared/text";
import type { ImageFieldAnimationConfig, AssetRef } from "../../types/scene";
import type { AnimationModule, RenderContext } from "../types";
import { getOrComputeImageFieldLayout, type ImageFieldSlot } from "./layout";
import { ImageFieldParamsPanel } from "./ImageFieldParamsPanel";

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface EntranceState {
  opacityMul: number;
  scaleMul: number;
  offsetX: number;
  offsetY: number;
}

function computeEntrance(
  slot: ImageFieldSlot,
  index: number,
  slots: ImageFieldSlot[],
  config: ImageFieldAnimationConfig,
  t: number,
  tileWidth: number,
  tileHeight: number,
  ease: (x: number) => number,
): EntranceState {
  if (config.entrance === "none") {
    return { opacityMul: 1, scaleMul: 1, offsetX: 0, offsetY: 0 };
  }

  let rank = slot.order;
  if (config.staggerOrder === "fromCenter") {
    const cx = tileWidth / 2;
    const cy = tileHeight / 2;
    const distances = slots.map((s) => Math.hypot(s.baseX - cx, s.baseY - cy));
    const dist = distances[index];
    rank = distances.filter((d) => d < dist).length;
  }

  const startTime = (rank * config.staggerMs) / 1000;
  const entranceDur = Math.max(0.05, config.entranceDurationMs / 1000);
  const progress = Math.max(0, Math.min(1, (t - startTime) / entranceDur));
  const eased = ease(progress);

  if (config.entrance === "stagger") {
    return { opacityMul: eased, scaleMul: lerp(0.8, 1, eased), offsetX: 0, offsetY: 0 };
  }

  // assemble: fly in from further out along the same radial direction from
  // the tile center.
  const cx = tileWidth / 2;
  const cy = tileHeight / 2;
  const dx = slot.baseX - cx;
  const dy = slot.baseY - cy;
  const startX = cx + dx * 3;
  const startY = cy + dy * 3;
  return {
    opacityMul: eased,
    scaleMul: lerp(0.6, 1, eased),
    offsetX: lerp(startX - slot.baseX, 0, eased),
    offsetY: lerp(startY - slot.baseY, 0, eased),
  };
}

function drawOverlay(rc: RenderContext, config: ImageFieldAnimationConfig) {
  if (!config.overlayEnabled || !config.overlayText.trim()) return;
  drawWrappedText(rc.ctx, config.overlayText, {
    x: rc.width / 2,
    y: rc.height / 2,
    fontSize: config.overlaySize,
    fontFamily: rc.resolveFont(null).family,
    color: config.overlayColor,
    align: "center",
    lineHeight: rc.typography.lineHeight,
    letterSpacing: rc.typography.letterSpacing,
  });
}

function boxSizeFor(config: ImageFieldAnimationConfig, image: AssetRef | undefined, nominalSize: number, scale: number): { w: number; h: number } {
  const aspect = (image && config.aspectRatios[image.id]) || 1;
  const w = nominalSize * scale;
  return { w, h: w / aspect };
}

/**
 * Carousel is a distinct rotating motion, not the shared direction/speed
 * drift+wrap every other layout uses — each image orbits a fixed angle
 * (layout.ts spaces the base angles evenly) plus continuous rotation from
 * carouselRotationSpeed. "ring" keeps every image the same size moving
 * around a flat circle; "coverflow" projects the ring onto x, scaling and
 * fading images by how far they've rotated from front-center.
 */
function renderCarousel(rc: RenderContext, config: ImageFieldAnimationConfig, layoutSlots: ImageFieldSlot[]) {
  const { ctx, width, height, t } = rc;
  const cx = width / 2;
  const cy = height / 2;
  const nominalSize = Math.min(width, height) * 0.16;
  const rotation = t * config.carouselRotationSpeed;

  const withAngle = layoutSlots.map((slot) => {
    const angleDeg = mod(slot.angleDeg + rotation, 360);
    const angleRad = (angleDeg * Math.PI) / 180;
    return { slot, angleRad, front: Math.cos(angleRad) };
  });

  if (config.carouselStyle === "ring") {
    // Flat 2D ring: same size throughout, positioned around the circle.
    withAngle
      .slice()
      .sort((a, b) => a.front - b.front)
      .forEach(({ slot, angleRad }) => {
        const image = config.images[slot.imageIndex];
        const bitmap = image && getImageBitmap(image.id);
        if (!bitmap) return;
        const x = cx + Math.sin(angleRad) * config.carouselRadius;
        const y = cy - Math.cos(angleRad) * config.carouselRadius;
        const { w, h } = boxSizeFor(config, image, nominalSize, slot.scale);
        drawImageTile(ctx, bitmap, {
          cx: x,
          cy: y,
          width: w,
          height: h,
          rotationDeg: slot.rotationBase,
          cornerRadius: config.cornerRadius,
          opacity: 1,
          focal: image ? config.focalPoints[image.id] : undefined,
          shadow: config.shadowEnabled ? { blur: config.shadowBlur, offsetY: config.shadowOffsetY, opacity: config.shadowOpacity } : null,
          border: config.borderEnabled ? { width: config.borderWidth, color: config.borderColor } : null,
        });
      });
    return;
  }

  // coverflow: back-to-front draw order, front-facing images are larger and more opaque.
  withAngle
    .slice()
    .sort((a, b) => a.front - b.front)
    .forEach(({ slot, angleRad, front }) => {
      const image = config.images[slot.imageIndex];
      const bitmap = image && getImageBitmap(image.id);
      if (!bitmap) return;
      const frontFactor = (front + 1) / 2; // 0 = back, 1 = front
      const x = cx + Math.sin(angleRad) * config.carouselRadius;
      const scaleMul = lerp(1 - config.carouselTilt, 1, frontFactor) * slot.scale;
      const opacity = lerp(0.15, 1, frontFactor);
      const { w, h } = boxSizeFor(config, image, nominalSize, scaleMul);
      drawImageTile(ctx, bitmap, {
        cx: x,
        cy: cy,
        width: w,
        height: h,
        rotationDeg: 0,
        cornerRadius: config.cornerRadius,
        opacity,
        focal: image ? config.focalPoints[image.id] : undefined,
        shadow: config.shadowEnabled ? { blur: config.shadowBlur, offsetY: config.shadowOffsetY, opacity: config.shadowOpacity } : null,
        border: config.borderEnabled ? { width: config.borderWidth, color: config.borderColor } : null,
      });
    });
}

export const imageFieldModule: AnimationModule<ImageFieldAnimationConfig> = {
  id: "imageField",
  label: "Image field",
  defaults: {
    type: "imageField",
    images: [],
    focalPoints: {},
    aspectRatios: {},
    seed: 1,
    assignment: "order",
    layoutMode: "scatter",

    scatterColumns: 8,
    scatterRows: 6,
    scatterDensity: 0.35,
    scatterJitter: 0.6,
    protectCenter: true,
    protectCenterWidthPct: 45,
    protectCenterHeightPct: 30,

    clusterSpread: 260,
    clusterArc: 40,
    clusterOverlap: 0.4,

    rowGap: 24,
    rowVerticalJitter: 0,

    bandsRowCount: 3,
    bandsRowGap: 40,

    carouselStyle: "coverflow",
    carouselRadius: 320,
    carouselRotationSpeed: 40,
    carouselTilt: 0.6,

    direction: "ltr",
    speed: 60,
    parallax: 0.4,
    swayEnabled: false,
    swayAmplitude: 12,
    swayFrequency: 1,
    rotationDriftEnabled: false,
    rotationDriftDegreesPerLoop: 8,

    cornerRadius: 0,
    scaleMin: 0.6,
    scaleMax: 1.4,
    rotationMin: 0,
    rotationMax: 0,
    shadowEnabled: false,
    shadowBlur: 20,
    shadowOffsetY: 8,
    shadowOpacity: 0.35,
    depthFade: 0.3,
    borderEnabled: false,
    borderWidth: 2,
    borderColor: "#ffffff",

    entrance: "none",
    entranceDurationMs: 500,
    staggerMs: 60,
    staggerOrder: "sequential",

    overlayEnabled: false,
    overlayText: "",
    overlaySize: 64,
    overlayColor: "#f5f5f0",
    overlayPosition: "above",
  },
  ParamsPanel: ImageFieldParamsPanel,
  renderFrame(rc, config) {
    const { ctx, width, height, t, duration, easing } = rc;

    if (config.overlayEnabled && config.overlayPosition === "below") drawOverlay(rc, config);

    if (config.images.length === 0) {
      ctx.save();
      ctx.fillStyle = rc.palette.secondary;
      ctx.font = "24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.6;
      ctx.fillText("Add images in the panel on the left", width / 2, height / 2);
      ctx.restore();
      if (config.overlayEnabled && config.overlayPosition === "above") drawOverlay(rc, config);
      return;
    }

    const tileWidth = width;
    const tileHeight = height;
    const layout = getOrComputeImageFieldLayout(config, tileWidth, tileHeight);

    if (config.layoutMode === "carousel") {
      renderCarousel(rc, config, layout.slots);
      if (config.overlayEnabled && config.overlayPosition === "above") drawOverlay(rc, config);
      return;
    }

    const isHorizontal = config.direction === "ltr" || config.direction === "rtl";
    const nominalSize = Math.min(width, height) * 0.16;
    const loopDuration = Math.max(duration, 1e-6);
    const dirSign = config.direction === "rtl" || config.direction === "up" ? -1 : 1;

    layout.slots.forEach((slot, i) => {
      const image = config.images[slot.imageIndex];
      const bitmap = image && getImageBitmap(image.id);
      if (!bitmap) return;

      const speedFactor = 1 + config.parallax * (slot.depth - 0.5) * 2;
      const effectiveSpeed = config.speed * speedFactor * slot.speedMultiplier;
      const rawOffset = effectiveSpeed * t * dirSign;

      let x = slot.baseX;
      let y = slot.baseY;
      if (isHorizontal) {
        x = mod(slot.baseX + rawOffset, tileWidth);
      } else {
        y = mod(slot.baseY + rawOffset, tileHeight);
      }

      if (config.swayEnabled) {
        const swayPhase = (t / loopDuration) * Math.PI * 2 * config.swayFrequency + slot.phase;
        const swayOffset = Math.sin(swayPhase) * config.swayAmplitude;
        if (isHorizontal) y += swayOffset;
        else x += swayOffset;
      }

      let rotation = slot.rotationBase;
      if (config.rotationDriftEnabled) {
        rotation += config.rotationDriftDegreesPerLoop * (t / loopDuration) * slot.rotationDriftSign;
      }

      const entrance = computeEntrance(slot, i, layout.slots, config, t, tileWidth, tileHeight, easing);
      const opacity = (1 - config.depthFade * (1 - slot.depth)) * entrance.opacityMul;
      if (opacity <= 0.002) return;

      const { w: boxW, h: boxH } = boxSizeFor(config, image, nominalSize, slot.scale * entrance.scaleMul);

      // Draw three tile copies so images crossing one edge are already
      // visible re-entering the opposite edge — the seamless-loop wrap.
      const copies = isHorizontal ? [-tileWidth, 0, tileWidth] : [0];
      const vCopies = isHorizontal ? [0] : [-tileHeight, 0, tileHeight];
      for (const cx of copies) {
        for (const cy of vCopies) {
          const drawX = x + cx + entrance.offsetX;
          const drawY = y + cy + entrance.offsetY;
          if (drawX + boxW / 2 < 0 || drawX - boxW / 2 > width) continue;
          if (drawY + boxH / 2 < 0 || drawY - boxH / 2 > height) continue;
          drawImageTile(ctx, bitmap, {
            cx: drawX,
            cy: drawY,
            width: boxW,
            height: boxH,
            rotationDeg: rotation,
            cornerRadius: config.cornerRadius,
            opacity,
            focal: config.focalPoints[image.id],
            shadow: config.shadowEnabled
              ? { blur: config.shadowBlur, offsetY: config.shadowOffsetY, opacity: config.shadowOpacity }
              : null,
            border: config.borderEnabled ? { width: config.borderWidth, color: config.borderColor } : null,
          });
        }
      }
    });

    if (config.overlayEnabled && config.overlayPosition === "above") drawOverlay(rc, config);
  },
};
