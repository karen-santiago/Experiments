import type { AssetRef, ChartAnimationConfig, ChartDataPoint } from "../../types/scene";
import { SliderField } from "../../components/SliderField";
import { FontSelect } from "../../components/FontSelect";

type Props = {
  config: ChartAnimationConfig;
  onChange: (next: ChartAnimationConfig) => void;
  fonts: AssetRef[];
};

const ROW_COLORS = ["#ff5a36", "#f5f5f0", "#8a8a8a", "#4caf6a", "#3b82f6", "#f5c518"];

function makeId(): string {
  return `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function ChartParamsPanel({ config, onChange, fonts }: Props) {
  const set = <K extends keyof ChartAnimationConfig>(key: K, value: ChartAnimationConfig[K]) =>
    onChange({ ...config, [key]: value });

  const setRow = (id: string, patch: Partial<ChartDataPoint>) =>
    set(
      "data",
      config.data.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );

  const addRow = () => {
    const color = ROW_COLORS[config.data.length % ROW_COLORS.length];
    set("data", [...config.data, { id: makeId(), label: `Item ${config.data.length + 1}`, value: 10, color }]);
  };

  const removeRow = (id: string) => set("data", config.data.filter((d) => d.id !== id));

  return (
    <div className="params-panel">
      <label className="field">
        <span>Chart type</span>
        <select value={config.chartType} onChange={(e) => set("chartType", e.target.value as ChartAnimationConfig["chartType"])}>
          <option value="bar">Bar</option>
          <option value="donut">Donut</option>
        </select>
      </label>

      <FontSelect fonts={fonts} value={config.fontId} onChange={(fontId) => set("fontId", fontId)} />

      <details open>
        <summary>Data ({config.data.length})</summary>
        <ul className="chart-data-list">
          {config.data.map((row) => (
            <li key={row.id} className="chart-data-row">
              <input type="color" value={row.color} onChange={(e) => setRow(row.id, { color: e.target.value })} />
              <input
                type="text"
                className="chart-data-label"
                value={row.label}
                onChange={(e) => setRow(row.id, { label: e.target.value })}
                placeholder="Label"
              />
              <input
                type="number"
                className="chart-data-value"
                value={row.value}
                onChange={(e) => setRow(row.id, { value: Number(e.target.value) })}
              />
              <button type="button" onClick={() => removeRow(row.id)} title="Remove">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addRow}>
          Add row
        </button>
      </details>

      <details open>
        <summary>Reveal timing</summary>
        <SliderField label="Hold start (s)" value={config.holdStart} min={0} max={5} step={0.05} onChange={(v) => set("holdStart", v)} />
        <SliderField label="Reveal duration (s)" value={config.revealDuration} min={0.1} max={5} step={0.05} onChange={(v) => set("revealDuration", v)} />
        <SliderField label="Hold end (s)" value={config.holdEnd} min={0} max={5} step={0.05} onChange={(v) => set("holdEnd", v)} />
        <SliderField label="Stagger (ms)" value={config.staggerMs} min={0} max={500} step={5} onChange={(v) => set("staggerMs", v)} />
        <label className="field">
          <span>Loop mode</span>
          <select value={config.loopMode} onChange={(e) => set("loopMode", e.target.value as ChartAnimationConfig["loopMode"])}>
            <option value="once">Once</option>
            <option value="loop">Loop</option>
            <option value="pingpong">Ping-pong</option>
          </select>
        </label>
      </details>

      {config.chartType === "bar" && (
        <details open>
          <summary>Bar style</summary>
          <SliderField label="Gap" value={config.barGap} min={0} max={0.8} step={0.01} onChange={(v) => set("barGap", v)} />
          <SliderField label="Corner radius (px)" value={config.barCornerRadius} min={0} max={40} step={1} onChange={(v) => set("barCornerRadius", v)} />
          <label className="field field-checkbox">
            <input type="checkbox" checked={config.showValues} onChange={(e) => set("showValues", e.target.checked)} />
            <span>Show values</span>
          </label>
          <label className="field field-checkbox">
            <input type="checkbox" checked={config.showLabels} onChange={(e) => set("showLabels", e.target.checked)} />
            <span>Show labels</span>
          </label>
          <label className="field">
            <span>Axis color</span>
            <input type="color" value={config.axisColor} onChange={(e) => set("axisColor", e.target.value)} />
          </label>
        </details>
      )}

      {config.chartType === "donut" && (
        <details open>
          <summary>Donut style</summary>
          <SliderField label="Thickness" value={config.donutThickness} min={0.1} max={0.9} step={0.01} onChange={(v) => set("donutThickness", v)} />
          <SliderField label="Segment gap (deg)" value={config.donutGapDeg} min={0} max={20} step={0.5} onChange={(v) => set("donutGapDeg", v)} />
          <label className="field">
            <span>Center text</span>
            <input type="text" value={config.centerText} onChange={(e) => set("centerText", e.target.value)} placeholder="72%" />
          </label>
          <SliderField label="Center text size" value={config.centerTextSize} min={12} max={200} step={1} onChange={(v) => set("centerTextSize", v)} />
          <label className="field">
            <span>Center text color</span>
            <input type="color" value={config.centerTextColor} onChange={(e) => set("centerTextColor", e.target.value)} />
          </label>
        </details>
      )}
    </div>
  );
}
