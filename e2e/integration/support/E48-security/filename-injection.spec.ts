import { test, expect } from "@playwright/test";

// E48 security — filename sanitisation.
// Traces TC-29..TC-32 from specs/support/E48-security.md.
//
// The sanitiser in functions/_lib/attachment-sanitize.ts strips control
// chars, path traversal, unicode RTL overrides, and truncates the stem
// while preserving the extension. The storage_path is always the
// server-generated `<ticket_id>/<uuid>.<ext>` shape — the user-supplied
// filename never participates in the storage path.

const LIVE_DB = Boolean(process.env.SUPPORT_LIVE_DB);
const TICKET_ID = process.env.SUPPORT_TICKET_ID ?? "";
const VIEW_TOKEN = process.env.SUPPORT_VIEW_TOKEN ?? "";

test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });

const ENDPOINT = "/api/support-attachment-upload";

// Real (minimal) PNG that passes magic-byte verification — used as the
// container for the various filename payloads.
const VALID_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
  "base64",
);

// Valid 4-byte PDF stub.
const VALID_PDF = Buffer.from(`%PDF-1.4\n%öäü\n${"\n".repeat(32)}%%EOF\n`, "utf8");

test.describe("E48 security — filename sanitisation", () => {
  test.skip(!LIVE_DB || !TICKET_ID || !VIEW_TOKEN, "needs wrangler + seeded ticket+token");

  test("TC-29: path traversal in filename is stripped to basename + storage_path is server-generated", async ({
    request,
  }) => {
    const r = await request.post(ENDPOINT, {
      multipart: {
        file: {
          name: "../../../etc/passwd.png",
          mimeType: "image/png",
          buffer: VALID_PNG,
        },
        ticket_id: TICKET_ID,
        view_token: VIEW_TOKEN,
      },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    // Filename: traversal stripped; the basename remains.
    expect(body.filename).not.toContain("/");
    expect(body.filename).not.toContain("..");
    expect(body.filename).toMatch(/passwd/);
    // storage_path: server pattern, no user filename inside.
    expect(body.storage_path).toMatch(new RegExp(`^${TICKET_ID}/[0-9a-f-]+\\.png$`));
    expect(body.storage_path).not.toContain("passwd");
    expect(body.storage_path).not.toContain("..");
  });

  test("TC-30: Windows reserved name CON.png — known sanitiser gap; storage_path defence holds", async ({
    request,
  }) => {
    test.info().annotations.push({
      type: "filename_edge_known_gap",
      description:
        "CON.png passes the sanitizer regex [A-Za-z0-9._-]+ unchanged. The storage_path is server-generated so the Windows-reserved-name angle is moot in practice, but the gap is noted here so it stays visible.",
    });
    const r = await request.post(ENDPOINT, {
      multipart: {
        file: { name: "CON.png", mimeType: "image/png", buffer: VALID_PNG },
        ticket_id: TICKET_ID,
        view_token: VIEW_TOKEN,
      },
    });
    // Accept either path — successful upload or strict-rejection both
    // satisfy the security boundary because the OS-level path never
    // contains the user filename.
    if (r.status() === 200) {
      const body = await r.json();
      expect(body.storage_path).toMatch(new RegExp(`^${TICKET_ID}/[0-9a-f-]+\\.png$`));
    } else {
      expect(r.status()).toBe(400);
      expect((await r.json()).error).toBe("attachment_filename_invalid");
    }
  });

  test("TC-31: RTL override character in filename is neutralised", async ({ request }) => {
    // U+202E inverts visual rendering. The sanitiser strips chars
    // outside [A-Za-z0-9._-] so the control char must vanish.
    const rtlName = `image‮gnp.jpg`;
    const r = await request.post(ENDPOINT, {
      multipart: {
        file: {
          name: rtlName,
          mimeType: "image/jpeg",
          buffer: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(1024)]),
        },
        ticket_id: TICKET_ID,
        view_token: VIEW_TOKEN,
      },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    // No Unicode control chars in the stored filename.
    expect(body.filename).not.toMatch(/[‪-‮⁦-⁩]/);
  });

  test("TC-32: 300-character stem is truncated; extension preserved", async ({ request }) => {
    const longName = `${"a".repeat(300)}.pdf`;
    const r = await request.post(ENDPOINT, {
      multipart: {
        file: { name: longName, mimeType: "application/pdf", buffer: VALID_PDF },
        ticket_id: TICKET_ID,
        view_token: VIEW_TOKEN,
      },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.filename.length).toBeLessThanOrEqual(200);
    expect(body.filename.endsWith(".pdf")).toBe(true);
  });
});
