// E37 Phase B' — contract test for the tests-catalog DB unification
// mega-migration. Regex sweep over both the migration SQL and the
// DEPLOY_SETUP.sql mirror. No live DB needed — the contract is the
// SQL text. Future drift (someone drops a policy, renames a column,
// changes the RPC signature, removes idempotency guards) fails closed
// here.
//
// Lesson encoded for next-time-you (or me): pg_policies (VIEW) uses
// `policyname`; pg_policy (TABLE) uses `polname`. They are NOT
// interchangeable. The DEPLOY_SETUP mirror for E44 Phase D landed
// with the wrong one and only surfaced at fresh-DB-apply time.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521280000_e37_platform_packs_unified.sql",
);
const DEPLOY_PATH = resolve(__dirname, "../../DEPLOY_SETUP.sql");
const SEED_PATH = resolve(__dirname, "../../E37_SEED.sql");

let MIGRATION = "";
let DEPLOY = "";
let SEED = "";

beforeAll(() => {
  MIGRATION = readFileSync(MIGRATION_PATH, "utf8");
  DEPLOY = readFileSync(DEPLOY_PATH, "utf8");
  SEED = readFileSync(SEED_PATH, "utf8");
});

describe("E37 Phase B' — questions.sources_jsonb column", () => {
  it("adds sources_jsonb jsonb column with default '[]' (idempotent)", () => {
    expect(MIGRATION).toMatch(
      /ALTER TABLE public\.questions\s+ADD COLUMN IF NOT EXISTS sources_jsonb jsonb NOT NULL DEFAULT '\[\]'::jsonb/,
    );
  });

  it("guards the array-shape CHECK with a pg_constraint existence test", () => {
    expect(MIGRATION).toMatch(/questions_sources_jsonb_is_array/);
    expect(MIGRATION).toMatch(/CHECK \(jsonb_typeof\(sources_jsonb\) = 'array'\)/);
    expect(MIGRATION).toMatch(/IF NOT EXISTS \(\s*SELECT 1 FROM pg_constraint/);
  });
});

describe("E37 Phase B' — platform_pack_metadata table", () => {
  it("creates the table with IF NOT EXISTS and CASCADE delete to tests", () => {
    expect(MIGRATION).toMatch(/CREATE TABLE IF NOT EXISTS public\.platform_pack_metadata \(/);
    expect(MIGRATION).toMatch(
      /test_id uuid PRIMARY KEY\s+REFERENCES public\.tests\(id\) ON DELETE CASCADE/,
    );
  });

  it("declares the trilingual columns (sk/en/cs) the pack copy will need later", () => {
    expect(MIGRATION).toMatch(/tagline_en text/);
    expect(MIGRATION).toMatch(/tagline_cs text/);
    expect(MIGRATION).toMatch(/target_persona_en text/);
    expect(MIGRATION).toMatch(/target_persona_cs text/);
  });

  it("enables RLS and adds the anon-readable + admin-write policies", () => {
    expect(MIGRATION).toMatch(
      /ALTER TABLE public\.platform_pack_metadata ENABLE ROW LEVEL SECURITY/,
    );
    expect(MIGRATION).toMatch(/platform_pack_metadata_public_read/);
    expect(MIGRATION).toMatch(/FOR SELECT TO anon, authenticated/);
    expect(MIGRATION).toMatch(/platform_pack_metadata_admin_write/);
    expect(MIGRATION).toMatch(/public\.has_role\(auth\.uid\(\), 'admin'/);
  });

  it("constrains passing_threshold to 0..100", () => {
    expect(MIGRATION).toMatch(
      /passing_threshold int NOT NULL DEFAULT 70\s+CHECK \(passing_threshold BETWEEN 0 AND 100\)/,
    );
  });
});

describe("E37 Phase B' — get_platform_packs RPC", () => {
  it("declares get_platform_packs() returning the catalog row shape", () => {
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_platform_packs\(\)\s+RETURNS TABLE/,
    );
    // Sanity-check the columns the catalog view will read.
    for (const col of [
      "id uuid",
      "slug text",
      "title text",
      "tagline text",
      "industry text",
      "industry_emoji text",
      "passing_threshold int",
      "question_count int",
      "published_at timestamptz",
    ]) {
      expect(MIGRATION).toMatch(new RegExp(col.replace(/ /g, "\\s+")));
    }
  });

  it("is SECURITY DEFINER STABLE with locked search_path", () => {
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_platform_packs[\s\S]*?SECURITY DEFINER[\s\S]*?STABLE/,
    );
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_platform_packs[\s\S]*?SET search_path = public, pg_temp/,
    );
  });

  it("revokes from PUBLIC and grants to anon + authenticated", () => {
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.get_platform_packs\(\) FROM PUBLIC/);
    expect(MIGRATION).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_platform_packs\(\)[\s\S]*?TO anon, authenticated/,
    );
  });

  it("only emits packs with status = 'published'", () => {
    expect(MIGRATION).toMatch(/FROM public\.tests t[\s\S]*?WHERE t\.status = 'published'/);
  });
});

