import type { ComponentType } from "react";
import type { Font } from "opentype.js";
import type { EasingFn } from "../render/easing";
import type { AnimationConfig, AssetRef, CanvasConfig, PaletteConfig, TypographyConfig } from "../types/scene";

// Every animation module implements this shape. Adding a new animation type
// means: add a variant to AnimationConfig (src/types/scene.ts), write a
// module implementing AnimationModule, and add one line to registry.ts.
// Nothing else in the app should need to change.
export interface ResolvedFont {
  /** CSS font family registered for canvas fillText, or a generic fallback. */
  family: string;
  /** Parsed opentype.js Font, if this font is uploaded and parseable — null otherwise (glyph outlines unavailable). */
  parsedFont: Font | null;
}

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
  /**
   * Resolves a module-local font id (e.g. TextWallAnimationConfig.fontId)
   * to a usable font, falling back to the scene's default font
   * (typography.fontFileId) when `fontId` is null. Pass null to just get
   * the scene default.
   */
  resolveFont: (fontId: string | null) => ResolvedFont;
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
    /** The scene's uploaded font library, for modules with their own font selector. */
    fonts: AssetRef[];
    /** Read-only scene typography (e.g. for loop-duration estimates that depend on the default font size). */
    typography: TypographyConfig;
  }>;
  renderFrame: (rc: RenderContext, config: TConfig) => void;
}
