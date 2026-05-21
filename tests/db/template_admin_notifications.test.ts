// E44 Phase C — DB contract test for template_admin_notifications + Phase D
// anon_public_read migrations. Regex sweep over the migration SQL files plus
// a mirror sweep over DEPLOY_SETUP.sql. No live DB needed — the contract is
// the SQL text. Future drift (someone deletes a policy / changes a role /
// drops the SECURITY DEFINER attribute) fails closed here.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PHASE_C_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521160000_template_admin_notifications.sql",
);
const PHASE_D_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521170000_templates_anon_public_read.sql",
);
const DEPLOY_PATH = resolve(__dirname, "../../DEPLOY_SETUP.sql");

let PHASE_C = "";
let PHASE_D = "";
let DEPLOY = "";

beforeAll(() => {
  PHASE_C = readFileSync(PHASE_C_PATH, "utf8");
  PHASE_D = readFileSync(PHASE_D_PATH, "utf8");
  DEPLOY = readFileSync(DEPLOY_PATH, "utf8");
});

describe("E44.11 — notifications.kind column + CHECK constraint", () => {
  it("adds kind text column with default 'user'", () => {
    expect(PHASE_C).toMatch(/ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'user'/);
  });

  it("adds CHECK constraint allowing only 'user' or 'admin'", () => {
    expect(PHASE_C).toMatch(/notifications_kind_check/);
    expect(PHASE_C).toMatch(/CHECK \(kind IN \('user', 'admin'\)\)/);
  });

  it("uses NOT VALID + VALIDATE to avoid a long exclusive lock", () => {
    expect(PHASE_C).toMatch(/CHECK \(kind IN \('user', 'admin'\)\) NOT VALID/);
    expect(PHASE_C).toMatch(/VALIDATE CONSTRAINT notifications_kind_check/);
  });

  it("adds the partial index for admin-unread badge counting", () => {
    expect(PHASE_C).toMatch(
      /CREATE INDEX IF NOT EXISTS notifications_admin_unread_idx[\s\S]*WHERE kind = 'admin' AND read_at IS NULL/,
    );
  });
});

describe("E44.11 — notify_admins fan-out function", () => {
  it("declares notify_admins(text, text, text, uuid) SECURITY DEFINER", () => {
    expect(PHASE_C).toMatch(
      /CREATE OR REPLACE FUNCTION public\.notify_admins\([\s\S]*?\)[\s\S]*?SECURITY DEFINER/,
    );
  });

  it("filters user_roles WHERE role = 'admin'::public.app_role", () => {
    expect(PHASE_C).toMatch(
      /FROM public\.user_roles[\s\S]*WHERE ur\.role = 'admin'::public\.app_role/,
    );
  });

  it("sets kind='admin' on the inserted rows (defense in depth)", () => {
    expect(PHASE_C).toMatch(/INSERT INTO public\.notifications[\s\S]*?'admin'/);
  });

  it("revokes execute from PUBLIC and grants to authenticated + service_role", () => {
    expect(PHASE_C).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.notify_admins\(text, text, text, uuid\) FROM PUBLIC/,
    );
    expect(PHASE_C).toMatch(
      /GRANT\s+EXECUTE ON FUNCTION public\.notify_admins\(text, text, text, uuid\)[\s\S]*?TO authenticated, service_role/,
    );
  });
});

describe("E44.11 — template_submissions trigger", () => {
  it("creates AFTER INSERT OR UPDATE OF status trigger", () => {
    expect(PHASE_C).toMatch(
      /CREATE TRIGGER template_submissions_notify_admins[\s\S]*?AFTER INSERT OR UPDATE OF status ON public\.template_submissions/,
    );
  });

  it("trigger function returns early for non-pending status (no fan-out)", () => {
    expect(PHASE_C).toMatch(/IF NEW\.status <> 'pending' THEN[\s\S]*?RETURN NEW/);
  });

  it("trigger function suppresses pending→pending no-ops on UPDATE", () => {
    expect(PHASE_C).toMatch(
      /IF TG_OP = 'UPDATE' THEN[\s\S]*?IF OLD\.status = 'pending' THEN[\s\S]*?RETURN NEW/,
    );
  });
});

describe("E44.10 — approve_template_submission RPC", () => {
  it("declares the function with uuid arg and SECURITY DEFINER", () => {
    expect(PHASE_C).toMatch(
      /CREATE OR REPLACE FUNCTION public\.approve_template_submission\(\s*p_submission_id uuid\s*\)[\s\S]*?SECURITY DEFINER/,
    );
  });

  it("re-checks has_role(auth.uid(), 'admin') (defense in depth)", () => {
    expect(PHASE_C).toMatch(
      /IF NOT public\.has_role\(v_admin, 'admin'::public\.app_role\) THEN[\s\S]*?RAISE EXCEPTION 'forbidden/,
    );
  });

  it("raises on illegal state transition (non-pending submission)", () => {
    expect(PHASE_C).toMatch(/illegal_state: submission is %, expected pending/);
  });

  it("flips template to public+published with author/age_rating/license snapshot", () => {
    expect(PHASE_C).toMatch(
      /UPDATE public\.templates[\s\S]*?visibility = 'public'[\s\S]*?status = 'published'[\s\S]*?author_display_name = v_submission\.author_display_name/,
    );
  });

  it("writes audit_log entry with template_submission.approved action", () => {
    expect(PHASE_C).toMatch(/INSERT INTO public\.audit_log[\s\S]*?'template_submission\.approved'/);
  });

  it("revokes from PUBLIC, grants to authenticated only", () => {
    expect(PHASE_C).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.approve_template_submission\(uuid\) FROM PUBLIC/,
    );
    expect(PHASE_C).toMatch(
      /GRANT\s+EXECUTE ON FUNCTION public\.approve_template_submission\(uuid\) TO authenticated/,
    );
  });
});

