// E44.9 Phase B — contract test for POST /api/templates/precheck.
//
// What this test owns:
//   - 401 unauthorized (no JWT, bad JWT)
//   - 400 invalid_body
//   - 429 rate_limit_ip, rate_limit_user_daily
//   - 503 budget_exhausted
//   - 404 template_not_found_or_not_owned
//   - 429 rejected_cooldown_active
//   - 200 happy path: shape + INSERT / UPDATE / audit_log shape
//   - 200 fallback path: Anthropic fails → submission row still created,
//     verdict marked as manual_review_required.
//
// Strategy: mock `@supabase/supabase-js` createClient to return a chainable
// stub that exposes hooks. Stub `globalThis.fetch` for the Anthropic call.
// Reset `__test__.resetAll()` from security.ts between cases.

import { describe, it, expect, vi, beforeEach } from "vitest";

import { __test__ as security__test__ } from "../../functions/_lib/security";

interface RowsByTable {
  templates: Array<Record<string, unknown>>;
  template_submissions: Array<Record<string, unknown>>;
  profiles: Array<Record<string, unknown>>;
}

interface SupabaseState {
  rows: RowsByTable;
  // Captured writes — assertable from each test.
  inserts: Array<{ table: string; payload: Record<string, unknown> }>;
  updates: Array<{ table: string; id: string; payload: Record<string, unknown> }>;
  authUser: { id: string } | null;
  authError: { message: string } | null;
  // Forced overrides for `auth.getUser`.
  spentTodayUsd?: number;
}

let state: SupabaseState;

function freshState(): SupabaseState {
  return {
    rows: { templates: [], template_submissions: [], profiles: [] },
    inserts: [],
    updates: [],
    authUser: { id: "user-1" },
    authError: null,
  };
}

