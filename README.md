# Motion Tool

A local desktop-run app for making short animations for portfolio case studies. Runs on your machine, no accounts, no cloud, no telemetry.

Full spec: see the original build spec for the five animation types (shape morph, text morph, image field, image flicker, text wall), the data model, and the export formats this is built toward.

## Status

Building in the phased order the spec lays out (section 9). Shipped so far:

- **Phase 1 — Skeleton.** Vite + React + TS app, Node/Express sidecar, ffmpeg detection with a clear on-screen error when it's missing, the `renderFrame(ctx, t, config)` pure-function contract, a rAF preview loop, scrub bar, play/pause, loop toggle, zoom-to-fit, and keyboard shortcuts (space, arrow keys).
- **Phase 2 — Export.** Full frame-capture pipeline: steps `t = frameIndex / fps` (never wall-clock) for every frame, uploads each PNG to the sidecar, and encodes with native ffmpeg. Progress bar with ETA, cancel, and temp-directory cleanup on both cancel and completion (including failed encodes). All five formats from the spec's table are wired up (MP4, WebM/VP9 alpha, ProRes 4444, GIF via palettegen+paletteuse, PNG sequence via zip). MP4 is blocked when the background is transparent, per spec.

One animation module (`demo`) is registered for now — a rotating shape with an optional zero-padded frame counter overlay, used to verify frame-accurate export. The five real animation types (shape morph, text morph, image field, image flicker, text wall) come in phases 3–7; adding each one means adding a variant to `AnimationConfig` in `src/types/scene.ts` and one entry in `src/animations/registry.ts` — nothing else should need to change.

Not yet built: image field (phase 3), text morph (phase 4/6), shape morph (phase 5), image flicker + text wall (phase 7), and polish (phase 8: save/load `.motion.json` scenes, font upload, remaining UI wiring for presets, keyboard save shortcut).

## Running it

Requires [ffmpeg](https://ffmpeg.org/) on your PATH (`brew install ffmpeg` on macOS). The app detects it on boot and shows a clear error in the top bar if it's missing — you can still use the preview without it, just not export.

```bash
npm install
npm run dev
```

This starts the Vite dev server and the Node sidecar together (via `concurrently`). Open the printed Vite URL.

- `npm run dev:client` / `npm run dev:server` — run either half alone.
- `npm run build` — typecheck (`tsc -b`, covering the client, the Node config, and the sidecar) and build the client.
- `npm run lint` — oxlint.

## Architecture

The one rule that matters: **rendering is a pure function of time.**

```ts
renderFrame(ctx: CanvasRenderingContext2D, t: number, config: SceneConfig): void
```

`src/render/renderFrame.ts` is the pure entry point — nothing reachable from it reads `Date.now()`, `performance.now()`, rAF timestamps, or mutates persistent state. Two callers exist:

- `src/components/CanvasPreview.tsx` — a rAF loop that derives `t` from wall-clock deltas for live preview.
- `src/lib/exportPipeline.ts` — ignores wall clock entirely and steps `t = frameIndex / fps` for each exported frame.

Both call the exact same `renderFrame`, which is what makes exports frame-accurate regardless of how slow rendering is.

Animation types are a registry (`src/animations/registry.ts`) of modules implementing `{ id, label, defaults, ParamsPanel, renderFrame }` (`src/animations/types.ts`). The scene data model (`src/types/scene.ts`) is a single `SceneConfig` JSON object, matching the `.motion.json` format in `presets/`.

The sidecar (`server/index.ts`) only handles what needs OS access: ffmpeg detection, session-scoped temp directories for frame capture, and spawning ffmpeg for encode. The export format definitions and ffmpeg argument builders live in `src/shared/exportFormats.ts` so both the client (for format metadata/labels) and the sidecar (for the actual ffmpeg args) import the same source of truth.
