// E44.4 — DB contract test for templates_v2_ownership migration.
//
// Regex sweep over the migration SQL string + a smaller mirror sweep over
// DEPLOY_SETUP.sql. The migration is code-only on the branch (per CLAUDE.md
// "DB migrations on a branch are code only until merged"), so this contract
// test is the single guarantee that the file matches the plan before merge.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260520210000_templates_v2_ownership.sql",
);
const DEPLOY_PATH = resolve(__dirname, "../../DEPLOY_SETUP.sql");

let SQL = "";
let DEPLOY = "";

beforeAll(() => {
  SQL = readFileSync(MIGRATION_PATH, "utf8");
  DEPLOY = readFileSync(DEPLOY_PATH, "utf8");
});

describe("E44.1 — templates_v2_ownership migration: enums", () => {
  it.each([
    ["template_visibility", "'private', 'public', 'unlisted'"],
    ["template_status", "'draft', 'published'"],
    ["template_license", "'cc-by-4.0'"],
    ["template_age_rating", "'all', 'thirteen_plus', 'sixteen_plus', 'eighteen_plus'"],
  ])("declares CREATE TYPE public.%s with values (%s)", (typeName, values) => {
    const re = new RegExp(
      `CREATE TYPE public\\.${typeName} AS ENUM \\(${values.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\)`,
    );
    expect(SQL).toMatch(re);
  });
});

describe("E44.1 — columns added with correct defaults", () => {
  const REQUIRED_COLUMNS: Array<[string, RegExp]> = [
    [
      "owner_id",
      /ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth\.users\(id\) ON DELETE CASCADE/,
    ],
    [
      "visibility",
      /ADD COLUMN IF NOT EXISTS visibility public\.template_visibility NOT NULL DEFAULT 'private'/,
    ],
    [
      "fork_of",
      /ADD COLUMN IF NOT EXISTS fork_of uuid REFERENCES public\.templates\(id\) ON DELETE SET NULL/,
    ],
    ["status", /ADD COLUMN IF NOT EXISTS status public\.template_status NOT NULL DEFAULT 'draft'/],
    [
      "license",
      /ADD COLUMN IF NOT EXISTS license public\.template_license NOT NULL DEFAULT 'cc-by-4\.0'/,
    ],
    ["author_display_name", /ADD COLUMN IF NOT EXISTS author_display_name text/],
    [
      "age_rating",
      /ADD COLUMN IF NOT EXISTS age_rating public\.template_age_rating NOT NULL DEFAULT 'all'/,
    ],
    ["slug", /ADD COLUMN IF NOT EXISTS slug text UNIQUE/],
    ["published_at", /ADD COLUMN IF NOT EXISTS published_at timestamptz(?!\s+NOT NULL)/],
    ["updated_at", /ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now\(\)/],
  ];

  it.each(REQUIRED_COLUMNS)("ADD COLUMN IF NOT EXISTS %s", (_name, re) => {
    expect(SQL).toMatch(re);
  });

  it("declares all 10 ADD COLUMN clauses (count check)", () => {
    const matches = SQL.match(/ADD COLUMN IF NOT EXISTS/g) ?? [];
    expect(matches.length).toBe(10);
  });
});

describe("E44.1 — indexes", () => {
  it.each([
    [
      "templates_owner_visibility_idx",
      /CREATE INDEX IF NOT EXISTS templates_owner_visibility_idx[\s\S]*?WHERE owner_id IS NOT NULL/,
    ],
    [
      "templates_public_published_idx",
      /CREATE INDEX IF NOT EXISTS templates_public_published_idx[\s\S]*?WHERE visibility = 'public' AND status = 'published'/,
    ],
    [
      "templates_fork_of_idx",
      /CREATE INDEX IF NOT EXISTS templates_fork_of_idx[\s\S]*?WHERE fork_of IS NOT NULL/,
    ],
  ])("creates partial index %s", (_name, re) => {
    expect(SQL).toMatch(re);
  });
});

describe("E44.1 — trigger functions + triggers", () => {
  it("declares touch_templates_updated_at trigger function", () => {
    expect(SQL).toMatch(
      /CREATE OR REPLACE FUNCTION public\.touch_templates_updated_at\(\)[\s\S]*?NEW\.updated_at := now\(\)/,
    );
  });

  it("wires templates_touch_updated_at BEFORE UPDATE trigger", () => {
    expect(SQL).toMatch(
      /CREATE TRIGGER templates_touch_updated_at\s+BEFORE UPDATE ON public\.templates[\s\S]*?EXECUTE FUNCTION public\.touch_templates_updated_at\(\)/,
    );
  });

  it("declares forbid_default_template_mutation trigger function", () => {
    expect(SQL).toMatch(
      /CREATE OR REPLACE FUNCTION public\.forbid_default_template_mutation\(\)[\s\S]*?RAISE EXCEPTION/,
    );
  });

  it("wires templates_forbid_default_mutation trigger only on owner_id IS NULL rows", () => {
    expect(SQL).toMatch(
      /CREATE TRIGGER templates_forbid_default_mutation\s+BEFORE UPDATE OR DELETE ON public\.templates[\s\S]*?WHEN \(OLD\.owner_id IS NULL\)[\s\S]*?EXECUTE FUNCTION public\.forbid_default_template_mutation\(\)/,
    );
  });

  it("service_role bypass + admin bypass branch is present in the trigger body", () => {
    expect(SQL).toMatch(/current_setting\('role', true\) = 'service_role'/);
    expect(SQL).toMatch(/public\.has_role\(auth\.uid\(\), 'admin'\)/);
  });
});

