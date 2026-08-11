import { useState } from "react";
import type { TextWallAnimationConfig } from "../../types/scene";
import { SliderField } from "../../components/SliderField";

type Props = {
  config: TextWallAnimationConfig;
  onChange: (next: TextWallAnimationConfig) => void;
};

export function TextWallParamsPanel({ config, onChange }: Props) {
  const set = <K extends keyof TextWallAnimationConfig>(key: K, value: TextWallAnimationConfig[K]) =>
    onChange({ ...config, [key]: value });

  const [draft, setDraft] = useState(config.words.join("\n"));

  return (
    <div className="params-panel">
      <label className="field">
        <span>Words (one per line)</span>
        <textarea
          rows={8}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() =>
            set(
              "words",
              draft.split("\n").map((w) => w.trim()).filter(Boolean),
            )
          }
        />
      </label>

      <label className="field">
        <span>Layout</span>
        <select value={config.layout} onChange={(e) => set("layout", e.target.value as TextWallAnimationConfig["layout"])}>
          <option value="grid">Grid</option>
          <option value="marqueeRows">Marquee rows</option>
          <option value="verticalScroll">Vertical scroll</option>
        </select>
      </label>

      {config.layout !== "grid" && (
        <SliderField label="Scroll speed (px/s)" value={config.scrollSpeed} min={-400} max={400} step={5} onChange={(v) => set("scrollSpeed", v)} />
      )}

      <label className="field">
        <span>Reveal</span>
        <select value={config.reveal} onChange={(e) => set("reveal", e.target.value as TextWallAnimationConfig["reveal"])}>
          <option value="all">All at once</option>
          <option value="staggered">Staggered</option>
          <option value="typewriter">Typewriter</option>
        </select>
      </label>
      {config.reveal !== "all" && (
        <SliderField label="Stagger interval (ms)" value={config.staggerIntervalMs} min={0} max={500} step={5} onChange={(v) => set("staggerIntervalMs", v)} />
      )}

      <label className="field">
        <span>Color mode</span>
        <select value={config.colorMode} onChange={(e) => set("colorMode", e.target.value as TextWallAnimationConfig["colorMode"])}>
          <option value="primary">All primary</option>
          <option value="alternating">Alternating</option>
          <option value="random">Random from palette</option>
        </select>
      </label>

      <SliderField label="Font size variance" value={config.fontSizeVariance} min={0} max={1} step={0.01} onChange={(v) => set("fontSizeVariance", v)} />
      <SliderField label="Rotation variance (deg)" value={config.rotationVariance} min={0} max={45} step={1} onChange={(v) => set("rotationVariance", v)} />

      <label className="field">
        <span>Seed</span>
        <div className="field-row">
          <input type="number" value={config.seed} onChange={(e) => set("seed", Number(e.target.value))} />
          <button type="button" onClick={() => set("seed", Math.floor(Math.random() * 1_000_000))}>
            🎲
          </button>
        </div>
      </label>
    </div>
  );
}
