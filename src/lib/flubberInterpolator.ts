import { interpolate, interpolateAll, separate, combine, splitPathString, type Interpolator } from "flubber";

/**
 * Builds a flubber interpolator between two possibly-compound path `d`
 * strings, picking interpolate/separate/combine/interpolateAll based on
 * how many subpaths each side has — spec 5.1: "Accept multi-subpath SVGs
 * by using flubber.separate / combine where counts differ." Shared by
 * shape morph (two uploaded paths) and glyph morph (one interpolator per
 * character pair, since glyphs like "o" or "8" are compound paths too).
 */
export function buildShapeInterpolator(pathA: string, pathB: string): Interpolator {
  const shapesA = safeSplit(pathA);
  const shapesB = safeSplit(pathB);
  const options = { maxSegmentLength: 2, single: true } as const;

  if (shapesA.length === shapesB.length) {
    return shapesA.length === 1 ? interpolate(shapesA[0], shapesB[0], options) : interpolateAll(shapesA, shapesB, options);
  }
  if (shapesA.length === 1) return separate(shapesA[0], shapesB, options);
  if (shapesB.length === 1) return combine(shapesA, shapesB[0], options);
  // Neither side is a single shape and the counts don't match — no direct
  // flubber method covers N-to-M, so fall back to the first subpath of each.
  return interpolate(shapesA[0], shapesB[0], options);
}

function safeSplit(d: string): string[] {
  const shapes = splitPathString(d).filter((s) => s.trim().length > 0);
  return shapes.length > 0 ? shapes : [d];
}
