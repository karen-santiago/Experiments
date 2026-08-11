# Motion Tool

A local desktop-run app for making short animations for portfolio case studies. Runs on your machine, no accounts, no cloud, no telemetry.

Full spec: see the original build spec for the five animation types (shape morph, text morph, image field, image flicker, text wall), the data model, and the export formats this is built toward.

## Status

All eight phases from the spec's build order (section 9) are implemented:

- **Phase 1 — Skeleton.** Vite + React + TS app, Node/Express sidecar, ffmpeg detection with a clear on-screen error when it's missing, the `renderFrame(ctx, t, config)` pure-function contract, a rAF preview loop, scrub bar, play/pause, loop toggle, zoom-to-fit, keyboard shortcuts.
- **Phase 2 — Export.** Frame-capture pipeline that steps `t = frameIndex / fps` (never wall-clock), uploads each PNG to the sidecar, and encodes with native ffmpeg. Progress bar with ETA, cancel, temp-directory cleanup on cancel/completion/failure. All five formats from the spec's table (MP4, WebM/VP9 alpha, ProRes 4444, GIF via palettegen+paletteuse, PNG sequence via zip). MP4 is blocked when the background is transparent.
- **Phase 3 — Image field.** Content-addressed image storage via the sidecar (browsers can't read back real OS paths from a picked File, so uploads are hashed and stored locally instead — see Architecture below), a seeded PRNG driving every layout decision, four layout modes (scatter/cluster/row/bands), horizontal/vertical drift with seamless wrap, parallax, sway, rotation drift, three entrance modes, a static text overlay, and a "snap duration to loop" control with a live sync check.
- **Phase 4 — Text morph mode B + font upload.** Font upload (ttf/otf/woff/woff2) persisted via the sidecar, registered with `FontFace` for canvas text. Character-transition mode: per-character crossfade/slide/scale/blur with configurable stagger, direction (including seeded random), and its own opacity easing curve.
- **Phase 5 — Shape morph.** SVG path upload or direct `d`-string paste, normalized (centered + scaled into a shared viewBox) once at edit time, flubber interpolate/separate/combine dispatch depending on how many subpaths each side has.
- **Phase 6 — Text morph mode A (glyph morph).** Per-character-pair flubber interpolators built from real opentype.js glyph outlines positioned at their actual advance-width offsets; falls back to character transition when no font is uploaded. Variable fonts are detected on upload with a warning that only the default instance is used.
- **Phase 7 — Image flicker + text wall.** Flicker: four order modes, hard-cut/crossfade transitions, cover/contain/fill fit. Text wall: grid/marquee-rows/vertical-scroll layouts, three reveal modes, seeded per-word color/size/rotation variance.
- **Phase 8 — Polish.** Save/load `.motion.json` scenes and presets through the top bar's New/Open/Save/Save As, `cmd+s` shortcut. (Transparent export and all five export formats were already in place from phase 2.)

Adding a sixth animation type means: add a variant to `AnimationConfig` in `src/types/scene.ts`, write a module implementing `AnimationModule` (`src/animations/types.ts`), add one entry to `src/animations/registry.ts`. Nothing else should need to change.

### Known gaps

- **ffmpeg wasn't installed in the sandbox this was built in**, so actual video encoding is untested end-to-end — the frame-capture → upload pipeline is verified (a 10s/30fps/1080×1080 export renders and uploads all 300 frames in ~12s, well inside the spec's 60s budget), and the missing-binary path is verified to surface the intended clear error. Encoding itself is a straightforward `spawn("ffmpeg", args)` with args matching the spec's table exactly (`server/ffmpeg.ts`, `src/shared/exportFormats.ts`).
- **Image flicker's optional per-image duration override** isn't implemented — interval + order + transition + fit are.
- The bundle is ~560KB minified (mostly opentype.js + flubber). Fine for a local dev-server app; would be worth code-splitting per animation module if this ever needs to ship over a network.

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

Uploaded images and fonts persist in `library/` and `fonts/` at the project root (gitignored); saved scenes live in `scenes/`. All three are created on first use.

## Architecture

The one rule that matters: **rendering is a pure function of time.**

```ts
renderFrame(ctx: CanvasRenderingContext2D, t: number, config: SceneConfig): void
```

`src/render/renderFrame.ts` is the pure entry point — nothing reachable from it reads `Date.now()`, `performance.now()`, rAF timestamps, or mutates persistent state that depends on time. Two callers exist:

- `src/components/CanvasPreview.tsx` — a rAF loop that derives `t` from wall-clock deltas for live preview.
- `src/lib/exportPipeline.ts` — ignores wall clock entirely and steps `t = frameIndex / fps` for each exported frame.

Both call the exact same `renderFrame`, which is what makes exports frame-accurate regardless of how slow rendering is.

Modules *are* allowed to read from caches populated asynchronously outside `renderFrame` — decoded images (`src/lib/imageCache.ts`), registered fonts (`src/lib/fontRegistry.ts`), memoized layouts and flubber interpolators (keyed by config object identity or the exact params that produced them, e.g. `src/animations/imageField/layout.ts`, `src/animations/shapeMorph/interpolator.ts`). These are keyed by *config*, not by time, so a given `t` still always produces the same output for a given config — they just avoid redoing expensive work (triangulating a flubber morph, decoding a photo, laying out a seeded scatter of 200 images) on every single frame.

Animation types are a registry (`src/animations/registry.ts`) of modules implementing `{ id, label, defaults, ParamsPanel, renderFrame }` (`src/animations/types.ts`). The scene data model (`src/types/scene.ts`) is a single `SceneConfig` JSON object, matching the `.motion.json` format in `presets/`.

The sidecar (`server/index.ts`) only handles what needs OS access: ffmpeg detection, session-scoped temp directories for frame capture, spawning ffmpeg for encode, and content-addressed asset storage. `server/assets.ts` hashes uploaded images/fonts (sha256) and stores one copy per unique file under `library/`/`fonts/` — the practical substitute for the spec's "store absolute file paths": a browser can't read back a real OS path from a picked `File` for security reasons, so instead the app keeps its own persistent copy and references it by content hash, which also means re-uploading identical bytes is a no-op and a reopened scene always resolves its images. The export format definitions and ffmpeg argument builders live in `src/shared/exportFormats.ts` so both the client (format metadata/labels) and the sidecar (actual ffmpeg args) import the same source of truth.

## Verification

Every phase was checked with `tsc -b`, `vite build`, `oxlint`, and a headless-Chromium (Playwright) pass driving the actual UI — uploading real images/fonts, scrubbing the timeline, and screenshotting each animation type mid-motion — rather than just reading the code back. Notably this caught one real bug during phase 3 (the preview's rAF loop had captured a stale `scene` closure at mount, so parameter edits stopped applying once you hit play), which is fixed in `src/components/CanvasPreview.tsx` via a `sceneRef`.
