import { parseSVG, makeAbsolute, type CommandMadeAbsolute } from "svg-path-parser";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function extendBounds(b: Bounds, x: number | undefined, y: number | undefined) {
  if (x === undefined || y === undefined || Number.isNaN(x) || Number.isNaN(y)) return;
  if (x < b.minX) b.minX = x;
  if (x > b.maxX) b.maxX = x;
  if (y < b.minY) b.minY = y;
  if (y > b.maxY) b.maxY = y;
}

function computeBounds(commands: CommandMadeAbsolute[]): Bounds {
  const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const cmd of commands) {
    const c = cmd as unknown as Record<string, number>;
    extendBounds(b, c.x, c.y);
    extendBounds(b, c.x1, c.y1);
    extendBounds(b, c.x2, c.y2);
  }
  return b;
}

function formatNum(n: number): string {
  return Number(n.toFixed(3)).toString();
}

function serialize(commands: CommandMadeAbsolute[]): string {
  return commands
    .map((cmd) => {
      const c = cmd as unknown as Record<string, number | boolean>;
      switch (cmd.code) {
        case "M":
          return `M${formatNum(c.x as number)},${formatNum(c.y as number)}`;
        case "L":
          return `L${formatNum(c.x as number)},${formatNum(c.y as number)}`;
        case "H":
          return `H${formatNum(c.x as number)}`;
        case "V":
          return `V${formatNum(c.y as number)}`;
        case "C":
          return `C${formatNum(c.x1 as number)},${formatNum(c.y1 as number)} ${formatNum(c.x2 as number)},${formatNum(c.y2 as number)} ${formatNum(c.x as number)},${formatNum(c.y as number)}`;
        case "S":
          return `S${formatNum(c.x2 as number)},${formatNum(c.y2 as number)} ${formatNum(c.x as number)},${formatNum(c.y as number)}`;
        case "Q":
          return `Q${formatNum(c.x1 as number)},${formatNum(c.y1 as number)} ${formatNum(c.x as number)},${formatNum(c.y as number)}`;
        case "T":
          return `T${formatNum(c.x as number)},${formatNum(c.y as number)}`;
        case "A":
          return `A${formatNum(c.rx as number)},${formatNum(c.ry as number)} ${formatNum(c.xAxisRotation as number)} ${c.largeArc ? 1 : 0},${c.sweep ? 1 : 0} ${formatNum(c.x as number)},${formatNum(c.y as number)}`;
        case "Z":
          return "Z";
        default:
          return "";
      }
    })
    .join(" ");
}

/**
 * Parses `d`, centers its bounding box at the origin, and uniformly scales
 * it to fit within `targetSize`, then re-centers into a 0..targetSize
 * viewBox. Run once when a path is uploaded/edited, not per frame — see
 * spec section 5.1 ("normalize both paths to the same viewBox and center
 * them before interpolating").
 */
export function normalizePath(d: string, targetSize = 200): string {
  const commands = makeAbsolute(parseSVG(d));
  const bounds = computeBounds(commands);
  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxY - bounds.minY || 1;
  const scale = targetSize / Math.max(width, height);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const offset = targetSize / 2;

  for (const cmd of commands) {
    const c = cmd as unknown as Record<string, number>;
    if (typeof c.x === "number") c.x = (c.x - cx) * scale + offset;
    if (typeof c.y === "number") c.y = (c.y - cy) * scale + offset;
    if (typeof c.x1 === "number") c.x1 = (c.x1 - cx) * scale + offset;
    if (typeof c.y1 === "number") c.y1 = (c.y1 - cy) * scale + offset;
    if (typeof c.x2 === "number") c.x2 = (c.x2 - cx) * scale + offset;
    if (typeof c.y2 === "number") c.y2 = (c.y2 - cy) * scale + offset;
    if (typeof c.rx === "number") c.rx *= scale;
    if (typeof c.ry === "number") c.ry *= scale;
  }

  return serialize(commands);
}

/** Extracts and concatenates every <path d="..."> in an uploaded SVG file's markup. */
export function extractPathsFromSvgMarkup(svgMarkup: string): string {
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("Could not parse this file as SVG.");
  const paths = Array.from(doc.querySelectorAll("path"));
  const d = paths
    .map((p) => p.getAttribute("d"))
    .filter((v): v is string => Boolean(v))
    .join(" ");
  if (!d) throw new Error("No <path> elements with a d attribute were found in this SVG.");
  return d;
}
