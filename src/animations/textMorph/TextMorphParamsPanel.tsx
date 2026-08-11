import type { TextMorphAnimationConfig } from "../../types/scene";
import { EASINGS } from "../../render/easing";
import { SliderField } from "../../components/SliderField";

type Props = {
  config: TextMorphAnimationConfig;
  onChange: (next: TextMorphAnimationConfig) => void;
};

export function TextMorphParamsPanel({ config, onChange }: Props) {
  const set = <K extends keyof TextMorphAnimationConfig>(key: K, value: TextMorphAnimationConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="params-panel">
      <label className="field">
        <span>
          Mode
          {config.mode === "glyph" && (
            <span className="hint" title="Glyph morph interpolates letter outlines directly. It looks great on short strings with similar letter counts and gets mushy on long or very different ones.">
              {" "}
              (ⓘ hover)
            </span>
          )}
        </span>
        <select value={config.mode} onChange={(e) => set("mode", e.target.value as TextMorphAnimationConfig["mode"])}>
          <option value="character">Character transition (recommended)</option>
          <option value="glyph">Glyph morph (outlines)</option>
        </select>
      </label>
      {config.mode === "glyph" && (
        <p className="hint">
          Glyph morph interpolates letter outlines directly using the uploaded font. It looks great on short strings
          with a similar letter count and gets mushy on long or very different strings — character transition is
          usually the better default.
        </p>
      )}

      <label className="field">
        <span>Text A</span>
        <input type="text" value={config.textA} onChange={(e) => set("textA", e.target.value)} />
      </label>
      <label className="field">
        <span>Text B</span>
        <input type="text" value={config.textB} onChange={(e) => set("textB", e.target.value)} />
      </label>

      <SliderField label="Hold start (s)" value={config.holdStart} min={0} max={5} step={0.05} onChange={(v) => set("holdStart", v)} />
      <SliderField label="Transition duration (s)" value={config.transitionDuration} min={0.05} max={5} step={0.05} onChange={(v) => set("transitionDuration", v)} />
      <SliderField label="Hold end (s)" value={config.holdEnd} min={0} max={5} step={0.05} onChange={(v) => set("holdEnd", v)} />

      <label className="field">
        <span>Loop mode</span>
        <select value={config.loopMode} onChange={(e) => set("loopMode", e.target.value as TextMorphAnimationConfig["loopMode"])}>
          <option value="once">Once</option>
          <option value="loop">Loop</option>
          <option value="pingpong">Ping-pong</option>
        </select>
      </label>

      <label className="field">
        <span>Color</span>
        <input type="color" value={config.color} onChange={(e) => set("color", e.target.value)} />
      </label>
      <label className="field field-checkbox">
        <input type="checkbox" checked={config.strokeEnabled} onChange={(e) => set("strokeEnabled", e.target.checked)} />
        <span>Stroke</span>
      </label>
      {config.strokeEnabled && (
        <>
          <label className="field">
            <span>Stroke color</span>
            <input type="color" value={config.strokeColor} onChange={(e) => set("strokeColor", e.target.value)} />
          </label>
          <SliderField label="Stroke width" value={config.strokeWidth} min={0.5} max={12} step={0.5} onChange={(v) => set("strokeWidth", v)} />
        </>
      )}

      {config.mode === "character" && (
        <details open>
          <summary>Character transition</summary>
          <SliderField label="Stagger (ms)" value={config.staggerMs} min={0} max={200} step={5} onChange={(v) => set("staggerMs", v)} />
          <label className="field">
            <span>Direction</span>
            <select value={config.direction} onChange={(e) => set("direction", e.target.value as TextMorphAnimationConfig["direction"])}>
              <option value="up">Up</option>
              <option value="down">Down</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="random">Random</option>
            </select>
          </label>
          {config.direction === "random" && (
            <label className="field">
              <span>Seed</span>
              <div className="field-row">
                <input type="number" value={config.seed} onChange={(e) => set("seed", Number(e.target.value))} />
                <button type="button" onClick={() => set("seed", Math.floor(Math.random() * 1_000_000))}>
                  🎲
                </button>
              </div>
            </label>
          )}
          <SliderField label="Blur (px)" value={config.blurAmount} min={0} max={40} step={1} onChange={(v) => set("blurAmount", v)} />
          <SliderField label="Scale from" value={config.scaleFrom} min={0.1} max={2} step={0.05} onChange={(v) => set("scaleFrom", v)} />
          <SliderField label="Scale to" value={config.scaleTo} min={0.1} max={2} step={0.05} onChange={(v) => set("scaleTo", v)} />
          <label className="field">
            <span>Opacity curve</span>
            <select value={config.opacityEasing} onChange={(e) => set("opacityEasing", e.target.value as TextMorphAnimationConfig["opacityEasing"])}>
              {Object.keys(EASINGS).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </details>
      )}
    </div>
  );
}
