/**
 * @vitest-environment node
 *
 * This file overrides the default jsdom environment because jsdom's
 * Blob implementation mishandles binary bytes in FormData multipart
 * serialisation — the bytes get encoded as the ASCII string "undefined"
 * during the Request → request.formData() roundtrip, which breaks the
 * magic-byte verification path. Node 20+ ships undici globally with a
 * correct binary-preserving implementation.
 *
 * The other E48 tests stay on jsdom because they exercise React
 * components / DOM APIs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost } from "../../functions/api/support-attachment-upload";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  SUPABASE_ANON_KEY: "anon_stub",
};

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const VIEW_TOKEN = "a".repeat(64);
const USER_ID = "22222222-2222-4222-8222-222222222222";

// Pre-computed sha256(VIEW_TOKEN) for the ticket row stub.
async function precomputeTokenHash(): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(VIEW_TOKEN));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

let TOKEN_HASH: string;

const MINIMAL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

interface MockState {
  ticketMissing?: boolean;
  tokenInvalidated?: boolean;
  tokenExpired?: boolean;
  attachmentCount?: number;
  uploadOk?: boolean;
  insertOk?: boolean;
  submitterUserId?: string | null;
  getUserId?: string | null;
}

function buildRequest(opts: {
  file?: { content: Uint8Array; type: string; name: string };
  ticketId?: string;
  viewToken?: string;
  jwt?: string;
}) {
  const form = new FormData();
  if (opts.file) {
    // jsdom's File constructor mishandles Uint8Array directly (truncates
    // to a few bytes during the multipart roundtrip). Wrap in a Blob
    // built from the underlying ArrayBuffer — that preserves binary
    // bytes faithfully across jsdom + Node FormData implementations.
    const blob = new Blob([opts.file.content.buffer.slice(0)], {
      type: opts.file.type,
    });
    form.append("file", blob, opts.file.name);
  }
  if (opts.ticketId !== undefined) form.append("ticket_id", opts.ticketId);
  if (opts.viewToken !== undefined) form.append("view_token", opts.viewToken);

  const headers: Record<string, string> = {};
  if (opts.jwt !== undefined) headers.authorization = `Bearer ${opts.jwt}`;

  return new Request("https://subenai.sk/api/support-attachment-upload", {
    method: "POST",
    headers,
    body: form,
  });
}

function mockFetch(state: MockState) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;

    // auth.getUser
    if (url.endsWith("/auth/v1/user")) {
      if (!state.getUserId) {
        return new Response(JSON.stringify({ error: "invalid_jwt" }), { status: 401 });
      }
      return new Response(JSON.stringify({ id: state.getUserId, aud: "authenticated" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // support_tickets lookup
    if (url.includes("/rest/v1/support_tickets") && (init?.method ?? "GET") === "GET") {
      if (state.ticketMissing) {
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const expires = state.tokenExpired
        ? new Date(Date.now() - 1000).toISOString()
        : new Date(Date.now() + 86_400_000).toISOString();
      return new Response(
        JSON.stringify({
          id: TICKET_ID,
          submitter_user_id: state.submitterUserId ?? null,
          view_token_hash: TOKEN_HASH,
          view_token_expires_at: expires,
          view_token_invalidated_at: state.tokenInvalidated ? new Date().toISOString() : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // support_ticket_attachments — count check (HEAD or GET with
    // count Prefer header) vs INSERT (POST with a body).
    if (url.includes("/rest/v1/support_ticket_attachments")) {
      const method = init?.method ?? "GET";
      if (method === "POST") {
        if (state.insertOk === false) {
          return new Response(JSON.stringify({ code: "23505", message: "unique violation" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ id: "attachment-row-id" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      // Everything else against the attachments table is a count
      // query (supabase-js sends HEAD with Prefer: count=exact, but
      // depending on the build it may also do GET — accept both).
      return new Response("[]", {
        status: 200,
        headers: {
          "content-range": `0-0/${state.attachmentCount ?? 0}`,
          "content-type": "application/json",
        },
      });
    }

    // Storage upload — POST /storage/v1/object/<bucket>/<path>
    if (url.includes("/storage/v1/object/")) {
      if (state.uploadOk === false) {
        return new Response(JSON.stringify({ message: "storage offline" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ Key: "support-attachments/..." }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("not stubbed: " + url, { status: 500 });
  });
}

beforeEach(async () => {
  vi.restoreAllMocks();
  if (!TOKEN_HASH) TOKEN_HASH = await precomputeTokenHash();
});

describe("POST /api/support-attachment-upload — input validation", () => {
  it("returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    const envNoKey = { ...env, SUPABASE_SERVICE_ROLE_KEY: "" };
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "tiny.png" },
        ticketId: TICKET_ID,
        viewToken: VIEW_TOKEN,
      }),
      env: envNoKey,
    });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("supabase_not_configured");
  });

  it("returns 400 file_missing when no file field is present", async () => {
    const res = await onRequestPost({
      request: buildRequest({ ticketId: TICKET_ID, viewToken: VIEW_TOKEN }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("file_missing");
  });

  it("returns 400 ticket_id_invalid for non-UUID ticket_id", async () => {
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "tiny.png" },
        ticketId: "not-a-uuid",
        viewToken: VIEW_TOKEN,
      }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("ticket_id_invalid");
  });
});

describe("POST /api/support-attachment-upload — authorization", () => {
  // Audit A8 — uniform 403 for both "ticket UUID doesn't exist" and
  // "ticket exists but auth failed". The earlier 404 leaked whether a
  // UUID was live, letting an unauthenticated attacker enumerate
  // ticket IDs by probing the endpoint. Both arms now respond
  // identically so the attacker can't distinguish the cases from the
  // client side.
  it("returns 403 not_authorized when the ticket does not exist (no enumeration leak)", async () => {
    mockFetch({ ticketMissing: true });
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "tiny.png" },
        ticketId: TICKET_ID,
        viewToken: VIEW_TOKEN,
      }),
      env,
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("not_authorized");
  });

  it("returns 403 when view_token does not match the ticket hash", async () => {
    mockFetch({});
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "tiny.png" },
        ticketId: TICKET_ID,
        viewToken: "b".repeat(64), // wrong token
      }),
      env,
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("not_authorized");
  });

  it("returns 403 when view_token is expired", async () => {
    mockFetch({ tokenExpired: true });
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "tiny.png" },
        ticketId: TICKET_ID,
        viewToken: VIEW_TOKEN,
      }),
      env,
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when view_token has been invalidated", async () => {
    mockFetch({ tokenInvalidated: true });
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "tiny.png" },
        ticketId: TICKET_ID,
        viewToken: VIEW_TOKEN,
      }),
      env,
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when JWT user does not own the ticket", async () => {
    mockFetch({ getUserId: "different-user-id", submitterUserId: USER_ID });
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "tiny.png" },
        ticketId: TICKET_ID,
        jwt: "stub-jwt",
      }),
      env,
    });
    expect(res.status).toBe(403);
  });

  it("authorizes JWT user who owns the ticket", async () => {
    mockFetch({ getUserId: USER_ID, submitterUserId: USER_ID });
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "tiny.png" },
        ticketId: TICKET_ID,
        jwt: "stub-jwt",
      }),
      env,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; attachment_id: string };
    expect(body.ok).toBe(true);
    expect(body.attachment_id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("POST /api/support-attachment-upload — sanitization integration", () => {
  it("happy path: PNG uploads, returns attachment_id + checksum + size", async () => {
    mockFetch({});
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "tiny.png" },
        ticketId: TICKET_ID,
        viewToken: VIEW_TOKEN,
      }),
      env,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      attachment_id: string;
      filename: string;
      mime: string;
      size_bytes: number;
      checksum_sha256: string;
    };
    expect(body.ok).toBe(true);
    expect(body.filename).toBe("tiny.png");
    expect(body.mime).toBe("image/png");
    expect(body.size_bytes).toBe(MINIMAL_PNG.byteLength);
    expect(body.checksum_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects polyglot (declared PDF, magic bytes PNG)", async () => {
    mockFetch({});
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "application/pdf", name: "spoof.pdf" },
        ticketId: TICKET_ID,
        viewToken: VIEW_TOKEN,
      }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("attachment_magic_mismatch");
  });

  it("rejects GIF (mime not in whitelist)", async () => {
    mockFetch({});
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: gif, type: "image/gif", name: "anim.gif" },
        ticketId: TICKET_ID,
        viewToken: VIEW_TOKEN,
      }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("attachment_mime_not_allowed");
  });

  it("rejects when attachment limit (3) already reached", async () => {
    mockFetch({ attachmentCount: 3 });
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "fourth.png" },
        ticketId: TICKET_ID,
        viewToken: VIEW_TOKEN,
      }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("attachment_limit_reached");
  });

  it("returns 500 when Storage upload fails", async () => {
    mockFetch({ uploadOk: false });
    const res = await onRequestPost({
      request: buildRequest({
        file: { content: MINIMAL_PNG, type: "image/png", name: "fail.png" },
        ticketId: TICKET_ID,
        viewToken: VIEW_TOKEN,
      }),
      env,
    });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("storage_upload_failed");
  });
});
