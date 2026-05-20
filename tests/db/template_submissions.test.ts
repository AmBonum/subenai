// E44.9 Phase B — DB contract test for template_submissions migration.
//
// The migration ships on a feature branch (per CLAUDE.md "DB migrations on
// a branch are code only until merged"). This regex sweep is the single
// guarantee that the SQL file matches the plan before merge. The DEPLOY_SETUP
// sweep is lighter: we re-check the enum, table, and policies (the bits that
// drive RLS shape), not every trigger statement.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521150000_template_submissions.sql",
);
const DEPLOY_PATH = resolve(__dirname, "../../DEPLOY_SETUP.sql");

let SQL = "";
let DEPLOY = "";

beforeAll(() => {
  SQL = readFileSync(MIGRATION_PATH, "utf8");
  DEPLOY = readFileSync(DEPLOY_PATH, "utf8");
});

describe("E44.6 — template_submissions migration: enum", () => {
  it("declares CREATE TYPE template_submission_status with all 4 values", () => {
    expect(SQL).toMatch(
      /CREATE TYPE public\.template_submission_status AS ENUM \(\s*'pending',\s*'approved',\s*'rejected',\s*'withdrawn'\s*\)/,
    );
  });

  it.each(["pending", "approved", "rejected", "withdrawn"])("enum contains '%s'", (value) => {
    expect(SQL).toMatch(new RegExp(`'${value}'`));
  });
});

describe("E44.6 — table columns", () => {
  const REQUIRED_COLUMNS: Array<[string, RegExp]> = [
    ["id", /id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/],
    [
      "template_id",
      /template_id uuid NOT NULL REFERENCES public\.templates\(id\) ON DELETE CASCADE/,
    ],
    ["author_id", /author_id uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/],
    ["author_display_name", /author_display_name text NOT NULL/],
    ["age_rating_declared", /age_rating_declared public\.template_age_rating NOT NULL/],
    ["license", /license public\.template_license NOT NULL DEFAULT 'cc-by-4\.0'/],
    ["status", /status public\.template_submission_status NOT NULL DEFAULT 'pending'/],
    ["precheck", /precheck jsonb/],
    ["precheck_passed", /precheck_passed boolean/],
    ["precheck_at", /precheck_at timestamptz/],
    ["rejection_reason", /rejection_reason text/],
    ["reviewed_at", /reviewed_at timestamptz/],
    ["reviewer_id", /reviewer_id uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/],
    ["submitted_at", /submitted_at timestamptz NOT NULL DEFAULT now\(\)/],
    ["updated_at", /updated_at timestamptz NOT NULL DEFAULT now\(\)/],
  ];

  it("CREATE TABLE IF NOT EXISTS template_submissions present", () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.template_submissions/);
  });

  it.each(REQUIRED_COLUMNS)("declares column %s", (_name, re) => {
    expect(SQL).toMatch(re);
  });

  it("enables row-level security on the table", () => {
    expect(SQL).toMatch(/ALTER TABLE public\.template_submissions ENABLE ROW LEVEL SECURITY/);
  });
});

describe("E44.6 — indexes", () => {
  it.each([
    [
      "template_submissions_template_idx",
      /CREATE INDEX IF NOT EXISTS template_submissions_template_idx[\s\S]*?\(template_id, submitted_at DESC\)/,
    ],
    [
      "template_submissions_author_idx",
      /CREATE INDEX IF NOT EXISTS template_submissions_author_idx[\s\S]*?\(author_id, submitted_at DESC\)/,
    ],
    [
      "template_submissions_admin_queue_idx",
      /CREATE INDEX IF NOT EXISTS template_submissions_admin_queue_idx[\s\S]*?WHERE status = 'pending'/,
    ],
  ])("creates index %s", (_name, re) => {
    expect(SQL).toMatch(re);
  });
});

