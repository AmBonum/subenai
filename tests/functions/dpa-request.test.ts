import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost } from "../../functions/api/dpa-request";
import { __test__ as security__test__ } from "../../functions/_lib/security";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  TURNSTILE_SECRET_KEY: "ts-secret-stub",
};

interface MockState {
  turnstileOk?: boolean;
  insertOk?: boolean;
  insertedId?: string;
}

function buildRequest(body: unknown, ip = "203.0.113.10") {
  return new Request("https://subenai.sk/api/dpa-request", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mockFetch(state: MockState) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("turnstile/v0/siteverify")) {
      return new Response(JSON.stringify({ success: state.turnstileOk ?? true }), { status: 200 });
    }
    if (url.includes("/rest/v1/dpa_requests")) {
      if (state.insertOk === false) {
        return new Response(JSON.stringify({ message: "insert error" }), { status: 500 });
      }
      // .single() sends Accept: application/vnd.pgrst.object+json — PostgREST
      // responds with the unwrapped object, not an array.
      return new Response(JSON.stringify({ id: state.insertedId ?? "req-1" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not stubbed", { status: 500 });
  });
}

const validBody = {
  contact_name: "Jana Nováková",
  contact_email: "Jana@Skola.SK",
  school_name: "Gymnázium Zlatá brána",
  consent_dpa_processing: true,
  turnstile_token: "ts-token-stub",
};

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("POST /api/dpa-request", () => {
  it("happy path returns request metadata for client-side PDF render", async () => {
    mockFetch({ turnstileOk: true, insertedId: "req-abc" });
    const r = await onRequestPost({ request: buildRequest(validBody), env });
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      ok: boolean;
      requestId: string;
      fileName: string;
      templateVersion: string;
      generatedAt: string;
    };
    expect(body.ok).toBe(true);
    expect(body.requestId).toBe("req-abc");
    expect(body.templateVersion).toBe("v0.1");
    expect(body.fileName).toMatch(/^DPA-subenai-.*-v0\.1\.pdf$/);
    expect(typeof body.generatedAt).toBe("string");
    expect(new Date(body.generatedAt).toString()).not.toBe("Invalid Date");
  });

  it("400 invalid_json on malformed body", async () => {
    mockFetch({});
    const r = await onRequestPost({ request: buildRequest("{not-json"), env });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("invalid_json");
  });

  it("400 turnstile_failed when siteverify returns success=false", async () => {
    mockFetch({ turnstileOk: false });
    const r = await onRequestPost({ request: buildRequest(validBody), env });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("turnstile_failed");
  });

  it("400 consent_required when consent flag is missing", async () => {
    mockFetch({ turnstileOk: true });
    const r = await onRequestPost({
      request: buildRequest({ ...validBody, consent_dpa_processing: false }),
      env,
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("consent_required");
  });

  it("400 email_invalid on bad email format", async () => {
    mockFetch({ turnstileOk: true });
    const r = await onRequestPost({
      request: buildRequest({ ...validBody, contact_email: "not-an-email" }),
      env,
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("email_invalid");
  });

  it("400 name_invalid when name is too short", async () => {
    mockFetch({ turnstileOk: true });
    const r = await onRequestPost({
      request: buildRequest({ ...validBody, contact_name: "X" }),
      env,
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("name_invalid");
  });

  it("400 school_invalid when school name is too short", async () => {
    mockFetch({ turnstileOk: true });
    const r = await onRequestPost({
      request: buildRequest({ ...validBody, school_name: "X" }),
      env,
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("school_invalid");
  });

  it("429 rate_limited after IP per-window cap (4th call from same IP)", async () => {
    mockFetch({ turnstileOk: true });
    // First 3 calls succeed (cap default = 3 per 15 min).
    for (let i = 0; i < 3; i++) {
      await onRequestPost({
        request: buildRequest({ ...validBody, school_name: `school-${i}` }, "198.51.100.1"),
        env,
      });
    }
    const r = await onRequestPost({
      request: buildRequest({ ...validBody, school_name: "school-4" }, "198.51.100.1"),
      env,
    });
    expect(r.status).toBe(429);
    expect(((await r.json()) as { error: string }).error).toBe("rate_limited");
  });

  it("500 supabase_not_configured when service-role key missing", async () => {
    mockFetch({ turnstileOk: true });
    const r = await onRequestPost({
      request: buildRequest(validBody),
      env: { ...env, SUPABASE_SERVICE_ROLE_KEY: "" },
    });
    expect(r.status).toBe(500);
    expect(((await r.json()) as { error: string }).error).toBe("supabase_not_configured");
  });

  it("500 insert_failed surfaces the Postgres error code in `reason`", async () => {
    // PostgREST returns an error envelope with a `code` like '42P01' when
    // the table doesn't exist. Mock that shape and assert the handler
    // surfaces the code (not the human message) on the 500 response.
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("turnstile/v0/siteverify")) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (url.includes("/rest/v1/dpa_requests")) {
        return new Response(
          JSON.stringify({
            code: "42P01",
            message: 'relation "dpa_requests" does not exist',
            details: null,
          }),
          { status: 404, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("not stubbed", { status: 500 });
    });
    const r = await onRequestPost({ request: buildRequest(validBody), env });
    expect(r.status).toBe(500);
    const body = (await r.json()) as { error: string; reason: string };
    expect(body.error).toBe("insert_failed");
    expect(body.reason).toBe("42P01");
  });
});
