import { describe, it, expect } from "vitest";

import { fnv1a32, mulberry32, shuffleBySessionId, resolveQuestionOrder } from "@/lib/quiz/shuffle";

describe("fnv1a32", () => {
  it("is deterministic for the same input", () => {
    expect(fnv1a32("hello")).toBe(fnv1a32("hello"));
    expect(fnv1a32("")).toBe(fnv1a32(""));
  });

  it("returns different hashes for similar but distinct inputs", () => {
    expect(fnv1a32("session-1")).not.toBe(fnv1a32("session-2"));
    expect(fnv1a32("a")).not.toBe(fnv1a32("b"));
  });

  it("returns a 32-bit unsigned integer", () => {
    const h = fnv1a32("anything");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    const a = [r1(), r1(), r1(), r1()];
    const b = [r2(), r2(), r2(), r2()];
    expect(a).toEqual(b);
  });

  it("yields values in [0, 1)", () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });
});

describe("shuffleBySessionId", () => {
  const ids = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"];

  it("is deterministic for the same session id (R2: refresh preserves order)", () => {
    const a = shuffleBySessionId(ids, "session-abc-123");
    const b = shuffleBySessionId(ids, "session-abc-123");
    expect(a).toEqual(b);
  });

  it("produces different orders for different session ids (anti-cheat)", () => {
    const a = shuffleBySessionId(ids, "session-A");
    const b = shuffleBySessionId(ids, "session-B");
    expect(a).not.toEqual(b);
  });

  it("preserves all elements (no drops, no dupes)", () => {
    const out = shuffleBySessionId(ids, "any-session");
    expect(out).toHaveLength(ids.length);
    expect(new Set(out)).toEqual(new Set(ids));
  });

  it("does not mutate the input array", () => {
    const input = ids.slice();
    shuffleBySessionId(input, "x");
    expect(input).toEqual(ids);
  });

  it("returns the input unchanged for length 0 or 1", () => {
    expect(shuffleBySessionId([], "s")).toEqual([]);
    expect(shuffleBySessionId(["only"], "s")).toEqual(["only"]);
  });

  it("shuffles distinctly from the input for a typical 8-item array", () => {
    // The shuffle CAN coincidentally equal the input, but for 8 items and a
    // well-mixed seed the probability is 1/8! = 1/40320. Run a handful of
    // seeds and assert at least one produces a different order.
    const anyDifferent = ["s1", "s2", "s3", "s4", "s5"]
      .map((s) => shuffleBySessionId(ids, s))
      .some((out) => out.join(",") !== ids.join(","));
    expect(anyDifferent).toBe(true);
  });
});

describe("resolveQuestionOrder", () => {
  const ids = ["q1", "q2", "q3", "q4"];

  it("returns input as-is when mode is fixed", () => {
    expect(resolveQuestionOrder(ids, "fixed", "session-x")).toEqual(ids);
  });

  it("returns input as-is when sessionId is null (pre-intake render)", () => {
    expect(resolveQuestionOrder(ids, "random", null)).toEqual(ids);
  });

  it("shuffles when mode is random and sessionId is present", () => {
    // For a fixed seed across multiple sessions, at least one shuffle must
    // diverge from the input.
    const seeds = ["s1", "s2", "s3", "s4", "s5"];
    const allMatch = seeds.every(
      (s) => resolveQuestionOrder(ids, "random", s).join(",") === ids.join(","),
    );
    expect(allMatch).toBe(false);
  });

  it("does not mutate the input array", () => {
    const input = ids.slice();
    resolveQuestionOrder(input, "random", "x");
    resolveQuestionOrder(input, "fixed", "x");
    expect(input).toEqual(ids);
  });
});
