import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// E48 security audit A5 — verify get_ticket_thread_for_view_token
// inserts into audit_log only AFTER the FOUND guard.
//
// Anon has GRANT EXECUTE on this RPC. If the audit_log row is written
// before the FOUND check, an attacker can spray random tokens and
// pollute the audit_log table with one row per probe. Real security
// signal gets drowned in noise + Supabase storage quota burns.
//
// We grep the migration SQL deterministically — no DB needed — and
// assert the INSERT INTO public.audit_log appears AFTER the
// IF NOT FOUND THEN RETURN NULL guard inside the function body.

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260522110000_e48_2_audit_log_after_found_check.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("E48 audit A5 — get_ticket_thread_for_view_token audit ordering", () => {
  it("the migration exists and re-declares the function", () => {
    expect(SQL).toMatch(/CREATE OR REPLACE FUNCTION public\.get_ticket_thread_for_view_token/);
  });

  it("the IF NOT FOUND guard appears before the audit_log INSERT", () => {
    const guardIdx = SQL.search(/IF NOT FOUND THEN[\s\S]*?RETURN NULL/);
    const insertIdx = SQL.search(/INSERT INTO public\.audit_log/);
    expect(guardIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(insertIdx);
  });

  it("documents the constraint via COMMENT ON FUNCTION", () => {
    expect(SQL).toMatch(/COMMENT ON FUNCTION public\.get_ticket_thread_for_view_token/);
    expect(SQL).toMatch(/audit/i);
    expect(SQL).toMatch(/FOUND/);
  });

  it("preserves the anon + authenticated GRANT EXECUTE", () => {
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_ticket_thread_for_view_token/);
    expect(SQL).toMatch(/TO anon, authenticated/);
  });
});
