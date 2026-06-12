import { describe, it, expect } from "vitest";

import skApp from "@/i18n/locales/sk/app-explainers.json";
import enApp from "@/i18n/locales/en/app-explainers.json";
import csApp from "@/i18n/locales/cs/app-explainers.json";

// Mirrors the nav-key list AppShell emits for /app/* routes.
const EXPECTED_KEYS = [
  "dashboard",
  "tests",
  "edu_tests",
  "templates",
  "library",
  "audiences",
  "history",
  "insights",
  "notifications",
  "teams",
  "profile",
  "help",
] as const;

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function getPath(root: Json, path: string): Json | undefined {
  let cur: Json = root;
  for (const part of path.split(".")) {
    if (cur && typeof cur === "object" && !Array.isArray(cur) && part in cur) {
      cur = (cur as Record<string, Json>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function collectLeafPaths(node: Json, prefix = ""): string[] {
  if (node === null || typeof node !== "object") {
    return [prefix];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child, i) => collectLeafPaths(child, `${prefix}[${i}]`));
  }
  return Object.entries(node).flatMap(([k, v]) =>
    collectLeafPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

const skExplainers = (skApp as unknown as { explainers?: Json }).explainers;
const enExplainers = (enApp as unknown as { explainers?: Json }).explainers;
const csExplainers = (csApp as unknown as { explainers?: Json }).explainers;

describe("app explainers — i18n shape (SK)", () => {
  it("has the full set of 12 expected pageKeys (no missing, no extra)", () => {
    expect(skExplainers, "explainers subtree missing from sk/app-explainers.json").toBeDefined();
    const actual = Object.keys(skExplainers as Record<string, unknown>).sort();
    const expected = [...EXPECTED_KEYS].sort();
    expect(actual).toEqual(expected);
  });

  it.each([...EXPECTED_KEYS])(
    "'%s' — title + lead + section headings + docs heading are non-empty strings",
    (key) => {
      const stringPaths = [
        `${key}.title`,
        `${key}.lead`,
        `${key}.sections.what_you_configure.heading`,
        `${key}.sections.time_impact.heading`,
        `${key}.sections.pitfalls.heading`,
        `${key}.docs.heading`,
      ];
      for (const p of stringPaths) {
        const v = getPath(skExplainers as Json, p);
        expect(typeof v, `expected string at explainers.${p}`).toBe("string");
        expect((v as string).length, `empty string at explainers.${p}`).toBeGreaterThan(0);
      }
    },
  );

  it.each([...EXPECTED_KEYS])("'%s' — sections.*.items are non-empty arrays of strings", (key) => {
    for (const section of ["what_you_configure", "time_impact", "pitfalls"] as const) {
      const items = getPath(skExplainers as Json, `${key}.sections.${section}.items`);
      expect(
        Array.isArray(items),
        `expected array at explainers.${key}.sections.${section}.items`,
      ).toBe(true);
      const arr = items as Json[];
      expect(
        arr.length,
        `empty array at explainers.${key}.sections.${section}.items`,
      ).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < arr.length; i++) {
        expect(typeof arr[i], `non-string item at ${key}.sections.${section}.items[${i}]`).toBe(
          "string",
        );
      }
    }
  });

  it.each([...EXPECTED_KEYS])(
    "'%s' — docs.links is a non-empty array of {label, href} with /docs/app/* hrefs",
    (key) => {
      const links = getPath(skExplainers as Json, `${key}.docs.links`);
      expect(Array.isArray(links), `expected array at explainers.${key}.docs.links`).toBe(true);
      const arr = links as Json[];
      expect(arr.length).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < arr.length; i++) {
        const link = arr[i] as Record<string, Json>;
        expect(typeof link.label, `non-string label at ${key}.docs.links[${i}].label`).toBe(
          "string",
        );
        expect((link.label as string).length).toBeGreaterThan(0);
        expect(typeof link.href, `non-string href at ${key}.docs.links[${i}].href`).toBe("string");
        expect(
          (link.href as string).startsWith("/docs/app/"),
          `href at ${key}.docs.links[${i}] must start with /docs/app/ (got ${String(link.href)})`,
        ).toBe(true);
      }
    },
  );
});

describe("app explainers — locale parity (sk vs en vs cs)", () => {
  it("EN app-explainers bundle includes the explainers subtree", () => {
    expect(enExplainers, "explainers subtree missing from en/app-explainers.json").toBeDefined();
  });

  it("CS app-explainers bundle includes the explainers subtree", () => {
    expect(csExplainers, "explainers subtree missing from cs/app-explainers.json").toBeDefined();
  });

  it("EN leaf-key paths are identical to SK (no missing, no extra)", () => {
    const skPaths = new Set(collectLeafPaths(skExplainers as Json));
    const enPaths = new Set(collectLeafPaths((enExplainers ?? {}) as Json));
    const missingInEn = [...skPaths].filter((p) => !enPaths.has(p)).sort();
    const extraInEn = [...enPaths].filter((p) => !skPaths.has(p)).sort();
    expect(
      { missingInEn, extraInEn },
      `EN drifts from SK — missing ${missingInEn.length}, extra ${extraInEn.length}`,
    ).toEqual({ missingInEn: [], extraInEn: [] });
  });

  it("CS leaf-key paths are identical to SK (no missing, no extra)", () => {
    const skPaths = new Set(collectLeafPaths(skExplainers as Json));
    const csPaths = new Set(collectLeafPaths((csExplainers ?? {}) as Json));
    const missingInCs = [...skPaths].filter((p) => !csPaths.has(p)).sort();
    const extraInCs = [...csPaths].filter((p) => !skPaths.has(p)).sort();
    expect(
      { missingInCs, extraInCs },
      `CS drifts from SK — missing ${missingInCs.length}, extra ${extraInCs.length}`,
    ).toEqual({ missingInCs: [], extraInCs: [] });
  });
});