interface ChainableBuilder {
  select: (cols?: string) => ChainableBuilder;
  eq: (col: string, val: unknown) => ChainableBuilder;
  gt: (col: string, val: unknown) => ChainableBuilder;
  gte: (col: string, val: unknown) => ChainableBuilder;
  lt: (col: string, val: unknown) => ChainableBuilder;
  order: (col: string, opts?: unknown) => ChainableBuilder;
  limit: (n: number) => ChainableBuilder;
  insert: (payload: Record<string, unknown>) => ChainableBuilder;
  update: (payload: Record<string, unknown>) => ChainableBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
  then: (onF: (v: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
}

function makeBuilder(table: keyof RowsByTable): ChainableBuilder {
  const filters: Array<{ col: string; op: "eq" | "gt" | "gte" | "lt"; val: unknown }> = [];
  let pendingInsert: Record<string, unknown> | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;
  let selectCols: string | undefined;
  let orderCol: string | null = null;
  let limitN: number | null = null;

  function matchRow(row: Record<string, unknown>): boolean {
    for (const f of filters) {
      if (f.op === "eq" && row[f.col] !== f.val) return false;
      if (f.op === "gt" && !(row[f.col] !== undefined && String(row[f.col]) > String(f.val))) {
        return false;
      }
      if (f.op === "gte" && !(row[f.col] !== undefined && String(row[f.col]) >= String(f.val))) {
        return false;
      }
      if (f.op === "lt" && !(row[f.col] !== undefined && String(row[f.col]) < String(f.val))) {
        return false;
      }
    }
    return true;
  }

  function filteredRows(): Array<Record<string, unknown>> {
    let out = state.rows[table].filter(matchRow);
    if (orderCol) {
      out = [...out].sort((a, b) => String(b[orderCol!]).localeCompare(String(a[orderCol!])));
    }
    if (limitN !== null) out = out.slice(0, limitN);
    return out;
  }

  const b: ChainableBuilder = {
    select(cols?: string) {
      selectCols = cols;
      void selectCols;
      return b;
    },
    eq(col, val) {
      filters.push({ col, op: "eq", val });
      return b;
    },
    gt(col, val) {
      filters.push({ col, op: "gt", val });
      return b;
    },
    gte(col, val) {
      filters.push({ col, op: "gte", val });
      return b;
    },
    lt(col, val) {
      filters.push({ col, op: "lt", val });
      return b;
    },
    order(col) {
      orderCol = col;
      return b;
    },
    limit(n) {
      limitN = n;
      return b;
    },
    insert(payload) {
      pendingInsert = payload;
      return b;
    },
    update(payload) {
      pendingUpdate = payload;
      return b;
    },
    async maybeSingle() {
      const rows = filteredRows();
      return { data: rows[0] ?? null, error: null };
    },
    async single() {
      if (pendingInsert) {
        const id = pendingInsert.id ?? `${table}-${state.rows[table].length + 1}`;
        const row = { id, ...pendingInsert };
        state.rows[table].push(row);
        state.inserts.push({ table, payload: pendingInsert });
        return { data: { id }, error: null };
      }
      const rows = filteredRows();
      if (rows.length === 0) return { data: null, error: { message: "not found" } };
      return { data: rows[0], error: null };
    },
    // Awaiting the builder directly (used for `await update(...)` patterns).
    then(onFulfilled) {
      if (pendingUpdate) {
        const idFilter = filters.find((f) => f.col === "id" && f.op === "eq");
        if (idFilter) {
          state.updates.push({
            table,
            id: String(idFilter.val),
            payload: pendingUpdate,
          });
          const row = state.rows[table].find((r) => r.id === idFilter.val);
          if (row) Object.assign(row, pendingUpdate);
        }
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      }
      if (pendingInsert && table === "template_submissions") {
        // insert without .single() chain (e.g. audit_log style, but we get
        // here only when there's no .single() call — used for fall-through).
        state.inserts.push({ table, payload: pendingInsert });
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      }
      if (pendingInsert) {
        state.inserts.push({ table, payload: pendingInsert });
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      }
      const rows = filteredRows();
      return Promise.resolve({ data: rows, error: null }).then(onFulfilled);
    },
  };
  return b;
}

interface SupabaseClient {
  from: (table: string) => ChainableBuilder;
  auth: {
    getUser: (jwt?: string) => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
}

function makeSupabase(): SupabaseClient {
  return {
    from(table: string) {
      if (table === "audit_log") {
        // Audit log doesn't need state; capture and return success.
        return makeBuilder("template_submissions" as keyof RowsByTable);
      }
      return makeBuilder(table as keyof RowsByTable);
    },
    auth: {
      async getUser(_jwt?: string) {
        return {
          data: { user: state.authUser },
          error: state.authError,
        };
      },
    },
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => makeSupabase()),
}));

// readSpentTodayUsd reads rows from template_submissions directly via the
// supabase client; the chainable mock returns matching rows; spend is summed
// from `precheck.cost_usd`. To force spend in budget tests, seed rows.

const env = {
  ANTHROPIC_API_KEY: "anth-key",
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};

const VALID_BODY = {
  template_id: "11111111-1111-4111-8111-111111111111",
  title: "Bezpečné heslá pre tím",
  description: "Šablóna pre onboarding kolegov.",
  question_texts: ["Aké je minimálne odporúčané dĺžka hesla podľa NIST?"],
  age_rating_self_declared: "13+",
  cc_by_consent: true as const,
};

function buildRequest(body: unknown, opts: { auth?: string; ip?: string } = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cf-connecting-ip": opts.ip ?? "203.0.113.5",
  };
  if (opts.auth !== undefined) headers["authorization"] = opts.auth;
  return new Request("https://subenai.sk/api/templates/precheck", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function anthropicSuccessResponse(verdictJson: string) {
  return new Response(
    JSON.stringify({
      id: "msg_1",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: verdictJson }],
      model: "claude-haiku-4-5-20251001",
      stop_reason: "end_turn",
      usage: { input_tokens: 1800, output_tokens: 100 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const CLEAN_VERDICT_JSON = JSON.stringify({
  safety: { score: 0.05, categories: [] },
  profanity: { score: 0, terms: [] },
  age_rating: "13+",
  copyright_red_flags: [],
  summary: "Looks fine.",
});

function seedOwnedTemplate(templateId = VALID_BODY.template_id, userId = "user-1") {
  state.rows.templates.push({
    id: templateId,
    owner_id: userId,
    title: "Original title",
    description: "desc",
    visibility: "private",
  });
}

function seedProfile(userId = "user-1", display_name = "Author Name") {
  state.rows.profiles.push({ id: userId, display_name, email: "author@example.com" });
}

// `onRequestPost` is imported lazily inside each test so the supabase mock
// is hoisted before module load.
async function callHandler(req: Request): Promise<Response> {
  const { onRequestPost } = await import("../../functions/api/templates/precheck");
  return onRequestPost({ request: req, env });
}

beforeEach(() => {
  state = freshState();
  security__test__.resetAll();
  vi.restoreAllMocks();
  // Spy fetch with a default valid Anthropic response; individual tests
  // override via mockImplementation or mockResolvedValueOnce.
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    anthropicSuccessResponse(CLEAN_VERDICT_JSON),
  );
});

describe("POST /api/templates/precheck — auth", () => {
  it("401 when Authorization header is missing", async () => {
    const res = await callHandler(buildRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("401 invalid_token when auth.getUser returns error", async () => {
    state.authUser = null;
    state.authError = { message: "bad token" };
    const res = await callHandler(buildRequest(VALID_BODY, { auth: "Bearer abc" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("invalid_token");
  });
});

describe("POST /api/templates/precheck — body validation", () => {
  it("400 invalid_body on missing template_id", async () => {
    const { template_id: _drop, ...rest } = VALID_BODY;
    const res = await callHandler(buildRequest(rest, { auth: "Bearer t" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });

  it("400 invalid_body on title > 200 chars", async () => {
    const body = { ...VALID_BODY, title: "x".repeat(201) };
    const res = await callHandler(buildRequest(body, { auth: "Bearer t" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/templates/precheck — rate limits", () => {
  it("429 rate_limit_ip when per-IP-hour cap is exhausted", async () => {
    // Default PRECHECK_PER_IP_PER_HOUR = 20. Send 20 from same IP then expect 429.
    seedOwnedTemplate();
    seedProfile();
    for (let i = 0; i < 20; i++) {
      const r = await callHandler(buildRequest(VALID_BODY, { auth: "Bearer t", ip: "1.2.3.4" }));
      expect([200, 429]).toContain(r.status);
    }
    const blocked = await callHandler(
      buildRequest(VALID_BODY, { auth: "Bearer t", ip: "1.2.3.4" }),
    );
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toBe("rate_limit_ip");
  });

  it("429 rate_limit_user_daily when 5 prechecks exhausted by same user", async () => {
    seedOwnedTemplate();
    seedProfile();
    // Use different IPs so the IP limiter does not fire first.
    for (let i = 0; i < 5; i++) {
      const r = await callHandler(
        buildRequest(VALID_BODY, { auth: "Bearer t", ip: `10.0.0.${i}` }),
      );
      expect(r.status).toBe(200);
    }
    const blocked = await callHandler(
      buildRequest(VALID_BODY, { auth: "Bearer t", ip: "10.0.0.99" }),
    );
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toBe("rate_limit_user_daily");
  });
});

describe("POST /api/templates/precheck — budget ceiling", () => {
  it("503 budget_exhausted when today's spend already at the ceiling", async () => {
    seedOwnedTemplate();
    seedProfile();
    // Seed a precheck row with cost_usd above the default budget of 5.00.
    const today = new Date().toISOString().slice(0, 10);
    state.rows.template_submissions.push({
      id: "old-sub",
      precheck_at: `${today}T01:00:00.000Z`,
      precheck: { cost_usd: 99.99 },
    });
    const res = await callHandler(buildRequest(VALID_BODY, { auth: "Bearer t" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("budget_exhausted");
  });
});

describe("POST /api/templates/precheck — ownership + cooldown", () => {
  it("404 template_not_found_or_not_owned when caller does not own the template", async () => {
    state.rows.templates.push({
      id: VALID_BODY.template_id,
      owner_id: "someone-else",
      title: "x",
      description: "y",
      visibility: "private",
    });
    seedProfile();
    const res = await callHandler(buildRequest(VALID_BODY, { auth: "Bearer t" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("template_not_found_or_not_owned");
  });

  it("429 rejected_cooldown_active when a rejected submission exists within 24h", async () => {
    seedOwnedTemplate();
    seedProfile();
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    state.rows.template_submissions.push({
      id: "prev-sub",
      template_id: VALID_BODY.template_id,
      author_id: "user-1",
      status: "rejected",
      submitted_at: oneHourAgo,
    });
    const res = await callHandler(buildRequest(VALID_BODY, { auth: "Bearer t" }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("rejected_cooldown_active");
    expect(body.retry_after_hours).toBe(24);
  });
});

describe("POST /api/templates/precheck — happy path 200", () => {
  it("returns verdict with submission_id + held_for_admin_review=false", async () => {
    seedOwnedTemplate();
    seedProfile();
    const res = await callHandler(buildRequest(VALID_BODY, { auth: "Bearer t" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submission_id).toBeTypeOf("string");
    expect(body.precheck_passed).toBe(true);
    expect(body.age_rating).toBe("13+");
    expect(body.summary).toBe("Looks fine.");
    expect(body.held_for_admin_review).toBe(false);
  });

  it("INSERT on template_submissions uses fetched author_display_name + mapped age_rating_declared", async () => {
    seedOwnedTemplate();
    seedProfile("user-1", "Jana Authorová");
    const res = await callHandler(buildRequest(VALID_BODY, { auth: "Bearer t" }));
    expect(res.status).toBe(200);
    const insert = state.inserts.find((i) => i.table === "template_submissions");
    expect(insert).toBeDefined();
    expect(insert!.payload.author_display_name).toBe("Jana Authorová");
    // API value "13+" → DB enum value "thirteen_plus"
    expect(insert!.payload.age_rating_declared).toBe("thirteen_plus");
    expect(insert!.payload.template_id).toBe(VALID_BODY.template_id);
    expect(insert!.payload.author_id).toBe("user-1");
    expect(insert!.payload.status).toBe("pending");
  });

  it("UPDATE on template_submissions stores precheck envelope WITHOUT raw_response", async () => {
    seedOwnedTemplate();
    seedProfile();
    const res = await callHandler(buildRequest(VALID_BODY, { auth: "Bearer t" }));
    expect(res.status).toBe(200);
    const update = state.updates.find((u) => u.table === "template_submissions");
    expect(update).toBeDefined();
    const precheck = update!.payload.precheck as Record<string, unknown>;
    expect(precheck).toBeTypeOf("object");
    expect(precheck).not.toHaveProperty("raw_response");
    expect(precheck.model_id).toBe("claude-haiku-4-5-20251001");
    expect(precheck.attempt).toBe(1);
    expect(update!.payload.precheck_passed).toBe(true);
    expect(update!.payload.precheck_at).toBeTypeOf("string");
  });

  it("INSERT on audit_log with action='template_precheck'", async () => {
    seedOwnedTemplate();
    seedProfile();
    await callHandler(buildRequest(VALID_BODY, { auth: "Bearer t" }));
    const audit = state.inserts.find(
      (i) => (i.payload as { action?: string }).action === "template_precheck",
    );
    expect(audit).toBeDefined();
    const payload = audit!.payload as Record<string, unknown>;
    expect(payload.actor_id).toBe("user-1");
    expect(payload.target_type).toBe("template_submission");
    expect(payload.pii_access).toBe(false);
  });
});

describe("POST /api/templates/precheck — Anthropic failure fallback (200)", () => {
  it("fallback verdict on persistent Anthropic failure: precheck_passed=false, summary starts with manual_review_required", async () => {
    seedOwnedTemplate();
    seedProfile();
    // Force Anthropic to always return malformed JSON → retry → throw → fallback.
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      anthropicSuccessResponse("not-valid-json"),
    );

    const res = await callHandler(buildRequest(VALID_BODY, { auth: "Bearer t" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.precheck_passed).toBe(false);
    expect(body.held_for_admin_review).toBe(true);
    expect(body.summary.startsWith("manual_review_required:")).toBe(true);

    // Submission row was still inserted (so admin queue picks it up).
    const insert = state.inserts.find((i) => i.table === "template_submissions");
    expect(insert).toBeDefined();
    const update = state.updates.find((u) => u.table === "template_submissions");
    expect(update).toBeDefined();
    expect(update!.payload.precheck_passed).toBe(false);
  });
});
