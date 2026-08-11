import type { AnimationConfig } from "../types/scene";
import type { AnimationModule } from "./types";
import { demoModule } from "./demo";
import { imageFieldModule } from "./imageField";
import { textAnimationModule } from "./textAnimation";
import { shapeMorphModule } from "./shapeMorph";
import { imageFlickerModule } from "./imageFlicker";
import { textWallModule } from "./textWall";
import { chartModule } from "./chart";

// Registering a new animation type means: add it to this array (and to the
// AnimationConfig union in src/types/scene.ts). Nothing else should need to
// change — see spec section 5.
export const ANIMATION_MODULES: AnimationModule<AnimationConfig>[] = [
  imageFieldModule as AnimationModule<AnimationConfig>,
  textAnimationModule as AnimationModule<AnimationConfig>,
  shapeMorphModule as AnimationModule<AnimationConfig>,
  imageFlickerModule as AnimationModule<AnimationConfig>,
  textWallModule as AnimationModule<AnimationConfig>,
  chartModule as AnimationModule<AnimationConfig>,
  demoModule as AnimationModule<AnimationConfig>,
];

const byId = new Map(ANIMATION_MODULES.map((m) => [m.id, m]));

export function getAnimationModule(type: AnimationConfig["type"]): AnimationModule<AnimationConfig> {
  const mod = byId.get(type);
  if (!mod) throw new Error(`No animation module registered for type "${type}"`);
  return mod;
}
