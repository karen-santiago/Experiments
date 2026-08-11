import { useState } from "react";
import type { SceneConfig } from "../types/scene";
import { EASINGS, getEasing } from "../render/easing";

const CANVAS_PRESETS: Array<{ label: string; width: number; height: number }> = [
  { label: "1080 x 1080", width: 1080, height: 1080 },
  { label: "1080 x 1350", width: 1080, height: 1350 },
  { label: "1080 x 1920", width: 1080, height: 1920 },
  { label: "1920 x 1080", width: 1920, height: 1080 },
  { label: "1600 x 900", width: 1600, height: 900 },
  { label: "2560 x 1440", width: 2560, height: 1440 },
];

function roundToEven(n: number): number {
  return n % 2 === 0 ? n : n + 1;
}

export function GlobalPanel({
  scene,
  onChange,
  speedMultiplier,
  onSpeedMultiplierChange,
}: {
  scene: SceneConfig;
  onChange: (next: SceneConfig) => void;
  speedMultiplier: number;
  onSpeedMultiplierChange: (v: number) => void;
}) {
  const setCanvas = (patch: Partial<SceneConfig["canvas"]>) =>
    onChange({ ...scene, canvas: { ...scene.canvas, ...patch } });
  const setPalette = (patch: Partial<SceneConfig["palette"]>) =>
    onChange({ ...scene, palette: { ...scene.palette, ...patch } });

  const [oddWarning, setOddWarning] = useState<string | null>(null);
  return (
    <div className="global-panel panel-section">
      <h3>Canvas</h3>

      <label className="field">
        <span>Preset</span>
        <select
          onChange={(e) => {
            const preset = CANVAS_PRESETS[Number(e.target.value)];
            if (preset) setCanvas({ width: preset.width, height: preset.height });
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Choose a preset…
          </option>
          {CANVAS_PRESETS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span>Width</span>
          <input
            type="number"
            value={scene.canvas.width}
            onChange={(e) => {
              const raw = Number(e.target.value);
              const even = roundToEven(raw);
              setOddWarning(even !== raw ? `Rounded width to ${even} (H.264 needs even dimensions)` : null);
              setCanvas({ width: even });
            }}
          />
        </label>
        <label className="field">
          <span>Height</span>
          <input
            type="number"
            value={scene.canvas.height}
            onChange={(e) => {
              const raw = Number(e.target.value);
              const even = roundToEven(raw);
              setOddWarning(even !== raw ? `Rounded height to ${even} (H.264 needs even dimensions)` : null);
              setCanvas({ height: even });
            }}
          />
        </label>
      </div>
      {oddWarning && <p className="hint">{oddWarning}</p>}

      <label className="field">
        <span>Background</span>
        <div className="field-row">
          <input
            type="color"
            value={scene.canvas.background === "transparent" ? "#000000" : scene.canvas.background}
            onChange={(e) => setCanvas({ background: e.target.value })}
            disabled={scene.canvas.background === "transparent"}
          />
          <label className="loop-toggle">
            <input
              type="checkbox"
              checked={scene.canvas.background === "transparent"}
              onChange={(e) => setCanvas({ background: e.target.checked ? "transparent" : "#000000" })}
            />
            Transparent
          </label>
        </div>
      </label>

      <label className="field">
        <span>FPS</span>
        <select
          value={scene.canvas.fps}
          onChange={(e) => setCanvas({ fps: Number(e.target.value) as SceneConfig["canvas"]["fps"] })}
        >
          <option value={24}>24</option>
          <option value={30}>30</option>
          <option value={60}>60</option>
        </select>
      </label>

      <label className="field">
        <span>Duration (s)</span>
        <div className="field-row">
          <input
            type="range"
            min={0.5}
            max={30}
            step={0.1}
            value={scene.canvas.duration}
            onChange={(e) => setCanvas({ duration: Number(e.target.value) })}
          />
          <input
            type="number"
            value={scene.canvas.duration}
            onChange={(e) => setCanvas({ duration: Number(e.target.value) })}
          />
        </div>
      </label>

      <label className="field">
        <span>Speed multiplier ({speedMultiplier.toFixed(2)}x)</span>
        <input
          type="range"
          min={0.25}
          max={4}
          step={0.05}
          value={speedMultiplier}
          onChange={(e) => onSpeedMultiplierChange(Number(e.target.value))}
        />
      </label>

      <h3>Easing</h3>
      <label className="field">
        <select value={scene.easing} onChange={(e) => onChange({ ...scene, easing: e.target.value as SceneConfig["easing"] })}>
          {Object.keys(EASINGS).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <EasingPreview name={scene.easing} />

      <h3>Palette</h3>
      {(["primary", "secondary", "accent"] as const).map((key) => (
        <label className="field" key={key}>
          <span>{key[0].toUpperCase() + key.slice(1)}</span>
          <div className="field-row">
            <input type="color" value={scene.palette[key]} onChange={(e) => setPalette({ [key]: e.target.value })} />
            <input type="text" value={scene.palette[key]} onChange={(e) => setPalette({ [key]: e.target.value })} />
          </div>
        </label>
      ))}
    </div>
  );
}

function EasingPreview({ name }: { name: SceneConfig["easing"] }) {
  const fn = getEasing(name);
  const points: string[] = [];
  const w = 120;
  const h = 40;
  for (let i = 0; i <= 20; i++) {
    const x = i / 20;
    const y = fn(x);
    points.push(`${(x * w).toFixed(1)},${(h - y * h).toFixed(1)}`);
  }
  return (
    <svg width={w} height={h} className="easing-preview">
      <polyline points={points.join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2} />
    </svg>
  );
}
