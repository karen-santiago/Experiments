import type { ImageFlickerAnimationConfig } from "../../types/scene";
import { SliderField } from "../../components/SliderField";
import { ImagePicker } from "../../components/ImagePicker";

type Props = {
  config: ImageFlickerAnimationConfig;
  onChange: (next: ImageFlickerAnimationConfig) => void;
};

export function ImageFlickerParamsPanel({ config, onChange }: Props) {
  const set = <K extends keyof ImageFlickerAnimationConfig>(key: K, value: ImageFlickerAnimationConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="params-panel">
      <details open>
        <summary>Images ({config.images.length})</summary>
        <ImagePicker images={config.images} onChange={(images) => set("images", images)} />
      </details>

      <SliderField label="Interval (ms)" value={config.intervalMs} min={16} max={2000} step={4} onChange={(v) => set("intervalMs", v)} />

      <label className="field">
        <span>Order</span>
        <select value={config.order} onChange={(e) => set("order", e.target.value as ImageFlickerAnimationConfig["order"])}>
          <option value="sequential">Sequential</option>
          <option value="reverse">Reverse</option>
          <option value="randomBySeed">Random by seed</option>
          <option value="pingpong">Ping-pong</option>
        </select>
      </label>
      {config.order === "randomBySeed" && (
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

      <label className="field">
        <span>Transition</span>
        <select value={config.transition} onChange={(e) => set("transition", e.target.value as ImageFlickerAnimationConfig["transition"])}>
          <option value="cut">Hard cut</option>
          <option value="crossfade">Crossfade</option>
        </select>
      </label>
      {config.transition === "crossfade" && (
        <SliderField label="Crossfade duration (ms)" value={config.crossfadeDurationMs} min={10} max={config.intervalMs} step={5} onChange={(v) => set("crossfadeDurationMs", v)} />
      )}

      <label className="field">
        <span>Fit</span>
        <select value={config.fit} onChange={(e) => set("fit", e.target.value as ImageFlickerAnimationConfig["fit"])}>
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill (stretch)</option>
        </select>
      </label>

      <label className="field">
        <span>Background</span>
        <div className="field-row">
          <input
            type="color"
            value={config.background === "transparent" ? "#000000" : config.background}
            onChange={(e) => set("background", e.target.value)}
            disabled={config.background === "transparent"}
          />
          <label className="loop-toggle">
            <input
              type="checkbox"
              checked={config.background === "transparent"}
              onChange={(e) => set("background", e.target.checked ? "transparent" : "#000000")}
            />
            Use canvas background
          </label>
        </div>
      </label>
    </div>
  );
}