describe("E37 Phase B' — get_pack_with_questions RPC", () => {
  it("declares the function with a p_slug text arg returning jsonb", () => {
    expect(MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_pack_with_questions\(p_slug text\)\s+RETURNS jsonb/,
    );
  });

  it("returns NULL for unknown / unpublished slugs (caller distinguishes)", () => {
    expect(MIGRATION).toMatch(/IF v_pack_id IS NULL THEN[\s\S]*?RETURN NULL/);
  });

  it("joins on published questions only (matches the catalog visibility rule)", () => {
    expect(MIGRATION).toMatch(/WHERE tq\.test_id = v_pack_id AND q\.status = 'published'/);
  });

  it("revokes from PUBLIC and grants to anon + authenticated", () => {
    expect(MIGRATION).toMatch(
      /REVOKE ALL ON FUNCTION public\.get_pack_with_questions\(text\) FROM PUBLIC/,
    );
    expect(MIGRATION).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_pack_with_questions\(text\)[\s\S]*?TO anon, authenticated/,
    );
  });
});

describe("E37 Phase B' — Phase D + E platform-user prerequisite handling", () => {
  it("looks up platform@subenai.sk from auth.users (not auth schema INSERT)", () => {
    expect(MIGRATION).toMatch(/FROM auth\.users\s+WHERE email = 'platform@subenai\.sk'/);
  });

  it("RAISE NOTICEs and RETURNs when the user is absent (D + E no-op safely)", () => {
    expect(MIGRATION).toMatch(
      /IF v_platform_id IS NULL THEN[\s\S]*?RAISE NOTICE[\s\S]*?platform@subenai\.sk[\s\S]*?RETURN/,
    );
  });

  it("does NOT INSERT INTO auth.users — Dashboard-only creation per D9 amendment", () => {
    // Strip SQL comments before scanning so the migration header's "Why
    // Dashboard creation, not INSERT INTO auth.users" docstring doesn't
    // trip the regex. Only the executable SQL must stay clean.
    const exec = MIGRATION.replace(/^\s*--.*$/gm, "");
    expect(exec).not.toMatch(/INSERT INTO auth\.users/);
  });
});

describe("E37 Phase B' — idempotency throughout", () => {
  it("INSERTs into public.tests use ON CONFLICT DO NOTHING", () => {
    // Phases D + E both INSERT into public.tests inside their DO $...$ blocks.
    expect(MIGRATION).toMatch(
      /INSERT INTO public\.tests \([\s\S]*?\) VALUES[\s\S]*?ON CONFLICT \(id\) DO NOTHING/,
    );
  });

  it("INSERTs into platform_pack_metadata use ON CONFLICT (test_id)", () => {
    expect(MIGRATION).toMatch(
      /INSERT INTO public\.platform_pack_metadata[\s\S]*?ON CONFLICT \(test_id\) DO NOTHING/,
    );
  });

  it("INSERTs into test_questions use ON CONFLICT (test_id, question_id)", () => {
    expect(MIGRATION).toMatch(
      /INSERT INTO public\.test_questions[\s\S]*?ON CONFLICT \(test_id, question_id\) DO NOTHING/,
    );
  });

  it("INSERTs into questions use ON CONFLICT (id) DO NOTHING", () => {
    expect(MIGRATION).toMatch(/INSERT INTO public\.questions[\s\S]*?ON CONFLICT \(id\) DO NOTHING/);
  });
});

