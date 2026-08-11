export interface FocalPoint {
  x: number; // 0..1
  y: number; // 0..1
}

export function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws `bitmap` into the (dx,dy,dw,dh) box with CSS `object-fit: cover`
 * semantics, cropping around `focal` (0..1, default center).
 */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  focal: FocalPoint = { x: 0.5, y: 0.5 },
) {
  const srcAspect = bitmap.width / bitmap.height;
  const dstAspect = dw / dh;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (srcAspect > dstAspect) {
    sw = bitmap.height * dstAspect;
  } else {
    sh = bitmap.width / dstAspect;
  }
  const sx = clamp((bitmap.width - sw) * focal.x, 0, bitmap.width - sw);
  const sy = clamp((bitmap.height - sh) * focal.y, 0, bitmap.height - sh);
  ctx.drawImage(bitmap, sx, sy, sw, sh, dx, dy, dw, dh);
}

export function drawContain(ctx: CanvasRenderingContext2D, bitmap: ImageBitmap, dx: number, dy: number, dw: number, dh: number) {
  const srcAspect = bitmap.width / bitmap.height;
  const dstAspect = dw / dh;
  let w = dw;
  let h = dh;
  if (srcAspect > dstAspect) {
    h = dw / srcAspect;
  } else {
    w = dh * srcAspect;
  }
  const x = dx + (dw - w) / 2;
  const y = dy + (dh - h) / 2;
  ctx.drawImage(bitmap, x, y, w, h);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Draws a rounded-corner, optionally shadowed/bordered cover-fit image
 * centered at (cx, cy) with the given box size. All state is saved and
 * restored so callers can chain these per-slot without leaking ctx state.
 */
export function drawImageTile(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  opts: {
    cx: number;
    cy: number;
    width: number;
    height: number;
    rotationDeg: number;
    cornerRadius: number;
    opacity: number;
    focal?: FocalPoint;
    shadow?: { blur: number; offsetY: number; opacity: number } | null;
    border?: { width: number; color: string } | null;
  },
) {
  const { cx, cy, width, height, rotationDeg, cornerRadius, opacity, focal, shadow, border } = opts;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  ctx.rotate((rotationDeg * Math.PI) / 180);

  if (shadow) {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${shadow.opacity})`;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetY = shadow.offsetY;
    roundedRectPath(ctx, -width / 2, -height / 2, width, height, cornerRadius);
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundedRectPath(ctx, -width / 2, -height / 2, width, height, cornerRadius);
  ctx.clip();
  drawCover(ctx, bitmap, -width / 2, -height / 2, width, height, focal);
  ctx.restore();

  if (border && border.width > 0) {
    roundedRectPath(ctx, -width / 2, -height / 2, width, height, cornerRadius);
    ctx.strokeStyle = border.color;
    ctx.lineWidth = border.width;
    ctx.stroke();
  }

  ctx.restore();
}
