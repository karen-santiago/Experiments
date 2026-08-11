import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// Uploaded images and fonts are stored content-addressed (sha256 of the
// bytes) under a local directory so a saved scene can reference them by id
// and they survive app restarts. This is the practical substitute for the
// spec's "store absolute file paths" — a browser sandbox has no reliable
// way to read back an OS absolute path from a picked File, so instead we
// keep our own persistent copy and use its hash as identity. Re-uploading
// identical bytes is a no-op (same id).
export interface StoredAsset {
  id: string;
  ext: string;
  originalName: string;
  filePath: string;
}

export async function storeAsset(dir: string, buffer: Buffer, originalName: string): Promise<StoredAsset> {
  await fs.mkdir(dir, { recursive: true });
  const id = crypto.createHash("sha256").update(buffer).digest("hex");
  const ext = path.extname(originalName).toLowerCase() || "";
  const filePath = path.join(dir, `${id}${ext}`);
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, buffer);
  }
  const metaPath = path.join(dir, `${id}.json`);
  try {
    await fs.access(metaPath);
  } catch {
    await fs.writeFile(metaPath, JSON.stringify({ originalName }));
  }
  return { id, ext, originalName, filePath };
}

export async function findAsset(dir: string, id: string): Promise<{ filePath: string; originalName: string } | null> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const match = entries.find((f) => f.startsWith(id) && !f.endsWith(".json"));
  if (!match) return null;
  const filePath = path.join(dir, match);
  let originalName = match;
  try {
    const meta = JSON.parse(await fs.readFile(path.join(dir, `${id}.json`), "utf-8"));
    originalName = meta.originalName ?? match;
  } catch {
    // no metadata sidecar; fall back to the stored filename
  }
  return { filePath, originalName };
}
