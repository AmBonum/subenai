#!/usr/bin/env node
// E31 — rasterize public/og-default.svg → public/og-default.png at
// build time. Facebook + LinkedIn + X (Twitter) only render
// PNG/JPEG/GIF for og:image — SVG is rejected or text-falls-back.
// Ship the raster too.
//
// Runs as part of `npm run build` (also exposed as `npm run og-default`
// for one-off regeneration). Output is checked into git so dev
// environments without sharp's libvips dep can still serve the asset.
//
// Output spec: 1200×630 PNG at the Facebook/Twitter recommended size,
// quality optimized for ~150KB on disk (well under FB's 8MB limit but
// crisp enough at 600px-wide previews).

import sharp from "sharp";
import { writeFile, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SVG_PATH = resolve(ROOT, "public/og-default.svg");
const PNG_PATH = resolve(ROOT, "public/og-default.png");

async function main() {
  let svgBuffer;
  try {
    svgBuffer = await readFile(SVG_PATH);
  } catch (err) {
    console.error(`[og-default] Source SVG not found at ${SVG_PATH}: ${err.message}`);
    process.exit(1);
  }

  // density 144 gives a crisper raster than sharp's default 72 for
  // text-heavy SVGs; the explicit width pin ensures 1200×630 regardless
  // of SVG viewBox interpretation across sharp versions.
  const png = await sharp(svgBuffer, { density: 144 })
    .resize(1200, 630, { fit: "fill" })
    .png({ compressionLevel: 9, quality: 90 })
    .toBuffer();

  await writeFile(PNG_PATH, png);
  const { size } = await stat(PNG_PATH);
  const kb = (size / 1024).toFixed(1);
  console.log(`og-default.png written: 1200×630, ${kb} KB`);
}

await main();
