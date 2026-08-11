import type { DemoAnimationConfig } from "../../types/scene";

export function DemoParamsPanel({
  config,
  onChange,
}: {
  config: DemoAnimationConfig;
  onChange: (next: DemoAnimationConfig) => void;
}) {
  return (
    <div className="params-panel">
      <label className="field">
        <span>Shape</span>
        <select
          value={config.shape}
          onChange={(e) =>
            onChange({ ...config, shape: e.target.value as DemoAnimationConfig["shape"] })
          }
        >
          <option value="square">Square</option>
          <option value="circle">Circle</option>
        </select>
      </label>

      <label className="field">
        <span>Rotation speed (deg/s)</span>
        <div className="field-row">
          <input
            type="range"
            min={-360}
            max={360}
            step={1}
            value={config.rotationSpeed}
            onChange={(e) => onChange({ ...config, rotationSpeed: Number(e.target.value) })}
          />
          <input
            type="number"
            value={config.rotationSpeed}
            onChange={(e) => onChange({ ...config, rotationSpeed: Number(e.target.value) })}
          />
        </div>
      </label>

      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={config.showFrameCounter}
          onChange={(e) => onChange({ ...config, showFrameCounter: e.target.checked })}
        />
        <span>Show frame counter (for export accuracy checks)</span>
      </label>
    </div>
  );
}
