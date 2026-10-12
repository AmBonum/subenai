import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

// fontkit is what @react-pdf/renderer itself uses to lay out glyphs.
const fontkit = createRequire(import.meta.url)("fontkit") as {
  openSync(path: string): { hasGlyphForCodePoint(cp: number): boolean };
};
const FONTS = ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map((f) =>
  fontkit.openSync(join(process.cwd(), "public/fonts", f)),
);

const pdfTemplates = readdirSync(SRC, { recursive: true, encoding: "utf8" })
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => ({ file: f, code: readFileSync(join(SRC, f), "utf8") }))
  .filter(({ code }) => /from "@react-pdf\/renderer"/.test(code))
  .filter(({ code }) => /fontFamily:/.test(code));

describe("React-PDF templates render Slovak diacritics", () => {
  it("finds the templates", () => {
    expect(pdfTemplates.map((t) => t.file)).toEqual(
      expect.arrayContaining([expect.stringContaining("edu/pdf-document.tsx")]),
    );
  });

  it.each(pdfTemplates.map((t) => [t.file, t.code] as const))(
    "%s uses only fonts it registers, never the Latin-1 built-ins",
    (_file, code) => {
      expect(code).not.toMatch(/fontFamily:\s*"(Helvetica|Times|Courier)/);
      const registered = new Set(
        [...code.matchAll(/Font\.register\(\{\s*family:\s*"([^"]+)"/g)].map((m) => m[1]),
      );
      const used = [...code.matchAll(/fontFamily:\s*"([^"]+)"/g)].map((m) => m[1]);
      for (const family of used) expect(registered).toContain(family);
    },
  );

  it.each(pdfTemplates.map((t) => [t.file, t.code] as const))(
    "%s only hard-codes characters the bundled Noto Sans can draw",
    (_file, code) => {
      const text = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      const missing = [...new Set(text)].filter(
        (ch) =>
          ch.codePointAt(0)! > 127 &&
          FONTS.some((font) => !font.hasGlyphForCodePoint(ch.codePointAt(0)!)),
      );
      expect(missing).toEqual([]);
    },
  );
});
