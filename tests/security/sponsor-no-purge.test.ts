// E42 / P-10 — sponsorship data has a 10-year retention (§ 35 zákona
// č. 431/2002 Z. z. on accounting), which we satisfy by NOT purging
// the `sponsors` (or related) tables. This spec locks the absence of
// any retention purge against sponsor / payment surfaces: if a future
// migration accidentally adds an attempt to delete sponsor rows on a
// schedule, this test fails.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

function readAllMigrations(): { path: string; text: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => {
      const path = resolve(MIGRATIONS_DIR, f);
      return { path, text: readFileSync(path, "utf8") };
    });
}

const SPONSOR_TABLES = ["sponsors", "footer_sponsors", "sponsorships", "subscriptions"];
const PURGE_PATTERNS = [
  /DELETE\s+FROM\s+public\.(sponsors|footer_sponsors|sponsorships|subscriptions)\b/i,
  /purge_(expired_)?(sponsor|subscription)/i,
  /TRUNCATE\s+(TABLE\s+)?public\.(sponsors|footer_sponsors|sponsorships|subscriptions)\b/i,
];

describe("sponsorship retention — no purge job exists (P-10)", () => {
  const migrations = readAllMigrations();

  it("at least one migration declares a sponsor-related table", () => {
    const hasSponsorTable = migrations.some((m) =>
      SPONSOR_TABLES.some((table) =>
        new RegExp(`CREATE TABLE.*public\\.${table}\\b`, "i").test(m.text),
      ),
    );
    expect(hasSponsorTable, "no sponsor table found — schema regression?").toBe(true);
  });

  it("no migration registers a scheduled purge or DELETE against sponsor tables", () => {
    const offenders: { path: string; pattern: string; snippet: string }[] = [];
    for (const { path, text } of migrations) {
      for (const pattern of PURGE_PATTERNS) {
        const match = text.match(pattern);
        if (!match) continue;
        // The matched fragment + a few surrounding chars helps the
        // reviewer trace the regression without grep-and-find.
        const idx = text.indexOf(match[0]);
        const snippet = text.slice(Math.max(0, idx - 40), idx + match[0].length + 40);
        offenders.push({ path: path.split("/").slice(-1)[0], pattern: pattern.source, snippet });
      }
    }
    expect(
      offenders,
      `Found purge / DELETE against sponsor tables — violates 10-year retention claim in /privacy s7:\n${JSON.stringify(offenders, null, 2)}`,
    ).toEqual([]);
  });

  it("no cron.schedule call references a sponsor purge function", () => {
    for (const { path, text } of migrations) {
      const match = text.match(/cron\.schedule\([^)]*?(sponsor|sponsorship|subscription)/i);
      expect(
        match,
        `cron.schedule referencing sponsor surface found in ${path.split("/").slice(-1)[0]}: ${match?.[0]}`,
      ).toBeNull();
    }
  });
});
