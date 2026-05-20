// E39 Phase B — unit tests for the post-build CSP hash extractor.
//
// Locks the three pure functions in `scripts/extract-csp-hashes.mjs`.
// The CLI block at the bottom of that file is exercised by the build
// pipeline itself and verified by `tests/security/headers-contract.test.ts`
// reading the produced artifact (when `dist/client/_headers` exists).
//
// Why test these as units: the script is the only thing standing
// between us and shipping a broken CSP that white-screens the prod
// SPA. A regression in the regex (e.g. swallowing `<script src=…>`
// tags) would either produce a too-loose hash set (false sense of
// security) or strip valid inline scripts from the policy. Both
// fail closed in different ways.

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

import {
  extractInlineScripts,
  computeScriptHashes,
  narrowCsp,
  // @ts-expect-error — .mjs without declaration; runtime import is fine.
} from "../../scripts/extract-csp-hashes.mjs";

describe("extractInlineScripts", () => {
  it("returns inline script bodies in document order", () => {
    const html = `<html><head>
      <script>window.first = 1;</script>
      <script>window.second = 2;</script>
    </head></html>`;
    expect(extractInlineScripts(html)).toEqual(["window.first = 1;", "window.second = 2;"]);
  });

  it("skips <script src=…> external references", () => {
    const html = `<html>
      <script>inline-one</script>
      <script src="/assets/bundle.js"></script>
      <script type="module" src="/m.js"></script>
      <script>inline-two</script>
    </html>`;
    expect(extractInlineScripts(html)).toEqual(["inline-one", "inline-two"]);
  });

  it("keeps JSON-LD blocks (CSP applies to type=application/ld+json)", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org"}</script>`;
    expect(extractInlineScripts(html)).toEqual([`{"@context":"https://schema.org"}`]);
  });

  it("returns empty array when no inline scripts present", () => {
    expect(extractInlineScripts(`<html><body>no scripts</body></html>`)).toEqual([]);
  });

  it("preserves whitespace inside script bodies (CSP hashes the literal text)", () => {
    const html = `<script>
      a();
    </script>`;
    const [body] = extractInlineScripts(html);
    expect(body).toBe("\n      a();\n    ");
  });

  // CodeQL js/bad-tag-filter — a naive regex like `<\/script>` misses
  // `</script >` with trailing whitespace before the gt. jsdom is a
  // real WHATWG parser, so it handles every legal closing form.
  it("handles closing tags with trailing whitespace (</script >)", () => {
    expect(extractInlineScripts(`<script>x();</script >`)).toEqual(["x();"]);
  });

  it("handles mixed-case <SCRIPT> tags", () => {
    expect(extractInlineScripts(`<SCRIPT>y();</SCRIPT>`)).toEqual(["y();"]);
  });

  it("treats <script src=…> with text content as an external (text is irrelevant for CSP)", () => {
    // Per HTML spec, `<script src=…>some text</script>` ignores the
    // inline body — the browser fetches from src. We skip it entirely.
    const html = `<script src="/a.js">ignored body</script>`;
    expect(extractInlineScripts(html)).toEqual([]);
  });
});

describe("computeScriptHashes", () => {
  it("emits one CSP-formatted sha256 source per unique body", () => {
    const hashes = computeScriptHashes(["a();", "b();"]);
    expect(hashes).toHaveLength(2);
    for (const h of hashes) {
      expect(h).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/);
    }
  });

  it("dedupes identical bodies", () => {
    expect(computeScriptHashes(["x();", "x();", "x();"])).toHaveLength(1);
  });

  it("matches a hand-computed SHA-256 base64 for a known body", () => {
    const body = "window.dataLayer = window.dataLayer || [];";
    const expected = createHash("sha256").update(body, "utf8").digest("base64");
    expect(computeScriptHashes([body])).toEqual([`'sha256-${expected}'`]);
  });

  it("returns sorted output for diff stability", () => {
    const hashes = computeScriptHashes(["z();", "a();", "m();"]);
    const sorted = [...hashes].sort();
    expect(hashes).toEqual(sorted);
  });

  it("returns an empty array for empty input", () => {
    expect(computeScriptHashes([])).toEqual([]);
  });
});

describe("narrowCsp", () => {
  const headers = [
    "/*",
    "  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'",
    "  X-Frame-Options: DENY",
    "",
  ].join("\n");

  it("replaces 'unsafe-inline' with the given hashes in script-src only", () => {
    const out = narrowCsp(headers, ["'sha256-AAA'", "'sha256-BBB'"]);
    // script-src no longer contains 'unsafe-inline', hashes present.
    expect(out).toMatch(/script-src 'self' 'sha256-AAA' 'sha256-BBB' https:\/\/js\.stripe\.com/);
    expect(out).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("leaves style-src 'unsafe-inline' alone (Tailwind v4 / Radix need it)", () => {
    const out = narrowCsp(headers, ["'sha256-AAA'"]);
    expect(out).toMatch(/style-src 'self' 'unsafe-inline'/);
  });

  it("throws when given an empty hash set (refuses to break inline scripts)", () => {
    expect(() => narrowCsp(headers, [])).toThrow(/empty hash set/);
  });

  it("is idempotent on already-narrowed input (no 'unsafe-inline' left to replace)", () => {
    const narrowed = narrowCsp(headers, ["'sha256-AAA'"]);
    // Running it again should not duplicate hashes — the second pass has
    // no `'unsafe-inline'` to replace, so the regex's inner replace is a
    // no-op and the line stays as-is.
    expect(narrowCsp(narrowed, ["'sha256-AAA'"])).toBe(narrowed);
  });
});
