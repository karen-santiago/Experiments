import { useRef, useState } from "react";
import { EXPORT_FORMATS, type ExportFormatId } from "../shared/exportFormats";
import { exportScene, ExportCancelledError, type ExportProgress } from "../lib/exportPipeline";
import { apiPostJson } from "../lib/api";
import type { SceneConfig } from "../types/scene";

export function ExportPanel({ scene }: { scene: SceneConfig }) {
  const [format, setFormat] = useState<ExportFormatId>("mp4");
  const [outputDir, setOutputDir] = useState("");
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<{ outputPath: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isTransparent = scene.canvas.background === "transparent";
  const blockedByAlpha = format === "mp4" && isTransparent;

  const formatInfo = EXPORT_FORMATS.find((f) => f.id === format)!;

  const handleExport = async () => {
    setError(null);
    setResult(null);
    setIsExporting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await exportScene({
        scene,
        format,
        outputDir: outputDir || undefined,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setResult(res);
    } catch (err) {
      if (!(err instanceof ExportCancelledError)) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsExporting(false);
      setProgress(null);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleReveal = () => {
    if (!result) return;
    apiPostJson("/api/reveal", { path: result.outputPath }).catch(() => {});
  };

  const pct = progress ? Math.round((progress.frameIndex / progress.totalFrames) * 100) : 0;

  return (
    <div className="export-panel panel-section">
      <h3>Export</h3>

      <label className="field">
        <span>Format</span>
        <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormatId)}>
          {EXPORT_FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      {blockedByAlpha && (
        <p className="warning">
          MP4 (H.264) cannot carry an alpha channel. Background is set to transparent — pick WebM (VP9,
          alpha) or ProRes 4444 instead.
        </p>
      )}
      {isTransparent && formatInfo.supportsAlpha && (
        <p className="hint">Transparent background will be preserved in this format.</p>
      )}

      <label className="field">
        <span>Output folder</span>
        <input
          type="text"
          placeholder="~/MotionToolExports (default)"
          value={outputDir}
          onChange={(e) => setOutputDir(e.target.value)}
        />
      </label>

      {!isExporting && (
        <button className="primary" disabled={blockedByAlpha} onClick={handleExport}>
          Export {formatInfo.label}
        </button>
      )}

      {isExporting && progress && (
        <div className="export-progress">
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <p>
            Frame {progress.frameIndex} / {progress.totalFrames} ({pct}%) — ~
            {Math.ceil(progress.etaSeconds)}s remaining
          </p>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="export-result">
          <p>Exported to:</p>
          <code>{result.outputPath}</code>
          <button onClick={handleReveal}>Reveal in Finder</button>
        </div>
      )}
    </div>
  );
}
