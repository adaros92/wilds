import sharp from "sharp";
import { readdir, stat } from "fs/promises";
import { join, basename, extname } from "path";
import { cellSize, thumbResizeOptions, DPR } from "./grid-geometry.mjs";

const srcDir = process.argv[2];
const quality = parseInt(process.argv[4] || "62", 10);

// Which grid slot these photos will occupy. Portrait is inferred per-file from
// the image itself; --wide must be stated because spanning 2 columns is a
// deliberate layout choice, not a property of the file.
const wide = process.argv.includes("--wide");

if (!srcDir) {
  console.error("Usage: node to-avif.mjs <input-dir> [output-dir] [quality] [--wide]");
  console.error("  quality:  0-100, default 62");
  console.error("  --wide:   these photos get a 2-column grid slot");
  console.error("");
  console.error("Thumbnails are sized from scripts/grid-geometry.mjs so they match");
  console.error("what make-grid-thumbs.mjs produces. Do not pass a thumb size.");
  process.exit(1);
}

const outDir = process.argv[3] || join(srcDir, "avif");

const fs = await import("fs");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(join(outDir, "thumbs"), { recursive: true });

const exts = new Set([".jpeg", ".jpg", ".png", ".tiff", ".webp"]);
const files = (await readdir(srcDir)).filter((f) => exts.has(extname(f).toLowerCase()));

if (files.length === 0) {
  console.error(`No image files found in ${srcDir}`);
  process.exit(1);
}

for (const file of files) {
  const input = join(srcDir, file);
  const name = basename(file, extname(file));
  const orig = (await stat(input)).size;

  // Full-size AVIF — the master. Full resolution, never downscaled; this is
  // what the lightbox opens.
  const full = await sharp(input).avif({ quality }).toFile(join(outDir, `${name}.avif`));
  const fullPct = ((1 - full.size / orig) * 100).toFixed(0);

  // Thumbnail AVIF — sized to exactly what its grid cell needs at DPR 2.
  // Decode cost scales with megapixels, so serving masters into the grid is
  // what made scrolling stutter; keep these small.
  const meta = await sharp(input).metadata();
  const slot = { portrait: meta.height > meta.width, wide };
  const cell = cellSize(slot);
  const thumb = await sharp(input)
    .resize(thumbResizeOptions(meta, slot))
    .avif({ quality })
    .toFile(join(outDir, "thumbs", `${name}.avif`));

  console.log(
    `${file} → full: ${full.width}x${full.height} ${(full.size / 1024).toFixed(0)} KB (${fullPct}% smaller)` +
      ` | thumb[${cell.type}]: ${thumb.width}x${thumb.height} ${(thumb.size / 1024).toFixed(0)} KB`
  );
}

console.log(`\nThumbnails sized for DPR ${DPR}. Upload masters to the bucket root`);
console.log(`and thumbs/ to the thumbs/ prefix, then add entries to photos.json.`);
