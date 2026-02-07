import sharp from "sharp";
import { readdir, stat } from "fs/promises";
import { join, basename, extname } from "path";

const srcDir = process.argv[2];
const outDir = process.argv[3] || join(srcDir, "avif");
const quality = parseInt(process.argv[4] || "60", 10);

if (!srcDir) {
  console.error("Usage: node to-avif.mjs <input-dir> [output-dir] [quality]");
  console.error("  quality: 0-100, default 60");
  process.exit(1);
}

await import("fs").then((fs) => fs.mkdirSync(outDir, { recursive: true }));

const exts = new Set([".jpeg", ".jpg", ".png", ".tiff", ".webp"]);
const files = (await readdir(srcDir)).filter((f) => exts.has(extname(f).toLowerCase()));

if (files.length === 0) {
  console.error(`No image files found in ${srcDir}`);
  process.exit(1);
}

for (const file of files) {
  const input = join(srcDir, file);
  const name = basename(file, extname(file));
  const output = join(outDir, `${name}.avif`);
  const info = await sharp(input).avif({ quality }).toFile(output);
  const orig = (await stat(input)).size;
  const pct = ((1 - info.size / orig) * 100).toFixed(0);
  console.log(`${file} → ${name}.avif  (${(orig / 1024).toFixed(0)} KB → ${(info.size / 1024).toFixed(0)} KB, ${pct}% smaller)`);
}
