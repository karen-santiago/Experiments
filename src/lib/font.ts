import * as opentype from "opentype.js";

export interface ParsedFont {
  font: opentype.Font;
  isVariable: boolean;
}

/**
 * Parses an uploaded font for glyph outlines (shape/glyph morph) and
 * detects variable fonts, which opentype.js only reads the default
 * instance of. Woff2 in particular isn't always parseable by opentype.js
 * even though the browser can still render it via FontFace — callers
 * should treat a thrown/null result as "outlines unavailable" without
 * blocking canvas text rendering.
 */
export async function parseFontBuffer(buffer: ArrayBuffer): Promise<ParsedFont | null> {
  try {
    const font = opentype.parse(buffer.slice(0));
    const isVariable = Boolean((font.tables as Record<string, unknown> | undefined)?.fvar);
    return { font, isVariable };
  } catch {
    return null;
  }
}
