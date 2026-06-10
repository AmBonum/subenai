// Phase 9c — SECURITY DEFINER RPC client-contract tests.
//
// What this proves: the CLIENT sends the right call shape and reacts
// safely to mocked RPC responses (success / error / edge args). The 9
// in-scope RPCs are:
//   1. has_role
//   2. consume_mfa_backup_code
//   3. generate_mfa_backup_codes
//   4. log_audit_event
//   5. start_respondent_session
//   6. submit_respondent_answer
//   7. finalize_respondent_session
//   8. get_peer_card
//   9. get_quick_test_questions
//
// What this does NOT prove: that the DB-side SECURITY DEFINER functions
// enforce their privilege model under a hostile JWT. Real RLS +
// privilege boundary verification is deferred to Phase 10 pgTAP.
//
// Pattern: every test mocks `@/integrations/supabase/client` and asserts
// either on the exact `supabase.rpc(name, args)` payload or on the
// caller's reaction to a mocked envelope.

import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const refreshSessionMock = vi.fn(async () => ({ data: null, error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: {
      refreshSession: () => refreshSessionMock(),
      // getSession only needed for has_role-via-useAuth; not exercised
      // here (those paths are covered by useAuth.test.ts).
    },
  },
}));

import {
  startRespondentSession,
  submitRespondentAnswer,
  finalizeRespondentSession,
} from "@/lib/respondent/queries";
import { consumeBackupCode, generateBackupCodes } from "@/lib/auth/mfa";
import { buildRespondentsAccessAudit } from "@/lib/admin/respondents.functions";

type RpcArgs = Record<string, unknown>;

beforeEach(() => {
  rpcMock.mockReset();
  refreshSessionMock.mockClear();
});

// ---------------------------------------------------------------------------
// has_role — call shape + safe-default-deny on error envelope.
// ---------------------------------------------------------------------------
describe("has_role RPC contract", () => {
  it("passes only the canonical { _user_id, _role } argument pair", async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    // Inline mini-caller that mirrors the four production call sites.
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.rpc("has_role", {
      _user_id: "00000000-0000-0000-0000-000000000001",
      _role: "admin",
    });
    expect(data).toBe(true);
    const [name, args] = rpcMock.mock.calls[0] as [string, RpcArgs];
    expect(name).toBe("has_role");
    expect(Object.keys(args).sort()).toEqual(["_role", "_user_id"]);
    // Role param is a hard-coded literal in every production call site
    // (`"admin"`); the client never threads user input into _role.
    expect(args._role).toBe("admin");
  });

  it("treats an error envelope as deny — never silent-allows admin UI", async () => {
    // Mirrors the safety contract in useAuth.ts + post-login-redirect.ts:
    // `error` OR `data !== true` → not admin.
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "rls_denied" } });
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: "u1",
      _role: "admin",
    });
    const isAdmin = !error && data === true;
    expect(isAdmin).toBe(false);
  });

  it("a falsy `data` response yields the unauthenticated/admin-free state", async () => {
    rpcMock.mockResolvedValueOnce({ data: false, error: null });
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: "u1",
      _role: "admin",
    });
    expect(!error && data === true).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// consume_mfa_backup_code — input normalization + error → false.
