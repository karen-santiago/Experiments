import type { EasingName } from "../types/scene";

// All easing functions map [0,1] -> [0,1]. Pure math only, no side effects,
// so they're safe to call from renderFrame.
export type EasingFn = (x: number) => number;

const linear: EasingFn = (x) => x;

const easeInOut: EasingFn = (x) =>
  x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

const easeOutCubic: EasingFn = (x) => 1 - Math.pow(1 - x, 3);

const easeOutQuint: EasingFn = (x) => 1 - Math.pow(1 - x, 5);

const easeOutExpo: EasingFn = (x) =>
  x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);

const easeInOutBack: EasingFn = (x) => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return x < 0.5
    ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
    : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
};

// Damped sine approximation of a spring settling at 1.
const springish: EasingFn = (x) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const decay = Math.exp(-6 * x);
  return 1 - decay * Math.cos(x * 12);
};

export const EASINGS: Record<EasingName, EasingFn> = {
  linear,
  easeInOut,
  easeOutCubic,
  easeOutQuint,
  easeOutExpo,
  easeInOutBack,
  springish,
};

export function getEasing(name: EasingName): EasingFn {
  return EASINGS[name];
}