describe("E44.10 — reject_template_submission RPC", () => {
  it("requires reason ≥ 3 chars", () => {
    expect(PHASE_C).toMatch(
      /IF p_reason IS NULL OR length\(btrim\(p_reason\)\) < 3 THEN[\s\S]*?RAISE EXCEPTION 'reason_required/,
    );
  });

  it("trims the reason before persisting", () => {
    expect(PHASE_C).toMatch(/rejection_reason = btrim\(p_reason\)/);
  });

  it("writes audit_log entry with template_submission.rejected action", () => {
    expect(PHASE_C).toMatch(/INSERT INTO public\.audit_log[\s\S]*?'template_submission\.rejected'/);
  });

  it("re-checks has_role admin before doing anything", () => {
    expect(PHASE_C).toMatch(
      /CREATE OR REPLACE FUNCTION public\.reject_template_submission\([\s\S]*?\)[\s\S]*?BEGIN[\s\S]*?IF NOT public\.has_role/,
    );
  });
});

describe("E44 Phase D — anon read RLS migration", () => {
  it("creates templates_anon_read_defaults policy TO anon with owner_id IS NULL predicate", () => {
    expect(PHASE_D).toMatch(
      /CREATE POLICY templates_anon_read_defaults ON public\.templates\s+FOR SELECT TO anon\s+USING \(owner_id IS NULL\)/,
    );
  });

  it("creates templates_anon_read_public_published policy TO anon with public+published predicate", () => {
    expect(PHASE_D).toMatch(
      /CREATE POLICY templates_anon_read_public_published ON public\.templates\s+FOR SELECT TO anon\s+USING \(visibility = 'public' AND status = 'published'\)/,
    );
  });

  it("does NOT touch the existing authenticated policies (smallest reviewable diff)", () => {
    expect(PHASE_D).not.toMatch(/DROP POLICY/);
    expect(PHASE_D).not.toMatch(/ALTER POLICY/);
  });

  it("does NOT grant anon read on private templates or template_submissions", () => {
    // Strip SQL comments before scanning so the explanatory header
    // (which mentions both 'template_submissions' and 'private' to
    // document what the migration explicitly does NOT grant) doesn't
    // trigger the regex. Only the executable SQL must stay clean.
    const exec = PHASE_D.replace(/^\s*--.*$/gm, "");
    expect(exec).not.toMatch(/CREATE POLICY[\s\S]*?template_submissions/i);
    expect(exec).not.toMatch(/USING[\s\S]*?visibility = 'private'/);
  });
});

describe("DEPLOY_SETUP.sql mirrors both Phase C and Phase D", () => {
  it("includes the Phase C notifications.kind column add", () => {
    expect(DEPLOY).toMatch(/ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'user'/);
  });

  it("includes the Phase C notify_admins function", () => {
    expect(DEPLOY).toMatch(
      /CREATE OR REPLACE FUNCTION public\.notify_admins\([\s\S]*?\)[\s\S]*?SECURITY DEFINER/,
    );
  });

  it("includes the Phase C approve_template_submission RPC", () => {
    expect(DEPLOY).toMatch(/CREATE OR REPLACE FUNCTION public\.approve_template_submission\(/);
  });

  it("includes the Phase C reject_template_submission RPC", () => {
    expect(DEPLOY).toMatch(/CREATE OR REPLACE FUNCTION public\.reject_template_submission\(/);
  });

  it("includes the Phase D anon read policies (idempotent IF NOT EXISTS guards)", () => {
    expect(DEPLOY).toMatch(/templates_anon_read_defaults/);
    expect(DEPLOY).toMatch(/templates_anon_read_public_published/);
    expect(DEPLOY).toMatch(/FOR SELECT TO anon/);
  });

  // Lesson encoded for the next person who writes a policy-existence guard:
  // pg_policies (the user-facing VIEW) uses column `policyname`.
  // pg_policy (the low-level system TABLE) uses column `polname`.
  // They are NOT interchangeable. The original Phase D DEPLOY_SETUP mirror
  // landed with `polname` on `pg_policies` and would have aborted any
  // fresh-DB bootstrap with `column "polname" does not exist`.
  it("uses pg_policies.policyname (NOT polname) in the Phase D existence guards", () => {
    // Both DO blocks must reference policyname.
    const guards = DEPLOY.match(
      /SELECT 1 FROM pg_policies[\s\S]*?templates_anon_read_(?:defaults|public_published)/g,
    );
    expect(guards).not.toBeNull();
    expect(guards!.length).toBe(2);
    for (const guard of guards!) {
      expect(guard).toMatch(/policyname\s*=/);
      expect(guard).not.toMatch(/\bpolname\s*=/);
    }
  });
});
