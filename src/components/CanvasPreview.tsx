import { useEffect, useRef, useState } from "react";
import { renderFrame } from "../render/renderFrame";
import { subscribeImageCache } from "../lib/imageCache";
import { subscribeFontRegistry } from "../lib/fontRegistry";
import type { SceneConfig } from "../types/scene";

interface CanvasPreviewProps {
  scene: SceneConfig;
  speedMultiplier: number;
}

/**
 * Preview-only concern: this component owns the rAF loop and derives `t`
 * from wall-clock deltas, then hands that `t` to the pure renderFrame(ctx,
 * t, config). The wall clock never leaks into renderFrame itself — export
 * (src/lib/exportPipeline.ts) calls the identical renderFrame with
 * frame-stepped `t` values instead.
 */
export function CanvasPreview({ scene, speedMultiplier }: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [zoomToFit, setZoomToFit] = useState(true);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  // Read via refs inside the rAF callback so the loop doesn't need to be
  // torn down and restarted every time one of these changes. Without
  // sceneRef, the rAF closure (set up once on mount) would keep drawing the
  // scene as it was at mount time and never pick up param edits made while
  // playing.
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const stateRef = useRef({ currentTime, isPlaying, loop, speedMultiplier, duration: scene.canvas.duration });
  stateRef.current = { currentTime, isPlaying, loop, speedMultiplier, duration: scene.canvas.duration };

  const draw = (t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderFrame(ctx, t, sceneRef.current);
  };

  // Redraw immediately whenever the scene or currentTime changes while
  // paused (e.g. scrubbing, stepping frames, editing params).
  useEffect(() => {
    if (!isPlaying) draw(currentTime);
  }, [scene, currentTime, isPlaying]);

  // Images and fonts decode asynchronously outside renderFrame (see
  // src/lib/imageCache.ts, src/lib/fontRegistry.ts). When one finishes
  // loading, force a redraw of the current frame so a paused preview
  // doesn't keep showing placeholders.
  useEffect(() => {
    const redraw = () => draw(stateRef.current.currentTime);
    const unsubImages = subscribeImageCache(redraw);
    const unsubFonts = subscribeFontRegistry(redraw);
    return () => {
      unsubImages();
      unsubFonts();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tick = (ts: number) => {
      const s = stateRef.current;
      if (s.isPlaying) {
        const last = lastTsRef.current ?? ts;
        const dt = ((ts - last) / 1000) * s.speedMultiplier;
        lastTsRef.current = ts;
        let next = s.currentTime + dt;
        if (next >= s.duration) {
          if (s.loop) {
            next = s.duration > 0 ? next % s.duration : 0;
          } else {
            next = s.duration;
            setIsPlaying(false);
          }
        }
        setCurrentTime(next);
        draw(next);
      } else {
        lastTsRef.current = ts;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
        e.preventDefault();
        setIsPlaying(false);
        const frameDuration = 1 / scene.canvas.fps;
        const dir = e.code === "ArrowRight" ? 1 : -1;
        setCurrentTime((t) => {
          const next = t + dir * frameDuration;
          return Math.min(scene.canvas.duration, Math.max(0, next));
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scene.canvas.fps, scene.canvas.duration]);

  const { width, height, background } = scene.canvas;

  return (
    <div className="canvas-preview">
      <div className={`canvas-stage ${background === "transparent" ? "checkerboard" : ""}`}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={
            zoomToFit
              ? { maxWidth: "100%", maxHeight: "60vh", width: "auto", height: "auto" }
              : { width, height }
          }
        />
      </div>

      <div className="transport">
        <button onClick={() => setIsPlaying((p) => !p)} aria-label="Play/Pause">
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={scene.canvas.duration}
          step={1 / scene.canvas.fps}
          value={currentTime}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentTime(Number(e.target.value));
          }}
          className="scrub-bar"
        />
        <span className="time-readout">
          {currentTime.toFixed(2)}s / {scene.canvas.duration.toFixed(2)}s
        </span>
        <label className="loop-toggle">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          Loop
        </label>
        <label className="loop-toggle">
          <input type="checkbox" checked={zoomToFit} onChange={(e) => setZoomToFit(e.target.checked)} />
          Zoom to fit
        </label>
      </div>
    </div>
  );
}
