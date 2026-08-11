import { createRng } from "../../lib/prng";
import { layoutCharacters } from "../shared/charLayout";
import { computeElapsedSinceStart } from "../shared/holdTransition";
import type { TextAnimationConfig } from "../../types/scene";
import type { AnimationModule, RenderContext } from "../types";
import { TextAnimationParamsPanel } from "./TextAnimationParamsPanel";

function revealDurationFor(config: TextAnimationConfig): number {
  const n = [...config.text].length;
  switch (config.style) {
    case "typeIn":
      return Math.max(0.05, (n * config.charIntervalMs) / 1000);
    case "grow":
      return Math.max(0.05, (Math.max(0, n - 1) * config.growStaggerMs + config.growDurationMs) / 1000);
    case "quick":
      return Math.max(0.05, config.quickDurationMs / 1000);
    case "rapidFire":
      return Math.max(0.05, (Math.max(0, n - 1) * config.rapidFireStaggerMs + config.rapidFireCycleMs) / 1000);
  }
}

function drawSolid(rc: RenderContext, config: TextAnimationConfig, fontFamily: string, text: string, opacity: number, scale: number) {
  if (opacity <= 0.002 || !text) return;
  const { ctx, width, height, typography } = rc;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);
  ctx.font = `${typography.fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (config.strokeEnabled) {
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = config.strokeWidth;
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = config.color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function renderTypeIn(rc: RenderContext, config: TextAnimationConfig, fontFamily: string, elapsed: number, revealDuration: number) {
  const chars = [...config.text];
  const charsToShow = Math.min(chars.length, Math.floor(elapsed / Math.max(config.charIntervalMs / 1000, 1e-6)));
  let shown = chars.slice(0, charsToShow).join("");
  if (config.showCursor && elapsed < revealDuration) {
    const blinkOn = Math.floor(rc.t * 2.5) % 2 === 0;
    if (blinkOn) shown += "|";
  }
  drawSolid(rc, config, fontFamily, shown, 1, 1);
}

function renderGrow(rc: RenderContext, config: TextAnimationConfig, fontFamily: string, elapsed: number) {
  const { ctx, width, height, typography, easing } = rc;
  const fontSize = typography.fontSize;
  const positions = layoutCharacters(ctx, config.text, fontSize, fontFamily, typography.letterSpacing, width / 2, "center");
  const y = height / 2 + fontSize * 0.35;
  const staggerSec = config.growStaggerMs / 1000;
  const durSec = Math.max(config.growDurationMs / 1000, 1e-6);

  positions.forEach((pos, i) => {
    const charStart = i * staggerSec;
    const progress = Math.max(0, Math.min(1, (elapsed - charStart) / durSec));
    const eased = easing(progress);
    if (eased <= 0.002 || !pos.ch.trim()) return;
    const scale = Math.max(0.001, config.growScaleFrom + (1 - config.growScaleFrom) * eased);
    ctx.save();
    ctx.globalAlpha = eased;
    ctx.translate(pos.x, y);
    ctx.scale(scale, scale);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    if (config.strokeEnabled) {
      ctx.strokeStyle = config.strokeColor;
      ctx.lineWidth = config.strokeWidth;
      ctx.strokeText(pos.ch, 0, 0);
    }
    ctx.fillStyle = config.color;
    ctx.fillText(pos.ch, 0, 0);
    ctx.restore();
  });
}

function renderQuick(rc: RenderContext, config: TextAnimationConfig, fontFamily: string, elapsed: number) {
  const progress = Math.max(0, Math.min(1, elapsed / Math.max(config.quickDurationMs / 1000, 1e-6)));
  const eased = rc.easing(progress);
  drawSolid(rc, config, fontFamily, config.text, eased, 0.85 + 0.15 * eased);
}

function renderRapidFire(rc: RenderContext, config: TextAnimationConfig, fontFamily: string, elapsed: number) {
  const { ctx, width, height, typography } = rc;
  const fontSize = typography.fontSize;
  const chars = [...config.text];
  const charset = config.rapidFireCharset || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const staggerSec = config.rapidFireStaggerMs / 1000;
  const cycleSec = Math.max(config.rapidFireCycleMs / 1000, 1e-6);
  const scrambleStepSec = 0.05;

  const positions = layoutCharacters(ctx, config.text, fontSize, fontFamily, typography.letterSpacing, width / 2, "center");
  const y = height / 2 + fontSize * 0.35;

  ctx.save();
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  positions.forEach((pos, i) => {
    const localT = elapsed - i * staggerSec;
    if (localT < 0) return;
    let ch = chars[i];
    let opacity = 1;
    if (localT < cycleSec) {
      const step = Math.floor(localT / scrambleStepSec);
      const rng = createRng(config.seed + i * 7919 + step * 104729);
      ch = pos.ch.trim() ? rng.pick([...charset]) : pos.ch;
      opacity = 0.85;
    }
    ctx.globalAlpha = opacity;
    if (config.strokeEnabled) {
      ctx.strokeStyle = config.strokeColor;
      ctx.lineWidth = config.strokeWidth;
      ctx.strokeText(ch, pos.x, y);
    }
    ctx.fillStyle = config.color;
    ctx.fillText(ch, pos.x, y);
  });
  ctx.restore();
}

export const textAnimationModule: AnimationModule<TextAnimationConfig> = {
  id: "textAnimation",
  label: "Text animation",
  defaults: {
    type: "textAnimation",
    style: "typeIn",
    text: "Hello, world",
    fontId: null,
    holdStart: 0.4,
    holdEnd: 0.9,
    color: "#f5f5f0",
    strokeEnabled: false,
    strokeColor: "#000000",
    strokeWidth: 2,
    loopMode: "loop",

    charIntervalMs: 60,
    showCursor: true,
    cursorColor: "#f5f5f0",

    growStaggerMs: 40,
    growDurationMs: 350,
    growScaleFrom: 0.4,

    quickDurationMs: 250,

    rapidFireStaggerMs: 50,
    rapidFireCycleMs: 350,
    rapidFireCharset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    seed: 1,
  },
  ParamsPanel: TextAnimationParamsPanel,
  renderFrame(rc, config) {
    if (!config.text.trim()) return;
    const fontFamily = rc.resolveFont(config.fontId).family;
    const revealDuration = revealDurationFor(config);
    const elapsed = computeElapsedSinceStart(rc.t, config.holdStart, revealDuration, config.holdEnd, config.loopMode);

    switch (config.style) {
      case "typeIn":
        renderTypeIn(rc, config, fontFamily, elapsed, revealDuration);
        break;
      case "grow":
        renderGrow(rc, config, fontFamily, elapsed);
        break;
      case "quick":
        renderQuick(rc, config, fontFamily, elapsed);
        break;
      case "rapidFire":
        renderRapidFire(rc, config, fontFamily, elapsed);
        break;
    }
  },
};
