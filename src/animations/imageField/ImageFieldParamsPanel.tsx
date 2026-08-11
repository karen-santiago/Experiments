import { useRef, useState } from "react";
import type { CanvasConfig, ImageFieldAnimationConfig } from "../../types/scene";
import { assetUrl, uploadAsset } from "../../lib/assets";
import { SliderField } from "../../components/SliderField";

type Props = {
  config: ImageFieldAnimationConfig;
  onChange: (next: ImageFieldAnimationConfig) => void;
  canvas: CanvasConfig;
  onCanvasChange: (next: CanvasConfig) => void;
};

export function ImageFieldParamsPanel({ config, onChange, canvas, onCanvasChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof ImageFieldAnimationConfig>(key: K, value: ImageFieldAnimationConfig[K]) =>
    onChange({ ...config, [key]: value });

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const files = Array.from(fileList).filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));
      const uploaded = await Promise.all(files.map((f) => uploadAsset("image", f)));
      const next = [...config.images, ...uploaded.map((u) => ({ id: u.id, name: u.originalName }))];
      onChange({ ...config, images: next });
    } finally {
      setUploading(false);
    }
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= config.images.length) return;
    const next = config.images.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    set("images", next);
  };

  const removeImage = (index: number) => {
    set(
      "images",
      config.images.filter((_, i) => i !== index),
    );
  };

  const duplicateImage = (index: number) => {
    const next = config.images.slice();
    next.splice(index + 1, 0, { ...next[index] });
    set("images", next);
  };

  const dragIndex = useRef<number | null>(null);

  const targetLoopDuration = canvas.width / Math.max(config.speed, 1e-6);
  const inSync = Math.abs(canvas.duration - targetLoopDuration) < 1 / canvas.fps;

  return (
    <div className="params-panel">
      <details open>
        <summary>Images ({config.images.length})</summary>

        <div className="field-row" style={{ marginTop: 8 }}>
          <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            Add files
          </button>
          <button type="button" disabled={uploading} onClick={() => folderInputRef.current?.click()}>
            Add folder
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          hidden
          // @ts-expect-error non-standard attribute, Chromium-only folder picking
          webkitdirectory=""
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {uploading && <p className="hint">Uploading…</p>}

        <ul className="thumb-list">
          {config.images.map((img, i) => (
            <li
              key={`${img.id}-${i}`}
              className="thumb-row"
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current !== null) moveImage(dragIndex.current, i);
                dragIndex.current = null;
              }}
            >
              <img
                src={assetUrl("image", img.id)}
                alt={img.name}
                className="thumb-img"
                onClick={(e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width;
                  const y = (e.clientY - rect.top) / rect.height;
                  onChange({ ...config, focalPoints: { ...config.focalPoints, [img.id]: { x, y } } });
                }}
                title="Click to set focal point"
              />
              <span className="thumb-name">{img.name}</span>
              <button type="button" onClick={() => moveImage(i, i - 1)} title="Move up">
                ↑
              </button>
              <button type="button" onClick={() => moveImage(i, i + 1)} title="Move down">
                ↓
              </button>
              <button type="button" onClick={() => duplicateImage(i)} title="Duplicate">
                ⧉
              </button>
              <button type="button" onClick={() => removeImage(i)} title="Remove">
                ✕
              </button>
            </li>
          ))}
        </ul>

        <label className="field">
          <span>Assignment</span>
          <select value={config.assignment} onChange={(e) => set("assignment", e.target.value as ImageFieldAnimationConfig["assignment"])}>
            <option value="order">List order</option>
            <option value="shuffled">Shuffled by seed</option>
          </select>
        </label>

        <label className="field">
          <span>Seed</span>
          <div className="field-row">
            <input type="number" value={config.seed} onChange={(e) => set("seed", Number(e.target.value))} />
            <button type="button" onClick={() => set("seed", Math.floor(Math.random() * 1_000_000))} title="Randomize seed">
              🎲
            </button>
          </div>
        </label>
      </details>

      <details open>
        <summary>Layout</summary>
        <label className="field">
          <span>Mode</span>
          <select value={config.layoutMode} onChange={(e) => set("layoutMode", e.target.value as ImageFieldAnimationConfig["layoutMode"])}>
            <option value="scatter">Scatter</option>
            <option value="cluster">Cluster</option>
            <option value="row">Row</option>
            <option value="bands">Bands</option>
          </select>
        </label>

        {config.layoutMode === "scatter" && (
          <>
            <SliderField label="Columns" value={config.scatterColumns} min={2} max={20} step={1} onChange={(v) => set("scatterColumns", v)} />
            <SliderField label="Rows" value={config.scatterRows} min={2} max={20} step={1} onChange={(v) => set("scatterRows", v)} />
            <SliderField label="Density" value={config.scatterDensity} min={0} max={1} step={0.01} onChange={(v) => set("scatterDensity", v)} />
            <SliderField label="Jitter" value={config.scatterJitter} min={0} max={1} step={0.01} onChange={(v) => set("scatterJitter", v)} />
            <label className="field field-checkbox">
              <input type="checkbox" checked={config.protectCenter} onChange={(e) => set("protectCenter", e.target.checked)} />
              <span>Protect center</span>
            </label>
            {config.protectCenter && (
              <>
                <SliderField label="Protect width %" value={config.protectCenterWidthPct} min={0} max={100} step={1} onChange={(v) => set("protectCenterWidthPct", v)} />
                <SliderField label="Protect height %" value={config.protectCenterHeightPct} min={0} max={100} step={1} onChange={(v) => set("protectCenterHeightPct", v)} />
              </>
            )}
          </>
        )}

        {config.layoutMode === "cluster" && (
          <>
            <SliderField label="Spread (px)" value={config.clusterSpread} min={0} max={800} step={1} onChange={(v) => set("clusterSpread", v)} />
            <SliderField label="Arc (deg)" value={config.clusterArc} min={0} max={180} step={1} onChange={(v) => set("clusterArc", v)} />
            <SliderField label="Overlap" value={config.clusterOverlap} min={0} max={1} step={0.01} onChange={(v) => set("clusterOverlap", v)} />
          </>
        )}

        {config.layoutMode === "row" && (
          <>
            <SliderField label="Gap (px)" value={config.rowGap} min={0} max={200} step={1} onChange={(v) => set("rowGap", v)} />
            <SliderField label="Vertical jitter (px)" value={config.rowVerticalJitter} min={0} max={200} step={1} onChange={(v) => set("rowVerticalJitter", v)} />
          </>
        )}

        {config.layoutMode === "bands" && (
          <>
            <SliderField label="Rows" value={config.bandsRowCount} min={2} max={5} step={1} onChange={(v) => set("bandsRowCount", v)} />
            <SliderField label="Row gap (px)" value={config.bandsRowGap} min={0} max={200} step={1} onChange={(v) => set("bandsRowGap", v)} />
          </>
        )}
      </details>

      <details open>
        <summary>Motion</summary>
        <label className="field">
          <span>Direction</span>
          <select value={config.direction} onChange={(e) => set("direction", e.target.value as ImageFieldAnimationConfig["direction"])}>
            <option value="ltr">Left → Right</option>
            <option value="rtl">Right → Left</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
          </select>
        </label>
        <SliderField label="Speed (px/s)" value={config.speed} min={0} max={400} step={1} onChange={(v) => set("speed", v)} />
        <p className="hint">One full loop takes {targetLoopDuration.toFixed(2)}s at this speed and canvas width.</p>
        <div className="field-row">
          <button type="button" onClick={() => onCanvasChange({ ...canvas, duration: Number(targetLoopDuration.toFixed(3)) })}>
            Snap duration to loop
          </button>
          {inSync && <span className="loop-sync-ok">✓ in sync</span>}
        </div>
        {config.entrance !== "none" && (
          <p className="hint">Loop snap is disabled while entrance is not "none" — an entrance animation isn't in place at t=0, so it can't loop seamlessly.</p>
        )}

        <SliderField label="Parallax" value={config.parallax} min={0} max={1} step={0.01} onChange={(v) => set("parallax", v)} />

        <label className="field field-checkbox">
          <input type="checkbox" checked={config.swayEnabled} onChange={(e) => set("swayEnabled", e.target.checked)} />
          <span>Sway</span>
        </label>
        {config.swayEnabled && (
          <>
            <SliderField label="Amplitude (px)" value={config.swayAmplitude} min={0} max={100} step={1} onChange={(v) => set("swayAmplitude", v)} />
            <SliderField label="Frequency (cycles/loop)" value={config.swayFrequency} min={0} max={10} step={0.1} onChange={(v) => set("swayFrequency", v)} />
          </>
        )}

        <label className="field field-checkbox">
          <input type="checkbox" checked={config.rotationDriftEnabled} onChange={(e) => set("rotationDriftEnabled", e.target.checked)} />
          <span>Rotation drift</span>
        </label>
        {config.rotationDriftEnabled && (
          <SliderField label="Degrees/loop" value={config.rotationDriftDegreesPerLoop} min={0} max={90} step={1} onChange={(v) => set("rotationDriftDegreesPerLoop", v)} />
        )}
      </details>

      <details>
        <summary>Appearance</summary>
        <SliderField label="Corner radius (px)" value={config.cornerRadius} min={0} max={64} step={1} onChange={(v) => set("cornerRadius", v)} />
        <SliderField label="Scale min" value={config.scaleMin} min={0.1} max={3} step={0.05} onChange={(v) => set("scaleMin", v)} />
        <SliderField label="Scale max" value={config.scaleMax} min={0.1} max={3} step={0.05} onChange={(v) => set("scaleMax", v)} />
        <SliderField label="Rotation min (deg)" value={config.rotationMin} min={-45} max={45} step={1} onChange={(v) => set("rotationMin", v)} />
        <SliderField label="Rotation max (deg)" value={config.rotationMax} min={-45} max={45} step={1} onChange={(v) => set("rotationMax", v)} />
        <SliderField label="Depth fade" value={config.depthFade} min={0} max={1} step={0.01} onChange={(v) => set("depthFade", v)} />

        <label className="field field-checkbox">
          <input type="checkbox" checked={config.shadowEnabled} onChange={(e) => set("shadowEnabled", e.target.checked)} />
          <span>Shadow</span>
        </label>
        {config.shadowEnabled && (
          <>
            <SliderField label="Blur" value={config.shadowBlur} min={0} max={60} step={1} onChange={(v) => set("shadowBlur", v)} />
            <SliderField label="Offset Y" value={config.shadowOffsetY} min={0} max={40} step={1} onChange={(v) => set("shadowOffsetY", v)} />
            <SliderField label="Opacity" value={config.shadowOpacity} min={0} max={1} step={0.01} onChange={(v) => set("shadowOpacity", v)} />
          </>
        )}

        <label className="field field-checkbox">
          <input type="checkbox" checked={config.borderEnabled} onChange={(e) => set("borderEnabled", e.target.checked)} />
          <span>Border</span>
        </label>
        {config.borderEnabled && (
          <>
            <SliderField label="Width" value={config.borderWidth} min={1} max={20} step={1} onChange={(v) => set("borderWidth", v)} />
            <label className="field">
              <span>Color</span>
              <input type="color" value={config.borderColor} onChange={(e) => set("borderColor", e.target.value)} />
            </label>
          </>
        )}
      </details>

      <details>
        <summary>Entrance</summary>
        <label className="field">
          <select value={config.entrance} onChange={(e) => set("entrance", e.target.value as ImageFieldAnimationConfig["entrance"])}>
            <option value="none">None (required for seamless loop)</option>
            <option value="stagger">Stagger</option>
            <option value="assemble">Assemble</option>
          </select>
        </label>
        {config.entrance !== "none" && (
          <>
            <SliderField label="Stagger (ms)" value={config.staggerMs} min={0} max={500} step={5} onChange={(v) => set("staggerMs", v)} />
            <SliderField label="Duration (ms)" value={config.entranceDurationMs} min={100} max={3000} step={50} onChange={(v) => set("entranceDurationMs", v)} />
            <label className="field">
              <span>Order</span>
              <select value={config.staggerOrder} onChange={(e) => set("staggerOrder", e.target.value as ImageFieldAnimationConfig["staggerOrder"])}>
                <option value="sequential">Sequential</option>
                <option value="fromCenter">From center out</option>
              </select>
            </label>
          </>
        )}
      </details>

      <details>
        <summary>Static overlay</summary>
        <label className="field field-checkbox">
          <input type="checkbox" checked={config.overlayEnabled} onChange={(e) => set("overlayEnabled", e.target.checked)} />
          <span>Enabled</span>
        </label>
        {config.overlayEnabled && (
          <>
            <label className="field">
              <span>Text</span>
              <textarea rows={2} value={config.overlayText} onChange={(e) => set("overlayText", e.target.value)} />
            </label>
            <SliderField label="Size" value={config.overlaySize} min={12} max={200} step={1} onChange={(v) => set("overlaySize", v)} />
            <label className="field">
              <span>Color</span>
              <input type="color" value={config.overlayColor} onChange={(e) => set("overlayColor", e.target.value)} />
            </label>
            <label className="field">
              <span>Position</span>
              <select value={config.overlayPosition} onChange={(e) => set("overlayPosition", e.target.value as ImageFieldAnimationConfig["overlayPosition"])}>
                <option value="above">Above images</option>
                <option value="below">Below images</option>
              </select>
            </label>
          </>
        )}
      </details>
    </div>
  );
}
