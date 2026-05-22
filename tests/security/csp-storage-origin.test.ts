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
