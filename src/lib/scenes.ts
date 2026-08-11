import { apiGet, apiPostJson } from "./api";
import type { SceneConfig } from "../types/scene";

export async function listScenes(): Promise<string[]> {
  const res = await apiGet<{ scenes: string[] }>("/api/scenes");
  return res.scenes;
}

export async function loadScene(fileName: string): Promise<SceneConfig> {
  return apiGet<SceneConfig>(`/api/scenes/${encodeURIComponent(fileName)}`);
}

export async function saveScene(scene: SceneConfig): Promise<{ fileName: string }> {
  return apiPostJson<{ ok: true; fileName: string }>("/api/scenes", scene);
}

export async function listPresets(): Promise<string[]> {
  const res = await apiGet<{ presets: string[] }>("/api/presets");
  return res.presets;
}

export async function loadPreset(fileName: string): Promise<SceneConfig> {
  return apiGet<SceneConfig>(`/api/presets/${encodeURIComponent(fileName)}`);
}
