import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

interface FfmpegStatus {
  available: boolean;
  version: string | null;
  error: string | null;
}

export function TopBar({
  sceneName,
  onSceneNameChange,
}: {
  sceneName: string;
  onSceneNameChange: (name: string) => void;
}) {
  const [status, setStatus] = useState<FfmpegStatus | "loading" | "unreachable">("loading");

  useEffect(() => {
    apiGet<FfmpegStatus>("/api/ffmpeg-status")
      .then(setStatus)
      .catch(() => setStatus("unreachable"));
  }, []);

  let statusLabel = "Checking ffmpeg…";
  let statusClass = "loading";
  if (status === "unreachable") {
    statusLabel = "Sidecar not running";
    statusClass = "error";
  } else if (status !== "loading") {
    statusLabel = status.available ? status.version ?? "ffmpeg ready" : "ffmpeg missing — brew install ffmpeg";
    statusClass = status.available ? "ok" : "error";
  }

  return (
    <div className="top-bar">
      <input
        className="scene-name-input"
        value={sceneName}
        onChange={(e) => onSceneNameChange(e.target.value)}
      />
      <div className="top-bar-actions">
        <button disabled title="Phase 8">New</button>
        <button disabled title="Phase 8">Open</button>
        <button disabled title="Phase 8">Save</button>
        <button disabled title="Phase 8">Save As</button>
      </div>
      <div className={`ffmpeg-status ${statusClass}`}>{statusLabel}</div>
    </div>
  );
}
