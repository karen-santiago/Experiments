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

// Reference to a locally-stored (content-addressed) uploaded image or font.
// `id` is the sha256 of the file's bytes, assigned by the sidecar on
// upload — see server/assets.ts and src/lib/assets.ts.
export interface AssetRef {
  id: string;
  name: string;
}

export interface DemoAnimationConfig {
  type: "demo";
  shape: "square" | "circle";
  rotationSpeed: number; // degrees per second
  showFrameCounter: boolean;
}

export interface ShapeMorphAnimationConfig {
  type: "shapeMorph";
  pathA: string; // SVG `d` data
  pathB: string;
  holdStart: number; // seconds
  morphDuration: number; // seconds
  holdEnd: number; // seconds
  fill: string;
  strokeEnabled: boolean;
  stroke: string;
  strokeWidth: number;
  loopMode: LoopMode;
  rotationOffset: number; // degrees
}

export type TextMorphMode = "glyph" | "character";
export type CharacterDirection = "up" | "down" | "left" | "right" | "random";

export interface TextMorphAnimationConfig {
  type: "textMorph";
  mode: TextMorphMode;
  textA: string;
  textB: string;
  holdStart: number;
  transitionDuration: number;
  holdEnd: number;
  color: string;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  loopMode: LoopMode;
  // Mode B (character transition) params.
  staggerMs: number;
  direction: CharacterDirection;
  blurAmount: number; // px
  scaleFrom: number;
  scaleTo: number;
  opacityEasing: EasingName;
  seed: number; // used when direction === "random"
}

export type ImageFieldLayoutMode = "scatter" | "cluster" | "row" | "bands";
export type ImageFieldDirection = "ltr" | "rtl" | "up" | "down";
export type ImageFieldEntrance = "none" | "stagger" | "assemble";
export type ImageFieldAssignment = "order" | "shuffled";

export interface ImageFieldAnimationConfig {
  type: "imageField";
  images: AssetRef[];
  focalPoints: Record<string, { x: number; y: number }>; // assetId -> 0..1 crop anchor
  seed: number;
  assignment: ImageFieldAssignment;
  layoutMode: ImageFieldLayoutMode;

  scatterColumns: number;
  scatterRows: number;
  scatterDensity: number; // 0..1
  scatterJitter: number; // 0..1
  protectCenter: boolean;
  protectCenterWidthPct: number;
  protectCenterHeightPct: number;

  clusterSpread: number; // px
  clusterArc: number; // degrees
  clusterOverlap: number; // 0..1

  rowGap: number; // px
  rowVerticalJitter: number; // px

  bandsRowCount: number; // 2..5
  bandsRowGap: number; // px

  direction: ImageFieldDirection;
  speed: number; // px/s
  parallax: number; // 0..1
  swayEnabled: boolean;
  swayAmplitude: number; // px
  swayFrequency: number; // cycles per loop
  rotationDriftEnabled: boolean;
  rotationDriftDegreesPerLoop: number;

  cornerRadius: number; // px
  scaleMin: number;
  scaleMax: number;
  rotationMin: number; // degrees
  rotationMax: number;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowOffsetY: number;
  shadowOpacity: number;
  depthFade: number; // 0..1
  borderEnabled: boolean;
  borderWidth: number;
  borderColor: string;

  entrance: ImageFieldEntrance;
  entranceDurationMs: number;
  staggerMs: number;
  staggerOrder: "sequential" | "fromCenter";

  overlayEnabled: boolean;
  overlayText: string;
  overlaySize: number;
  overlayColor: string;
  overlayPosition: "above" | "below";
}

export type ImageFlickerOrder = "sequential" | "reverse" | "randomBySeed" | "pingpong";
export type ImageFlickerTransition = "cut" | "crossfade";
export type ImageFit = "cover" | "contain" | "fill";

export interface ImageFlickerAnimationConfig {
  type: "imageFlicker";
  images: AssetRef[];
  intervalMs: number;
  order: ImageFlickerOrder;
  seed: number;
  transition: ImageFlickerTransition;
  crossfadeDurationMs: number;
  fit: ImageFit;
  background: string; // hex, or "transparent" to use the canvas background
}

export type TextWallLayout = "grid" | "marqueeRows" | "verticalScroll";
export type TextWallReveal = "all" | "staggered" | "typewriter";
export type TextWallColorMode = "primary" | "alternating" | "random";

export interface TextWallAnimationConfig {
  type: "textWall";
  words: string[]; // one per line, from a textarea
  layout: TextWallLayout;
  reveal: TextWallReveal;
  staggerIntervalMs: number;
  scrollSpeed: number; // px/s
  colorMode: TextWallColorMode;
  fontSizeVariance: number; // 0 = uniform
  rotationVariance: number; // degrees
  seed: number;
}

// Registering a new animation type means: add a variant here, write a
// module implementing AnimationModule (src/animations/types.ts), and add
// one entry to src/animations/registry.ts. Nothing else should need to
// change — see spec section 5.
export type AnimationConfig =
  | DemoAnimationConfig
  | ShapeMorphAnimationConfig
  | TextMorphAnimationConfig
  | ImageFieldAnimationConfig
  | ImageFlickerAnimationConfig
  | TextWallAnimationConfig;

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
