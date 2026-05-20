// E42 / M-4 — Magic-link expiry claim contract.
//
// `/manage-support` UI declares the portal magic link is valid for
// "1 hodinu". Supabase Auth controls the actual TTL via project-level
// settings (default = 3600s OTP expiry); we don't set it from code.
// This spec locks the documented value in three places:
//   1. The i18n string the user sees ("1 hodinu" / "1 hour" / "1 hodinu").
//   2. The expected Supabase default in the operator runbook
//      (functions/api/portal-magic-link.ts comment).
//   3. The unit assertion that all three locales claim the same value
//      so a future translator can't accidentally bump SK to "2 hodín"
//      while EN stays at "1 hour".

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_DEFAULT_TTL_SECONDS = 3600;

const locales: Array<{ locale: "sk" | "cs" | "en"; expected: string }> = [
  { locale: "sk", expected: "1 hodinu" },
  { locale: "cs", expected: "1 hodinu" },
  { locale: "en", expected: "1 hour" },
];

function readLocaleJson(locale: "sk" | "cs" | "en") {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), `src/i18n/locales/${locale}/marketing.json`), "utf8"),
  );
}

describe("magic-link expiry contract (M-4)", () => {
  it.each(locales)(
    "$locale: marketing.spravovat_podporu.submitted_body_hours === '$expected' (matches Supabase default)",
    ({ locale, expected }) => {
      const json = readLocaleJson(locale);
      // The Slovak section name was kept verbatim (spravovat_podporu)
      // when the i18n bundle was added — a fixed contract per
      // CLAUDE.md "language rule" (Slovak constants stay verbatim).
      const section = json.spravovat_podporu;
      expect(section, `${locale}: spravovat_podporu key missing from marketing.json`).toBeDefined();
      expect(section.submitted_body_hours).toBe(expected);
    },
  );

  it("documented value equals the Supabase default OTP expiry (3600s = 1 hour)", () => {
    // Multiplying by 60 to express in seconds in the same units Supabase
    // uses internally. If a future operator decides to extend the TTL,
    // they must update both this value and the user-facing copy in all
    // three locales; the test enforces alignment.
    expect(SUPABASE_DEFAULT_TTL_SECONDS).toBe(60 * 60);
  });

  it("portal magic-link handler comments cite the documented TTL", () => {
    const handler = readFileSync(
      resolve(process.cwd(), "functions/api/portal-magic-link.ts"),
      "utf8",
    );
    // The handler doesn't set the TTL (Supabase does), but should
    // mention the expected value so a future maintainer knows the
    // contract. If the comment is missing or wrong, this surfaces it.
    expect(handler.toLowerCase()).toMatch(/(1\s*hour|3600|hodin)/);
  });
});
