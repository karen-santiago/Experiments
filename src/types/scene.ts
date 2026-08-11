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
  /** Default font for the scene — used by any text-capable module whose own `fontId` is null. */
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

export type TextAnimationStyle = "typeIn" | "grow" | "quick" | "rapidFire";

export interface TextAnimationConfig {
  type: "textAnimation";
  style: TextAnimationStyle;
  text: string;
  /** Overrides the scene's default font (typography.fontFileId) when set. */
  fontId: string | null;
  holdStart: number;
  holdEnd: number;
  color: string;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  loopMode: LoopMode;

  // style: typeIn
  charIntervalMs: number;
  showCursor: boolean;
  cursorColor: string;

  // style: grow
  growStaggerMs: number;
  growDurationMs: number;
  growScaleFrom: number;

  // style: quick
  quickDurationMs: number;

  // style: rapidFire — each character cycles through random glyphs before
  // settling on its real character, like a decode/glitch effect.
  rapidFireStaggerMs: number;
  rapidFireCycleMs: number;
  rapidFireCharset: string;
  seed: number;
}

export type ImageFieldLayoutMode = "scatter" | "cluster" | "row" | "bands" | "carousel" | "grid";
export type ImageFieldDirection = "ltr" | "rtl" | "up" | "down";
export type ImageFieldEntrance = "none" | "stagger" | "assemble";
export type ImageFieldAssignment = "order" | "shuffled";
export type CarouselStyle = "coverflow" | "ring";

export interface ImageFieldAnimationConfig {
  type: "imageField";
  images: AssetRef[];
  focalPoints: Record<string, { x: number; y: number }>; // assetId -> 0..1 crop anchor
  aspectRatios: Record<string, number>; // assetId -> width/height override (1 = square, default)
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

  // layoutMode: carousel — a distinct rotating motion, not the shared
  // direction/speed drift the other modes use.
  carouselStyle: CarouselStyle;
  carouselRadius: number; // px: ring radius, or coverflow spacing between images
  carouselRotationSpeed: number; // degrees per second
  carouselTilt: number; // 0..1, how much receding coverflow images scale/fade down

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
  fontId: string | null;
}

export type ChartType = "bar" | "donut";

export interface ChartDataPoint {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface ChartAnimationConfig {
  type: "chart";
  chartType: ChartType;
  data: ChartDataPoint[];
  fontId: string | null;

  holdStart: number;
  revealDuration: number; // seconds, total time for the reveal
  holdEnd: number;
  loopMode: LoopMode;
  staggerMs: number; // delay before each bar/segment starts growing

  // bar chart
  barGap: number; // 0..1 fraction of each bar's slot width
  barCornerRadius: number;
  showValues: boolean;
  showLabels: boolean;
  axisColor: string;

  // donut chart
  donutThickness: number; // 0..1 fraction of outer radius
  donutGapDeg: number; // gap between segments, degrees
  centerText: string;
  centerTextSize: number;
  centerTextColor: string;
}

export type ChatSpeaker = "a" | "b";

export interface ChatMessage {
  id: string;
  speaker: ChatSpeaker;
  text: string;
}

export interface ChatAnimationConfig {
  type: "chat";
  messages: ChatMessage[];
  avatarA: AssetRef | null;
  avatarB: AssetRef | null;
  nameA: string;
  nameB: string;
  bubbleColorA: string;
  bubbleColorB: string;
  textColorA: string;
  textColorB: string;
  fontId: string | null;
  fontSize: number;
  bubbleCornerRadius: number;

  messageIntervalMs: number; // time from one bubble appearing to the next starting
  showTypingIndicator: boolean;
  typingDurationMs: number;
  typingDotColor: string;

  loopMode: LoopMode;
  holdEnd: number; // hold after the last message before looping
}

// Registering a new animation type means: add a variant here, write a
// module implementing AnimationModule (src/animations/types.ts), and add
// one entry to src/animations/registry.ts. Nothing else should need to
// change — see spec section 5.
export type AnimationConfig =
  | DemoAnimationConfig
  | ShapeMorphAnimationConfig
  | TextAnimationConfig
  | ImageFieldAnimationConfig
  | ImageFlickerAnimationConfig
  | TextWallAnimationConfig
  | ChartAnimationConfig
  | ChatAnimationConfig;

export interface SceneConfig {
  version: 1;
  name: string;
  canvas: CanvasConfig;
  typography: TypographyConfig;
  palette: PaletteConfig;
  easing: EasingName;
  /** Uploaded font library — text-capable modules pick one by id, or fall back to typography.fontFileId. */
  fonts: AssetRef[];
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
    fonts: [],
    animation: {
      type: "demo",
      shape: "square",
      rotationSpeed: 45,
      showFrameCounter: true,
    },
  };
}
