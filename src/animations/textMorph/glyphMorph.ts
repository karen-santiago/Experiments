import type { TextMorphAnimationConfig } from "../../types/scene";
import type { RenderContext } from "../types";
import { renderCharacterTransition } from "./characterTransition";

// Placeholder until phase 6 wires up real opentype.js + flubber outline
// interpolation (font.getPath -> per-glyph flubber morph). Falls back to
// the character-transition renderer so mode "glyph" still animates
// something in the meantime rather than rendering blank.
export function renderGlyphMorph(rc: RenderContext, config: TextMorphAnimationConfig, progress: number) {
  renderCharacterTransition(rc, config, progress);
}
