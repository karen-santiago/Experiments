import type { ComponentType } from "react";
import type { AnimationConfig, PaletteConfig } from "../types/scene";

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
}

export interface AnimationModule<TConfig extends AnimationConfig = AnimationConfig> {
  id: TConfig["type"];
  label: string;
  defaults: TConfig;
  ParamsPanel: ComponentType<{
    config: TConfig;
    onChange: (next: TConfig) => void;
  }>;
  renderFrame: (rc: RenderContext, config: TConfig) => void;
}
