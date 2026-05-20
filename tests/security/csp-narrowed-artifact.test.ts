// E39 Phase B — production artifact contract.
//
// `public/_headers` is the source template (still carries
// `'unsafe-inline'` in script-src as a safety fallback). The post-build
// step `scripts/extract-csp-hashes.mjs` narrows the deployed copy at
// `dist/client/_headers` by computing SHA-256 hashes of every inline
// script in the emitted HTML and replacing `'unsafe-inline'` with the
// hash set.
//
// This spec locks the SHAPE of that narrowed artifact. It skips
// gracefully when `dist/client/_headers` is missing (e.g. tests
// running without a prior `npm run build`), so CI's lint-only PR
// checks aren't penalised. In the full deploy pipeline, `npm run
// build` runs before `npm test`, so the artifact will exist and the
// assertions run.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  extractInlineScripts,
  computeScriptHashes,
  // @ts-expect-error — .mjs without declaration; runtime import is fine.
} from "../../scripts/extract-csp-hashes.mjs";

const ARTIFACT_PATH = resolve(process.cwd(), "dist/client/_headers");
const ARTIFACT_EXISTS = existsSync(ARTIFACT_PATH);

function findHeader(text: string, name: string): string | null {
  const lower = name.toLowerCase();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx < 1) continue;
    if (line.slice(0, colonIdx).trim().toLowerCase() === lower) {
      return line.slice(colonIdx + 1).trim();
    }
  }
  return null;
}

function getScriptSrcSources(csp: string): string[] {
  const match = csp.match(/script-src\s+([^;]+)/i);
  if (!match) return [];
  return match[1].trim().split(/\s+/);
}

describe.skipIf(!ARTIFACT_EXISTS)("dist/client/_headers — Phase B narrowed CSP artifact", () => {
  const text = ARTIFACT_EXISTS ? readFileSync(ARTIFACT_PATH, "utf8") : "";
  const csp = findHeader(text, "Content-Security-Policy") ?? "";
  const scriptSources = getScriptSrcSources(csp);

  it("declares a Content-Security-Policy header", () => {
    expect(csp).not.toBe("");
  });

  it("script-src does NOT contain 'unsafe-inline'", () => {
    expect(scriptSources).not.toContain("'unsafe-inline'");
  });

  it("script-src contains at least one 'sha256-…' source", () => {
    const hashes = scriptSources.filter((s) => /^'sha256-[A-Za-z0-9+/]+=*'$/.test(s));
    expect(hashes.length).toBeGreaterThan(0);
  });

  it("style-src still contains 'unsafe-inline' (Tailwind v4 / Radix dynamic styles)", () => {
    // Phase B narrows script-src only. Phase C will tackle style-src.
    const styleMatch = csp.match(/style-src\s+([^;]+)/i);
    expect(styleMatch?.[1] ?? "").toContain("'unsafe-inline'");
  });

  it("retains report-uri /api/csp-report (Phase A reporter is still wired)", () => {
    expect(csp).toContain("report-uri /api/csp-report");
  });

  // Hash integrity: re-walk dist/client/**.html, recompute hashes
  // from scratch, and assert every hash is present in script-src.
  // This catches:
  //   - regex drift between extract-csp-hashes.mjs and reality
  //   - manual edits to _headers that delete a legitimate hash
  //   - a second run of extract-csp-hashes producing different output
  //     (i.e. non-idempotent — should never happen)
  it("script-src contains a 'sha256-…' for every inline script in dist/client/**.html", () => {
    function findHtmlFiles(dir: string): string[] {
      const out: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const s = statSync(full);
        if (s.isDirectory()) out.push(...findHtmlFiles(full));
        else if (entry.endsWith(".html")) out.push(full);
      }
      return out;
    }

    const distDir = resolve(process.cwd(), "dist/client");
    const htmlFiles = findHtmlFiles(distDir);
    const allBodies: string[] = [];
    for (const file of htmlFiles) {
      allBodies.push(...extractInlineScripts(readFileSync(file, "utf8")));
    }
    const expectedHashes = computeScriptHashes(allBodies);
    for (const hash of expectedHashes) {
      expect(
        scriptSources,
        `script-src must include ${hash} for an inline script found in dist/client/**.html`,
      ).toContain(hash);
    }
  });
});

// Sanity: when the artifact is missing we still emit a passing placeholder
// test so the test output explicitly says "Phase B artifact not built".
describe.skipIf(ARTIFACT_EXISTS)(
  "dist/client/_headers — Phase B narrowed CSP artifact (skipped)",
  () => {
    it("skipped: run `npm run build` to generate dist/client/_headers", () => {
      expect(ARTIFACT_EXISTS).toBe(false);
    });
  },
);
