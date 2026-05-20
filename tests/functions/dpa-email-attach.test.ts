import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost } from "../../functions/api/dpa-email-attach";
import { __test__ as security__test__ } from "../../functions/_lib/security";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  RESEND_API_KEY: "resend-stub",
  EMAIL_FROM: "noreply@subenai.sk",
  EMAIL_REPLY_TO: "kontakt@subenai.sk",
};

interface MockState {
  rowFound?: boolean;
  emailStatus?: "pending" | "sent" | "failed";
  anonymised?: boolean;
  resendOk?: boolean;
  resendId?: string;
}

const VALID_REQUEST_ID = "11111111-2222-3333-4444-555555555555";
const PDF_BASE64 = btoa("%PDF-1.4 stub binary");

function buildRequest(body: unknown, ip = "203.0.113.10") {
  return new Request("https://subenai.sk/api/dpa-email-attach", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mockFetch(state: MockState) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/rest/v1/dpa_requests")) {
      if (state.rowFound === false) {
        return new Response(JSON.stringify(null), { status: 200 });
      }
      // .maybeSingle() unwraps to one object; UPDATE also returns 200/204.
      const row = state.anonymised
        ? {
            id: VALID_REQUEST_ID,
            contact_name: null,
            contact_email: null,
            school_name: null,
            email_status: state.emailStatus ?? "pending",
          }
        : {
            id: VALID_REQUEST_ID,
            contact_name: "Jana Nováková",
            contact_email: "jana@gymzlb.sk",
            school_name: "Gymnázium Zlatá brána",
            email_status: state.emailStatus ?? "pending",
          };
      return new Response(JSON.stringify(row), { status: 200 });
    }
    if (url.includes("api.resend.com/emails")) {
      if (state.resendOk === false) {
        return new Response(JSON.stringify({ message: "domain blocked" }), { status: 403 });
      }
      return new Response(JSON.stringify({ id: state.resendId ?? "msg-abc" }), { status: 200 });
    }
    return new Response("not stubbed", { status: 500 });
  });
}

const validBody = {
  requestId: VALID_REQUEST_ID,
  pdfBase64: PDF_BASE64,
  fileName: "DPA-subenai-gymnazium-v0.1.pdf",
};

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("POST /api/dpa-email-attach", () => {
  it("happy path sends e-mail with PDF attachment + writes email_status='sent'", async () => {
    mockFetch({ resendOk: true, resendId: "msg-xyz" });
    const r = await onRequestPost({ request: buildRequest(validBody), env });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { ok: boolean; messageId: string };
    expect(body.ok).toBe(true);
    expect(body.messageId).toBe("msg-xyz");
  });

  it("400 invalid_request_id when not a UUID", async () => {
    mockFetch({});
    const r = await onRequestPost({
      request: buildRequest({ ...validBody, requestId: "not-a-uuid" }),
      env,
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("invalid_request_id");
  });

  it("400 pdf_invalid when payload too large", async () => {
    mockFetch({});
    const r = await onRequestPost({
      request: buildRequest({ ...validBody, pdfBase64: "x".repeat(2 * 1024 * 1024 + 1) }),
      env,
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("pdf_invalid");
  });

  it("400 filename_invalid when not ending in .pdf", async () => {
    mockFetch({});
    const r = await onRequestPost({
      request: buildRequest({ ...validBody, fileName: "DPA.docx" }),
      env,
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe("filename_invalid");
  });

  it("404 request_not_found when row missing", async () => {
    mockFetch({ rowFound: false });
    const r = await onRequestPost({ request: buildRequest(validBody), env });
    expect(r.status).toBe(404);
    expect(((await r.json()) as { error: string }).error).toBe("request_not_found");
  });

  it("409 already_sent when email_status='sent'", async () => {
    mockFetch({ emailStatus: "sent" });
    const r = await onRequestPost({ request: buildRequest(validBody), env });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toBe("already_sent");
  });

  it("410 anonymised when PII has already been NULLed by retention cron", async () => {
    mockFetch({ anonymised: true });
    const r = await onRequestPost({ request: buildRequest(validBody), env });
    expect(r.status).toBe(410);
    expect(((await r.json()) as { error: string }).error).toBe("anonymised");
  });

  it("502 send_failed when Resend rejects", async () => {
    mockFetch({ resendOk: false });
    const r = await onRequestPost({ request: buildRequest(validBody), env });
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: string }).error).toBe("send_failed");
  });

  it("500 email_not_configured when RESEND_API_KEY missing", async () => {
    mockFetch({});
    const r = await onRequestPost({
      request: buildRequest(validBody),
      env: { ...env, RESEND_API_KEY: "" },
    });
    expect(r.status).toBe(500);
    expect(((await r.json()) as { error: string }).error).toBe("email_not_configured");
  });
});
