import sharp from "sharp";
import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const photosPath = join(__dirname, "..", "src", "data", "photos.json");

const photos = JSON.parse(await readFile(photosPath, "utf-8"));

for (const photo of photos) {
  if (photo.width && photo.height) {
    console.log(`#${photo.id} already has dimensions (${photo.width}x${photo.height}), skipping`);
    continue;
  }

  const res = await fetch(photo.thumbnail);
  if (!res.ok) {
    console.error(`Failed to fetch thumbnail for #${photo.id}: ${res.status}`);
    continue;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const metadata = await sharp(buffer).metadata();

  photo.width = metadata.width;
  photo.height = metadata.height;
  console.log(`#${photo.id} → ${metadata.width}x${metadata.height}`);
}

await writeFile(photosPath, JSON.stringify(photos, null, 2) + "\n");
console.log("Done! photos.json updated with dimensions.");
