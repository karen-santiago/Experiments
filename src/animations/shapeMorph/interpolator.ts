import type { Interpolator } from "flubber";
import { buildShapeInterpolator } from "../../lib/flubberInterpolator";

// Building a flubber interpolator triangulates both shapes, which is too
// expensive to redo every frame. Cached by the exact (pathA, pathB) string
// pair — recomputed only when a path actually changes, not when unrelated
// params (fill color, hold timing, ...) create a new config object.
let cacheKey = "";
let cachedInterpolator: Interpolator | null = null;

export function getOrBuildInterpolator(pathA: string, pathB: string): Interpolator {
  const key = `${pathA} ${pathB}`;
  if (cachedInterpolator && key === cacheKey) return cachedInterpolator;

  const interpolator = buildShapeInterpolator(pathA, pathB);
  cacheKey = key;
  cachedInterpolator = interpolator;
  return interpolator;
}
