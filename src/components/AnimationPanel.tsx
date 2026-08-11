import { ANIMATION_MODULES, getAnimationModule } from "../animations/registry";
import type { AnimationConfig } from "../types/scene";

export function AnimationPanel({
  animation,
  onChange,
}: {
  animation: AnimationConfig;
  onChange: (next: AnimationConfig) => void;
}) {
  const module = getAnimationModule(animation.type);
  const Params = module.ParamsPanel;

  return (
    <div className="animation-panel panel-section">
      <h3>Animation type</h3>
      <label className="field">
        <select
          value={animation.type}
          onChange={(e) => {
            const next = getAnimationModule(e.target.value as AnimationConfig["type"]);
            onChange(next.defaults);
          }}
        >
          {ANIMATION_MODULES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <Params config={animation} onChange={onChange as (next: typeof animation) => void} />
    </div>
  );
}
