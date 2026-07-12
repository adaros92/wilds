import sharp from "sharp";
import { readFile, writeFile, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const photosPath = join(__dirname, "..", "src", "data", "photos.json");
const outDir = join("/Users/adamsrosales/Desktop", "wilds-thumbs");
const thumbSize = process.argv[2] ? parseInt(process.argv[2], 10) : null;
const quality = parseInt(process.argv[3] || "60", 10);

await mkdir(outDir, { recursive: true });

const photos = JSON.parse(await readFile(photosPath, "utf-8"));

for (const photo of photos) {
  const res = await fetch(photo.src);
  if (!res.ok) {
    console.error(`Failed to fetch #${photo.id}: ${res.status}`);
    continue;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  let pipeline = sharp(buffer);
  if (thumbSize) {
    pipeline = pipeline.resize({ width: thumbSize, height: thumbSize, fit: "inside" });
  }
  const thumb = await pipeline.avif({ quality }).toFile(join(outDir, `${photo.id}.avif`));

  // Update dimensions in photos.json
  photo.width = thumb.width;
  photo.height = thumb.height;

  console.log(`#${photo.id} → ${thumb.width}x${thumb.height} (${(thumb.size / 1024).toFixed(0)} KB)`);
}

await writeFile(photosPath, JSON.stringify(photos, null, 2) + "\n");
console.log(`\nDone! Thumbnails saved to ${outDir}`);
console.log("photos.json updated with new dimensions.");
