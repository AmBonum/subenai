import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { stubScamChatReply } from "../../mocks/api/scam-chat";

// AC 4 — triage high-risk path: the assistant returns a triage assessment
// with risk:"high"; the panel surfaces the risk badge + the police-contact
// (158) guidance and offers the PDF button. Clicking it fires a download
// whose filename matches podozrenie-podvod-*.pdf and whose body is non-zero.
test.describe("scam-chat triage + police-report PDF", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  test("SC-04: high-risk triage shows 158 + PDF button; PDF downloads", async ({
    page,
    scamChat,
  }) => {
    await stubScamChatReply(page, {
      reply: "Toto vyzerá ako podvod. Odporúčam kontaktovať políciu — tiesňová linka 158.",
      triage: {
        risk: "high",
        indicators: ["Naliehavá výzva na okamžitú platbu", "Neznámy odosielateľ"],
        timeline: ["Prišla SMS o zablokovanom účte"],
        evidence: ["Screenshot SMS"],
        next_steps: ["Kontaktujte políciu na linke 158", "Nahláste banke"],
      },
    });

    await scamChat.openHost("/");
    await scamChat.openFromLauncher();
    await scamChat.sendTriage("Bol som podvedený, prišla mi podozrivá SMS o účte.");

    await test.step("Triage result block renders with high-risk badge", async () => {
      await expect(scamChat.triageResult).toBeVisible();
      await expect(scamChat.triageRisk).toHaveText("Vysoké riziko");
    });

    await test.step("Police 158 guidance is surfaced", async () => {
      await expect(scamChat.lastAssistantMessage).toContainText("158");
    });

    await test.step("PDF button appears on the high-risk path", async () => {
      await expect(scamChat.downloadPdfButton).toBeVisible();
    });

    await test.step("Clicking PDF fires a download with the expected filename + non-zero size", async () => {
      const downloadPromise = page.waitForEvent("download");
      await scamChat.downloadPdfButton.click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/^podozrenie-podvod-\d{8}\.pdf$/);

      const path = await download.path();
      expect(path).not.toBeNull();
      const { statSync } = await import("node:fs");
      expect(statSync(path!).size).toBeGreaterThan(0);
    });
  });
});
