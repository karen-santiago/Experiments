export type ExportFormatId = "mp4" | "webm" | "prores" | "gif" | "png-sequence";

export interface ExportFormatInfo {
  id: ExportFormatId;
  label: string;
  ext: string;
  supportsAlpha: boolean;
}

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  { id: "mp4", label: "MP4 (H.264)", ext: "mp4", supportsAlpha: false },
  { id: "webm", label: "WebM (VP9, alpha)", ext: "webm", supportsAlpha: true },
  { id: "prores", label: "ProRes 4444", ext: "mov", supportsAlpha: true },
  { id: "gif", label: "GIF", ext: "gif", supportsAlpha: false },
  { id: "png-sequence", label: "PNG sequence (zip)", ext: "zip", supportsAlpha: true },
];

export function buildEncodeArgs(
  format: Exclude<ExportFormatId, "gif" | "png-sequence">,
  opts: { fps: number; framesPattern: string; outPath: string },
): string[] {
  const input = ["-y", "-framerate", String(opts.fps), "-i", opts.framesPattern];
  switch (format) {
    case "mp4":
      return [...input, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", opts.outPath];
    case "webm":
      return [...input, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", "20", "-b:v", "0", opts.outPath];
    case "prores":
      return [...input, "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", opts.outPath];
  }
}

export function buildPaletteGenArgs(opts: { fps: number; framesPattern: string; palettePath: string }): string[] {
  return [
    "-y",
    "-framerate",
    String(opts.fps),
    "-i",
    opts.framesPattern,
    "-vf",
    "palettegen",
    opts.palettePath,
  ];
}

export function buildPaletteUseArgs(opts: {
  fps: number;
  framesPattern: string;
  palettePath: string;
  outPath: string;
}): string[] {
  return [
    "-y",
    "-framerate",
    String(opts.fps),
    "-i",
    opts.framesPattern,
    "-i",
    opts.palettePath,
    "-lavfi",
    "paletteuse",
    opts.outPath,
  ];
}
