#!/usr/bin/env node
// Build-time changelog parser. Reads CHANGELOG.md (Keep a Changelog 1.1
// format) and writes a typed JSON snapshot to
// src/content/changelog.generated.json that the /changelog route imports.
//
// Run via `npm run changelog` or as part of `npm run build`.
//
// Format we accept (whitespace-tolerant):
//
//   ## [VERSION] — YYYY-MM-DD     ← released entry
//   ## [Unreleased]                ← skipped
//   ### Added | Changed | Fixed | Removed | Deprecated | Security
//   - bullet item

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "CHANGELOG.md");
const OUT = resolve(ROOT, "src/content/changelog.generated.json");

// Section heading aliases — both English (Keep a Changelog spec) and Slovak
// (the actual flavour we publish). Lookup is case-insensitive on `s`.
const SECTION_ALIASES = {
  added: "added",
  pridané: "added",
  changed: "changed",
  zmenené: "changed",
  fixed: "fixed",
  opravené: "fixed",
  removed: "removed",
  odstránené: "removed",
  deprecated: "deprecated",
  zastarané: "deprecated",
  security: "security",
  bezpečnosť: "security",
};

export function parseChangelog(markdown) {
  const lines = markdown.split(/\r?\n/);
  const versions = [];
  let current = null;
  let currentSection = null;

  for (const raw of lines) {
    const line = raw.trimEnd();

    const versionMatch = line.match(
      /^##\s+\[(?<v>[^\]]+)\](?:\s+[-—–]\s+(?<d>\d{4}-\d{2}-\d{2}))?\s*$/,
    );
    if (versionMatch) {
      const version = versionMatch.groups.v.trim();
      const date = versionMatch.groups.d?.trim() ?? null;
      if (version.toLowerCase() === "unreleased") {
        current = null;
        currentSection = null;
        continue;
      }
      if (!date) {
        throw new Error(`changelog parse: version "${version}" has no date`);
      }
      current = {
        version,
        date,
        added: [],
        changed: [],
        fixed: [],
        removed: [],
        deprecated: [],
        security: [],
      };
      versions.push(current);
      currentSection = null;
      continue;
    }

    const sectionMatch = line.match(/^###\s+(?<s>\S+)\s*$/);
    if (sectionMatch) {
      const key = SECTION_ALIASES[sectionMatch.groups.s.toLowerCase()];
      currentSection = key && current ? key : null;
      continue;
    }

    const bulletMatch = line.match(/^-\s+(?<t>.+?)\s*$/);
    if (bulletMatch && current && currentSection) {
      current[currentSection].push(bulletMatch.groups.t);
    }
  }

  return versions;
}

async function main() {
  const md = await readFile(SRC, "utf8");
  const versions = parseChangelog(md);
  if (versions.length === 0) {
    throw new Error("changelog parse: no released versions found in CHANGELOG.md");
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(versions, null, 2) + "\n", "utf8");
  console.log(`Changelog parsed: ${versions.length} versions → ${OUT.replace(ROOT + "/", "")}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
