import type { AssetRef, TextAnimationConfig } from "../../types/scene";
import { SliderField } from "../../components/SliderField";
import { FontSelect } from "../../components/FontSelect";

type Props = {
  config: TextAnimationConfig;
  onChange: (next: TextAnimationConfig) => void;
  fonts: AssetRef[];
};

export function TextAnimationParamsPanel({ config, onChange, fonts }: Props) {
  const set = <K extends keyof TextAnimationConfig>(key: K, value: TextAnimationConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="params-panel">
      <label className="field">
        <span>Style</span>
        <select value={config.style} onChange={(e) => set("style", e.target.value as TextAnimationConfig["style"])}>
          <option value="typeIn">Type in</option>
          <option value="grow">Grow</option>
          <option value="quick">Quick</option>
          <option value="rapidFire">Rapid fire</option>
        </select>
      </label>

      <label className="field">
        <span>Text</span>
        <input type="text" value={config.text} onChange={(e) => set("text", e.target.value)} />
      </label>

      <FontSelect fonts={fonts} value={config.fontId} onChange={(fontId) => set("fontId", fontId)} />

      <SliderField label="Hold start (s)" value={config.holdStart} min={0} max={5} step={0.05} onChange={(v) => set("holdStart", v)} />
      <SliderField label="Hold end (s)" value={config.holdEnd} min={0} max={5} step={0.05} onChange={(v) => set("holdEnd", v)} />

      <label className="field">
        <span>Loop mode</span>
        <select value={config.loopMode} onChange={(e) => set("loopMode", e.target.value as TextAnimationConfig["loopMode"])}>
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

      {config.style === "typeIn" && (
        <details open>
          <summary>Type in</summary>
          <SliderField label="Char interval (ms)" value={config.charIntervalMs} min={10} max={400} step={5} onChange={(v) => set("charIntervalMs", v)} />
          <label className="field field-checkbox">
            <input type="checkbox" checked={config.showCursor} onChange={(e) => set("showCursor", e.target.checked)} />
            <span>Show cursor</span>
          </label>
        </details>
      )}

      {config.style === "grow" && (
        <details open>
          <summary>Grow</summary>
          <SliderField label="Stagger (ms)" value={config.growStaggerMs} min={0} max={200} step={5} onChange={(v) => set("growStaggerMs", v)} />
          <SliderField label="Duration (ms)" value={config.growDurationMs} min={50} max={1500} step={10} onChange={(v) => set("growDurationMs", v)} />
          <SliderField label="Scale from" value={config.growScaleFrom} min={0} max={1} step={0.05} onChange={(v) => set("growScaleFrom", v)} />
        </details>
      )}

      {config.style === "quick" && (
        <details open>
          <summary>Quick</summary>
          <SliderField label="Duration (ms)" value={config.quickDurationMs} min={50} max={1000} step={10} onChange={(v) => set("quickDurationMs", v)} />
        </details>
      )}

      {config.style === "rapidFire" && (
        <details open>
          <summary>Rapid fire</summary>
          <SliderField label="Stagger (ms)" value={config.rapidFireStaggerMs} min={0} max={200} step={5} onChange={(v) => set("rapidFireStaggerMs", v)} />
          <SliderField label="Cycle duration (ms)" value={config.rapidFireCycleMs} min={50} max={1500} step={10} onChange={(v) => set("rapidFireCycleMs", v)} />
          <label className="field">
            <span>Scramble charset</span>
            <input type="text" value={config.rapidFireCharset} onChange={(e) => set("rapidFireCharset", e.target.value)} />
          </label>
          <label className="field">
            <span>Seed</span>
            <div className="field-row">
              <input type="number" value={config.seed} onChange={(e) => set("seed", Number(e.target.value))} />
              <button type="button" onClick={() => set("seed", Math.floor(Math.random() * 1_000_000))}>
                🎲
              </button>
            </div>
          </label>
        </details>
      )}
    </div>
  );
}
