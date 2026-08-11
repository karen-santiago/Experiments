import { computeHoldTransition } from "../shared/holdTransition";
import { roundedRectPath } from "../../lib/canvasDraw";
import type { ChartAnimationConfig, ChartDataPoint } from "../../types/scene";
import type { AnimationModule, RenderContext } from "../types";
import { ChartParamsPanel } from "./ChartParamsPanel";

function itemProgress(progress: number, index: number, count: number, staggerMs: number, revealDuration: number, ease: (x: number) => number): number {
  if (count <= 0) return progress;
  const staggerFrac = count > 1 ? Math.min(0.9 / count, staggerMs / 1000 / Math.max(revealDuration, 1e-6)) : 0;
  const spanFrac = Math.max(0.15, 1 - Math.max(0, count - 1) * staggerFrac);
  const start = index * staggerFrac;
  const local = Math.max(0, Math.min(1, (progress - start) / spanFrac));
  return ease(local);
}

function renderBarChart(rc: RenderContext, config: ChartAnimationConfig, progress: number, fontFamily: string) {
  const { ctx, width, height, easing } = rc;
  const data = config.data;
  if (data.length === 0) return;

  const marginTop = height * 0.1;
  const marginBottom = height * (config.showLabels ? 0.16 : 0.08);
  const marginX = width * 0.08;
  const chartW = width - marginX * 2;
  const chartH = height - marginTop - marginBottom;
  const baseline = height - marginBottom;
  const maxValue = Math.max(...data.map((d) => d.value), 1e-6);

  const slotW = chartW / data.length;
  const barW = slotW * (1 - config.barGap);

  ctx.save();
  ctx.strokeStyle = config.axisColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, baseline);
  ctx.lineTo(marginX + chartW, baseline);
  ctx.stroke();
  ctx.restore();

  data.forEach((d, i) => {
    const eased = itemProgress(progress, i, data.length, config.staggerMs, config.revealDuration, easing);
    const barH = Math.max(0, eased * (d.value / maxValue) * chartH);
    const x = marginX + i * slotW + (slotW - barW) / 2;
    const y = baseline - barH;

    ctx.save();
    ctx.fillStyle = d.color;
    roundedRectPath(ctx, x, y, barW, barH, config.barCornerRadius);
    ctx.fill();
    ctx.restore();

    if (config.showValues && eased > 0.05) {
      ctx.save();
      ctx.globalAlpha = eased;
      ctx.fillStyle = d.color;
      ctx.font = `${Math.round(height * 0.03)}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(formatValue(d.value), x + barW / 2, y - 6);
      ctx.restore();
    }

    if (config.showLabels) {
      ctx.save();
      ctx.fillStyle = rc.palette.secondary;
      ctx.font = `${Math.round(height * 0.026)}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(d.label, x + barW / 2, baseline + 10);
      ctx.restore();
    }
  });
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function renderDonutChart(rc: RenderContext, config: ChartAnimationConfig, progress: number, fontFamily: string) {
  const { ctx, width, height, easing } = rc;
  const data = config.data;
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) * 0.38;
  const innerR = outerR * (1 - config.donutThickness);
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);

  if (data.length > 0 && total > 0) {
    const gapRad = (config.donutGapDeg * Math.PI) / 180;
    let angle = -Math.PI / 2;

    data.forEach((d, i) => {
      const sweep = (Math.max(0, d.value) / total) * (Math.PI * 2) - gapRad;
      const eased = itemProgress(progress, i, data.length, config.staggerMs, config.revealDuration, easing);
      const drawnSweep = Math.max(0, sweep) * eased;
      if (drawnSweep > 0.0005) {
        ctx.save();
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, angle, angle + drawnSweep);
        ctx.arc(cx, cy, innerR, angle + drawnSweep, angle, true);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      angle += sweep + gapRad;
    });
  }

  if (config.centerText.trim()) {
    ctx.save();
    ctx.fillStyle = config.centerTextColor;
    ctx.font = `${config.centerTextSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(config.centerText, cx, cy);
    ctx.restore();
  }
}

export const chartModule: AnimationModule<ChartAnimationConfig> = {
  id: "chart",
  label: "Chart",
  defaults: {
    type: "chart",
    chartType: "bar",
    data: makeDefaultData(),
    fontId: null,
    holdStart: 0.4,
    revealDuration: 1.2,
    holdEnd: 1.2,
    loopMode: "loop",
    staggerMs: 120,
    barGap: 0.3,
    barCornerRadius: 8,
    showValues: true,
    showLabels: true,
    axisColor: "#8a8a8a",
    donutThickness: 0.35,
    donutGapDeg: 3,
    centerText: "72%",
    centerTextSize: 72,
    centerTextColor: "#f5f5f0",
  },
  ParamsPanel: ChartParamsPanel,
  renderFrame(rc, config) {
    if (config.data.length === 0) {
      const { ctx, width, height } = rc;
      ctx.save();
      ctx.fillStyle = rc.palette.secondary;
      ctx.font = "24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.6;
      ctx.fillText("Add data rows in the panel on the left", width / 2, height / 2);
      ctx.restore();
      return;
    }

    const fontFamily = rc.resolveFont(config.fontId).family;
    const { progress } = computeHoldTransition(rc.t, config.holdStart, config.revealDuration, config.holdEnd, config.loopMode);
    if (config.chartType === "bar") renderBarChart(rc, config, progress, fontFamily);
    else renderDonutChart(rc, config, progress, fontFamily);
  },
};

function makeDefaultData(): ChartDataPoint[] {
  return [
    { id: "a", label: "Q1", value: 24, color: "#ff5a36" },
    { id: "b", label: "Q2", value: 38, color: "#f5f5f0" },
    { id: "c", label: "Q3", value: 31, color: "#8a8a8a" },
    { id: "d", label: "Q4", value: 52, color: "#ff5a36" },
  ];
}
