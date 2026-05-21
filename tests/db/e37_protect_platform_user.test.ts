// E37 architect-P1 — contract test for the protect-platform-user trigger
// migration. Regex sweep over the migration SQL + DEPLOY_SETUP mirror.
//
// Without this trigger, a Supabase Auth dashboard "delete inactive users"
// sweep that includes platform@subenai.sk would CASCADE-delete all 15
// platform pack rows because public.tests.owner_id is
// REFERENCES auth.users(id) ON DELETE CASCADE.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521320000_e37_protect_platform_user.sql",
);
const DEPLOY_PATH = resolve(__dirname, "../../DEPLOY_SETUP.sql");
// The schema migration that establishes the dangerous CASCADE.
const SCHEMA_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260517000000_admin_hub_schema.sql",
);

let MIGRATION = "";
let DEPLOY = "";
let SCHEMA = "";

beforeAll(() => {
  MIGRATION = readFileSync(MIGRATION_PATH, "utf8");
  DEPLOY = readFileSync(DEPLOY_PATH, "utf8");
  SCHEMA = readFileSync(SCHEMA_PATH, "utf8");
});

describe("E37 architect-P1 — verifies the dangerous CASCADE still exists", () => {
  // This test exists to anchor the audit finding. If the team ever
  // changes the FK to RESTRICT or SET NULL, this trigger becomes
  // belt-and-suspenders rather than load-bearing. The test will fail
  // loudly so we can re-evaluate whether the trigger is still needed.
  it("public.tests.owner_id still REFERENCES auth.users ON DELETE CASCADE", () => {
    expect(SCHEMA).toMatch(
      /CREATE TABLE public\.tests \(\s*[\s\S]*?owner_id uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/,
    );
  });
});

describe("E37 architect-P1 — forbid_platform_user_delete trigger function", () => {
  it("declares the function as SECURITY DEFINER PL/pgSQL with locked search_path", () => {
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.forbid_platform_user_delete\(\)[\s\S]*?LANGUAGE plpgsql[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, pg_temp/,
    );
  });

  it("fires only on the platform@subenai.sk email (not all auth.users deletes)", () => {
    // The IF gate is what makes this trigger safe to install on
    // auth.users — every other delete path stays unaffected.
    expect(MIGRATION).toMatch(/IF OLD\.email = 'platform@subenai\.sk' THEN/);
  });

  it("counts dependent packs and includes the count in the error message", () => {
    // Counting before raising gives the operator actionable info — they
    // know how many rows would have been lost.
    expect(MIGRATION).toMatch(
      /SELECT COUNT\(\*\) INTO v_pack_count[\s\S]*?FROM public\.tests t[\s\S]*?JOIN public\.platform_pack_metadata m ON m\.test_id = t\.id[\s\S]*?WHERE t\.owner_id = OLD\.id/,
    );
    expect(MIGRATION).toMatch(/% platform pack\(s\) depend on this owner_id/);
  });

  it("raises with the foreign_key_violation SQLSTATE so callers can pattern-match", () => {
    expect(MIGRATION).toMatch(/USING ERRCODE = 'foreign_key_violation'/);
  });

  it("returns OLD on the non-platform path (allows other deletes to proceed)", () => {
    expect(MIGRATION).toMatch(/END IF;\s*RETURN OLD;/);
  });
});

describe("E37 architect-P1 — trigger installation", () => {
  it("drops the trigger if it exists (idempotent re-apply)", () => {
    expect(MIGRATION).toMatch(/DROP TRIGGER IF EXISTS forbid_platform_user_delete ON auth\.users/);
  });

  it("creates the trigger BEFORE DELETE on auth.users FOR EACH ROW", () => {
    expect(MIGRATION).toMatch(
      /CREATE TRIGGER forbid_platform_user_delete\s+BEFORE DELETE ON auth\.users\s+FOR EACH ROW EXECUTE FUNCTION public\.forbid_platform_user_delete\(\)/,
    );
  });

  it("revokes execute from PUBLIC (function is trigger-only, no callable surface)", () => {
    expect(MIGRATION).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.forbid_platform_user_delete\(\) FROM PUBLIC/,
    );
  });
});

describe("DEPLOY_SETUP.sql mirrors the protect-platform-user migration", () => {
  it("includes the function declaration", () => {
    expect(DEPLOY).toMatch(/CREATE OR REPLACE FUNCTION public\.forbid_platform_user_delete\(\)/);
  });

  it("includes the email-gated IF check", () => {
    expect(DEPLOY).toMatch(/IF OLD\.email = 'platform@subenai\.sk' THEN/);
  });

  it("includes the BEFORE DELETE trigger on auth.users", () => {
    expect(DEPLOY).toMatch(
      /CREATE TRIGGER forbid_platform_user_delete\s+BEFORE DELETE ON auth\.users/,
    );
  });

  it("includes the idempotent DROP TRIGGER IF EXISTS guard", () => {
    expect(DEPLOY).toMatch(/DROP TRIGGER IF EXISTS forbid_platform_user_delete ON auth\.users/);
  });
});
