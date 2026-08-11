import { spawn } from "node:child_process";

export interface FfmpegStatus {
  available: boolean;
  version: string | null;
  error: string | null;
}

let cached: FfmpegStatus | null = null;

export function detectFfmpeg(): Promise<FfmpegStatus> {
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"]);
    let out = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.on("error", () => {
      cached = {
        available: false,
        version: null,
        error: "ffmpeg was not found on PATH. Install it with `brew install ffmpeg`.",
      };
      resolve(cached);
    });
    proc.on("close", (code) => {
      if (code === 0) {
        const version = out.split("\n")[0] ?? "ffmpeg";
        cached = { available: true, version, error: null };
      } else if (code === null || code < 0) {
        cached = {
          available: false,
          version: null,
          error: "ffmpeg was not found on PATH. Install it with `brew install ffmpeg`.",
        };
      } else {
        cached = { available: false, version: null, error: `ffmpeg exited with code ${code}` };
      }
      resolve(cached);
    });
  });
}

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => {
      const isMissing = (err as NodeJS.ErrnoException).code === "ENOENT";
      reject(
        isMissing
          ? new Error("ffmpeg was not found on PATH. Install it with `brew install ffmpeg`.")
          : err,
      );
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-4000)}`));
    });
  });
}
