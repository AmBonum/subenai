import { test, expect } from "@playwright/test";

// E48 security — concurrent attachment race on the 3-cap limit.
// Traces TC-40 from specs/support/E48-security.md.
//
// The cap is `attachments per ticket ≤ 3`. The implementation in v1
// counts rows then inserts — a TOCTOU window allows N parallel requests
// to all read count=0 and all insert, producing N>3 rows. The fix is
// either a UNIQUE constraint, an exclusion constraint, or a BEFORE
// INSERT trigger that locks the parent row and re-counts.
//
// PR #129 ships that trigger. Until then this test is marked
// `test.fail()` so CI is green while the gap is visible — it will
// flip green automatically when the trigger merges.

const LIVE_DB = Boolean(process.env.SUPPORT_LIVE_DB);
const TICKET_ID = process.env.SUPPORT_FRESH_TICKET_ID ?? "";
const VIEW_TOKEN = process.env.SUPPORT_FRESH_VIEW_TOKEN ?? "";

test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });

const ENDPOINT = "/api/support-attachment-upload";

const VALID_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
  "base64",
);

test.describe("E48 security — concurrent attachment cap", () => {
  test.skip(
    !LIVE_DB || !TICKET_ID || !VIEW_TOKEN,
    "needs a fresh ticket with 0 attachments via SUPPORT_FRESH_TICKET_ID + SUPPORT_FRESH_VIEW_TOKEN",
  );

  // TODO PR #129: This test is `test.fail()` until the BEFORE INSERT
  // trigger lands. Today the v1 implementation allows up to N parallel
  // inserts to all succeed because the count-then-insert is non-atomic.
  // When the trigger merges, the 4th concurrent insert raises
  // 'attachment_limit_reached' and exactly 3 rows persist — at which
  // point this test flips to passing and the .fail() must be removed.
  test.fail(
    "TC-40: 4 parallel uploads → at most 3 rows persist; overflow returns attachment_limit_reached",
    async ({ request }) => {
      const uploads = Array.from({ length: 4 }, (_, i) =>
        request.post(ENDPOINT, {
          multipart: {
            file: {
              name: `concurrent-${i}.png`,
              mimeType: "image/png",
              buffer: VALID_PNG,
            },
            ticket_id: TICKET_ID,
            view_token: VIEW_TOKEN,
          },
        }),
      );
      const results = await Promise.all(uploads);
      const oks = results.filter((r) => r.status() === 200);
      const rejected = results.filter((r) => r.status() === 400);

      // Expected post-fix behaviour: exactly 3 successes, exactly 1
      // rejection with the documented error code. v1 returns 4 successes
      // → the test fails today (expected) and self-heals when the
      // trigger ships.
      expect(oks.length).toBeLessThanOrEqual(3);
      expect(rejected.length).toBeGreaterThanOrEqual(1);
      for (const r of rejected) {
        expect((await r.json()).error).toBe("attachment_limit_reached");
      }
    },
  );
});
