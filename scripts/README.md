# Scripts

## to-avif.mjs

Converts all images in a folder to AVIF format using sharp. Generates both full-size and 600px square thumbnails.

### Usage

```bash
node scripts/to-avif.mjs <input-dir> [output-dir] [quality] [thumb-size]
```

- `input-dir` — folder containing images (required)
- `output-dir` — where to save AVIF files (default: `<input-dir>/avif/`)
- `quality` — 0-100, lower = smaller file size (default: 60)
- `thumb-size` — thumbnail width/height in px (default: 600)

### Output structure

```
<output-dir>/
  1.avif          # full-size
  2.avif
  thumbs/
    1.avif        # 600x600 cropped thumbnail
    2.avif
```

### Supported input formats

`.jpeg`, `.jpg`, `.png`, `.tiff`, `.webp`

### Examples

```bash
# Convert all images in Downloads
node scripts/to-avif.mjs ~/Downloads

# Specify a custom output directory
node scripts/to-avif.mjs ~/Downloads ~/photos/avif

# Lower quality for smaller files
node scripts/to-avif.mjs ~/Downloads ~/photos/avif 45

# Custom thumbnail size (800px)
node scripts/to-avif.mjs ~/Downloads ~/photos/avif 60 800
```
