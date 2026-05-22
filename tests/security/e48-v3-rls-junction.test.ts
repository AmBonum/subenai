// E48-v3 RLS integration — support_ticket_assignees junction table.
//
// These tests call the real Supabase instance via the anon/service keys.
// They are skipped when VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env
// vars are absent (local runs without .env). CI passes with secrets
// configured; the schema-invariants job gates on these.
//
// Assertion philosophy: we verify the *access control boundary*, not
// business logic. Each test attempts an operation the anon role must
// never perform and asserts that Supabase rejects it. A null/empty
// result on SELECT is also acceptable (RLS returning no rows = effective
// denial for a table the anon user owns nothing in).
//
// IMPORTANT: createClient is called inside each test (not at describe scope)
// so that describe.skipIf can abort before any client construction is
// attempted when env vars are absent.

import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

describe.skipIf(!SUPABASE_URL || !ANON_KEY)("E48-v3 RLS — support_ticket_assignees", () => {
  it("anon SELECT returns empty array (RLS hides all rows)", async () => {
    const anon = createClient(SUPABASE_URL!, ANON_KEY!);
    const { data, error } = await anon.from("support_ticket_assignees").select("*");
    // Either no error + empty rows (RLS filters), or a permission error.
    if (error) {
      expect(error.code).toBeDefined();
    } else {
      expect(data?.length ?? 0).toBe(0);
    }
  });

  it("anon INSERT is denied", async () => {
    const anon = createClient(SUPABASE_URL!, ANON_KEY!);
    const { error } = await anon.from("support_ticket_assignees").insert({
      ticket_id: ZERO_UUID,
      user_id: ZERO_UUID,
    });
    expect(error).toBeTruthy();
  });

  it("anon DELETE is denied", async () => {
    const anon = createClient(SUPABASE_URL!, ANON_KEY!);
    const { error } = await anon
      .from("support_ticket_assignees")
      .delete()
      .eq("ticket_id", ZERO_UUID);
    expect(error).toBeTruthy();
  });

  it("anon RPC assign_admin_to_ticket is denied", async () => {
    const anon = createClient(SUPABASE_URL!, ANON_KEY!);
    const { error } = await anon.rpc("assign_admin_to_ticket", {
      p_ticket_id: ZERO_UUID,
      p_user_id: ZERO_UUID,
    });
    expect(error).toBeTruthy();
  });

  it("anon RPC unassign_admin_from_ticket is denied", async () => {
    const anon = createClient(SUPABASE_URL!, ANON_KEY!);
    const { error } = await anon.rpc("unassign_admin_from_ticket", {
      p_ticket_id: ZERO_UUID,
      p_user_id: ZERO_UUID,
    });
    expect(error).toBeTruthy();
  });

  it("anon RPC list_admin_users is denied or returns empty array", async () => {
    const anon = createClient(SUPABASE_URL!, ANON_KEY!);
    const { data, error } = await anon.rpc("list_admin_users");
    if (error) {
      expect(error).toBeTruthy();
    } else {
      // If not denied outright, the function must return no rows for anon.
      expect(Array.isArray(data) ? data.length : 0).toBe(0);
    }
  });

  it("anon RPC request_attachment_signed_url is denied", async () => {
    const anon = createClient(SUPABASE_URL!, ANON_KEY!);
    const { error } = await anon.rpc("request_attachment_signed_url", {
      p_attachment_id: ZERO_UUID,
      p_inline: true,
    });
    expect(error).toBeTruthy();
  });
});

describe.skipIf(!SUPABASE_URL || !SERVICE_KEY)(
  "E48-v3 RLS — support_ticket_assignees (service role baseline)",
  () => {
    it("service role can read support_ticket_assignees (table exists, RLS not blocking service key)", async () => {
      const service = createClient(SUPABASE_URL!, SERVICE_KEY!);
      const { error } = await service
        .from("support_ticket_assignees")
        .select("ticket_id, user_id")
        .limit(1);
      // Service role bypasses RLS — any error here means the table doesn't
      // exist or the service key is wrong. Either way this fails the suite.
      expect(error).toBeNull();
    });
  },
);
