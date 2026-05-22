import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { mockSupabase } from "../../mocks/supabase";

// Wave 4 — View-token thread slice.
//
// Covers TC-04 (thread renders all fields + attachment section), TC-09
// (missing token → not-found card), TC-10 (invalid token → not-found card),
// TC-18 (Slovak diacritics round-trip), TC-22 (mocked token rotation → old
// token returns not-found), TC-38 (mobile 375×667 — no horizontal overflow).
//
// All specs use mockSupabase to stub get_ticket_thread_for_view_token.
// No real Supabase/DB write is performed.

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const VALID_TOKEN = "a".repeat(64);

const MSG_ID = "msg-0000-0000-0000-000000000001";
const ATTACHMENT_ID = "att-0000-0000-0000-000000000001";

test.describe("View-token thread — /contact-form/ticket/$id", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-04: Valid token renders subject, status badge, initial body, admin message, attachment section
  test("TC-04: Valid token renders thread correctly with all fields", async ({
    page,
    kontaktTicketView,
  }) => {
    await test.step("Stub the RPC to return a ticket with one admin message and one clean attachment", async () => {
      await mockSupabase(page, {
        rpcs: {
          get_ticket_thread_for_view_token: ({ p_view_token }: { p_view_token: string }) => {
            if (p_view_token !== VALID_TOKEN) return null;
            return {
              ticket: {
                id: TICKET_ID,
                subject: "Smoke test E48",
                body: "Toto je text žiadosti.",
                category: "question",
                status: "new",
                created_at: "2026-05-22T10:00:00.000Z",
                submitter_email: "anon@test.example",
                submitter_name: null,
              },
              messages: [
                {
                  id: MSG_ID,
                  created_at: "2026-05-22T11:00:00.000Z",
                  author_kind: "admin",
                  author_name: "Podpora subenai",
                  body: "Dobrý deň, preverujeme váš prípad.",
                },
              ],
              attachments: [
                {
                  id: ATTACHMENT_ID,
                  filename: "screenshot.png",
                  mime_type: "image/png",
                  size_bytes: 102400,
                  scan_status: "clean",
                },
              ],
            };
          },
        },
      });
    });

    await test.step("Navigate to the view-token page with the valid token", async () => {
      await kontaktTicketView.openWithToken(TICKET_ID, VALID_TOKEN);
    });

    await test.step("Verify subject and status badge render correctly", async () => {
      await expect(kontaktTicketView.subject).toHaveText("Smoke test E48");
      await expect(kontaktTicketView.status).toContainText("Nové");
    });

    await test.step("Verify the thread section contains the admin message body", async () => {
      await expect(kontaktTicketView.thread).toContainText("Dobrý deň, preverujeme váš prípad.");
    });

    await test.step("Verify the attachments section is visible", async () => {
      await expect(kontaktTicketView.attachments).toBeVisible();
    });

    await test.step("Verify the clean attachment item is rendered with the overené badge", async () => {
      await expect(kontaktTicketView.attachmentItem(ATTACHMENT_ID)).toBeVisible();
      await expect(kontaktTicketView.attachmentScanBadge(ATTACHMENT_ID)).toContainText("✓ overené");
    });
  });

  // TC-09: Missing token URL shows not-found card with "Chýba bezpečnostný token"
  test("TC-09: Missing token renders 'Chýba bezpečnostný token' not-found card", async ({
    page,
    kontaktTicketView,
  }) => {
    await test.step("Stub the RPC (should not be called for this path)", async () => {
      await mockSupabase(page, {
        rpcs: {
          get_ticket_thread_for_view_token: () => null,
        },
      });
    });

    await test.step("Navigate without a token parameter", async () => {
      await kontaktTicketView.openWithoutToken(TICKET_ID);
    });

    await test.step("Verify not-found card is visible with the correct message", async () => {
      await expect(kontaktTicketView.notFoundCard).toBeVisible();
      await expect(kontaktTicketView.notFoundCard).toContainText("Chýba bezpečnostný token");
    });
  });

  // TC-10: Invalid token returns not-found card with "Odkaz už nie je platný"
  test("TC-10: Invalid token renders 'Odkaz už nie je platný' not-found card", async ({
    page,
    kontaktTicketView,
  }) => {
    await test.step("Stub the RPC to return null for any token", async () => {
      await mockSupabase(page, {
        rpcs: {
          get_ticket_thread_for_view_token: () => null,
        },
      });
    });

    await test.step("Navigate with an invalid token (64 'b' chars)", async () => {
      await kontaktTicketView.openWithToken(TICKET_ID, "b".repeat(64));
    });

    await test.step("Verify not-found card is visible with the correct message", async () => {
      await expect(kontaktTicketView.notFoundCard).toBeVisible();
      await expect(kontaktTicketView.notFoundCard).toContainText("Odkaz už nie je platný");
    });
  });

  // TC-18: Slovak diacritics in subject and body survive round-trip through mock and render correctly
  test("TC-18: Slovak diacritics round-trip through mock RPC and render without corruption", async ({
    page,
    kontaktTicketView,
  }) => {
    const diacriticSubject = "Žiadosť: ščťžýáíéúô";
    const diacriticBody = "Toto je text s diakritikou: ščťžýáíéúô, aspoň dvadsať znakov.";

    await test.step("Stub the RPC to return ticket with Slovak diacritic subject and body", async () => {
      await mockSupabase(page, {
        rpcs: {
          get_ticket_thread_for_view_token: ({ p_view_token }: { p_view_token: string }) => {
            if (p_view_token !== VALID_TOKEN) return null;
            return {
              ticket: {
                id: TICKET_ID,
                subject: diacriticSubject,
                body: diacriticBody,
                category: "question",
                status: "new",
                created_at: "2026-05-22T10:00:00.000Z",
                submitter_email: "diakritika@test.example",
                submitter_name: null,
              },
              messages: [],
              attachments: [],
            };
          },
        },
      });
    });

    await test.step("Navigate to the view-token page with the valid token", async () => {
      await kontaktTicketView.openWithToken(TICKET_ID, VALID_TOKEN);
    });

    await test.step("Verify subject displays the full diacritic string without corruption", async () => {
      await expect(kontaktTicketView.subject).toHaveText(diacriticSubject);
    });

    await test.step("Verify thread body contains the diacritic characters intact", async () => {
      await expect(kontaktTicketView.thread).toContainText("ščťžýáíéúô");
    });
  });

  // TC-22: Token rotation — mocked RPC returns null for old token after rotation
  test("TC-22: Old token returns not-found card after token rotation (mocked RPC)", async ({
    page,
    kontaktTicketView,
  }) => {
    const OLD_TOKEN = "c".repeat(64);
    const NEW_TOKEN = "d".repeat(64);

    await test.step("Stub the RPC: old token returns null (rotated away); new token returns ticket", async () => {
      await mockSupabase(page, {
        rpcs: {
          get_ticket_thread_for_view_token: ({ p_view_token }: { p_view_token: string }) => {
            if (p_view_token === NEW_TOKEN) {
              return {
                ticket: {
                  id: TICKET_ID,
                  subject: "Smoke test token rotation",
                  body: "Toto je text žiadosti.",
                  category: "question",
                  status: "in_progress",
                  created_at: "2026-05-22T10:00:00.000Z",
                  submitter_email: "rotation@test.example",
                  submitter_name: null,
                },
                messages: [],
                attachments: [],
              };
            }
            // Old token and any other token → null (invalidated)
            return null;
          },
        },
      });
    });

    await test.step("Navigate with the old (now-invalidated) token", async () => {
      await kontaktTicketView.openWithToken(TICKET_ID, OLD_TOKEN);
    });

    await test.step("Verify not-found card is shown — old token is no longer valid", async () => {
      await expect(kontaktTicketView.notFoundCard).toBeVisible();
      await expect(kontaktTicketView.notFoundCard).toContainText("Odkaz už nie je platný");
    });

    await test.step("Navigate with the new token — ticket renders correctly", async () => {
      await kontaktTicketView.openWithToken(TICKET_ID, NEW_TOKEN);
      await expect(kontaktTicketView.subject).toHaveText("Smoke test token rotation");
    });
  });

  // TC-38: Mobile 375×667 viewport — view-token page has no horizontal overflow
  test("TC-38: Mobile 375×667 viewport — view-token page has no horizontal overflow", async ({
    page,
    kontaktTicketView,
  }) => {
    await test.step("Stub the RPC to return a ticket with a long subject (stress-tests layout)", async () => {
      await mockSupabase(page, {
        rpcs: {
          get_ticket_thread_for_view_token: ({ p_view_token }: { p_view_token: string }) => {
            if (p_view_token !== VALID_TOKEN) return null;
            return {
              ticket: {
                id: TICKET_ID,
                subject:
                  "Toto je dlhá téma žiadosti na overenie, že sa na mobilnom displeji neprelieva horizontálne",
                body: "Telo správy s dostatok znakmi pre správnu validáciu formulára.",
                category: "bug",
                status: "new",
                created_at: "2026-05-22T10:00:00.000Z",
                submitter_email: "mobile@test.example",
                submitter_name: null,
              },
              messages: [],
              attachments: [],
            };
          },
        },
      });
    });

    await test.step("Set mobile viewport (375×667)", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    await test.step("Navigate to the view-token page with the valid token", async () => {
      await kontaktTicketView.openWithToken(TICKET_ID, VALID_TOKEN);
    });

    await test.step("Verify root element is visible and page has no horizontal scroll", async () => {
      await expect(kontaktTicketView.root).toBeVisible();
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);
    });
  });
});
