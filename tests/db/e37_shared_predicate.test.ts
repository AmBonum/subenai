// E37 architect-P1 — contract test for the shared-predicate CTE refactor.
// Verifies that all three anon-safe RPCs now reference the named
// `visible_platform_packs` CTE rather than open-coding the
// `WHERE t.status='published' JOIN platform_pack_metadata` predicate.
//
// The value of this refactor is in the *naming* — a future visibility
// rule (featured flag, visibility enum, region filter) should land at
// the CTE definition, not in each RPC's WHERE clause. These assertions
// fail loudly if anyone removes the CTE and re-inlines the predicate.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521330000_e37_rpc_shared_predicate.sql",
);
const DEPLOY_PATH = resolve(__dirname, "../../DEPLOY_SETUP.sql");

let MIGRATION = "";
let DEPLOY = "";

beforeAll(() => {
  MIGRATION = readFileSync(MIGRATION_PATH, "utf8");
  DEPLOY = readFileSync(DEPLOY_PATH, "utf8");
});

// Helper — extract executable SQL (drop comment lines) so the migration
// header's documentation doesn't trip the regex sentinels below.
function executable(sql: string): string {
  return sql.replace(/^\s*--.*$/gm, "");
}

describe("E37 architect-P1 — shared CTE refactor: each RPC uses visible_platform_packs", () => {
  it("get_platform_packs() body declares the visible_platform_packs CTE", () => {
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_platform_packs\(\)[\s\S]*?WITH visible_platform_packs AS \([\s\S]*?WHERE t\.status = 'published'[\s\S]*?\)[\s\S]*?FROM visible_platform_packs/,
    );
  });

  it("get_pack_with_questions(p_slug) body declares the visible_platform_packs CTE", () => {
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_pack_with_questions\(p_slug text\)[\s\S]*?WITH visible_platform_packs AS \([\s\S]*?WHERE t\.status = 'published'[\s\S]*?\)/,
    );
  });

  it("get_platform_pack_question_ids() body declares the visible_platform_packs CTE", () => {
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_platform_pack_question_ids\(\)[\s\S]*?WITH visible_platform_packs AS \([\s\S]*?WHERE t\.status = 'published'[\s\S]*?\)[\s\S]*?FROM visible_platform_packs/,
    );
  });
});

describe("E37 architect-P1 — every CTE applies the SAME visibility predicate", () => {
  it("every visible_platform_packs CTE joins platform_pack_metadata + filters status='published'", () => {
    const exec = executable(MIGRATION);
    // Pull every CTE body out and verify each one applies the same
    // visibility rule. Three CTE blocks expected (one per RPC).
    const cteBlocks = exec.match(/WITH visible_platform_packs AS \(\s*SELECT[\s\S]*?\)/g);
    expect(cteBlocks).not.toBeNull();
    expect(cteBlocks!.length).toBeGreaterThanOrEqual(3);
    for (const block of cteBlocks!) {
      // Must join the metadata sibling table — that's how we tell a
      // platform pack apart from a user-created test.
      expect(block).toMatch(/JOIN public\.platform_pack_metadata m ON m\.test_id = t\.id/);
      // Must filter the pack-level published status.
      expect(block).toMatch(/WHERE t\.status = 'published'/);
    }
  });

  it("get_pack_with_questions keeps the question-level filter (q.status='published')", () => {
    // The question-level visibility is a separate concern from
    // pack-level. The CTE handles pack-level; this filter stays at the
    // question-aggregation site.
    expect(MIGRATION).toMatch(/WHERE tq\.test_id = v_pack_id AND q\.status = 'published'/);
  });

  it("get_platform_pack_question_ids preserves the inner-subquery q.status filter", () => {
    expect(MIGRATION).toMatch(
      /SELECT tq\.question_id[\s\S]*?JOIN public\.questions q ON q\.id = tq\.question_id[\s\S]*?WHERE tq\.test_id = p\.id[\s\S]*?AND q\.status = 'published'/,
    );
  });
});

describe("E37 architect-P1 — no RPC re-inlines the open-coded predicate", () => {
  // The whole point of the refactor: a future PR should NOT regress by
  // adding `FROM public.tests t JOIN platform_pack_metadata ... WHERE
  // t.status = 'published'` outside the CTE. The CTE block itself
  // legitimately uses that pattern; the assertion is that the count of
  // such matches equals the count of CTE openings (one per CTE).
  it("the number of public.tests + platform_pack_metadata joins equals the CTE count", () => {
    const exec = executable(MIGRATION);
    const ctes = exec.match(/WITH visible_platform_packs AS \(/g) ?? [];
    const inlinedJoins =
      exec.match(/FROM public\.tests t\s+JOIN public\.platform_pack_metadata m/g) ?? [];
    // The 3 CTEs SHOULD account for every join in the file. If an
    // inlined join leaks in (someone bypasses the CTE), this assertion
    // fails.
    expect(inlinedJoins.length).toBe(ctes.length);
  });
});

describe("E37 architect-P1 — hardening posture preserved across all three RPCs", () => {
  it("all three RPCs remain SECURITY DEFINER STABLE with locked search_path", () => {
    const exec = executable(MIGRATION);
    const definers = exec.match(/SECURITY DEFINER/g) ?? [];
    const stables = exec.match(/\bSTABLE\b/g) ?? [];
    const searchPaths = exec.match(/SET search_path = public, pg_temp/g) ?? [];
    expect(definers.length).toBeGreaterThanOrEqual(3);
    expect(stables.length).toBeGreaterThanOrEqual(3);
    expect(searchPaths.length).toBeGreaterThanOrEqual(3);
  });

  it("all three RPCs re-declare REVOKE FROM PUBLIC + GRANT to anon, authenticated", () => {
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.get_platform_packs\(\) FROM PUBLIC/);
    expect(MIGRATION).toMatch(
      /REVOKE ALL ON FUNCTION public\.get_pack_with_questions\(text\) FROM PUBLIC/,
    );
    expect(MIGRATION).toMatch(
      /REVOKE ALL ON FUNCTION public\.get_platform_pack_question_ids\(\) FROM PUBLIC/,
    );
    const grants = MIGRATION.match(/TO anon, authenticated/g) ?? [];
    expect(grants.length).toBeGreaterThanOrEqual(3);
  });
});

describe("DEPLOY_SETUP.sql mirrors the CTE refactor", () => {
  it("includes the visible_platform_packs CTE for all 3 RPCs in the new mirror block", () => {
    // The DEPLOY_SETUP file accumulates many older mirror blocks (each
    // earlier E37 migration appended one). The CTE pattern is what
    // matters — it should appear at least 3 times now.
    const ctes = DEPLOY.match(/WITH visible_platform_packs AS \(/g) ?? [];
    expect(ctes.length).toBeGreaterThanOrEqual(3);
  });

  it("includes the section banner identifying the architect-P1 mirror", () => {
    expect(DEPLOY).toMatch(
      /E37 architect-P1 — share the published-pack predicate across the 3 RPCs/,
    );
  });
});
