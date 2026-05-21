import { test, expect } from "../../../fixtures/base";
import { setupAppShell } from "../../../setup/app-shell";
import { ADMIN_SESSION } from "../../../fixtures/auth";

// E48 security — admin search box hardening.
// Traces TC-33, TC-34, TC-35 from specs/support/E48-security.md.
//
// The /admin/tickets search delegates to a parameterised PostgREST RPC
// (websearch_to_tsquery + ILIKE with escape sequence). These tests
// verify the browser layer never produces an error toast or a 500 for
// the three CodeQL-flagged inputs:
//   - bare `%`
//   - double backslash `\\`
//   - classic injection `'; DROP TABLE--`
//
// They also confirm the table renders normally (the parameterised query
// treats these as literals, so the result set is either 0 or the
// regularly-matched tickets).

const SEED_TICKET_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-05-21T10:00:00.000Z";

function seededTicket() {
  return {
    id: SEED_TICKET_ID,
    created_at: NOW,
    updated_at: NOW,
    status: "new",
    category: "question",
    source: "public_kontakt",
    subject: "Sentinel ticket for SQL injection cases",
    body: "Body content with at least twenty characters.",
    submitter_user_id: null,
    submitter_email: "sentinel@test.example",
    submitter_name: "Sentinel",
    assigned_to: null,
    archived_at: null,
    deleted_at: null,
  };
}

const INJECTION_INPUTS: ReadonlyArray<{ tc: string; input: string; label: string }> = [
  { tc: "TC-33", input: "%", label: "bare percent sign" },
  { tc: "TC-34", input: "\\\\", label: "double backslash" },
  { tc: "TC-35", input: "'; DROP TABLE--", label: "classic injection payload" },
];

test.describe("E48 security — admin search box parameterisation", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          support_tickets: [seededTicket()],
          support_ticket_messages: [],
          support_ticket_attachments: [],
        },
        rpcs: { has_role: true },
      },
    });
  });

  for (const { tc, input, label } of INJECTION_INPUTS) {
    test(`${tc}: search input "${label}" produces no error toast and table renders`, async ({
      adminTicketsQueue,
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await test.step("Open the queue", async () => {
        await adminTicketsQueue.open();
        await expect(adminTicketsQueue.table).toBeVisible();
      });

      await test.step(`Type the injection payload (${input})`, async () => {
        await adminTicketsQueue.searchInput.fill(input);
        await adminTicketsQueue.searchInput.press("Enter");
      });

      await test.step("Verify no error state surfaces", async () => {
        await expect(adminTicketsQueue.errorState).toBeHidden();
      });

      await test.step("Verify the queue still renders (table or empty state)", async () => {
        // Either the seeded sentinel matches the search (unlikely for
        // these inputs) or the empty state shows. Both prove the page
        // did NOT crash.
        const tableVisible = await adminTicketsQueue.table.isVisible();
        const emptyVisible = await adminTicketsQueue.emptyState.isVisible();
        expect(tableVisible || emptyVisible).toBe(true);
      });

      await test.step("Verify no Uncaught error appeared in the console", async () => {
        // We allow normal HMR/dev warnings; we only fail on Uncaught
        // exceptions, which signal a query-layer crash that the
        // parameterisation fix is supposed to prevent.
        const uncaught = consoleErrors.filter((m) => /Uncaught/i.test(m));
        expect(uncaught).toEqual([]);
      });
    });
  }
});
