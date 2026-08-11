export interface WrappedTextOptions {
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number; // multiplier, e.g. 1.2
  letterSpacing: number; // px
  strokeColor?: string;
  strokeWidth?: number;
}

function fillTextWithLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: "left" | "center" | "right",
  letterSpacing: number,
  stroke?: { color: string; width: number },
) {
  if (letterSpacing === 0) {
    ctx.textAlign = align;
    if (stroke) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.strokeText(text, x, y);
    }
    ctx.fillText(text, x, y);
    return;
  }

  // Canvas has no native letter-spacing, so measure per-character and
  // advance manually.
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + letterSpacing * Math.max(0, text.length - 1);
  let cursor = x;
  if (align === "center") cursor = x - totalWidth / 2;
  else if (align === "right") cursor = x - totalWidth;

  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    if (stroke) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.strokeText(ch, cursor, y);
    }
    ctx.fillText(ch, cursor, y);
    cursor += widths[i] + letterSpacing;
  });
}

/** Greedy word-wrap: breaks `text` into lines no wider than `maxWidth` at the current ctx.font. Respects existing `\n` breaks. */
export function wrapTextToLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

/** Draws `\n`-delimited multi-line text centered vertically on `y`. */
export function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, opts: WrappedTextOptions) {
  const lines = text.split("\n");
  const lineStep = opts.fontSize * opts.lineHeight;
  const totalHeight = lineStep * (lines.length - 1);
  const startY = opts.y - totalHeight / 2;

  ctx.save();
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
  ctx.fillStyle = opts.color;
  ctx.textBaseline = "middle";

  lines.forEach((line, i) => {
    fillTextWithLetterSpacing(
      ctx,
      line,
      opts.x,
      startY + i * lineStep,
      opts.align,
      opts.letterSpacing,
      opts.strokeColor && opts.strokeWidth ? { color: opts.strokeColor, width: opts.strokeWidth } : undefined,
    );
  });

  ctx.restore();
}
