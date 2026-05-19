import { describe, it, expect } from "vitest";
import { existsSync, statSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

// E31 — verify the og-default asset round-trip.
//
// Background: 3 routes (/r/$shareId, /s/$slug, /schools) reference
// `${SITE_ORIGIN}/og-default.png` from their head() blocks for the
// og:image / twitter:image meta tags. The asset was referenced but
// NOT committed prior to this PR — Messenger / WhatsApp / FB / LI
// previews silently 404'd and fell back to text-only cards.
//
// These tests guard the round-trip so a future refactor (or git LFS
// misconfiguration / accidental .gitignore) can't silently un-ship
// the asset again.

describe("E31 — og-default social-card asset", () => {
  it("commits the SVG source of truth at public/og-default.svg", () => {
    expect(existsSync(resolve(ROOT, "public/og-default.svg"))).toBe(true);
  });

  it("commits the rasterized PNG at public/og-default.png", () => {
    expect(existsSync(resolve(ROOT, "public/og-default.png"))).toBe(true);
  });

  it("PNG is a non-trivial size (> 5KB) — guards against empty / corrupt commits", () => {
    const size = statSync(resolve(ROOT, "public/og-default.png")).size;
    expect(size).toBeGreaterThan(5_000);
  });

  it("PNG is well under the social-platform 8MB ceiling", () => {
    const size = statSync(resolve(ROOT, "public/og-default.png")).size;
    expect(size).toBeLessThan(8 * 1024 * 1024);
  });

  it("PNG begins with the canonical PNG file signature", () => {
    const buf = readFileSync(resolve(ROOT, "public/og-default.png"));
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  it("SVG declares the 1200x630 OG-card dimensions", () => {
    const svg = readFileSync(resolve(ROOT, "public/og-default.svg"), "utf-8");
    expect(svg).toMatch(/width="1200"/);
    expect(svg).toMatch(/height="630"/);
    expect(svg).toMatch(/viewBox="0 0 1200 630"/);
  });

  it("generator script exists and pins the same dimensions", () => {
    const script = readFileSync(resolve(ROOT, "scripts/generate-og-default.mjs"), "utf-8");
    expect(script).toContain("resize(1200, 630");
    expect(script).toContain("og-default.png");
  });
});

describe("E31 — routes that reference og-default.png", () => {
  it("/r/$shareId still points at /og-default.png", () => {
    const src = readFileSync(resolve(ROOT, "src/routes/r.$shareId.tsx"), "utf-8");
    expect(src).toMatch(/\/og-default\.png/);
  });

  it("/s/$slug still points at /og-default.png", () => {
    const src = readFileSync(resolve(ROOT, "src/routes/s.$slug.tsx"), "utf-8");
    expect(src).toMatch(/\/og-default\.png/);
  });

  it("/schools still points at /og-default.png", () => {
    const src = readFileSync(resolve(ROOT, "src/routes/schools.tsx"), "utf-8");
    expect(src).toMatch(/\/og-default\.png/);
  });
});