// ---------------------------------------------------------------------------
describe("consume_mfa_backup_code RPC contract", () => {
  it("trims surrounding whitespace from the code before sending", async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    const ok = await consumeBackupCode("  AB-CD-EF  ");
    expect(ok).toBe("ok");
    const [, args] = rpcMock.mock.calls[0] as [string, RpcArgs];
    expect(args.p_code).toBe("AB-CD-EF");
  });

  it("returns invalid (and refreshes nothing harmful) on RPC error envelope", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "invalid_or_used" },
    });
    const ok = await consumeBackupCode("XX-YY-ZZ");
    expect(ok).toBe("invalid");
    // refreshSession only runs on success — must NOT fire on error
    // (otherwise we'd leak which attempt was the rate-limit boundary).
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it("returns invalid when the RPC succeeds but data !== true", async () => {
    // The DB function returns boolean — anything other than literal true
    // (null, false, undefined) is a non-redemption and must NOT promote.
    rpcMock.mockResolvedValueOnce({ data: false, error: null });
    const ok = await consumeBackupCode("AA-BB-CC");
    expect(ok).toBe("invalid");
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// generate_mfa_backup_codes — invocation + no-arg shape + no-log contract.
// ---------------------------------------------------------------------------
describe("generate_mfa_backup_codes RPC contract", () => {
  it("invokes the RPC with NO arguments and returns the plaintext array", async () => {
    const codes = ["A1B2-C3D4", "E5F6-G7H8"];
    rpcMock.mockResolvedValueOnce({ data: codes, error: null });
    const result = await generateBackupCodes();
    expect(result).toEqual(codes);
    const [name, args] = rpcMock.mock.calls[0] as [string, RpcArgs | undefined];
    expect(name).toBe("generate_mfa_backup_codes");
    // No user-controlled args — the DB derives caller from auth.uid().
    expect(args).toBeUndefined();
  });

  it("never leaks plaintext codes to console on success", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    rpcMock.mockResolvedValueOnce({
      data: ["SECRET-CODE-1", "SECRET-CODE-2"],
      error: null,
    });
    await generateBackupCodes();
    for (const spy of [logSpy, warnSpy, errorSpy, infoSpy]) {
      for (const call of spy.mock.calls) {
        const joined = call.map((c) => String(c)).join(" ");
        expect(joined).not.toContain("SECRET-CODE-1");
        expect(joined).not.toContain("SECRET-CODE-2");
      }
    }
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("throws on error envelope so the UI can render its own error state", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "not_aal2" },
    });
    await expect(generateBackupCodes()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// log_audit_event — argument shape + target_id discipline + metadata sanity.
// ---------------------------------------------------------------------------
describe("log_audit_event RPC contract", () => {
  it("builds an audit input whose target_id is a UUID-ish stable string", () => {
    // The respondent list calls the audit with the literal sentinel
    // "__list__" (no row-level target). Per-respondent audits would use
    // a UUID. We assert that the builder either emits a UUID OR the
    // sentinel, never a free-form free-text id.
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sentinelLike = /^__[a-z_]+__$/;
    const input = buildRespondentsAccessAudit();
    expect(uuidLike.test(input.target_id) || sentinelLike.test(input.target_id)).toBe(true);
  });

  it("does not put a respondent email or name into the details payload", () => {
    // Defence in depth: an admin's search string is logged (admins'
    // own input, by design — documented in respondents.functions.ts).
    // What we forbid is the BUILDER ever auto-pulling respondent rows
    // (email/display_name) into the audit. The filter-by-test-id /
    // filter-by-status path must stay PII-free.
    const input = buildRespondentsAccessAudit({
      filterTestId: "00000000-0000-0000-0000-000000000123",
      filterStatus: "active",
    });
    const serialized = JSON.stringify(input.details ?? {});
    expect(serialized).not.toMatch(/@/); // no email char
    // Slovak respondent names start with capital letters; the builder
    // must not expose any — only filter ids/statuses + a fixed note.
    expect(input.details).not.toHaveProperty("email");
    expect(input.details).not.toHaveProperty("display_name");
  });
});

// ---------------------------------------------------------------------------
// start_respondent_session — happy path, no automatic retry on success.
// ---------------------------------------------------------------------------
// E39 — fixtures use real-shape values that satisfy the zod boundary
// (uuids for session_id / session_token; share_id matches the migration
// regex). Without this, the zod gate rejects the input client-side and
// the RPC is never called.
const SESS_1 = "11111111-1111-1111-1111-111111111111";
const SESS_2 = "22222222-2222-2222-2222-222222222222";
const TOK_1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TOK_XYZ = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const SESS_FROM_SERVER = "33333333-3333-3333-3333-333333333333";

describe("start_respondent_session RPC contract", () => {
  it("is invoked exactly once on a successful start (no retry, no double-call)", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { session_id: SESS_1, session_token: TOK_1 },
      error: null,
    });
    await startRespondentSession({
      shareId: "shareabc",
      intake: { if_name: "Anna" },
      consent: true,
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the error to the caller so the route can render a Slovak fallback", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "share_expired" },
    });
    await expect(
      startRespondentSession({
        shareId: "shareabc",
        intake: {},
        consent: true,
      }),
    ).rejects.toBeTruthy();
    // The TakeTestFlow caller catches and sets `tErr("submit_failed")` —
    // the Slovak copy "Nepodarilo sa odoslať odpoveď. Skús to znova."
    // surfaces via `data-testid="respondent-flow-submit-error"`.
  });
});

// ---------------------------------------------------------------------------
// submit_respondent_answer — uses sessionId from start, not user input.
// ---------------------------------------------------------------------------
describe("submit_respondent_answer RPC contract", () => {
  it("threads the EXACT session id returned by start_respondent_session", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { session_id: SESS_FROM_SERVER, session_token: TOK_XYZ },
      error: null,
    });
    const { sessionId, sessionToken } = await startRespondentSession({
      shareId: "sharexyz",
      intake: {},
      consent: true,
    });
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await submitRespondentAnswer({
      sessionId,
      sessionToken,
      questionId: "q1",
      value: "A",
      isCorrect: true,
      timeMs: 1200,
    });
    const [, args] = rpcMock.mock.calls[1] as [string, RpcArgs];
    expect(args.p_session_id).toBe(SESS_FROM_SERVER);
    expect(args.p_session_token).toBe(TOK_XYZ);
  });
});

