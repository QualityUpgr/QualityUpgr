# QualityUpgr

A photo enhancement tool that runs in the browser. Your photo is never uploaded
anywhere to be enhanced.

**Live product logic:** all image processing happens client-side in
`index.html`. The only server-side piece is a small Early Access waitlist API
(see below) — your photos never touch it.

## What it does today

- **Measures the photo first.** Before anything is changed, the image is
  analysed for brightness, contrast, colour, noise level, sharpness and JPEG
  block artefacts. Everything the pipeline does afterwards is scaled from
  those measurements — there are no fixed contrast/saturation/sharpening
  constants applied to every photo.
- **AI super-resolution at 2× and 4×.** ESRGAN-Slim via UpscalerJS and
  TensorFlow.js, downloaded on demand and run locally. Each factor has its own
  model, so 4× is a single 4× pass, not 2× twice, and choosing 2× never
  downloads the 4× weights.
- **Adaptive, halo-limited sharpening.** Luma-only unsharp masking with a
  noise gate and an overshoot clamp against the local 3×3 range. A photo that
  measures as already sharp gets almost none; a noisy one gets less still.
- **Colour preservation.** Sharpening and tone work on luminance only; the
  chroma differences are carried through untouched, so hue cannot rotate and
  colours cannot go neon. Saturation is never boosted for its own sake.
- **Three modes** — Natural, Balanced, Detail — that differ in the actual
  algorithm (base strength, whether a mid-scale pass runs, halo budget, noise
  gate, how strongly flat areas are protected), not just in constants.
- **Quality control before you see the result.** The plan is dry-run on a
  downsampled proxy and checked for brightness drift, colour shift and new
  clipping. If it misbehaves it is softened, and if it still misbehaves it is
  dropped. The finished image is verified against the original again, and any
  residual brightness drift is corrected with a gamma curve (which holds black
  at black and white at white) rather than a brightness offset.
- **Honest fallbacks.** No WebGL, no model, a failed GPU run, or an image too
  large for a CPU pass all fall back to high-quality stepped resampling. The
  result always says which engine actually ran.
- **Format preserved.** PNG stays PNG and keeps transparency (the alpha
  channel is resampled separately, since the model works on RGB only); JPEG
  and WebP are re-encoded at a high quality factor.
- **Before/after comparison** with a draggable slider (mouse, touch, keyboard).

## What it does not do yet

- **Video enhancement** — marked "in development" in the UI rather than faked.
- **Google sign-in / accounts** — deliberately left out of this version.
- **Denoising** — noise is detected and used to hold enhancement back, but
  nothing removes it. A denoising model would be a large download for a
  modest, risky gain.

The AI model reconstructs plausible detail; it does not recover information
that was never captured. On screenshots, text and line art it is weaker than
on photographs, which is what it was trained on.

## Limits

| | |
|---|---|
| Input formats | JPG, PNG, WEBP |
| Max file size | 20 MB |
| Longest input side | 4000 px |
| Max output | ~32 MP desktop, ~16 MP on iPhone/iPad, ~20 MP on low-memory devices |
| Upscale factors | 1×, 2×, 4× (device-dependent; unavailable factors are disabled in the UI) |

The ceiling is the browser's own canvas limit plus the RGBA buffer the
pipeline has to hold, which is why it is lower on iOS.

## Running it

No build step. Open `index.html` in any modern browser, or serve the folder:

```bash
npx serve .
```

## Tests

Offline tests for the enhancement engine live in `tools/` and need only Node
(plus numpy and Pillow to regenerate the fixtures). They read the code under
test straight out of `index.html`. See `tools/README.md`.

```bash
python3 tools/make_tests.py
node tools/unit-test.js
node tools/core-test.js
node tools/pipeline-test.js
```

They cover the numeric core and the pipeline orchestration. They do not cover
WebGL, the TensorFlow.js runtime, model downloads, or real-browser rendering.

## Early Access (pricing, no real payments yet)

The site shows real pricing (Creator $7.99/mo, Pro $14.99/mo) with a **Join
Early Access** flow instead of a checkout — no payment is taken. See
`api/early-access.js` and `.env.example` for the backend and required
environment variables.

## Deploying (e.g. GitHub Pages)

1. Push this repo to GitHub.
2. In the repo settings, enable **GitHub Pages** for the `main` branch, root folder.
3. The site will be served directly from `index.html`.

The Early Access API needs a host that runs serverless functions (Vercel);
GitHub Pages serves the static site only.

## Tech

Plain HTML/CSS/JavaScript. No frameworks, no build tools. Runtime dependencies
are loaded from a CDN only when 2× or 4× is used, at pinned versions:

| Package | Version | Why pinned |
|---|---|---|
| `@tensorflow/tfjs` | 4.11.0 | UpscalerJS's model packages declare `~4.11.0`; tfjs has since moved to 4.22.x |
| `upscaler` | 1.0.0-beta.19 | matches the model packages |
| `@upscalerjs/esrgan-slim` | 1.0.0-beta.12 | latest published; MIT |

Loading `@latest` for these instead puts a model built against tfjs 4.11 on top
of a runtime several minor versions ahead, which is a known source of model
load failures. Google Fonts (Fraunces, Inter) is the only other external
request.

## License

MIT — see `LICENSE`.
