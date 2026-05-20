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
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