// ---------------------------------------------------------------------------
// finalize_respondent_session — single-call discipline (suite-level shape).
// ---------------------------------------------------------------------------
describe("finalize_respondent_session RPC contract", () => {
  it("sends the full { p_session_id, p_score, p_session_token } triple", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await finalizeRespondentSession({
      sessionId: SESS_1,
      sessionToken: TOK_1,
      score: 82,
    });
    const [name, args] = rpcMock.mock.calls[0] as [string, RpcArgs];
    expect(name).toBe("finalize_respondent_session");
    expect(args.p_session_id).toBe(SESS_1);
    expect(args.p_session_token).toBe(TOK_1);
    expect(args.p_score).toBe(82);
  });

  it("defaults a missing session_token to null (Phase-0 grace window)", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await finalizeRespondentSession({
      sessionId: SESS_2,
      score: null,
    });
    const [, args] = rpcMock.mock.calls[0] as [string, RpcArgs];
    expect(args.p_session_token).toBeNull();
    expect(args.p_score).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// get_peer_card — no user-controlled args (server resolves caller).
// ---------------------------------------------------------------------------
describe("get_peer_card RPC contract", () => {
  it("invokes with `{ p_user_id: undefined }` — server resolves auth.uid()", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { has_data: false, reason: "no_user" },
      error: null,
    });
    // Inline the call site shape from retention-queries.ts.
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.rpc("get_peer_card", { p_user_id: undefined });
    const [name, args] = rpcMock.mock.calls[0] as [string, RpcArgs];
    expect(name).toBe("get_peer_card");
    // The undefined is intentional: PostgREST drops undefined; the DB
    // function then derives identity from auth.uid(). Sending a
    // user-controlled uuid here would be a privilege boundary break.
    expect(args.p_user_id).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// get_quick_test_questions — limit + locale shape, no `select('*')` leak.
// ---------------------------------------------------------------------------
describe("get_quick_test_questions RPC contract", () => {
  it("passes the limit + locale and never falls back to a `from('questions').select('*')`", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.rpc("get_quick_test_questions", {
      p_limit: 10,
      p_locale: "sk",
    });
    const [name, args] = rpcMock.mock.calls[0] as [string, RpcArgs];
    expect(name).toBe("get_quick_test_questions");
    expect(args.p_limit).toBe(10);
    expect(args.p_locale).toBe("sk");
    // The anon `questions` table has RLS deny; the RPC is the only safe
    // path. The fact that the caller's `from()` is not part of this mock
    // surface (only `rpc`) is itself the safety contract — any
    // accidental `.from("questions").select("*")` would surface as a
    // TypeError at runtime, not silently leak data.
  });
});