describe("E44.6 — triggers", () => {
  it("declares touch_template_submissions_updated_at function and trigger", () => {
    expect(SQL).toMatch(
      /CREATE OR REPLACE FUNCTION public\.touch_template_submissions_updated_at\(\)[\s\S]*?NEW\.updated_at := now\(\)/,
    );
    expect(SQL).toMatch(
      /CREATE TRIGGER template_submissions_touch_updated_at\s+BEFORE UPDATE ON public\.template_submissions[\s\S]*?EXECUTE FUNCTION public\.touch_template_submissions_updated_at\(\)/,
    );
  });

  it("declares forbid_template_submission_illegal_transitions function", () => {
    expect(SQL).toMatch(
      /CREATE OR REPLACE FUNCTION public\.forbid_template_submission_illegal_transitions\(\)[\s\S]*?RAISE EXCEPTION/,
    );
  });

  it("wires forbid_illegal_transitions BEFORE UPDATE OF status trigger", () => {
    expect(SQL).toMatch(
      /CREATE TRIGGER template_submissions_forbid_illegal_transitions\s+BEFORE UPDATE OF status ON public\.template_submissions[\s\S]*?EXECUTE FUNCTION public\.forbid_template_submission_illegal_transitions\(\)/,
    );
  });

  it("allows pending → approved / rejected / withdrawn transitions", () => {
    expect(SQL).toMatch(
      /OLD\.status = 'pending' AND NEW\.status IN \('approved', 'rejected', 'withdrawn'\)/,
    );
  });

  it("allows rejected → pending transition (re-submission)", () => {
    expect(SQL).toMatch(/OLD\.status = 'rejected' AND NEW\.status = 'pending'/);
  });

  it("forbids any other transition (RAISE EXCEPTION on illegal change)", () => {
    expect(SQL).toMatch(/RAISE EXCEPTION 'template_submissions: illegal status transition % -> %'/);
  });
});

describe("E44.6 — RLS policies", () => {
  it("creates author_read policy TO authenticated with author_id gate", () => {
    expect(SQL).toMatch(
      /CREATE POLICY template_submissions_author_read ON public\.template_submissions\s+FOR SELECT TO authenticated\s+USING \(author_id = auth\.uid\(\)\)/,
    );
  });

  it("creates author_insert policy TO authenticated with WITH CHECK on author_id", () => {
    expect(SQL).toMatch(
      /CREATE POLICY template_submissions_author_insert ON public\.template_submissions\s+FOR INSERT TO authenticated\s+WITH CHECK \(author_id = auth\.uid\(\)\)/,
    );
  });

  it("creates author_withdraw policy gated on status = 'pending'", () => {
    expect(SQL).toMatch(
      /CREATE POLICY template_submissions_author_withdraw ON public\.template_submissions\s+FOR UPDATE TO authenticated\s+USING \(author_id = auth\.uid\(\) AND status = 'pending'\)\s+WITH CHECK \(author_id = auth\.uid\(\)\)/,
    );
  });

  it("creates admin_all policy with has_role(admin) USING + WITH CHECK", () => {
    expect(SQL).toMatch(
      /CREATE POLICY template_submissions_admin_all ON public\.template_submissions\s+FOR ALL TO authenticated\s+USING \(public\.has_role\(auth\.uid\(\), 'admin'\)\)\s+WITH CHECK \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/,
    );
  });
});

describe("E44.6 — DEPLOY_SETUP.sql mirrors the migration", () => {
  it("mirrors the template_submission_status enum", () => {
    expect(DEPLOY).toMatch(
      /CREATE TYPE public\.template_submission_status AS ENUM \(\s*'pending',\s*'approved',\s*'rejected',\s*'withdrawn'\s*\)/,
    );
  });

  it("mirrors the CREATE TABLE statement", () => {
    expect(DEPLOY).toMatch(/CREATE TABLE IF NOT EXISTS public\.template_submissions/);
  });

  it.each([
    "template_submissions_author_read",
    "template_submissions_author_insert",
    "template_submissions_author_withdraw",
    "template_submissions_admin_all",
  ])("mirrors RLS policy %s by name", (name) => {
    expect(DEPLOY).toMatch(new RegExp(`CREATE POLICY ${name} ON public\\.template_submissions`));
  });

  it("mirrors the forbid_illegal_transitions trigger function", () => {
    expect(DEPLOY).toMatch(
      /CREATE OR REPLACE FUNCTION public\.forbid_template_submission_illegal_transitions/,
    );
  });
});
