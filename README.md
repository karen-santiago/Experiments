# Motion Tool

A local desktop-run app for making short animations for portfolio case studies. Runs on your machine, no accounts, no cloud, no telemetry.

Started from a spec with five animation types (shape morph, text morph, image field, image flicker, text wall); has since grown to eight, plus a multi-font library and considerably more control inside each module, based on follow-up requests. See Status below for the current set.

## Status

**Animation types (8):** image field, text animation, shape morph, image flicker, text wall, chart (bar/donut), conversation (chat bubbles), and a demo module used for export-accuracy testing. Text morph (the original phase 4/6 module) was removed and replaced by text animation per a later request — see "Text animation" below.

All eight original build-order phases (section 9 of the spec) plus a second round of feature requests are implemented:

- **Phase 1 — Skeleton.** Vite + React + TS app, Node/Express sidecar, ffmpeg detection with a clear on-screen error when it's missing, the `renderFrame(ctx, t, config)` pure-function contract, a rAF preview loop, scrub bar, play/pause, loop toggle, zoom-to-fit, keyboard shortcuts.
- **Phase 2 — Export.** Frame-capture pipeline that steps `t = frameIndex / fps` (never wall-clock), uploads each PNG to the sidecar, and encodes with native ffmpeg. Progress bar with ETA, cancel, temp-directory cleanup on cancel/completion/failure. All five formats from the spec's table (MP4, WebM/VP9 alpha, ProRes 4444, GIF via palettegen+paletteuse, PNG sequence via zip). MP4 is blocked when the background is transparent.
- **Phase 3 — Image field.** Content-addressed image storage via the sidecar (browsers can't read back real OS paths from a picked File, so uploads are hashed and stored locally instead — see Architecture below), a seeded PRNG driving every layout decision, six layout modes (scatter/cluster/row/bands/grid/carousel — see below), horizontal/vertical drift with seamless wrap, parallax, sway, rotation drift, three entrance modes, a static text overlay, and a "snap duration to loop" control with a live sync check.
- **Phase 4 — Font upload.** Originally a single uploaded font; now a font *library* (see "Multi-font library" below).
- **Phase 5 — Shape morph.** SVG path upload or direct `d`-string paste, normalized (centered + scaled into a shared viewBox) once at edit time, flubber interpolate/separate/combine dispatch depending on how many subpaths each side has.
- **Phase 6 — Text animation (replaces text morph).** See "Text animation" below.
- **Phase 7 — Image flicker + text wall.** Flicker: four order modes, hard-cut/crossfade transitions, cover/contain/fill fit. Text wall: grid/marquee-rows/vertical-scroll layouts, three reveal modes, seeded per-word color/size/rotation variance, and a font override.
- **Phase 8 — Polish.** Save/load `.motion.json` scenes and presets through the top bar's New/Open/Save/Save As, `cmd+s` shortcut. (Transparent export and all five export formats were already in place from phase 2.)

Adding a new animation type means: add a variant to `AnimationConfig` in `src/types/scene.ts`, write a module implementing `AnimationModule` (`src/animations/types.ts`), add one entry to `src/animations/registry.ts`. Nothing else should need to change — the chart and chat modules below were both built this way without touching any other module.

### Multi-font library

`scene.fonts[]` replaces the original single-font model. Upload as many fonts as you like from the right panel; pick one as the scene default (used as a fallback), and any text-capable module — text animation, text wall, chart, chat — can override it with its own font via a `FontSelect` dropdown. `RenderContext.resolveFont(fontId)` resolves a module's own id, falling back to the scene default when null. Variable fonts are detected on upload with a warning that only the default instance is usable for glyph outlines.

### Text animation (replaces text morph)

The original text morph module (A→B glyph/character transition) was removed at the user's request in favor of single-text reveal styles, since that's what was actually wanted day to day:

- **Type in** — typewriter reveal with a blinking cursor
- **Grow** — per-character staggered scale + fade in
- **Quick** — the whole string snaps/fades in together, fast
- **Rapid fire** — a decode/glitch effect: each character rapidly cycles through random glyphs from a seeded charset before settling on the real one

### Image field: carousel, equidistant grid, per-image aspect ratio

Two layout modes were added beyond the original four:

- **Grid** — every image evenly spaced with zero jitter and no density gaps ("make everything equidistant"), instead of scatter's randomized placement.
- **Carousel** — a genuinely different motion model (continuous rotation around an axis, not drift+wrap), with two sub-styles: **coverflow** (3D — front image large and opaque, images recede in scale/opacity toward the sides, redrawn back-to-front every frame since draw order depends on the live rotation angle) and **ring** (flat 2D — same size throughout, positioned around a circle).

Each image can also override its box aspect ratio (1:1, 4:5, 3:2, 16:9, 9:16) independently, via a dropdown on its thumbnail.

### Chart builder

A new module, not in the original spec: editable `{label, value, color}` data rows. **Bar** grows each bar from zero to its value, staggered. **Donut** reveals each segment as a clockwise sweep (also staggered) and takes free-text for its center label — literally whatever you type, not a computed percentage.

### Conversation (chat bubbles)

Also new: two speakers, each with a name, an uploaded avatar, and independent bubble/text colors, plus a message script you build as a list of speaker-tagged lines. Messages reveal in sequence with a toggleable typing indicator (bouncing dots) whose duration is independently configurable; newest bubble anchors near the bottom and older ones scroll out of frame once the conversation outgrows the canvas, the way a real chat auto-scrolls.

### Known gaps

- **ffmpeg wasn't installed in the sandbox this was built in**, so actual video encoding is untested end-to-end — the frame-capture → upload pipeline is verified (a 10s/30fps/1080×1080 export renders and uploads all 300 frames in ~12s, well inside the spec's 60s budget), and the missing-binary path is verified to surface the intended clear error. Encoding itself is a straightforward `spawn("ffmpeg", args)` with args matching the spec's table exactly (`server/ffmpeg.ts`, `src/shared/exportFormats.ts`).
- **Image flicker's optional per-image duration override** isn't implemented — interval + order + transition + fit are.
- **Export quality/bitrate control, trim in/out points, batch export, and custom resolution scaling** were explicitly requested but then de-scoped in favor of "more control over the animations themselves" — not built.
- The bundle is ~585KB minified (mostly opentype.js + flubber). Fine for a local dev-server app; would be worth code-splitting per animation module if this ever needs to ship over a network.

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

Every phase — including the second round of feature requests (multi-font, image field carousel/grid/aspect-ratio, text animation, chart, chat) — was checked with `tsc -b`, `vite build`, `oxlint`, and a headless-Chromium (Playwright) pass driving the actual UI: uploading real images/fonts, scrubbing the timeline, screenshotting each animation type mid-motion, and round-tripping saves/loads through the sidecar — rather than just reading the code back. Notably this caught one real bug during phase 3 (the preview's rAF loop had captured a stale `scene` closure at mount, so parameter edits stopped applying once you hit play), which is fixed in `src/components/CanvasPreview.tsx` via a `sceneRef`.
