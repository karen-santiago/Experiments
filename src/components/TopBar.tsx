import { useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";
import { listPresets, listScenes } from "../lib/scenes";

interface FfmpegStatus {
  available: boolean;
  version: string | null;
  error: string | null;
}

export function TopBar({
  sceneName,
  onSceneNameChange,
  onNew,
  onSave,
  onSaveAs,
  onOpenScene,
  onOpenPreset,
  saveStatus,
}: {
  sceneName: string;
  onSceneNameChange: (name: string) => void;
  onNew: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpenScene: (fileName: string) => void;
  onOpenPreset: (fileName: string) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
}) {
  const [status, setStatus] = useState<FfmpegStatus | "loading" | "unreachable">("loading");
  const [openMenuVisible, setOpenMenuVisible] = useState(false);
  const [scenes, setScenes] = useState<string[]>([]);
  const [presets, setPresets] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet<FfmpegStatus>("/api/ffmpeg-status")
      .then(setStatus)
      .catch(() => setStatus("unreachable"));
  }, []);

  useEffect(() => {
    if (!openMenuVisible) return;
    listScenes().then(setScenes).catch(() => setScenes([]));
    listPresets().then(setPresets).catch(() => setPresets([]));
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuVisible(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openMenuVisible]);

  let statusLabel = "Checking ffmpeg…";
  let statusClass = "loading";
  if (status === "unreachable") {
    statusLabel = "Sidecar not running";
    statusClass = "error";
  } else if (status !== "loading") {
    statusLabel = status.available ? status.version ?? "ffmpeg ready" : "ffmpeg missing — brew install ffmpeg";
    statusClass = status.available ? "ok" : "error";
  }

  const saveLabel = { idle: "Save", saving: "Saving…", saved: "Saved ✓", error: "Save failed" }[saveStatus];

  return (
    <div className="top-bar">
      <input className="scene-name-input" value={sceneName} onChange={(e) => onSceneNameChange(e.target.value)} />
      <div className="top-bar-actions">
        <button onClick={onNew}>New</button>
        <div className="open-menu-wrap" ref={menuRef}>
          <button onClick={() => setOpenMenuVisible((v) => !v)}>Open</button>
          {openMenuVisible && (
            <div className="open-menu">
              <div className="open-menu-section">
                <h4>Presets</h4>
                {presets.length === 0 && <p className="hint">None</p>}
                {presets.map((p) => (
                  <button
                    key={p}
                    className="open-menu-item"
                    onClick={() => {
                      onOpenPreset(p);
                      setOpenMenuVisible(false);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="open-menu-section">
                <h4>My scenes</h4>
                {scenes.length === 0 && <p className="hint">None saved yet</p>}
                {scenes.map((s) => (
                  <button
                    key={s}
                    className="open-menu-item"
                    onClick={() => {
                      onOpenScene(s);
                      setOpenMenuVisible(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={onSave}>{saveLabel}</button>
        <button onClick={onSaveAs}>Save As</button>
      </div>
      <div className={`ffmpeg-status ${statusClass}`}>{statusLabel}</div>
    </div>
  );
}
