// Point the grid at thumbs/ while the lightbox keeps the full-resolution master.
//
//   thumbnail -> <origin>/thumbs/<id>.avif   sized for the grid cell at DPR 2
//   src       -> <origin>/<id>.avif          untouched master, full resolution
//
// Only `thumbnail` is rewritten. `src`, `width`, and `height` are left alone —
// width/height are grid layout directives (PhotoCard.astro: isPortrait =
// height > width), not file metadata.
//
// Refuses to write unless every thumbnail is actually reachable, so the grid
// cannot be pointed at files that have not been uploaded yet.
//
// Usage: node scripts/use-grid-thumbs.mjs [--dry] [--force]

import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const photosPath = join(__dirname, "..", "src", "data", "photos.json");

const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");

const photos = JSON.parse(await readFile(photosPath, "utf-8"));

function thumbUrl(photo) {
  const url = new URL(photo.src);
  const id = url.pathname.replace(/^\//, "").replace(/\.avif$/, "");
  return `${url.origin}/thumbs/${id}.avif`;
}

console.log(`checking ${photos.length} thumbnails are live...`);

const missing = [];
const sizes = [];
await Promise.all(
  photos.map(async (photo) => {
    const url = thumbUrl(photo);
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) return void missing.push(`#${photo.id} (${res.status})`);
      sizes.push(Number(res.headers.get("content-length")) || 0);
    } catch (err) {
      missing.push(`#${photo.id} (${err.code || "fetch failed"})`);
    }
  })
);

if (missing.length) {
  console.error(`\n${missing.length} not reachable: ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? " ..." : ""}`);
  if (!force) {
    console.error("\nUpload the thumbnails to R2 under thumbs/ first.");
    console.error("Re-run with --force only if you know these will exist before deploy.");
    process.exit(1);
  }
  console.error("--force: continuing anyway.\n");
}

const total = sizes.reduce((a, b) => a + b, 0);
console.log(`  ${sizes.length}/${photos.length} live, ${(total / 1048576).toFixed(1)} MB total\n`);

let changed = 0;
for (const photo of photos) {
  const next = thumbUrl(photo);
  if (photo.thumbnail === next) continue;
  photo.thumbnail = next;
  changed++;
}

const s = photos[0];
console.log(`sample #${s.id}`);
console.log(`  thumbnail  ${s.thumbnail}   <- grid`);
console.log(`  src        ${s.src}   <- lightbox, untouched`);
console.log(`  width/height ${s.width}x${s.height}   <- untouched`);
console.log(`\nfields to rewrite: ${changed}`);

if (dry) {
  console.log("\n--dry: no files written.");
  process.exit(0);
}
if (changed === 0) {
  console.log("\nAlready pointing at thumbs/. Nothing to do.");
  process.exit(0);
}

await writeFile(photosPath, JSON.stringify(photos, null, 2) + "\n");
console.log(`\nWrote ${photosPath}`);
