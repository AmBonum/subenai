import { describe, it, expect } from "vitest";

import {
  formatArticleCount,
  formatPublishedArticleCount,
} from "@/lib/blog/slovak-plurals";

// Slovak grammatical number has three forms, not two:
//   1 → singular nominative
//   2–4 → plural nominative
//   5+ and 0 → plural genitive
// English mistakes drop the middle form ("2 článkov" instead of "2 články"),
// so these tests pin each boundary explicitly.

describe("formatArticleCount", () => {
  it("uses singular nominative for 1", () => {
    expect(formatArticleCount(1)).toBe("1 článok");
  });

  it("uses plural nominative for 2, 3, 4", () => {
    expect(formatArticleCount(2)).toBe("2 články");
    expect(formatArticleCount(3)).toBe("3 články");
    expect(formatArticleCount(4)).toBe("4 články");
  });

  it("uses plural genitive for 5+ and 0", () => {
    expect(formatArticleCount(0)).toBe("0 článkov");
    expect(formatArticleCount(5)).toBe("5 článkov");
    expect(formatArticleCount(10)).toBe("10 článkov");
    expect(formatArticleCount(80)).toBe("80 článkov");
    expect(formatArticleCount(123)).toBe("123 článkov");
  });
});

describe("formatPublishedArticleCount", () => {
  it("uses singular nominative for 1", () => {
    expect(formatPublishedArticleCount(1)).toBe("1 publikovaný článok");
  });

  it("uses plural nominative for 2, 3, 4", () => {
    expect(formatPublishedArticleCount(2)).toBe("2 publikované články");
    expect(formatPublishedArticleCount(4)).toBe("4 publikované články");
  });

  it("uses plural genitive for 5+", () => {
    expect(formatPublishedArticleCount(5)).toBe("5 publikovaných článkov");
    expect(formatPublishedArticleCount(80)).toBe("80 publikovaných článkov");
  });
});
