export interface CharPosition {
  ch: string;
  x: number; // baseline-left x for this character
}

/**
 * Measures each character of `text` and returns left-edge x positions so
 * per-character transforms can be applied individually. `anchorX`/`align`
 * behave like canvas textAlign but pre-resolved to per-character offsets.
 */
export function layoutCharacters(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  fontFamily: string,
  letterSpacing: number,
  anchorX: number,
  align: "left" | "center" | "right",
): CharPosition[] {
  ctx.save();
  ctx.font = `${fontSize}px ${fontFamily}`;
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + letterSpacing * Math.max(0, chars.length - 1);
  ctx.restore();

  let cursor = anchorX;
  if (align === "center") cursor = anchorX - totalWidth / 2;
  else if (align === "right") cursor = anchorX - totalWidth;

  const positions: CharPosition[] = [];
  chars.forEach((ch, i) => {
    positions.push({ ch, x: cursor });
    cursor += widths[i] + letterSpacing;
  });
  return positions;
}
