// Renders one PNG per marketing/linkedin/posts/*.md `image:` spec into
// marketing/linkedin/rendered/ (gitignored). Usage:
//   node scripts/render-linkedin-cards.mjs
import { readdir, readFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderCard } from "../marketing/linkedin/templates/post-card.svg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const postsDir = path.join(root, "marketing", "linkedin", "posts");
const outDir = path.join(root, "marketing", "linkedin", "rendered");

await mkdir(outDir, { recursive: true });

const files = (await readdir(postsDir)).filter((f) => f.endsWith(".md")).sort();
if (files.length === 0) {
  console.error(`No post files found in ${postsDir}`);
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const md = await readFile(path.join(postsDir, file), "utf8");
  const match = md.match(/^image:\s*(\{.*\})\s*$/m);
  if (!match) {
    console.warn(`SKIP ${file} — no image: line`);
    continue;
  }
  try {
    const spec = JSON.parse(match[1]);
    const svg = renderCard(spec);
    const outFile = path.join(outDir, file.replace(/\.md$/, ".png"));
    await sharp(Buffer.from(svg)).png().toFile(outFile);
    const { size } = await stat(outFile);
    const dims = spec.wide ? "1200x627" : "1200x1200";
    console.log(`OK ${path.basename(outFile)} ${dims} ${(size / 1024).toFixed(1)} KB`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${file}: ${err.message}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
