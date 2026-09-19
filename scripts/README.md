# Scripts

## How images are served

Two tiers, and the split matters for performance:

| | file | used by | sized |
|---|---|---|---|
| Master | `<id>.avif` | lightbox, on click | full resolution, never downscaled |
| Thumbnail | `thumbs/<id>.avif` | the grid | exactly what its cell needs at DPR 2 |

The grid used to serve masters, which is what made scrolling stutter. Decode
cost scales with **megapixels, not bytes** — a 148 MP panorama blocks ~1s even
at 553 KB. Across 85 photos that was ~698 MP, roughly 2.8 GB of decoded bitmap,
far more than a browser holds, so it re-decoded constantly while scrolling.
Thumbnails cut that to ~113 MP.

`src/data/photos.json` wires it up: `thumbnail` → grid, `src` → lightbox.

> `width` and `height` in `photos.json` are **grid layout directives, not file
> metadata**. `PhotoCard.astro` does `isPortrait = height > width` to decide
> whether a cell spans two rows. `857x1200` means "give this a portrait slot" —
> it does not describe the file. Never overwrite them with real file dimensions.

## grid-geometry.mjs

Single source of truth for thumbnail sizing, imported by both generators so they
cannot drift. Mirrors `.photo-grid` in `src/styles/global.css`:

```
square    465 x 465 CSS px
portrait  465 x 932 CSS px   (grid-row: span 2)
wide      932 x 465 CSS px   (grid-column: span 2)
```

The grid is capped at `max-width: 1400px`, so cells are a fixed CSS size no
matter how large the display — DPR 2 is the real ceiling and a 4K monitor cannot
resolve more. If the grid CSS changes, change the constants here and regenerate.

## to-avif.mjs

Converts a folder of images to AVIF, producing a full-resolution master plus a
correctly-sized grid thumbnail.

```bash
node scripts/to-avif.mjs <input-dir> [output-dir] [quality] [--wide]
```

- `input-dir` — folder of images (required). `.jpeg .jpg .png .tiff .webp`
- `output-dir` — default `<input-dir>/avif/`
- `quality` — 0–100, default 62
- `--wide` — these photos get a 2-column grid slot

Portrait vs square is inferred per-file from the image's own orientation, which
matches every entry in the current `photos.json`. `--wide` must be stated
because spanning two columns is a layout choice, not a property of the file.

```
<output-dir>/
  86.avif          # master, full resolution -> bucket root
  thumbs/
    86.avif        # grid thumbnail          -> thumbs/ prefix
```

## make-grid-thumbs.mjs

Regenerates thumbnails for **every** photo already in `photos.json`, pulling
each master from R2. Use after changing the grid CSS or the geometry constants.

```bash
node scripts/make-grid-thumbs.mjs [quality] [--sample]
```

Writes to `~/Desktop/wilds-grid-thumbs/`. `--sample` does five representative
images so you can check sizes before committing to a full run. Does not modify
`photos.json` or touch masters.

## use-grid-thumbs.mjs

Points `photos.json` `thumbnail` at `thumbs/<id>.avif`, leaving `src`, `width`,
and `height` alone. Refuses to write unless all thumbnails are reachable, so the
grid cannot be pointed at files that were never uploaded.

```bash
node scripts/use-grid-thumbs.mjs --dry
node scripts/use-grid-thumbs.mjs
```

## set-image-origin.mjs

Rewrites the origin on `src`/`thumbnail`. Used to move off the `pub-*.r2.dev`
endpoint, which is rate-limited, serves HTTP/1.1, and cannot be CDN-cached.

```bash
node scripts/set-image-origin.mjs https://img.adamsrosales.com --dry
```

## Adding new photos

```bash
node scripts/to-avif.mjs ~/Desktop/new-photos      # add --wide for panoramas
# upload avif/*.avif       -> bucket root
# upload avif/thumbs/*.avif -> thumbs/
# add entries to photos.json: src -> master, thumbnail -> thumbs/, and pick
#   width/height to choose the grid slot you want
npm run build
```

## add-dimensions.mjs / regen-thumbs.mjs

Older helpers. `regen-thumbs.mjs` writes real file dimensions back into
`photos.json`, which will **clobber your grid layout** — see the warning above.
Prefer `make-grid-thumbs.mjs`.
