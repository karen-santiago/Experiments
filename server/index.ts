import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ZipArchive } from "archiver";
import { createWriteStream } from "node:fs";
import { detectFfmpeg, runFfmpeg } from "./ffmpeg.js";
import {
  EXPORT_FORMATS,
  buildEncodeArgs,
  buildPaletteGenArgs,
  buildPaletteUseArgs,
  type ExportFormatId,
} from "../src/shared/exportFormats.js";

const app = express();
const PORT = Number(process.env.SIDECAR_PORT ?? 8787);

app.use(cors());
app.use(express.json());

const SESSIONS_ROOT = path.join(os.tmpdir(), "motion-tool-sessions");
const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), "MotionToolExports");

interface Session {
  id: string;
  dir: string;
  framesDir: string;
  createdAt: number;
}

const sessions = new Map<string, Session>();

function pad(n: number, width = 5): string {
  return String(n).padStart(width, "0");
}

app.get("/api/ffmpeg-status", async (_req, res) => {
  const status = await detectFfmpeg();
  res.json(status);
});

app.get("/api/default-output-dir", (_req, res) => {
  res.json({ path: DEFAULT_OUTPUT_DIR });
});

app.post("/api/export/session", async (_req, res) => {
  const id = nanoid(10);
  const dir = path.join(SESSIONS_ROOT, id);
  const framesDir = path.join(dir, "frames");
  await fs.mkdir(framesDir, { recursive: true });
  sessions.set(id, { id, dir, framesDir, createdAt: Date.now() });
  res.json({ sessionId: id });
});

app.post("/api/export/frame/:sessionId/:index", express.raw({ type: "image/png", limit: "25mb" }), async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "unknown session" });
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0) return res.status(400).json({ error: "bad frame index" });
  const framePath = path.join(session.framesDir, `${pad(index)}.png`);
  await fs.writeFile(framePath, req.body as Buffer);
  res.json({ ok: true });
});

app.post("/api/export/cancel/:sessionId", async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (session) {
    sessions.delete(session.id);
    await fs.rm(session.dir, { recursive: true, force: true });
  }
  res.json({ ok: true });
});

interface EncodeBody {
  format: ExportFormatId;
  fps: number;
  sceneName: string;
  outputDir?: string;
}

app.post("/api/export/encode/:sessionId", async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "unknown session" });

  const { format, fps, sceneName, outputDir } = req.body as EncodeBody;
  const formatInfo = EXPORT_FORMATS.find((f) => f.id === format);
  if (!formatInfo) return res.status(400).json({ error: `unknown format ${format}` });

  const targetDir = outputDir && outputDir.trim() ? outputDir : DEFAULT_OUTPUT_DIR;
  await fs.mkdir(targetDir, { recursive: true });

  const safeName = (sceneName || "scene").replace(/[^a-z0-9-_]+/gi, "-");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(targetDir, `${safeName}-${timestamp}.${formatInfo.ext}`);
  const framesPattern = path.join(session.framesDir, "%05d.png");

  try {
    if (format === "png-sequence") {
      await zipDirectory(session.framesDir, outPath);
    } else if (format === "gif") {
      const palettePath = path.join(session.dir, "palette.png");
      await runFfmpeg(buildPaletteGenArgs({ fps, framesPattern, palettePath }));
      await runFfmpeg(buildPaletteUseArgs({ fps, framesPattern, palettePath, outPath }));
    } else {
      await runFfmpeg(buildEncodeArgs(format, { fps, framesPattern, outPath }));
    }

    sessions.delete(session.id);
    await fs.rm(session.dir, { recursive: true, force: true });

    res.json({ ok: true, outputPath: outPath });
  } catch (err) {
    sessions.delete(session.id);
    await fs.rm(session.dir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/reveal", async (req, res) => {
  const { path: targetPath } = req.body as { path: string };
  if (!targetPath) return res.status(400).json({ error: "missing path" });
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "darwin" ? ["-R", targetPath] : [path.dirname(targetPath)];
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  res.json({ ok: true });
});

function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

app.listen(PORT, () => {
  console.log(`[motion-tool sidecar] listening on http://localhost:${PORT}`);
  detectFfmpeg().then((status) => {
    if (status.available) {
      console.log(`[motion-tool sidecar] ${status.version}`);
    } else {
      console.warn(`[motion-tool sidecar] ffmpeg not found: ${status.error}`);
    }
  });
});
