// E42 / P-26 — DSR 30-day SLA contract.
//
// `/privacy` s5 promises "Žiadosti vybavujeme do 30 dní od doručenia
// (čl. 12 ods. 3 GDPR)". Today the `dsr_requests` table actually
// enforces a TIGHTER internal SLA of 72 hours via the
// `sla_due_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours')`
// column (migration `20260517000000_admin_hub_schema.sql`). That's
// well within the legal max — but the contract has to be locked so a
// future migration cannot loosen it past 30 days without this test
// failing loudly.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

function findDsrSchema(): { path: string; text: string } {
  for (const name of readdirSync(MIGRATIONS_DIR)) {
    if (!name.endsWith(".sql")) continue;
    const path = resolve(MIGRATIONS_DIR, name);
    const text = readFileSync(path, "utf8");
    if (/CREATE TABLE\s+public\.dsr_requests\b/i.test(text)) {
      return { path: name, text };
    }
  }
  throw new Error("dsr_requests CREATE TABLE not found in any migration");
}

describe("dsr_requests SLA — Art. 12(3) 30-day max (P-26)", () => {
  const { path, text } = findDsrSchema();

  it("dsr_requests table is declared with an sla_due_at column", () => {
    expect(
      /sla_due_at\s+timestamptz/i.test(text),
      `${path}: sla_due_at column missing from CREATE TABLE public.dsr_requests`,
    ).toBe(true);
  });

  it("sla_due_at default carries an interval ≤ 30 days (GDPR Art. 12(3) ceiling)", () => {
    // Capture the interval expression: e.g. `(now() + interval '72 hours')`.
    const match = text.match(/sla_due_at[^,]*DEFAULT\s*\(\s*now\(\)\s*\+\s*interval\s*'([^']+)'/i);
    expect(
      match,
      `${path}: sla_due_at DEFAULT must include now() + interval '<n> <unit>'`,
    ).not.toBeNull();
    const intervalText = match![1].trim().toLowerCase();
    const [valueRaw, unit] = intervalText.split(/\s+/);
    const value = Number.parseInt(valueRaw, 10);
    expect(
      Number.isFinite(value) && value > 0,
      `unparsable interval value: "${intervalText}"`,
    ).toBe(true);
    // Convert anything to hours for an apples-to-apples comparison.
    const HOURS_30_DAYS = 30 * 24;
    const hours = unit.startsWith("hour")
      ? value
      : unit.startsWith("day")
        ? value * 24
        : unit.startsWith("minute")
          ? value / 60
          : Number.NaN;
    expect(
      Number.isFinite(hours),
      `unsupported interval unit "${unit}" — extend the converter if you raised the SLA`,
    ).toBe(true);
    expect(
      hours,
      `sla_due_at default of ${intervalText} exceeds GDPR Art. 12(3) 30-day ceiling`,
    ).toBeLessThanOrEqual(HOURS_30_DAYS);
  });

  it("an index covers (status, sla_due_at) so overdue queries stay cheap", () => {
    expect(
      /CREATE\s+INDEX[^;]*ON\s+public\.dsr_requests[^;]*\(\s*status\s*,\s*sla_due_at\s*\)/i.test(
        text,
      ),
      `${path}: dsr_requests should index (status, sla_due_at) for the admin overdue queue`,
    ).toBe(true);
  });
});
