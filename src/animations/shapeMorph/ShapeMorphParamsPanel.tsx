import { useRef, useState } from "react";
import type { ShapeMorphAnimationConfig } from "../../types/scene";
import { normalizePath, extractPathsFromSvgMarkup } from "../../lib/svgPath";
import { SliderField } from "../../components/SliderField";

type Props = {
  config: ShapeMorphAnimationConfig;
  onChange: (next: ShapeMorphAnimationConfig) => void;
};

export function ShapeMorphParamsPanel({ config, onChange }: Props) {
  const set = <K extends keyof ShapeMorphAnimationConfig>(key: K, value: ShapeMorphAnimationConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="params-panel">
      <PathField label="Path A" value={config.pathA} onCommit={(d) => set("pathA", d)} />
      <PathField label="Path B" value={config.pathB} onCommit={(d) => set("pathB", d)} />

      <SliderField label="Hold start (s)" value={config.holdStart} min={0} max={5} step={0.05} onChange={(v) => set("holdStart", v)} />
      <SliderField label="Morph duration (s)" value={config.morphDuration} min={0.05} max={5} step={0.05} onChange={(v) => set("morphDuration", v)} />
      <SliderField label="Hold end (s)" value={config.holdEnd} min={0} max={5} step={0.05} onChange={(v) => set("holdEnd", v)} />

      <label className="field">
        <span>Loop mode</span>
        <select value={config.loopMode} onChange={(e) => set("loopMode", e.target.value as ShapeMorphAnimationConfig["loopMode"])}>
          <option value="once">Once</option>
          <option value="loop">Loop</option>
          <option value="pingpong">Ping-pong</option>
        </select>
      </label>

      <SliderField label="Rotation offset (deg)" value={config.rotationOffset} min={-180} max={180} step={1} onChange={(v) => set("rotationOffset", v)} />

      <label className="field">
        <span>Fill</span>
        <input type="color" value={config.fill} onChange={(e) => set("fill", e.target.value)} />
      </label>
      <label className="field field-checkbox">
        <input type="checkbox" checked={config.strokeEnabled} onChange={(e) => set("strokeEnabled", e.target.checked)} />
        <span>Stroke</span>
      </label>
      {config.strokeEnabled && (
        <>
          <label className="field">
            <span>Stroke color</span>
            <input type="color" value={config.stroke} onChange={(e) => set("stroke", e.target.value)} />
          </label>
          <SliderField label="Stroke width" value={config.strokeWidth} min={0.5} max={20} step={0.5} onChange={(v) => set("strokeWidth", v)} />
        </>
      )}
    </div>
  );
}

function PathField({ label, value, onCommit }: { label: string; value: string; onCommit: (d: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    try {
      const normalized = normalizePath(raw);
      setDraft(normalized);
      setError(null);
      onCommit(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse this path.");
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const d = extractPathsFromSvgMarkup(text);
      commit(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="field">
      <span>{label}</span>
      <textarea
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        placeholder="SVG path d string, e.g. M10,10 L90,90 ..."
      />
      <div className="field-row">
        <button type="button" onClick={() => fileRef.current?.click()}>
          Upload SVG
        </button>
        <button type="button" onClick={() => commit(draft)}>
          Normalize
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".svg,image/svg+xml"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="warning">{error}</p>}
    </div>
  );
}
