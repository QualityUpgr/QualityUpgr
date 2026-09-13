# QualityUpgr

A simple, honest tool for improving the quality of photos — right in your browser.

**Live product logic:** everything runs client-side in `index.html`. No backend, no uploads, no accounts (yet).

## What it actually does today

- **Photo enhancement**: real, local unsharp masking (approximated Gaussian blur + high-pass sharpening), plus contrast and saturation adjustment.
- **Upscaling**: real browser-native resampling, up to 2×. 4× is intentionally not offered — the quality didn't hold up.
- **Before/after comparison**: an interactive draggable slider (mouse, touch, and keyboard).
- **Download**: saves the actual processed file, not the original.
- **Privacy**: no file ever leaves the browser. There is no server component in this version.

## What it does not do yet

- **Video enhancement** — intentionally marked "in development" in the UI rather than faked. Needs a real local processing approach (e.g. WebCodecs or FFmpeg-WASM) that's been properly tested before it ships.
- **Google sign-in / accounts** — deliberately left out of this version.
- **AI super-resolution** — the current enhancement is classic image processing (sharpening/contrast/resampling), not a machine-learning model reconstructing detail. The UI copy says this explicitly; nothing here claims to be "AI magic."

## Running it

There's no build step. Open `index.html` in any modern browser (Chrome, Edge, Safari, or Firefox), or serve the folder with any static file server:

```bash
npx serve .
```

## Deploying (e.g. GitHub Pages)

1. Push this repo to GitHub.
2. In the repo settings, enable **GitHub Pages** for the `main` branch, root folder.
3. The site will be served directly from `index.html`.

## Tech

Plain HTML/CSS/JavaScript. No frameworks, no build tools, no external dependencies except the Google Fonts stylesheet (Fraunces, Inter) loaded at runtime.

## License

MIT — see `LICENSE`.
