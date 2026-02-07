import sharp from "sharp";
import { readdir, stat } from "fs/promises";
import { join, basename, extname } from "path";

const srcDir = process.argv[2];
const outDir = process.argv[3] || join(srcDir, "avif");
const quality = parseInt(process.argv[4] || "60", 10);
const thumbSize = parseInt(process.argv[5] || "600", 10);

if (!srcDir) {
  console.error("Usage: node to-avif.mjs <input-dir> [output-dir] [quality] [thumb-size]");
  console.error("  quality:    0-100, default 60");
  console.error("  thumb-size: thumbnail width/height in px, default 600");
  process.exit(1);
}

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

  // Full-size AVIF
  const full = await sharp(input).avif({ quality }).toFile(join(outDir, `${name}.avif`));
  const fullPct = ((1 - full.size / orig) * 100).toFixed(0);

  // Thumbnail AVIF
  const thumb = await sharp(input)
    .resize({ width: thumbSize, height: thumbSize, fit: "inside" })
    .avif({ quality })
    .toFile(join(outDir, "thumbs", `${name}.avif`));

  console.log(`${file} → full: ${(full.size / 1024).toFixed(0)} KB (${fullPct}% smaller) | thumb: ${(thumb.size / 1024).toFixed(0)} KB`);
}
