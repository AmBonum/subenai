import { describe, it, expect } from "vitest";

import { generateShareId, SHARE_ID_LENGTH } from "@/lib/platform/share-id";

// Must stay in lockstep with the respondent-side zod gate in
// src/lib/respondent/queries.ts and the SQL share_id regex.
const RESPONDENT_SHARE_ID_REGEX = /^[a-zA-Z0-9]{6,12}$/;

describe("generateShareId", () => {
  it("generates a 10-char base62 id by default", () => {
    const id = generateShareId();
    expect(id).toHaveLength(SHARE_ID_LENGTH);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("passes the respondent-flow share_id validation regex", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateShareId()).toMatch(RESPONDENT_SHARE_ID_REGEX);
    }
  });

  it("respects a custom length", () => {
    expect(generateShareId(6)).toHaveLength(6);
    expect(generateShareId(12)).toHaveLength(12);
  });

  it("does not collide across a batch of generations", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateShareId()));
    expect(ids.size).toBe(1000);
  });
});
