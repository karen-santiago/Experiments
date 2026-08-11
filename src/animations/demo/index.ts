import type { DemoAnimationConfig } from "../../types/scene";
import type { AnimationModule } from "../types";
import { DemoParamsPanel } from "./DemoParamsPanel";

// Phase 1/2 reference module: draws a rotating shape plus an optional
// zero-padded frame counter. Exists to prove renderFrame is a pure function
// of t and to verify frame-accurate export (each frame index appears
// exactly once in the encoded video).
export const demoModule: AnimationModule<DemoAnimationConfig> = {
  id: "demo",
  label: "Demo shape",
  defaults: {
    type: "demo",
    shape: "square",
    rotationSpeed: 45,
    showFrameCounter: true,
  },
  ParamsPanel: DemoParamsPanel,
  renderFrame({ ctx, t, width, height, fps, palette }, config) {
    const cx = width / 2;
    const cy = height / 2;
    const size = Math.min(width, height) * 0.28;
    const angle = ((config.rotationSpeed * t) % 360) * (Math.PI / 180);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = palette.accent;
    if (config.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-size / 2, -size / 2, size, size);
    }
    ctx.restore();

    if (config.showFrameCounter) {
      const frameIndex = Math.round(t * fps);
      const label = String(frameIndex).padStart(5, "0");
      ctx.save();
      ctx.fillStyle = palette.primary;
      ctx.font = `${Math.round(height * 0.06)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, height * 0.88);
      ctx.restore();
    }
  },
};
