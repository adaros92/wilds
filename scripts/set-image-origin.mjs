// Point photos.json at a different image origin.
//
// The r2.dev public endpoint is rate-limited, serves HTTP/1.1, and cannot be
// cached by Cloudflare — every request goes to bucket origin. Binding a custom
// domain to the bucket fixes all three; this swaps the URLs over to it.
//
// Only the `src` and `thumbnail` origins change. Every other field is left
// exactly as-is — `width`/`height` in particular are grid layout directives
// (see PhotoCard.astro: isPortrait = height > width), not file metadata.
//
// Usage: node scripts/set-image-origin.mjs <new-origin> [--dry]
//   node scripts/set-image-origin.mjs https://img.adamsrosales.com --dry
//   node scripts/set-image-origin.mjs https://img.adamsrosales.com

import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const photosPath = join(__dirname, "..", "src", "data", "photos.json");

const raw = process.argv[2];
const dry = process.argv.includes("--dry");

if (!raw) {
  console.error("Usage: node scripts/set-image-origin.mjs <new-origin> [--dry]");
  console.error("  e.g. node scripts/set-image-origin.mjs https://img.adamsrosales.com");
  process.exit(1);
}

let origin;
try {
  origin = new URL(raw).origin;
} catch {
  console.error(`Not a valid URL: ${raw}`);
  process.exit(1);
}

const text = await readFile(photosPath, "utf-8");
const photos = JSON.parse(text);

const fields = ["src", "thumbnail"];
const seen = new Set();
let changed = 0;

for (const photo of photos) {
  for (const field of fields) {
    const value = photo[field];
    if (typeof value !== "string") continue;

    let url;
    try {
      url = new URL(value);
    } catch {
      console.error(`! #${photo.id} ${field}: not a URL, skipped (${value})`);
      continue;
    }

    seen.add(url.origin);
    if (url.origin === origin) continue;

    url.protocol = new URL(origin).protocol;
    url.host = new URL(origin).host;
    photo[field] = url.toString();
    changed++;
  }
}

console.log(`origins found: ${[...seen].join(", ") || "none"}`);
console.log(`target origin: ${origin}`);
console.log(`fields to rewrite: ${changed}`);

if (changed === 0) {
  console.log("\nNothing to do — already pointing at the target origin.");
  process.exit(0);
}

// Show a sample so the change is visible before it lands.
const sample = photos[0];
console.log(`\nsample: #${sample.id}`);
console.log(`  src       ${sample.src}`);
console.log(`  thumbnail ${sample.thumbnail}`);
console.log(`  width/height untouched: ${sample.width}x${sample.height}`);

if (dry) {
  console.log("\n--dry: no files written.");
  process.exit(0);
}

await writeFile(photosPath, JSON.stringify(photos, null, 2) + "\n");
console.log(`\nWrote ${photosPath}`);
console.log("Verify with: git diff --stat src/data/photos.json");
