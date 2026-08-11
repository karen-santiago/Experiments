import { useState } from "react";
import type { AssetRef, CanvasConfig, TextWallAnimationConfig, TypographyConfig } from "../../types/scene";
import { SliderField } from "../../components/SliderField";
import { FontSelect } from "../../components/FontSelect";
import { getFontFamily } from "../../lib/fontRegistry";

type Props = {
  config: TextWallAnimationConfig;
  onChange: (next: TextWallAnimationConfig) => void;
  canvas: CanvasConfig;
  onCanvasChange: (next: CanvasConfig) => void;
  fonts: AssetRef[];
  typography: TypographyConfig;
};

// A lightweight, self-contained estimate (ignores per-word font-size
// variance) used only for the snap-to-loop button — the actual render path
// (src/animations/textWall/index.ts) always measures precisely per frame.
function estimateMarqueeTileWidth(config: TextWallAnimationConfig, fontFamily: string, canvas: CanvasConfig, baseFontSize: number): number {
  const measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d")!;
  const rowCount = Math.max(2, Math.min(6, Math.round(Math.sqrt(config.words.length || 1))));
  const gap = Math.min(canvas.width, canvas.height) * 0.06;
  ctx.font = `${baseFontSize}px ${fontFamily}`;
  const rows: number[] = Array.from({ length: rowCount }, () => 0);
  config.words.forEach((w, i) => (rows[i % rowCount] += ctx.measureText(w).width + gap));
  return Math.max(canvas.width, ...rows);
}

function estimateVerticalTileHeight(config: TextWallAnimationConfig, canvas: CanvasConfig, baseFontSize: number): number {
  const gap = Math.min(canvas.width, canvas.height) * 0.03;
  return config.words.length * (baseFontSize + gap);
}

export function TextWallParamsPanel({ config, onChange, canvas, onCanvasChange, fonts, typography }: Props) {
  const set = <K extends keyof TextWallAnimationConfig>(key: K, value: TextWallAnimationConfig[K]) =>
    onChange({ ...config, [key]: value });

  const [draft, setDraft] = useState(config.words.join("\n"));

  const fontFamily = getFontFamily(config.fontId ?? typography.fontFileId);
  const baseFontSize = typography.fontSize;
  const isMarquee = config.layout === "marqueeRows";
  const isVertical = config.layout === "verticalScroll";
  const targetTile = isMarquee
    ? estimateMarqueeTileWidth(config, fontFamily, canvas, baseFontSize)
    : isVertical
      ? estimateVerticalTileHeight(config, canvas, baseFontSize)
      : 0;
  const targetDuration = targetTile / Math.max(Math.abs(config.scrollSpeed), 1e-6);
  const inSync = (isMarquee || isVertical) && Math.abs(canvas.duration - targetDuration) < 1 / canvas.fps;

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

      <FontSelect fonts={fonts} value={config.fontId} onChange={(fontId) => set("fontId", fontId)} />

      <label className="field">
        <span>Layout</span>
        <select value={config.layout} onChange={(e) => set("layout", e.target.value as TextWallAnimationConfig["layout"])}>
          <option value="grid">Grid</option>
          <option value="marqueeRows">Marquee rows</option>
          <option value="verticalScroll">Vertical scroll</option>
        </select>
      </label>

      {config.layout !== "grid" && (
        <>
          <SliderField label="Scroll speed (px/s)" value={config.scrollSpeed} min={-400} max={400} step={5} onChange={(v) => set("scrollSpeed", v)} />
          <p className="hint">One full loop takes {targetDuration.toFixed(2)}s at this speed.</p>
          <div className="field-row">
            <button type="button" onClick={() => onCanvasChange({ ...canvas, duration: Number(targetDuration.toFixed(3)) })}>
              Snap duration to loop
            </button>
            {inSync && <span className="loop-sync-ok">✓ in sync</span>}
          </div>
        </>
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
