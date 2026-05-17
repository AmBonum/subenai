import { describe, it, expect } from "vitest";

import {
  takeTestFn,
  TakeTestInputSchema,
  SAFE_TEST_COLUMNS,
} from "@/lib/respondent/take-test.functions";
import { useTests } from "@/lib/platform/mock-store";
import { renderHook } from "@testing-library/react";

const SAFE_KEYS = new Set<string>(SAFE_TEST_COLUMNS);

function firstPublishedShareId(): string {
  const tests = renderHook(() => useTests()).result.current;
  const t = tests.find((x) => x.status === "published");
  if (!t) throw new Error("seed missing a published test");
  return t.share_id;
}

describe("TakeTestInputSchema", () => {
  it("rejects shareId shorter than 8 chars", () => {
    expect(() => TakeTestInputSchema.parse({ shareId: "abc" })).toThrow();
  });

  it("rejects shareId longer than 64 chars", () => {
    expect(() => TakeTestInputSchema.parse({ shareId: "x".repeat(65) })).toThrow();
  });

  it("accepts a well-formed shareId", () => {
    expect(() => TakeTestInputSchema.parse({ shareId: "abcdefgh" })).not.toThrow();
  });
});

describe("takeTestFn", () => {
  it("returns null for an unknown shareId", () => {
    expect(takeTestFn({ shareId: "no-such-id" })).toBeNull();
  });

  it("returns an object whose keys are a strict subset of SAFE_TEST_COLUMNS", () => {
    const shareId = firstPublishedShareId();
    const result = takeTestFn({ shareId });
    expect(result).not.toBeNull();
    const keys = Object.keys(result!);
    for (const k of keys) {
      expect(SAFE_KEYS.has(k)).toBe(true);
    }
    // Crucial PII / authority columns must NEVER leak.
    expect(keys).not.toContain("owner_id");
    expect(keys).not.toContain("password");
    expect(keys).not.toContain("password_hash");
    expect(keys).not.toContain("segmentation");
  });
});
