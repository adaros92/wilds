// Generate grid thumbnails sized to exactly what each cell needs on a 4K screen.
//
// The gallery serves full-resolution masters into the grid. Decode cost scales
// with megapixels, not bytes, so a 148 MP panorama blocks ~1s even though it is
// only 553 KB. Across 85 photos that is ~698 MP / ~2.8 GB of decoded bitmap,
// far more than a browser will hold, so it re-decodes constantly while scrolling.
//
// The grid is capped at max-width 1400px (global.css), so cells are a fixed size
// no matter how large the display:
//     square   465 x 465 CSS px
//     portrait 465 x 932 CSS px  (grid-row: span 2)
//     wide     932 x 465 CSS px  (grid-column: span 2)
// At DPR 2 that is the ceiling a 4K monitor can actually resolve. Each thumbnail
// is generated at the scale object-fit: cover needs for its own cell, full frame
// preserved and never upscaled.
//
// Masters are NOT touched. They stay full resolution for the lightbox.
// photos.json is NOT touched — point `thumbnail` at these separately.
//
// Usage: node scripts/make-grid-thumbs.mjs [quality] [--sample]

import sharp from "sharp";
import { readFile, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir } from "os";
import { cellSize, thumbResizeOptions, slotFromPhoto, DPR } from "./grid-geometry.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const photosPath = join(__dirname, "..", "src", "data", "photos.json");
const outDir = join(homedir(), "Desktop", "wilds-grid-thumbs");

const quality = parseInt(process.argv[2] || "62", 10);
const sample = process.argv.includes("--sample");

await mkdir(outDir, { recursive: true });
const photos = JSON.parse(await readFile(photosPath, "utf-8"));

const targets = sample ? photos.filter((p) => ["81", "83", "67", "52", "3"].includes(p.id)) : photos;

let srcMP = 0;
let outMP = 0;
let outBytes = 0;

console.log(`quality ${quality}, DPR ${DPR}${sample ? "  [SAMPLE]" : ""}\n`);

for (const photo of targets) {
  const res = await fetch(photo.src);
  if (!res.ok) {
    console.error(`! #${photo.id} ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const slot = slotFromPhoto(photo);
  const cell = cellSize(slot);
  const box = thumbResizeOptions(meta, slot);

  const t = process.hrtime.bigint();
  const out = await sharp(buf).resize(box).avif({ quality }).toFile(join(outDir, `${photo.id}.avif`));
  const encodeMs = Number(process.hrtime.bigint() - t) / 1e6;

  const sMP = (meta.width * meta.height) / 1e6;
  const oMP = (out.width * out.height) / 1e6;
  srcMP += sMP;
  outMP += oMP;
  outBytes += out.size;

  const upscaleNote = out.width < box.width ? "  (master smaller than cell — left native)" : "";
  console.log(
    `#${photo.id.padStart(2)} ${cell.type.padEnd(8)} ` +
      `${String(meta.width + "x" + meta.height).padEnd(12)} ${sMP.toFixed(1).padStart(5)} MP  ->  ` +
      `${String(out.width + "x" + out.height).padEnd(11)} ${oMP.toFixed(1).padStart(4)} MP  ` +
      `${(out.size / 1024).toFixed(0).padStart(4)} KB  [${encodeMs.toFixed(0)}ms]${upscaleNote}`
  );
}

console.log(
  `\n${targets.length} images:  ${srcMP.toFixed(0)} MP -> ${outMP.toFixed(0)} MP ` +
    `(${(srcMP / outMP).toFixed(1)}x less decode),  ${(outBytes / 1048576).toFixed(1)} MB total`
);
console.log(`Files: ${outDir}`);
if (!sample) {
  console.log("\nUpload to R2 under thumbs/, then point photos.json `thumbnail` at them.");
  console.log("Masters at the bucket root are untouched and stay the lightbox source.");
}
