import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { setupAppShell, setupAdmin } from "../../setup/app-shell";
import { RESPONDENT_SESSION } from "../../fixtures/auth";
import { stubScamChatReply, stubScamChatQuota } from "../../mocks/api/scam-chat";

// Verbatim Slovak strings (quoted from src/i18n/locales/sk/scam-chat.json
// and functions/_lib/scam-chat/gates.ts — do not paraphrase).
const NOTICE =
  "Tento rozhovor spracúva AI. Neukladáme ho — zatvorením karty sa zmaže. Nepíšte sem rodné číslo ani heslá.";
const OFF_TOPIC_REFUSAL =
  "Som asistent zameraný výlučne na ochranu pred podvodmi. S inou témou vám, žiaľ, neporadím.";
const QUOTA_MESSAGE =
  "Asistent má dnes plno. Skúste to, prosím, zajtra — alebo si zatiaľ pozrite naše kurzy o podvodoch.";

test.describe("scam-chat widget", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // AC 1 — launcher opens the panel, privacy notice is verbatim present,
  // focus is trapped in the dialog, Escape closes it.
  test("SC-01: launcher opens panel with verbatim notice; Escape closes", async ({
    page,
    scamChat,
  }) => {
    await scamChat.openHost("/");

    await test.step("Launcher visible, panel hidden", async () => {
      await expect(scamChat.launcher).toBeVisible();
      await expect(scamChat.panel).toBeHidden();
    });

    await test.step("Open the panel from the launcher", async () => {
      await scamChat.openFromLauncher();
      await expect(scamChat.panel).toBeVisible();
      await expect(scamChat.panelTitle).toBeVisible();
    });

    await test.step("Privacy notice renders verbatim", async () => {
      await expect(scamChat.notice).toHaveText(NOTICE);
    });

    await test.step("Focus is trapped inside the dialog", async () => {
      // Radix Dialog moves focus into the panel on open and restores it on
      // close. Asserting the active element is inside the panel proves the
      // trap is engaged.
      const focusInsidePanel = await scamChat.panel.evaluate((panel) =>
        panel.contains(document.activeElement),
      );
      expect(focusInsidePanel).toBe(true);
    });

    await test.step("Escape closes the panel and restores the launcher", async () => {
      await page.keyboard.press("Escape");
      await expect(scamChat.panel).toBeHidden();
      await expect(scamChat.launcher).toBeVisible();
    });
  });

  // AC 2 — on-topic Q&A: a citation URL in the reply renders in the
  // assistant bubble.
  test("SC-02: on-topic answer shows reply text and citation URL", async ({ page, scamChat }) => {
    const citationUrl = "https://subenai.sk/blog/phishing";
    await stubScamChatReply(page, {
      reply: `Áno, vyzerá to ako phishing. Viac v článku ${citationUrl}`,
      citations: [citationUrl],
    });

    await scamChat.openHost("/");
    await scamChat.openFromLauncher();
    await scamChat.send("Je tento e-mail z banky podvod?");

    await test.step("User message echoed", async () => {
      await expect(scamChat.userMessages).toHaveText(/Je tento e-mail z banky podvod\?/);
    });

    await test.step("Assistant bubble carries the reply and the citation URL", async () => {
      await expect(scamChat.lastAssistantMessage).toContainText("vyzerá to ako phishing");
      await expect(scamChat.lastAssistantMessage).toContainText(citationUrl);
    });
  });

  // AC 3 — off-topic refusal rendered verbatim as an assistant bubble.
  test("SC-03: off-topic message renders the verbatim refusal", async ({ page, scamChat }) => {
    await stubScamChatReply(page, { reply: OFF_TOPIC_REFUSAL, refusal: "off_topic" });

    await scamChat.openHost("/");
    await scamChat.openFromLauncher();
    await scamChat.send("napíš mi básničku");

    await expect(scamChat.lastAssistantMessage).toHaveText(OFF_TOPIC_REFUSAL);
  });

  // AC 6 — quota exhausted: 429 renders the fail-closed state verbatim.
  test("SC-06: 429 renders the verbatim quota fail-closed state", async ({ page, scamChat }) => {
    await stubScamChatQuota(page);

    await scamChat.openHost("/");
    await scamChat.openFromLauncher();
    await scamChat.send("Je toto podvod?");

    await expect(scamChat.quotaState).toBeVisible();
    await expect(scamChat.quotaMessage).toHaveText(QUOTA_MESSAGE);
  });

  // AC 7 — disclosure difference (anon vs signed-in): the widget mounts and
  // works in both contexts. Deep role-filtered answer differences are
  // gateway-unit-tested; here we assert reachability + a working turn.
  test("SC-07a: widget works for anonymous visitors", async ({ page, scamChat }) => {
    await stubScamChatReply(page, {
      reply: "Registráciou získate prístup k osobným nastaveniam.",
    });
    await scamChat.openHost("/");
    await scamChat.openFromLauncher();
    await scamChat.send("kde si nastavím notifikácie?");
    await expect(scamChat.lastAssistantMessage).toContainText("Registráciou");
  });

  test("SC-07b: widget works on the home page for signed-in users too", async ({
    page,
    context,
    scamChat,
  }) => {
    await setupAppShell(context, page, { session: RESPONDENT_SESSION });
    await stubScamChatReply(page, {
      reply: "Notifikácie nastavíte na /app/notifications.",
      citations: ["/app/notifications"],
    });

    // The launcher is home-only (product decision 2026-06-13); a signed-in
    // visitor on the home page gets it just like an anonymous one.
    await scamChat.openHost("/");
    await expect(scamChat.launcher).toBeVisible();
    await scamChat.openFromLauncher();
    await scamChat.send("kde si nastavím notifikácie?");
    await expect(scamChat.lastAssistantMessage).toContainText("/app/notifications");
  });

  // The launcher is HOME-ONLY (product decision 2026-06-13). __root.tsx
  // gates it with `isHomePage`. It must be absent everywhere else — both on
  // the /admin shell and on ordinary public routes.
  test("SC-07c: launcher is ABSENT on the /admin shell", async ({ page, context, scamChat }) => {
    await setupAdmin(context, page);
    await scamChat.openHost("/admin");
    await expect(page).toHaveURL(/\/admin/);
    await expect(scamChat.launcher).toHaveCount(0);
  });

  test("SC-07d: launcher is ABSENT on non-home public routes", async ({ scamChat }) => {
    await scamChat.openHost("/test");
    await expect(scamChat.launcher).toHaveCount(0);
  });

  // AC 8 — mobile 380px: the panel stays usable and the composer does not
  // force horizontal overflow of the document.
  test("SC-08: panel usable at 380px with no horizontal overflow", async ({ page, scamChat }) => {
    await page.setViewportSize({ width: 380, height: 740 });
    await stubScamChatReply(page, { reply: "Tu je odpoveď." });

    await scamChat.openHost("/");
    await scamChat.openFromLauncher();
    await expect(scamChat.panel).toBeVisible();
    await expect(scamChat.input).toBeVisible();
    await expect(scamChat.sendButton).toBeVisible();

    await test.step("No horizontal overflow at 380px (composer fits inside the viewport)", async () => {
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(innerWidth).toBe(380);

      // The Sheet slides in with a 500ms transform animation; poll the
      // settled layout rather than measure mid-transition. Once settled,
      // the panel and its composer must sit within the 380px viewport.
      await expect
        .poll(async () => {
          const panelBox = await scamChat.panel.boundingBox();
          return panelBox ? Math.round(panelBox.x + panelBox.width) : Infinity;
        })
        .toBeLessThanOrEqual(381);

      const inputBox = await scamChat.input.boundingBox();
      const sendBox = await scamChat.sendButton.boundingBox();
      expect(inputBox).not.toBeNull();
      expect(sendBox).not.toBeNull();
      expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(381);
      expect(sendBox!.x + sendBox!.width).toBeLessThanOrEqual(381);
    });

    await test.step("A turn still completes at this viewport", async () => {
      await scamChat.send("Je toto podvod?");
      await expect(scamChat.lastAssistantMessage).toContainText("Tu je odpoveď.");
    });
  });

  // AC E53.3 — no terminal storage: history lives in React state only.
  test("SC-09: conversation is not persisted to local/sessionStorage", async ({
    page,
    scamChat,
  }) => {
    await stubScamChatReply(page, { reply: "Odpoveď bez ukladania." });
    await scamChat.openHost("/");
    await scamChat.openFromLauncher();
    await scamChat.send("Je toto podvod?");
    await expect(scamChat.lastAssistantMessage).toContainText("bez ukladania");

    const storageDump = await page.evaluate(() => {
      const dump = (s: Storage) => {
        const out: Record<string, string> = {};
        for (let i = 0; i < s.length; i += 1) {
          const k = s.key(i)!;
          out[k] = s.getItem(k) ?? "";
        }
        return JSON.stringify(out);
      };
      return { local: dump(localStorage), session: dump(sessionStorage) };
    });
    expect(storageDump.local).not.toContain("podvod");
    expect(storageDump.local).not.toContain("ukladania");
    expect(storageDump.session).not.toContain("podvod");
    expect(storageDump.session).not.toContain("ukladania");
  });
});
