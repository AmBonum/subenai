// E37 Phase G3 — contract test for the get_platform_pack_question_ids
// RPC migration. Regex sweep over the migration + DEPLOY_SETUP mirror.
//
// The RPC is the bridge that lets the anon /test/builder composer read
// the pack→question-id mapping without touching public.test_questions
// directly (which is authenticated-only via RLS).

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521300000_e37_pack_question_ids_rpc.sql",
);
const DEPLOY_PATH = resolve(__dirname, "../../DEPLOY_SETUP.sql");

let MIGRATION = "";
let DEPLOY = "";

beforeAll(() => {
  MIGRATION = readFileSync(MIGRATION_PATH, "utf8");
  DEPLOY = readFileSync(DEPLOY_PATH, "utf8");
});

describe("E37 Phase G3 — get_platform_pack_question_ids RPC", () => {
  it("declares the function with no args returning (slug text, question_ids uuid[])", () => {
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_platform_pack_question_ids\(\)/,
    );
    expect(MIGRATION).toMatch(/RETURNS TABLE \(\s*slug text,\s*question_ids uuid\[\]\s*\)/);
  });

  it("is SECURITY DEFINER STABLE with locked search_path (same hardening as the catalog RPC)", () => {
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_platform_pack_question_ids[\s\S]*?SECURITY DEFINER/,
    );
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_platform_pack_question_ids[\s\S]*?STABLE/,
    );
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_platform_pack_question_ids[\s\S]*?SET search_path = public, pg_temp/,
    );
  });

  it("only emits published packs with a platform_pack_metadata row", () => {
    expect(MIGRATION).toMatch(/FROM public\.tests t[\s\S]*?WHERE t\.status = 'published'/);
    expect(MIGRATION).toMatch(/JOIN public\.platform_pack_metadata m ON m\.test_id = t\.id/);
  });

  it("orders question_ids by tq.position ASC (matches the catalog detail RPC)", () => {
    expect(MIGRATION).toMatch(/ORDER BY tq\.position ASC/);
  });

  it("revokes from PUBLIC and grants to anon + authenticated", () => {
    expect(MIGRATION).toMatch(
      /REVOKE ALL ON FUNCTION public\.get_platform_pack_question_ids\(\) FROM PUBLIC/,
    );
    expect(MIGRATION).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_platform_pack_question_ids\(\)[\s\S]*?TO anon, authenticated/,
    );
  });
});

describe("DEPLOY_SETUP.sql mirrors the Phase G3 RPC", () => {
  it("includes the function declaration", () => {
    expect(DEPLOY).toMatch(/CREATE OR REPLACE FUNCTION public\.get_platform_pack_question_ids/);
  });

  it("includes the anon + authenticated grant", () => {
    expect(DEPLOY).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_platform_pack_question_ids\(\)[\s\S]*?TO anon, authenticated/,
    );
  });
});
