// Core data model. See spec section 4. Kept in sync with presets/*.motion.json.

export type EasingName =
  | "linear"
  | "easeInOut"
  | "easeOutCubic"
  | "easeOutQuint"
  | "easeOutExpo"
  | "easeInOutBack"
  | "springish";

export type LoopMode = "once" | "pingpong" | "loop";

export interface CanvasConfig {
  width: number;
  height: number;
  background: string; // hex, or "transparent"
  fps: 24 | 30 | 60;
  duration: number; // seconds
}

export interface TypographyConfig {
  fontFileId: string | null;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
}

export interface PaletteConfig {
  primary: string;
  secondary: string;
  accent: string;
}

// Phase 1 ships a single "demo" animation module so the render pipeline and
// export pipeline can be built and verified end-to-end. Shape morph, text
// morph, image field, image flicker and text wall are added in later phases
// by adding a variant to this union and a matching entry in the registry —
// no other file needs to change.
export interface DemoAnimationConfig {
  type: "demo";
  shape: "square" | "circle";
  rotationSpeed: number; // degrees per second
  showFrameCounter: boolean;
}

export type AnimationConfig = DemoAnimationConfig;

export interface SceneConfig {
  version: 1;
  name: string;
  canvas: CanvasConfig;
  typography: TypographyConfig;
  palette: PaletteConfig;
  easing: EasingName;
  animation: AnimationConfig;
}

export function createDefaultScene(): SceneConfig {
  return {
    version: 1,
    name: "untitled",
    canvas: {
      width: 1080,
      height: 1080,
      background: "#0b0b0d",
      fps: 30,
      duration: 4,
    },
    typography: {
      fontFileId: null,
      fontSize: 48,
      letterSpacing: 0,
      lineHeight: 1.2,
      textAlign: "center",
    },
    palette: {
      primary: "#f5f5f0",
      secondary: "#8a8a8a",
      accent: "#ff5a36",
    },
    easing: "easeInOutBack",
    animation: {
      type: "demo",
      shape: "square",
      rotationSpeed: 45,
      showFrameCounter: true,
    },
  };
}
