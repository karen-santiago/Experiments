import { getImageBitmap } from "../../lib/imageCache";
import { drawCover, roundedRectPath } from "../../lib/canvasDraw";
import { wrapTextToLines } from "../shared/text";
import { computeElapsedSinceStart } from "../shared/holdTransition";
import type { AssetRef, ChatAnimationConfig, ChatMessage } from "../../types/scene";
import type { AnimationModule } from "../types";
import { ChatParamsPanel } from "./ChatParamsPanel";

function drawAvatar(ctx: CanvasRenderingContext2D, avatar: AssetRef | null, cx: number, cy: number, r: number, fallbackColor: string) {
  const bitmap = avatar && getImageBitmap(avatar.id);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  if (bitmap) {
    ctx.clip();
    drawCover(ctx, bitmap, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fill();
  }
  ctx.restore();
}

function drawTypingDots(ctx: CanvasRenderingContext2D, cx: number, cy: number, dotColor: string, localT: number) {
  const dotR = 4;
  const spacing = 14;
  for (let i = 0; i < 3; i++) {
    const bounce = Math.sin(localT * 6 - i * 0.8) * 0.5 + 0.5;
    const y = cy - bounce * 4;
    ctx.beginPath();
    ctx.arc(cx + (i - 1) * spacing, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
  }
}

interface RenderItem {
  message: ChatMessage;
  isTyping: boolean;
  lines: string[];
  typingLocalT: number;
  popIn: number; // 0..1, quick pop-in scale/opacity right after the bubble appears
}

export const chatModule: AnimationModule<ChatAnimationConfig> = {
  id: "chat",
  label: "Conversation",
  defaults: {
    type: "chat",
    messages: [
      { id: "m1", speaker: "a", text: "Hey! Have you seen the new case study?" },
      { id: "m2", speaker: "b", text: "Not yet, send it over" },
      { id: "m3", speaker: "a", text: "Just did 🎬" },
      { id: "m4", speaker: "b", text: "This looks amazing!" },
    ],
    avatarA: null,
    avatarB: null,
    nameA: "Alex",
    nameB: "Sam",
    bubbleColorA: "#2c2d32",
    bubbleColorB: "#ff5a36",
    textColorA: "#f5f5f0",
    textColorB: "#ffffff",
    fontId: null,
    fontSize: 32,
    bubbleCornerRadius: 20,
    messageIntervalMs: 500,
    showTypingIndicator: true,
    typingDurationMs: 700,
    typingDotColor: "#f5f5f0",
    loopMode: "loop",
    holdStart: 0.3,
    holdEnd: 1.4,
  },
  ParamsPanel: ChatParamsPanel,
  renderFrame(rc, config) {
    const { ctx, width, height } = rc;
    const n = config.messages.length;
    if (n === 0) {
      ctx.save();
      ctx.fillStyle = rc.palette.secondary;
      ctx.font = "24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.6;
      ctx.fillText("Add messages in the panel on the left", width / 2, height / 2);
      ctx.restore();
      return;
    }

    const fontFamily = rc.resolveFont(config.fontId).family;
    const typingSec = config.showTypingIndicator ? config.typingDurationMs / 1000 : 0;
    const slotSec = Math.max(0.05, typingSec + config.messageIntervalMs / 1000);
    const activeDuration = n * slotSec;
    const elapsed = computeElapsedSinceStart(rc.t, config.holdStart, activeDuration, config.holdEnd, config.loopMode);

    const maxBubbleWidth = width * 0.56;
    ctx.font = `${config.fontSize}px ${fontFamily}`;

    const items: RenderItem[] = [];
    for (let i = 0; i < n; i++) {
      const localElapsed = elapsed - i * slotSec;
      if (localElapsed < 0) break;
      if (localElapsed < typingSec) {
        items.push({ message: config.messages[i], isTyping: true, lines: [], typingLocalT: localElapsed, popIn: 1 });
        break;
      }
      const lines = wrapTextToLines(ctx, config.messages[i].text, maxBubbleWidth - config.fontSize * 1.2);
      const popIn = Math.min(1, (localElapsed - typingSec) / 0.15);
      items.push({ message: config.messages[i], isTyping: false, lines, typingLocalT: 0, popIn });
    }

    const lineHeight = config.fontSize * 1.3;
    const paddingX = config.fontSize * 0.6;
    const paddingY = config.fontSize * 0.45;
    const avatarR = config.fontSize * 0.9;
    const gap = config.fontSize * 0.6;
    const areaTop = height * 0.08;
    const areaBottom = height * 0.92;

    let cursorY = areaBottom;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const bubbleH = item.isTyping ? lineHeight + paddingY * 2 : item.lines.length * lineHeight + paddingY * 2;
      const bubbleTop = cursorY - bubbleH;
      if (bubbleTop < areaTop) break;

      const isA = item.message.speaker === "a";
      const bubbleColor = isA ? config.bubbleColorA : config.bubbleColorB;
      const textColor = isA ? config.textColorA : config.textColorB;
      const avatar = isA ? config.avatarA : config.avatarB;

      let bubbleWidth = maxBubbleWidth;
      if (!item.isTyping) {
        const lineWidths = item.lines.map((l) => ctx.measureText(l).width);
        bubbleWidth = Math.min(maxBubbleWidth, Math.max(...lineWidths, config.fontSize * 2) + paddingX * 2);
      } else {
        bubbleWidth = config.fontSize * 3;
      }

      const sideMargin = width * 0.06;
      const avatarX = isA ? sideMargin + avatarR : width - sideMargin - avatarR;
      const bubbleX = isA ? avatarX + avatarR + gap : avatarX - avatarR - gap - bubbleWidth;
      const bubbleCenterY = bubbleTop + bubbleH / 2;

      ctx.save();
      ctx.globalAlpha = item.popIn;
      const scale = 0.85 + 0.15 * item.popIn;
      ctx.translate(bubbleX + bubbleWidth / 2, bubbleCenterY);
      ctx.scale(scale, scale);
      ctx.translate(-(bubbleX + bubbleWidth / 2), -bubbleCenterY);

      roundedRectPath(ctx, bubbleX, bubbleTop, bubbleWidth, bubbleH, config.bubbleCornerRadius);
      ctx.fillStyle = bubbleColor;
      ctx.fill();

      if (item.isTyping) {
        drawTypingDots(ctx, bubbleX + bubbleWidth / 2, bubbleCenterY, config.typingDotColor, rc.t);
      } else {
        ctx.fillStyle = textColor;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = `${config.fontSize}px ${fontFamily}`;
        const startY = bubbleTop + paddingY + lineHeight / 2;
        item.lines.forEach((line, li) => {
          ctx.fillText(line, bubbleX + paddingX, startY + li * lineHeight);
        });
      }
      ctx.restore();

      drawAvatar(ctx, avatar, avatarX, bubbleCenterY, avatarR, isA ? config.bubbleColorA : config.bubbleColorB);

      cursorY = bubbleTop - gap;
    }
  },
};
