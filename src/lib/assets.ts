import { SIDECAR_URL } from "./api";

export type AssetKind = "image" | "font";

export interface UploadedAsset {
  id: string;
  ext: string;
  originalName: string;
}

export async function uploadAsset(kind: AssetKind, file: File): Promise<UploadedAsset> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch(`${SIDECAR_URL}/api/assets/${kind}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Failed to upload ${file.name}: ${res.status}`);
  return res.json() as Promise<UploadedAsset>;
}

export function assetUrl(kind: AssetKind, id: string): string {
  return `${SIDECAR_URL}/api/assets/${kind}/${id}`;
}

export async function fetchAssetArrayBuffer(kind: AssetKind, id: string): Promise<ArrayBuffer> {
  const res = await fetch(assetUrl(kind, id));
  if (!res.ok) throw new Error(`Failed to load asset ${id}: ${res.status}`);
  return res.arrayBuffer();
}
