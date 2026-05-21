// E48 incident response — assert critical RPCs and tables exist in
// production Supabase. Catches partial-migration apply scenarios that
// mock-based tests miss by design.
//
// THE PROBLEM THIS SOLVES:
//   Production /kontakt returned 500 with PG error 42883 (undefined_function)
//   because `submit_support_ticket(jsonb)` was missing despite the migration
//   SQL reporting "Success. No rows returned". All existing mocked tests passed.
//   This test calls the real PostgREST layer and fails if the function is absent.
//
// RUNS AGAINST PRODUCTION via:
//   VITE_SUPABASE_URL     — the project URL (already in .env for local dev)
//   PROD_INVARIANT_CHECK_KEY — a Supabase key with at minimum:
//       - EXECUTE on public.__test_introspect_function (service_role)
//   Fallback: SUPABASE_SERVICE_ROLE_KEY is accepted if PROD_INVARIANT_CHECK_KEY
//   is not separately provisioned (service_role already has the grant).
//
// SKIPPED (not failed) when either env var is absent so local `npm test`
// works without prod creds. CI sets both via GitHub Actions secrets.
//
// OPERATOR STEPS TO ACTIVATE (required after merge):
//   1. In the Supabase SQL editor run the helper migration:
//        supabase/migrations/20260522120000_test_introspect_function.sql
//      This creates public.__test_introspect_function (service_role only).
//   2. In GitHub → repo Settings → Secrets → Actions, add:
//        VITE_SUPABASE_URL       (same value as in Cloudflare Pages env)
//        PROD_INVARIANT_CHECK_KEY (the service_role key, or a narrow key)
//   3. Add the step from .github/workflows/ci.yml (see the "Schema invariants"
//      step added in this PR) — it's already wired, just needs the secrets.
//   4. On every future migration: after applying in the SQL editor, re-run
//        npx vitest run tests/db/prod-schema-invariants.test.ts
//      with the env vars set. If it fails, the migration did not fully apply.

import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.PROD_INVARIANT_CHECK_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Each tuple: [rpc_name, expected_pg_get_function_arguments output]
// Source of truth: the migration SQL CREATE OR REPLACE FUNCTION signatures.
const EXPECTED_RPCS: Array<[string, string]> = [
  ["submit_support_ticket", "p_payload jsonb"],
  [
    "get_ticket_thread_for_view_token",
    "p_ticket_id uuid, p_view_token text, p_ip_country text DEFAULT NULL::text",
  ],
  ["request_attachment_signed_url", "p_attachment_id uuid"],
  [
    "transition_ticket_status",
    "p_ticket_id uuid, p_new_status public.support_ticket_status, p_note text DEFAULT NULL::text",
  ],
];

const EXPECTED_TABLES = [
  "support_tickets",
  "support_ticket_messages",
  "support_ticket_attachments",
  "admin_notification_preferences",
];

describe.skipIf(!url || !key)("prod schema invariants (E48 incident response)", () => {
  const sb = createClient(url!, key!, { auth: { persistSession: false } });

  describe("RPCs — existence + signature (catches partial-migration apply)", () => {
    it.each(EXPECTED_RPCS)(
      "RPC %s exists with correct argument signature",
      async (name, expectedArgs) => {
        const { data, error } = await sb.rpc("__test_introspect_function", {
          p_name: name,
        });
        expect(
          error,
          `__test_introspect_function failed — is the helper migration applied? error: ${error?.message}`,
        ).toBeNull();
        expect(
          (data as Array<{ args: string; returns: string }> | null)?.length,
          `RPC "${name}" not found in pg_proc — migration may be partially applied`,
        ).toBe(1);
        const row = (data as Array<{ args: string; returns: string }>)[0];
        expect(row.args).toBe(expectedArgs);
      },
    );
  });

  describe("tables — SELECT access (catches missing table or broken RLS)", () => {
    it.each(EXPECTED_TABLES)(
      "table %s is reachable via PostgREST (returns no error on count query)",
      async (table) => {
        const { error } = await sb.from(table).select("count").limit(0);
        expect(
          error,
          `Table "${table}" unreachable — migration may not have applied or RLS blocks service_role: ${error?.message}`,
        ).toBeNull();
      },
    );
  });

  describe("PostgREST schema cache (catches stale cache after migration)", () => {
    it("submit_support_ticket is callable without 42883 (undefined_function) error", async () => {
      // We intentionally call with a payload that should fail validation,
      // NOT a missing-function error. 42883 = undefined_function (the incident).
      // Any non-42883 error (e.g. validation, permission) proves the function exists.
      const { error } = await sb.rpc("submit_support_ticket", {
        p_payload: { _probe: true },
      });
      // The call may succeed or fail — what we assert is the ABSENCE of 42883.
      // A valid call with a real ticket would need Turnstile + RLS context;
      // the probe just confirms the function is registered in PostgREST.
      if (error) {
        expect(
          error.code,
          `Got 42883 (undefined_function) — RPC missing from production DB`,
        ).not.toBe("42883");
      }
    });
  });
});
