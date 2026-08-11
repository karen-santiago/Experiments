import type { Font } from "opentype.js";
import { parseFontBuffer } from "./font";

// Registers uploaded fonts with the browser (for canvas fillText) and keeps
// a fontFileId -> CSS family name lookup so renderFrame can resolve which
// family to use. Also parses the same buffer with opentype.js so glyph
// morph can read outlines — a fontFileId with no parsed entry (parse
// failed, e.g. some woff2s) just means glyph morph isn't available for
// that font; canvas text rendering via FontFace is unaffected. Loading is
// async and happens outside renderFrame; until a font finishes loading,
// callers fall back to a generic family/no outlines so nothing throws
// mid-render.
const FALLBACK_FAMILY = "system-ui, sans-serif";

const families = new Map<string, string>();
const parsedFonts = new Map<string, Font>();
const loading = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();

export function subscribeFontRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const l of listeners) l();
}

export function getFontFamily(fontFileId: string | null): string {
  if (!fontFileId) return FALLBACK_FAMILY;
  return families.get(fontFileId) ?? FALLBACK_FAMILY;
}

export function getParsedFont(fontFileId: string | null): Font | null {
  if (!fontFileId) return null;
  return parsedFonts.get(fontFileId) ?? null;
}

export function isFontReady(fontFileId: string | null): boolean {
  return !fontFileId || families.has(fontFileId);
}

export async function registerFont(fontFileId: string, buffer: ArrayBuffer): Promise<string> {
  const existing = families.get(fontFileId);
  if (existing) return existing;
  const inFlight = loading.get(fontFileId);
  if (inFlight) return inFlight;

  const family = `motion-font-${fontFileId.slice(0, 12)}`;
  const promise = (async () => {
    const face = new FontFace(family, buffer);
    await face.load();
    document.fonts.add(face);
    families.set(fontFileId, family);

    const parsed = await parseFontBuffer(buffer);
    if (parsed) parsedFonts.set(fontFileId, parsed.font);

    notify();
    return family;
  })();
  loading.set(fontFileId, promise);
  return promise;
}
