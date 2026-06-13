import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { stubScamChatPhoto } from "../../mocks/api/scam-chat";

// A real 8x8 RGB PNG (valid signature + IHDR/IDAT/IEND) so the client's
// canvas downscale (createImageBitmap + canvas.toBlob) can actually decode
// and re-encode it in headless Chromium. Built once, reused across cases.
const PNG_8x8 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM4ISeHFTEMLQkAkL9BAbKfPiIAAAAASUVORK5CYII=",
  "base64",
);

// Verbatim client-side error strings from src/i18n/locales/sk/scam-chat.json.
const PHOTO_BAD_TYPE = "Podporované sú iba fotky JPEG a PNG.";
const PHOTO_TOO_LARGE = "Fotka je väčšia ako 5 MB.";

test.describe("scam-chat photo evidence", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // AC 5 — happy path: a valid small image is accepted, a thumbnail
  // appears, the mocked /photo endpoint returns findings.
  test("SC-05a: valid photo attaches, thumbnail + findings appear", async ({ page, scamChat }) => {
    await stubScamChatPhoto(page, {
      findings: "Screenshot SMS vyzýva na zaplatenie poplatku cez odkaz.",
    });

    await scamChat.openHost("/");
    await scamChat.openFromLauncher();

    await scamChat.photoInput.setInputFiles({
      name: "evidence.png",
      mimeType: "image/png",
      buffer: PNG_8x8,
    });

    await test.step("Thumbnail appears in the photo strip", async () => {
      await expect(scamChat.photoThumbs).toHaveCount(1);
    });

    await test.step("Findings flow into the conversation on the next message", async () => {
      // The hook attaches photo findings to the following chat turn; stub
      // the chat reply so the turn resolves.
      await page.route("**/api/scam-chat", async (route) => {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            reply: "Z fotky vyplýva podozrivá výzva na platbu.",
            citations: [],
            refusal: null,
            degraded: false,
            triage: null,
          }),
        });
      });
      await scamChat.send("Čo si myslíš o tejto SMS?");
      await expect(scamChat.lastAssistantMessage).toContainText("podozrivá výzva");
    });
  });

  // AC 5 — wrong file type rejected client-side with the Slovak error.
  test("SC-05b: wrong-type file rejected client-side", async ({ scamChat }) => {
    await scamChat.openHost("/");
    await scamChat.openFromLauncher();

    await scamChat.photoInput.setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });

    await expect(scamChat.photoError).toHaveText(PHOTO_BAD_TYPE);
    await expect(scamChat.photoThumbs).toHaveCount(0);
  });

  // AC 5 — oversized file (>5 MB) rejected client-side with the Slovak error.
  test("SC-05c: oversized file rejected client-side", async ({ scamChat }) => {
    await scamChat.openHost("/");
    await scamChat.openFromLauncher();

    // 5 MB + 1 byte, declared image/png → tripped by the size pre-check.
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 0);
    await scamChat.photoInput.setInputFiles({
      name: "huge.png",
      mimeType: "image/png",
      buffer: oversized,
    });

    await expect(scamChat.photoError).toHaveText(PHOTO_TOO_LARGE);
    await expect(scamChat.photoThumbs).toHaveCount(0);
  });
});
