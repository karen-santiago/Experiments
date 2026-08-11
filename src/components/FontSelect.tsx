import type { AssetRef } from "../types/scene";

/** Font picker for a module's own `fontId` override — null falls back to the scene's default font. */
export function FontSelect({
  fonts,
  value,
  onChange,
}: {
  fonts: AssetRef[];
  value: string | null;
  onChange: (fontId: string | null) => void;
}) {
  return (
    <label className="field">
      <span>Font</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Scene default</option>
        {fonts.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </label>
  );
}