describe("E37 Phase B' — content sanity (Phase C + D + E coverage)", () => {
  it("seeds questions for all 6 new packs (search by signature slug fragments)", () => {
    // The seed groups Phase C question INSERTs by pack via section comments.
    const packTags = [
      "heslo-2fa",
      "ai-deepfake",
      "socialne-siete",
      "rodicia",
      "skoly",
      "zdravotnictvo",
    ];
    for (const tag of packTags) {
      expect(MIGRATION).toMatch(new RegExp(`E37 Phase C[\\s\\S]*${tag}`, "i"));
    }
  });

  it("materialises all 9 legacy packs in Phase D", () => {
    const legacySlugs = [
      "vseobecny",
      "seniori",
      "studenti",
      "ziaci-do-16",
      "eshop",
      "gastro-horeca",
      "autoservis",
      "it-vyvoj",
      "verejne-sluzby",
    ];
    for (const slug of legacySlugs) {
      expect(MIGRATION).toMatch(new RegExp(`'${slug}'`));
    }
  });

  it("materialises the 6 new packs in Phase E", () => {
    expect(MIGRATION).toMatch(/E37 Phase E[\s\S]*?6 new platform packs/);
  });
});

describe("E37 Phase B' — DEPLOY_SETUP.sql mirror", () => {
  it("includes the sources_jsonb column add", () => {
    expect(DEPLOY).toMatch(
      /ALTER TABLE public\.questions\s+ADD COLUMN IF NOT EXISTS sources_jsonb jsonb/,
    );
  });

  it("includes the platform_pack_metadata table create", () => {
    expect(DEPLOY).toMatch(/CREATE TABLE IF NOT EXISTS public\.platform_pack_metadata/);
  });

  it("includes both anon-safe RPCs", () => {
    expect(DEPLOY).toMatch(/CREATE OR REPLACE FUNCTION public\.get_platform_packs/);
    expect(DEPLOY).toMatch(/CREATE OR REPLACE FUNCTION public\.get_pack_with_questions/);
  });

  it("includes the Phase D + E DO blocks (paste-once-then-done)", () => {
    expect(DEPLOY).toMatch(/E37 Phase D[\s\S]*?platform@subenai\.sk/);
    expect(DEPLOY).toMatch(/E37 Phase E[\s\S]*?6 new platform packs/);
  });

  it("preserves the global verification SELECT (E37 must not delete it)", () => {
    // The four-counter Verification SELECT used to live at end-of-file,
    // but PR #121 (E48 support tickets) appended the E44.11 / E44 Phase D
    // mirrors AFTER it, so the verify block now lives in the middle of the
    // file. What we still need to guarantee: the SELECT exists exactly
    // once. If E37 ever silently duplicated or removed it during a rebase,
    // ops would either get wrong counts (duplicate) or no verify at all.
    const verifyMatches = DEPLOY.match(
      /SELECT count\(\*\) FROM public\.questions\) as seeded_questions/g,
    );
    expect(verifyMatches).not.toBeNull();
    expect(verifyMatches!.length).toBe(1);
  });
});

describe("E37 — seed file is structurally consistent with the migration", () => {
  it("seed body equals migration body below the header (the migration is just the seed with a new header)", () => {
    // The migration's first ~46 lines are the new Phase B' header; everything
    // after the second `=====` banner is the seed verbatim. If they ever
    // diverge silently, we want this to fail loudly.
    const seedBody = SEED.split("\n").slice(44).join("\n");
    const migrationBody = MIGRATION.split("\n").slice(45).join("\n");
    expect(migrationBody).toBe(seedBody);
  });
});
