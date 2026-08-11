import type { LoopMode } from "../../types/scene";

export interface HoldTransitionState {
  /** 0 = fully "A", 1 = fully "B". */
  progress: number;
  /** true while inside the transition window (not holding at either end). */
  inTransition: boolean;
}

/**
 * Shared timing model for every "A holds, transitions to B, B holds" module
 * (shape morph, text morph). Pure function of t — loop/ping-pong wrapping
 * happens here so every module gets identical, tested semantics.
 */
export function computeHoldTransition(
  t: number,
  holdStart: number,
  transitionDuration: number,
  holdEnd: number,
  loopMode: LoopMode,
): HoldTransitionState {
  const cycle = Math.max(holdStart + transitionDuration + holdEnd, 1e-6);

  let tt: number;
  if (loopMode === "once") {
    tt = Math.min(t, cycle);
  } else if (loopMode === "loop") {
    tt = mod(t, cycle);
  } else {
    const period = cycle * 2;
    const phase = mod(t, period);
    tt = phase <= cycle ? phase : period - phase;
  }

  if (tt < holdStart) return { progress: 0, inTransition: false };
  if (tt < holdStart + transitionDuration) {
    return { progress: (tt - holdStart) / transitionDuration, inTransition: true };
  }
  return { progress: 1, inTransition: false };
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Seconds elapsed since a reveal/sequence started, clamped to
 * [0, activeDuration], honoring loop/ping-pong/once — the same hold
 * semantics as computeHoldTransition, but returning raw elapsed seconds
 * instead of a 0..1 progress. Useful when a module needs to know exactly
 * how far into its own multi-step timeline it is (text animation's
 * type-in char count, chat's per-message sequencing) rather than a single
 * blended progress value.
 */
export function computeElapsedSinceStart(
  t: number,
  holdStart: number,
  activeDuration: number,
  holdEnd: number,
  loopMode: LoopMode,
): number {
  const cycle = Math.max(holdStart + activeDuration + holdEnd, 1e-6);
  let tt: number;
  if (loopMode === "once") {
    tt = Math.min(t, cycle);
  } else if (loopMode === "loop") {
    tt = mod(t, cycle);
  } else {
    const period = cycle * 2;
    const phase = mod(t, period);
    tt = phase <= cycle ? phase : period - phase;
  }
  if (tt < holdStart) return 0;
  return Math.min(tt - holdStart, activeDuration);
}
