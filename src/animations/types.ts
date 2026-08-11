import type { ComponentType } from "react";
import type { Font } from "opentype.js";
import type { EasingFn } from "../render/easing";
import type { AnimationConfig, CanvasConfig, PaletteConfig, TypographyConfig } from "../types/scene";

// Every animation module implements this shape. Adding a new animation type
// means: add a variant to AnimationConfig (src/types/scene.ts), write a
// module implementing AnimationModule, and add one line to registry.ts.
// Nothing else in the app should need to change.
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  t: number; // seconds elapsed, 0..duration. NEVER read wall-clock time here.
  width: number;
  height: number;
  fps: number;
  duration: number;
  palette: PaletteConfig;
  typography: TypographyConfig;
  easing: EasingFn;
  /** CSS font family registered for the scene's uploaded font, or a generic fallback. */
  fontFamily: string;
  /** Parsed opentype.js Font for the uploaded font, if one is uploaded and parseable — null otherwise (glyph outlines unavailable). */
  parsedFont: Font | null;
}

export interface AnimationModule<TConfig extends AnimationConfig = AnimationConfig> {
  id: TConfig["type"];
  label: string;
  defaults: TConfig;
  ParamsPanel: ComponentType<{
    config: TConfig;
    onChange: (next: TConfig) => void;
    /** Read-only canvas context a few params panels need (e.g. image field's loop-snap button). */
    canvas: CanvasConfig;
    onCanvasChange: (next: CanvasConfig) => void;
  }>;
  renderFrame: (rc: RenderContext, config: TConfig) => void;
}
