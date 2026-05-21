import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// E48.1 contract test — deterministic grep over the migration SQL.
// No DB connection required. Asserts that every CRITICAL/HIGH finding
// from the Phase-A pre-implementation review is concretely addressed in
// the migration text. See tasks/stories/E48.1-tickets-schema-migration.md
// AC-10 for the full checklist this test enforces.

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521260000_e48_1_support_tickets_schema.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("E48.1 — support_tickets schema migration contract", () => {
  describe("required extensions", () => {
    it("enables pgcrypto (idempotent)", () => {
      expect(SQL).toMatch(/CREATE EXTENSION IF NOT EXISTS pgcrypto/);
    });
  });

  describe("enums", () => {
    it("declares support_ticket_status with the six values from PLAN (incl. reopened from M-DB1)", () => {
      const m = SQL.match(/CREATE TYPE public\.support_ticket_status AS ENUM \(([\s\S]*?)\)/);
      expect(m).not.toBeNull();
      const values = (m![1].match(/'[^']+'/g) ?? []).map((s) => s.replace(/'/g, ""));
      expect(values).toEqual([
        "new",
        "in_progress",
        "waiting_user",
        "resolved",
        "reopened",
        "archived",
      ]);
    });

    it("declares support_ticket_category with the seven values", () => {
      const m = SQL.match(/CREATE TYPE public\.support_ticket_category AS ENUM \(([\s\S]*?)\)/);
      expect(m).not.toBeNull();
      const values = (m![1].match(/'[^']+'/g) ?? []).map((s) => s.replace(/'/g, ""));
      expect(values.sort()).toEqual([
        "abuse_report",
        "billing",
        "bug",
        "feature_request",
        "gdpr",
        "other",
        "question",
      ]);
    });

    it("declares support_ticket_source enum (H-DB1: replaces free-text)", () => {
      expect(SQL).toMatch(/CREATE TYPE public\.support_ticket_source AS ENUM/);
    });

    it("scan_status enum is collapsed to ('clean', 'error') only — C-DB1 / D-1", () => {
      const m = SQL.match(/CREATE TYPE public\.support_attachment_scan_status AS ENUM \(([\s\S]*?)\)/);
      expect(m).not.toBeNull();
      const values = (m![1].match(/'[^']+'/g) ?? []).map((s) => s.replace(/'/g, ""));
      expect(values.sort()).toEqual(["clean", "error"]);
    });
  });

  describe("dropped columns from Phase-A review (C-DB1, L-S2, L-DB1)", () => {
    // The header comment intentionally documents that these columns were
    // dropped, so a naive grep against the whole SQL would false-positive.
    // We check that they do NOT appear inside the attachments table DDL.
    const attachmentsTable = SQL.match(
      /CREATE TABLE IF NOT EXISTS public\.support_ticket_attachments \(([\s\S]*?)\);/,
    )?.[1];

    it("attachments table DDL was found", () => {
      expect(attachmentsTable).toBeDefined();
    });

    it("attachments DDL does NOT contain a scan_provider column", () => {
      expect(attachmentsTable!).not.toMatch(/\bscan_provider\b/);
    });

    it("attachments DDL does NOT contain a scan_result column", () => {
      expect(attachmentsTable!).not.toMatch(/\bscan_result\b/);
    });
  });

  describe("tables and constraints", () => {
    const tables = [
      "support_tickets",
      "support_ticket_messages",
      "support_ticket_attachments",
      "admin_notification_preferences",
    ];

    it.each(tables)("creates %s", (name) => {
      expect(SQL).toContain(`CREATE TABLE IF NOT EXISTS public.${name}`);
    });

    it.each(tables)("enables RLS on %s", (name) => {
      expect(SQL).toMatch(new RegExp(`ALTER TABLE public\\.${name} ENABLE ROW LEVEL SECURITY`));
    });

    it("subject and body are length-bounded on support_tickets", () => {
      expect(SQL).toMatch(/subject text NOT NULL CHECK \(char_length\(subject\) BETWEEN 1 AND 200\)/);
      expect(SQL).toMatch(/body text NOT NULL CHECK \(char_length\(body\) BETWEEN 1 AND 5000\)/);
    });

    it("submitter_email has both length cap (5–254, M-S2) and email-regex check", () => {
      expect(SQL).toMatch(/char_length\(submitter_email\) BETWEEN 5 AND 254/);
      expect(SQL).toMatch(/submitter_email ~ '\^\[\^@\]\+@\[\^@\]\+\\\.\[\^@\]\+\$'/);
    });

    it("view_token_hash is column-level CHECK-constrained to 64 hex chars (L-DB2)", () => {
      expect(SQL).toMatch(/view_token_hash text NOT NULL CHECK \(view_token_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/);
    });

    it("view_token_invalidated_at revocation column exists (H-S3)", () => {
      expect(SQL).toMatch(/view_token_invalidated_at timestamptz/);
    });

    it("assigned_to is ON DELETE SET NULL (C-DB2)", () => {
      expect(SQL).toMatch(/assigned_to uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/);
    });

    it("filename allowed-char regex on attachments (M-S1 storage-path safety)", () => {
      expect(SQL).toMatch(/filename text NOT NULL CHECK \([\s\S]*?filename ~ '\^\[A-Za-z0-9\._\\\-\]\+\$'/);
    });

    it("size_bytes capped at 5 MiB", () => {
      expect(SQL).toMatch(/size_bytes integer NOT NULL CHECK \(size_bytes > 0 AND size_bytes <= 5242880\)/);
    });

    it("admin_notification_preferences.channels jsonb has CHECK for required keys (M-DB3)", () => {
      expect(SQL).toMatch(/channels jsonb NOT NULL[\s\S]*?CHECK \(channels \? 'email' AND channels \? 'in_app'\)/);
    });

    it("admin_notification_preferences.per_category jsonb has all seven category keys (M-DB3)", () => {
      expect(SQL).toMatch(
        /per_category[\s\S]*?CHECK \(per_category \?& ARRAY\['bug','question','feature_request','abuse_report','billing','gdpr','other'\]\)/,
      );
    });
  });

  describe("indexes (H-DB2, H-DB3)", () => {
    it("partial admin working-set index excludes deleted+archived", () => {
      expect(SQL).toMatch(
        /CREATE INDEX IF NOT EXISTS support_tickets_admin_working_set_idx[\s\S]*?WHERE deleted_at IS NULL AND archived_at IS NULL/,
      );
    });

    it("lower(submitter_email) index for GDPR Art. 17 lookup", () => {
      expect(SQL).toMatch(
        /CREATE INDEX IF NOT EXISTS support_tickets_submitter_email_lower_idx[\s\S]*?lower\(submitter_email\)/,
      );
    });

    it("GIN full-text index for admin search", () => {
      expect(SQL).toMatch(/USING GIN \(to_tsvector\('simple', subject \|\| ' ' \|\| body\)\)/);
    });
  });

  describe("RLS — anon is fully REVOKE'd; only RPCs allow anon writes/reads", () => {
    it("REVOKEs all from anon on all three ticketing tables", () => {
      expect(SQL).toMatch(/REVOKE ALL ON public\.support_tickets FROM anon/);
      expect(SQL).toMatch(/REVOKE ALL ON public\.support_ticket_messages FROM anon/);
      expect(SQL).toMatch(/REVOKE ALL ON public\.support_ticket_attachments FROM anon/);
    });

    it("admin_notification_preferences is fully closed to anon AND authenticated", () => {
      expect(SQL).toMatch(/REVOKE ALL ON public\.admin_notification_preferences FROM anon, authenticated/);
    });

    it("no anon INSERT policy exists on any support table (C-S1 closure)", () => {
      expect(SQL).not.toMatch(/POLICY [^ ]+ ON public\.support_tickets[\s\S]*?TO anon[\s\S]*?FOR INSERT/);
    });

    it("the eight named RLS policies are all declared", () => {
      const expected = [
        "support_tickets_user_select",
        "support_tickets_user_insert",
        "support_tickets_admin_all",
        "support_ticket_messages_user_select",
        "support_ticket_messages_user_insert",
        "support_ticket_messages_admin_all",
        "support_ticket_attachments_user_select",
        "support_ticket_attachments_admin_all",
        "admin_notification_preferences_owner_select",
        "admin_notification_preferences_owner_insert",
        "admin_notification_preferences_owner_update",
      ];
      for (const name of expected) {
        expect(SQL).toContain(`CREATE POLICY ${name}`);
      }
    });
  });

  describe("RPCs — four total; correct SECURITY DEFINER + GRANTs", () => {
    const rpcs = [
      { name: "submit_support_ticket", grants: ["service_role", "authenticated"], revoked: "anon" },
      {
        name: "get_ticket_thread_for_view_token",
        grants: ["anon", "authenticated"],
        revoked: null, // explicitly grants anon for token-gated reads
      },
      { name: "request_attachment_signed_url", grants: ["authenticated"], revoked: "anon" },
      { name: "transition_ticket_status", grants: ["authenticated"], revoked: "anon" },
    ];

    it.each(rpcs)("declares $name as SECURITY DEFINER", ({ name }) => {
      const r = new RegExp(
        `CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\)[\\s\\S]*?SECURITY DEFINER`,
      );
      expect(SQL).toMatch(r);
    });

    it("submit_support_ticket validates auth.role() branching (anon = service_role only)", () => {
      const fnBody = SQL.match(
        /CREATE OR REPLACE FUNCTION public\.submit_support_ticket\([\s\S]*?\$\$;/,
      )?.[0];
      expect(fnBody).toBeDefined();
      expect(fnBody!).toMatch(/auth\.role\(\)/);
      expect(fnBody!).toMatch(/service_role/);
      expect(fnBody!).toMatch(/authenticated/);
      // server-side view_token generation, never user-supplied (C-S1)
      expect(fnBody!).toMatch(/gen_random_bytes\(32\)/);
      expect(fnBody!).toMatch(/digest\([^,]+, 'sha256'\)/);
    });

    it("request_attachment_signed_url enforces admin AND aal2 AND scan_status='clean'", () => {
      const fnBody = SQL.match(
        /CREATE OR REPLACE FUNCTION public\.request_attachment_signed_url\([\s\S]*?\$\$;/,
      )?.[0];
      expect(fnBody).toBeDefined();
      expect(fnBody!).toMatch(/has_role\(v_uid, 'admin'\)/);
      expect(fnBody!).toMatch(/auth\.jwt\(\) ->> 'aal'/);
      expect(fnBody!).toMatch(/'aal2'/);
      expect(fnBody!).toMatch(/scan_status <> 'clean'/);
    });

    it("transition_ticket_status enforces the legal-transitions state machine", () => {
      const fnBody = SQL.match(
        /CREATE OR REPLACE FUNCTION public\.transition_ticket_status\([\s\S]*?\$\$;/,
      )?.[0];
      expect(fnBody).toBeDefined();
      // Sample legal transitions from PLAN
      expect(fnBody!).toMatch(/v_old_status = 'new' AND p_new_status = 'in_progress'/);
      expect(fnBody!).toMatch(/v_old_status = 'resolved' AND p_new_status IN \('reopened', 'archived'\)/);
    });

    it.each(rpcs.filter((r) => r.revoked))(
      "REVOKEs $name from $revoked",
      ({ name, revoked }) => {
        expect(SQL).toMatch(
          new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${name}\\([\\s\\S]*?\\) FROM[^;]*?${revoked}`),
        );
      },
    );

    it.each(rpcs)("GRANTs $name EXECUTE to $grants", ({ name, grants }) => {
      const r = new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([\\s\\S]*?\\) TO[^;]+`);
      const m = SQL.match(r);
      expect(m).not.toBeNull();
      for (const g of grants) {
        expect(m![0]).toContain(g);
      }
    });
  });

  describe("triggers", () => {
    it("immutability + audit trigger fires BEFORE UPDATE on support_tickets", () => {
      expect(SQL).toMatch(/BEFORE UPDATE ON public\.support_tickets[\s\S]*?support_tickets_immutability_and_audit/);
    });

    it("notification fan-out trigger fires AFTER INSERT on support_tickets (H-S4)", () => {
      expect(SQL).toMatch(/AFTER INSERT ON public\.support_tickets[\s\S]*?enqueue_admin_notifications_for_ticket/);
    });

    it("immutability trigger blocks edits to subject/body/email/name/view_token", () => {
      const fnBody = SQL.match(
        /CREATE OR REPLACE FUNCTION public\.support_tickets_immutability_and_audit\([\s\S]*?\$\$;/,
      )?.[0];
      expect(fnBody).toBeDefined();
      for (const col of [
        "subject",
        "body",
        "submitter_email",
        "submitter_name",
        "view_token_hash",
        "view_token_expires_at",
      ]) {
        expect(fnBody!).toContain(`NEW.${col} IS DISTINCT FROM OLD.${col}`);
      }
      expect(fnBody!).toMatch(/RAISE EXCEPTION 'immutable_field_changed/);
    });

    it("notification fan-out inserts a row per opted-in admin (server-side, not browser)", () => {
      const fnBody = SQL.match(
        /CREATE OR REPLACE FUNCTION public\.enqueue_admin_notifications_for_ticket\([\s\S]*?\$\$;/,
      )?.[0];
      expect(fnBody).toBeDefined();
      expect(fnBody!).toMatch(/INSERT INTO public\.notifications/);
      expect(fnBody!).toMatch(/admin_notification_preferences/);
      expect(fnBody!).toMatch(/p\.enabled = true/);
      expect(fnBody!).toMatch(/per_category ->> NEW\.category::text/);
      expect(fnBody!).toMatch(/channels ->> 'in_app'/);
      expect(fnBody!).toMatch(/pg_notify\(\s*'support_tickets_admin'/);
    });
  });
});
