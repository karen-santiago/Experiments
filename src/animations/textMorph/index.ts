import { computeHoldTransition } from "../shared/holdTransition";
import type { TextMorphAnimationConfig } from "../../types/scene";
import type { AnimationModule } from "../types";
import { renderCharacterTransition } from "./characterTransition";
import { renderGlyphMorph } from "./glyphMorph";
import { TextMorphParamsPanel } from "./TextMorphParamsPanel";

export const textMorphModule: AnimationModule<TextMorphAnimationConfig> = {
  id: "textMorph",
  label: "Text morph",
  defaults: {
    type: "textMorph",
    mode: "character",
    textA: "Design",
    textB: "Motion",
    holdStart: 0.6,
    transitionDuration: 0.8,
    holdEnd: 0.6,
    color: "#f5f5f0",
    strokeEnabled: false,
    strokeColor: "#000000",
    strokeWidth: 2,
    loopMode: "loop",
    staggerMs: 40,
    direction: "up",
    blurAmount: 8,
    scaleFrom: 0.6,
    scaleTo: 1,
    opacityEasing: "easeOutCubic",
    seed: 1,
  },
  ParamsPanel: TextMorphParamsPanel,
  renderFrame(rc, config) {
    const { progress } = computeHoldTransition(rc.t, config.holdStart, config.transitionDuration, config.holdEnd, config.loopMode);
    if (config.mode === "character") {
      renderCharacterTransition(rc, config, progress);
    } else {
      renderGlyphMorph(rc, config, progress);
    }
  },
};
