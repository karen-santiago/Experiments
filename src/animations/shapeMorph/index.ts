import { computeHoldTransition } from "../shared/holdTransition";
import type { ShapeMorphAnimationConfig } from "../../types/scene";
import type { AnimationModule } from "../types";
import { getOrBuildInterpolator } from "./interpolator";
import { ShapeMorphParamsPanel } from "./ShapeMorphParamsPanel";
import { normalizePath } from "../../lib/svgPath";

const PATH_SPACE_SIZE = 200;

// A rounded square morphing into a five-pointed star — a shape big enough
// to show subtle triangulation smoothing, distinct enough to prove the
// morph is really interpolating and not just crossfading.
const DEFAULT_PATH_A = normalizePath(
  "M40,10 H160 A30,30 0 0 1 190,40 V160 A30,30 0 0 1 160,190 H40 A30,30 0 0 1 10,160 V40 A30,30 0 0 1 40,10 Z",
);
const DEFAULT_PATH_B = normalizePath(
  "M100,10 L123,74 L193,74 L137,113 L158,180 L100,140 L42,180 L63,113 L7,74 L77,74 Z",
);

export const shapeMorphModule: AnimationModule<ShapeMorphAnimationConfig> = {
  id: "shapeMorph",
  label: "Shape morph",
  defaults: {
    type: "shapeMorph",
    pathA: DEFAULT_PATH_A,
    pathB: DEFAULT_PATH_B,
    holdStart: 0.6,
    morphDuration: 0.9,
    holdEnd: 0.6,
    fill: "#ff5a36",
    strokeEnabled: false,
    stroke: "#ffffff",
    strokeWidth: 2,
    loopMode: "pingpong",
    rotationOffset: 0,
  },
  ParamsPanel: ShapeMorphParamsPanel,
  renderFrame(rc, config) {
    const { ctx, width, height, easing } = rc;
    if (!config.pathA || !config.pathB) return;

    const { progress } = computeHoldTransition(rc.t, config.holdStart, config.morphDuration, config.holdEnd, config.loopMode);
    const eased = easing(progress);

    let d: string;
    try {
      const interpolator = getOrBuildInterpolator(config.pathA, config.pathB);
      d = interpolator(eased);
    } catch {
      return;
    }

    const displaySize = Math.min(width, height) * 0.6;
    const scale = displaySize / PATH_SPACE_SIZE;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((config.rotationOffset * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-PATH_SPACE_SIZE / 2, -PATH_SPACE_SIZE / 2);

    const path2d = new Path2D(d);
    ctx.fillStyle = config.fill;
    ctx.fill(path2d);
    if (config.strokeEnabled) {
      ctx.strokeStyle = config.stroke;
      ctx.lineWidth = config.strokeWidth / scale;
      ctx.stroke(path2d);
    }
    ctx.restore();
  },
};