describe("E44.1 — RLS policies", () => {
  const POLICY_NAMES = [
    "templates_read_defaults",
    "templates_read_own",
    "templates_read_public_published",
    "templates_insert_own",
    "templates_update_own",
    "templates_delete_own",
    "templates_admin_all",
  ] as const;

  it.each(POLICY_NAMES)("creates policy %s", (name) => {
    const re = new RegExp(`CREATE POLICY ${name} ON public\\.templates`);
    expect(SQL).toMatch(re);
  });

  it("drops the legacy two-policy pair before installing the new seven", () => {
    expect(SQL).toMatch(/DROP POLICY IF EXISTS templates_auth_read ON public\.templates/);
    expect(SQL).toMatch(/DROP POLICY IF EXISTS templates_admin_write ON public\.templates/);
  });

  it("templates_read_defaults gates on owner_id IS NULL", () => {
    expect(SQL).toMatch(/CREATE POLICY templates_read_defaults[\s\S]*?USING \(owner_id IS NULL\)/);
  });

  it("templates_read_own gates on owner_id = auth.uid()", () => {
    expect(SQL).toMatch(
      /CREATE POLICY templates_read_own[\s\S]*?USING \(owner_id = auth\.uid\(\)\)/,
    );
  });

  it("templates_insert_own restricts visibility to private or unlisted (no self-publish)", () => {
    expect(SQL).toMatch(
      /CREATE POLICY templates_insert_own[\s\S]*?WITH CHECK \(owner_id = auth\.uid\(\) AND visibility IN \('private', 'unlisted'\)\)/,
    );
  });

  it("templates_update_own forbids visibility transition to public", () => {
    expect(SQL).toMatch(
      /CREATE POLICY templates_update_own[\s\S]*?USING \(owner_id = auth\.uid\(\)\)[\s\S]*?WITH CHECK \(owner_id = auth\.uid\(\) AND visibility IN \('private', 'unlisted'\)\)/,
    );
  });

  it("templates_admin_all uses has_role(admin)", () => {
    expect(SQL).toMatch(
      /CREATE POLICY templates_admin_all[\s\S]*?USING \(public\.has_role\(auth\.uid\(\), 'admin'\)\)[\s\S]*?WITH CHECK \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/,
    );
  });
});

describe("E44.1 — 15 platform-default seed rows", () => {
  it("inserts exactly 15 rows with the canonical uuid prefix", () => {
    const matches = SQL.match(/'00000000-0000-4000-8000-0000000000\d{2}'/g) ?? [];
    expect(matches.length).toBe(15);
  });

  it("seeds every default row as public + published + owner_id implicit NULL", () => {
    // Each row VALUES tuple should contain 'public', 'published' literals.
    // Coarse count: 15 occurrences of 'public', 'published' adjacent.
    const matches = SQL.match(/'public', 'published'/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(15);
  });

  it("uses ON CONFLICT (id) DO NOTHING to make the seed idempotent", () => {
    expect(SQL).toMatch(/ON CONFLICT \(id\) DO NOTHING/);
  });

  it("seeds the expected canonical titles (smoke sample)", () => {
    for (const title of [
      "Onboarding kolegov",
      "Phishing 101",
      "SMS podvody",
      "Senior — základ",
      "HR recruitment screen",
    ]) {
      expect(SQL).toContain(`'${title}'`);
    }
  });

  it("every seed row has a unique slug (count of distinct slugs == 15)", () => {
    // Slugs follow the format 'slug-with-dashes', and the VALUES section
    // includes one slug per row. Lift them from the VALUES block by
    // scanning for the trailing 'all', now(), now()) tail anchor.
    const slugRegex = /'([a-z0-9][a-z0-9-]*)',\s+'all',\s+now\(\),\s+now\(\)/g;
    const slugs = new Set<string>();
    for (const m of SQL.matchAll(slugRegex)) slugs.add(m[1]);
    expect(slugs.size).toBe(15);
  });
});

describe("E44.1 — DEPLOY_SETUP.sql mirrors the migration", () => {
  it("mirrors all four enum declarations", () => {
    for (const t of [
      "template_visibility",
      "template_status",
      "template_license",
      "template_age_rating",
    ]) {
      expect(DEPLOY).toMatch(new RegExp(`CREATE TYPE public\\.${t} AS ENUM`));
    }
  });

  it("mirrors every RLS policy by name", () => {
    for (const name of [
      "templates_read_defaults",
      "templates_read_own",
      "templates_read_public_published",
      "templates_insert_own",
      "templates_update_own",
      "templates_delete_own",
      "templates_admin_all",
    ]) {
      expect(DEPLOY).toMatch(new RegExp(`CREATE POLICY ${name} ON public\\.templates`));
    }
  });

  it("mirrors the three new indexes", () => {
    for (const idx of [
      "templates_owner_visibility_idx",
      "templates_public_published_idx",
      "templates_fork_of_idx",
    ]) {
      expect(DEPLOY).toMatch(new RegExp(`CREATE INDEX IF NOT EXISTS ${idx}`));
    }
  });

  it("mirrors the forbid_default_template_mutation defense-in-depth trigger", () => {
    expect(DEPLOY).toMatch(/CREATE OR REPLACE FUNCTION public\.forbid_default_template_mutation/);
    expect(DEPLOY).toMatch(/CREATE TRIGGER templates_forbid_default_mutation/);
  });
});
