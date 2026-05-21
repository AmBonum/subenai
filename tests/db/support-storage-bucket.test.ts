import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// E48.2 contract test — deterministic grep over the Storage bucket migration.
// Asserts that the support-attachments bucket is provisioned as PRIVATE and
// that only the admin-SELECT policy is declared (INSERT/DELETE deliberately
// go through service-role; absence-of-policy = deny by default).
//
// Pairs with tests/db/support-tickets-schema.test.ts (which covers E48.1).

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521270000_e48_2_support_storage_bucket.sql",
);
const DEPLOY_SETUP_PATH = resolve(__dirname, "../../DEPLOY_SETUP.sql");

const SQL = readFileSync(MIGRATION_PATH, "utf8");
const DEPLOY_SQL = readFileSync(DEPLOY_SETUP_PATH, "utf8");

describe("E48.2 — support-attachments storage bucket migration", () => {
  it("provisions the bucket idempotently with public=false", () => {
    expect(SQL).toMatch(
      /INSERT INTO storage\.buckets \(id, name, public\)\s+VALUES \('support-attachments', 'support-attachments', false\)\s+ON CONFLICT \(id\) DO NOTHING/,
    );
  });

  it("public flag is explicitly false (never true)", () => {
    // Defence against an accidental copy from blog-images bucket (which is public)
    expect(SQL).not.toMatch(/VALUES \('support-attachments', 'support-attachments', true\)/);
  });

  it("declares ONE admin SELECT policy and no other policies", () => {
    const policies = (SQL.match(/CREATE POLICY "[^"]+"/g) ?? []).map((m) =>
      m.replace(/CREATE POLICY "(.+)"/, "$1"),
    );
    expect(policies).toEqual(["support_attachments_admin_select"]);
  });

  it("admin SELECT policy is gated by bucket_id + has_role(admin)", () => {
    expect(SQL).toMatch(
      /CREATE POLICY "support_attachments_admin_select"[\s\S]*?ON storage\.objects FOR SELECT TO authenticated[\s\S]*?bucket_id = 'support-attachments' AND public\.has_role\(auth\.uid\(\), 'admin'\)/,
    );
  });

  it("does NOT declare any INSERT/UPDATE/DELETE policy on the bucket", () => {
    const insertPolicies = SQL.match(/CREATE POLICY[^;]+FOR INSERT/g) ?? [];
    const updatePolicies = SQL.match(/CREATE POLICY[^;]+FOR UPDATE/g) ?? [];
    const deletePolicies = SQL.match(/CREATE POLICY[^;]+FOR DELETE/g) ?? [];
    expect(insertPolicies).toHaveLength(0);
    expect(updatePolicies).toHaveLength(0);
    expect(deletePolicies).toHaveLength(0);
  });

  it("is idempotent — drop-policy precedes create-policy", () => {
    const dropIdx = SQL.indexOf('DROP POLICY IF EXISTS "support_attachments_admin_select"');
    const createIdx = SQL.indexOf('CREATE POLICY "support_attachments_admin_select"');
    expect(dropIdx).toBeGreaterThan(0);
    expect(createIdx).toBeGreaterThan(dropIdx);
  });
});

describe("E48.2 — DEPLOY_SETUP.sql mirrors the bucket migration", () => {
  const markers = [
    "INSERT INTO storage.buckets (id, name, public)",
    "'support-attachments', 'support-attachments', false",
    'DROP POLICY IF EXISTS "support_attachments_admin_select" ON storage.objects',
    'CREATE POLICY "support_attachments_admin_select"',
  ];

  it.each(markers)("%s appears in DEPLOY_SETUP", (snippet) => {
    expect(DEPLOY_SQL).toContain(snippet);
  });

  it("DEPLOY_SETUP also bans accidental public=true for support-attachments", () => {
    expect(DEPLOY_SQL).not.toMatch(/VALUES \('support-attachments', 'support-attachments', true\)/);
  });
});
