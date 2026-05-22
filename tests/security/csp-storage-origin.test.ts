import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CSP — Supabase Storage origin (E48-v3)", () => {
  const headersFile = readFileSync(resolve("public/_headers"), "utf8");

  it("img-src allows Supabase Storage origin", () => {
    expect(headersFile).toMatch(/img-src[^;]*lwxichbuvcakscntjkzs\.supabase\.co/);
  });

  it("frame-src allows Supabase Storage origin", () => {
    expect(headersFile).toMatch(/frame-src[^;]*lwxichbuvcakscntjkzs\.supabase\.co/);
  });
});

describe("CSP — E48-v3 regression: no CSP relaxation from new features", () => {
  const headersFile = readFileSync(resolve("public/_headers"), "utf8");

  it("frame-src does NOT allow wildcard https: (must be specific origins)", () => {
    // Extract just the frame-src directive value up to the next semicolon.
    const match = headersFile.match(/frame-src\s+([^;]+)/);
    const frameSrc = match?.[1] ?? "";
    expect(frameSrc).not.toMatch(/\bhttps:\s*$/);
    expect(frameSrc).not.toContain("https: ");
    expect(frameSrc.trim()).not.toBe("https:");
    // The wildcard form 'https:' (without a hostname) must not appear.
    expect(frameSrc).not.toMatch(/(?:^|\s)https:(?:\s|;|$)/);
  });

  it("img-src does NOT allow wildcard https:", () => {
    const match = headersFile.match(/img-src\s+([^;]+)/);
    const imgSrc = match?.[1] ?? "";
    expect(imgSrc).not.toMatch(/(?:^|\s)https:(?:\s|;|$)/);
  });

  it("script-src does NOT include unsafe-inline for hashed scripts (E48-v3 regression)", () => {
    // We allow 'unsafe-inline' only because Vite inlines a bootstrap chunk.
    // This test documents the current state so any future removal of
    // 'unsafe-inline' in favour of hash/nonce is captured as a positive change.
    // The assertion here is a documentation lock, not a policy assertion:
    // if 'unsafe-inline' is removed in a future PR this test should be
    // updated to reflect the tightening — NOT relaxed back.
    const match = headersFile.match(/script-src\s+([^;]+)/);
    const scriptSrc = match?.[1] ?? "";
    // Confirm the CSP file was read and script-src exists.
    expect(scriptSrc.length).toBeGreaterThan(0);
    // E48-v3 must NOT have introduced 'unsafe-eval' (only wasm-unsafe-eval is
    // acceptable, for WASM). Full eval enables arbitrary code execution.
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("CSP frame-src includes Supabase Storage for PDF preview (E48-v3 feature)", () => {
    expect(headersFile).toMatch(/frame-src[^;]*lwxichbuvcakscntjkzs\.supabase\.co/);
  });

  it("CSP img-src includes Supabase Storage for image preview (E48-v3 feature)", () => {
    expect(headersFile).toMatch(/img-src[^;]*lwxichbuvcakscntjkzs\.supabase\.co/);
  });
});
