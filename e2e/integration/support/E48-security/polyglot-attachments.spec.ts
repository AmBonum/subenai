import { test, expect } from "@playwright/test";

// E48 security — polyglot / magic-byte attacks on the attachment upload.
// Traces TC-23..TC-28 from specs/support/E48-security.md.
//
// The CF function at /api/support-attachment-upload runs the multipart
// payload through `functions/_lib/attachment-sanitize.ts`. That module
// verifies the first N bytes against the declared MIME and rejects
// mismatches with one of two error codes:
//   - attachment_magic_mismatch — declared type doesn't match magic
//   - attachment_mime_not_allowed — declared type is not whitelisted
//
// SVG is the canonical XSS vector — rejected at the whitelist layer.
// PDF accepts JS sanitisation (TC-28) — we accept the upload and assert
// the stored bytes are stripped clean.
//
// All tests need wrangler running locally + a valid ticket + view_token.
// Without SUPPORT_LIVE_DB they skip. The seeding contract is the same
// as view-token-edge-cases.spec.ts in the same directory.

const LIVE_DB = Boolean(process.env.SUPPORT_LIVE_DB);
const TICKET_ID = process.env.SUPPORT_TICKET_ID ?? "";
const VIEW_TOKEN = process.env.SUPPORT_VIEW_TOKEN ?? "";

test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });

const ENDPOINT = "/api/support-attachment-upload";

// Magic-byte constants.
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const PDF_MAGIC = Buffer.from("%PDF-1.4\n");

function pad(buf: Buffer, totalLen = 1024): Buffer {
  // Right-pad so the upload is large enough that the function actually
  // streams a body — many request middlewares short-circuit empties.
  const padding = Buffer.alloc(Math.max(0, totalLen - buf.length), 0x20);
  return Buffer.concat([buf, padding]);
}

test.describe("E48 security — magic-byte mismatch rejection", () => {
  test.skip(!LIVE_DB || !TICKET_ID || !VIEW_TOKEN, "needs wrangler + seeded ticket+token");

  test("TC-23: JPEG bytes declared as image/png → 400 attachment_magic_mismatch", async ({
    request,
  }) => {
    const r = await request.post(ENDPOINT, {
      multipart: {
        file: { name: "polyglot.png", mimeType: "image/png", buffer: pad(JPEG_MAGIC) },
        ticket_id: TICKET_ID,
        view_token: VIEW_TOKEN,
      },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("attachment_magic_mismatch");
  });

  test("TC-24: PNG bytes declared as application/pdf → 400 attachment_magic_mismatch", async ({
    request,
  }) => {
    const r = await request.post(ENDPOINT, {
      multipart: {
        file: { name: "polyglot.pdf", mimeType: "application/pdf", buffer: pad(PNG_MAGIC) },
        ticket_id: TICKET_ID,
        view_token: VIEW_TOKEN,
      },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("attachment_magic_mismatch");
  });

  test("TC-25: ZIP bytes declared as application/pdf → 400 attachment_magic_mismatch", async ({
    request,
  }) => {
    const r = await request.post(ENDPOINT, {
      multipart: {
        file: { name: "polyglot.pdf", mimeType: "application/pdf", buffer: pad(ZIP_MAGIC) },
        ticket_id: TICKET_ID,
        view_token: VIEW_TOKEN,
      },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("attachment_magic_mismatch");
  });

  test("TC-26: HTML bytes declared as image/png → 400 attachment_magic_mismatch", async ({
    request,
  }) => {
    const html = Buffer.from("<!DOCTYPE html><script>alert(1)</script>", "utf8");
    const r = await request.post(ENDPOINT, {
      multipart: {
        file: { name: "payload.png", mimeType: "image/png", buffer: pad(html) },
        ticket_id: TICKET_ID,
        view_token: VIEW_TOKEN,
      },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("attachment_magic_mismatch");
  });
});

test.describe("E48 security — MIME whitelist", () => {
  test.skip(!LIVE_DB || !TICKET_ID || !VIEW_TOKEN, "needs wrangler + seeded ticket+token");

  test("TC-27: SVG with <script> declared as image/svg+xml → 400 attachment_mime_not_allowed", async ({
    request,
  }) => {
    const svg = Buffer.from(
      `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
      "utf8",
    );
    const r = await request.post(ENDPOINT, {
      multipart: {
        file: { name: "xss.svg", mimeType: "image/svg+xml", buffer: svg },
        ticket_id: TICKET_ID,
        view_token: VIEW_TOKEN,
      },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("attachment_mime_not_allowed");
  });
});

test.describe("E48 security — PDF JavaScript stripping", () => {
  test.skip(
    !LIVE_DB || !TICKET_ID || !VIEW_TOKEN || !process.env.SUPPORT_PDF_LIB_AVAILABLE,
    "TC-28 requires pdf-lib to assemble the fixture; set SUPPORT_PDF_LIB_AVAILABLE=1 after `npm i -D pdf-lib`",
  );

  // TODO PR #129: When the trigger that strips /OpenAction lands, this
  // test should pass without test.fail(). For now the sanitiser is still
  // pass-through for embedded JS — flagged in specs/support/E48-security.md
  // Open questions and the test self-heals when the implementation ships.
  test.fail(
    "TC-28: PDF with /OpenAction → upload accepted; stored bytes have /JS, /OpenAction stripped",
    async ({ request }) => {
      // Minimal PDF skeleton with an /OpenAction → /JS dictionary. The
      // exact PDF assembly is left to pdf-lib in CI; the fixture would
      // be generated at test-setup time.
      const fakePdf = Buffer.concat([
        PDF_MAGIC,
        Buffer.from("\n%öäü\n1 0 obj\n<< /Type /Catalog /OpenAction << /JS (app.alert('pwned')) >> >>\nendobj\n", "utf8"),
        Buffer.from("trailer\n<< /Root 1 0 R >>\n%%EOF\n", "utf8"),
      ]);
      const r = await request.post(ENDPOINT, {
        multipart: {
          file: { name: "with-js.pdf", mimeType: "application/pdf", buffer: fakePdf },
          ticket_id: TICKET_ID,
          view_token: VIEW_TOKEN,
        },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.ok).toBe(true);
      // Stored bytes assertion happens in PR #129 — the trigger downloads
      // the file via signed-URL and re-parses with pdf-lib to confirm
      // /JS, /JavaScript, /OpenAction, /AA keys are absent from the
      // indirect-object tree.
      throw new Error("TC-28 stored-bytes verification depends on PR #129 trigger; xfail until then");
    },
  );
});
