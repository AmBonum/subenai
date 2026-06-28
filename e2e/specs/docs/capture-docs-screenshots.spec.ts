import type { Page } from "@playwright/test";
import { test } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { setupAppShell } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { DsrFormPage } from "../../poms/user/DsrFormPage";
import { DocsPortal } from "../../poms/docs/DocsPortal";
import { AppAccountProfilePage } from "../../poms/app/AppAccountProfilePage";
import { LoginPage } from "../../poms/auth/LoginPage";
import { QuizFlowPage } from "../../poms/quiz/QuizFlowPage";
import { AcademyIndexPage } from "../../poms/academy/AcademyIndexPage";
import { AcademyEntryPage } from "../../poms/academy/AcademyEntryPage";
import { ScamChatPage } from "../../poms/scam-chat/ScamChat";
import { HomePage } from "../../poms/quiz/HomePage";
import { TestsIndexPage } from "../../poms/quiz/TestsDirectoryPage";
import { KontaktPage } from "../../poms/support/KontaktPage";
import { ComposerPage } from "../../poms/quiz/ComposerPage";
import { SchoolsPage } from "../../poms/marketing/SchoolsPage";
import { SponsorsPage } from "../../poms/marketing/SponsorsPage";
import { PrivacyPage } from "../../poms/marketing/PrivacyPage";
import { ChangelogPage } from "../../poms/marketing/ChangelogPage";
import { ShareResultPage } from "../../poms/quiz/ShareResultPage";
import { stubAttemptsByShareId, makeAttemptRow } from "../../mocks/supabase/attempts";

// E57 — generates the documentation screenshots WITHOUT prod writes, a
// password, or Docker: the existing e2e mock layer (mocked Supabase auth +
// PostgREST) renders the real UI against synthetic data, captured in BOTH
// themes so the docs show whichever matches the reader's current theme.
//
//   CAPTURE_DOCS=1 VITE_SUPABASE_PROJECT_ID=<ref> \
//     npx playwright test e2e/specs/docs/capture-docs-screenshots.spec.ts \
//     --project=e2e-chromium
//
// Output → public/img/docs/<name>.png (light) + <name>-dark.png (dark),
// embedded from src/content/docs/index.ts via the `#themed` convention.

const OUT = "public/img/docs";
const THEMES = [
  { theme: "light", suffix: "" },
  { theme: "dark", suffix: "-dark" },
] as const;

// Shoot the current page once per theme (subenai-theme switch + reload, which
// preserves the mocked auth/consent init scripts). `ready` re-waits for the
// page's key element after each reload.
async function shootBothThemes(
  page: Page,
  name: string,
  ready: () => Promise<void>,
  fullPage = false,
): Promise<void> {
  for (const { theme, suffix } of THEMES) {
    await page.evaluate((t) => window.localStorage.setItem("subenai-theme", t), theme);
    await page.reload();
    await ready();
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${OUT}/${name}${suffix}.png`, fullPage });
  }
}

// Generator, not a regression test — only runs when explicitly invoked with
// CAPTURE_DOCS=1, so the normal e2e suite never rewrites committed assets.
test.describe("docs screenshots (mocked surfaces, light + dark)", () => {
  test.skip(!process.env.CAPTURE_DOCS, "set CAPTURE_DOCS=1 to (re)generate doc screenshots");
  // These are slow generators (many surfaces × 2 themes × reloads), not
  // regression tests — give them plenty of headroom.
  test.describe.configure({ timeout: 300_000 });

  test("public — login, test flow, academy", async ({ context, page }) => {
    await primeConsent(context, "all");
    await page.setViewportSize({ width: 1180, height: 900 });

    const login = new LoginPage(page);
    await page.goto("/login");
    await shootBothThemes(page, "login", async () => {
      await login.card.waitFor({ state: "visible" });
      // The dev-only "E36 audit helper" panel never ships to production
      // (import.meta.env.DEV gated) — strip it so the doc shot matches what
      // real users see.
      await page.evaluate(() =>
        document.querySelector('[data-testid="login-dev-banner"]')?.remove(),
      );
    });

    const flow = new QuizFlowPage(page);
    await page.goto("/test");
    await shootBothThemes(page, "test-flow", async () => {
      await flow.questionCard.waitFor({ state: "visible" });
    });

    const academy = new AcademyIndexPage(page);
    await page.goto("/academy");
    await shootBothThemes(page, "academy", async () => {
      await academy.root.waitFor({ state: "visible" });
    });

    const chat = new ScamChatPage(page);
    await page.goto("/pomocnik");
    await shootBothThemes(page, "pomocnik", async () => {
      await chat.input.waitFor({ state: "visible" });
    });

    const home = new HomePage(page);
    await page.goto("/");
    await shootBothThemes(page, "home", async () => {
      await home.heroHeading.waitFor({ state: "visible" });
    });

    const packs = new TestsIndexPage(page);
    await page.goto("/tests");
    await shootBothThemes(page, "test-packs", async () => {
      await packs.grid.waitFor({ state: "visible" });
    });

    // A lesson's realistic scam mockup ("example z praxe") in context.
    const lesson = new AcademyEntryPage(page);
    await page.goto("/academy/email-phishing");
    await shootBothThemes(page, "lesson-example", async () => {
      await lesson.root.waitFor({ state: "visible" });
      await lesson.visual.first().scrollIntoViewIfNeeded();
    });

    const contact = new KontaktPage(page);
    await page.goto("/contact-form");
    await shootBothThemes(
      page,
      "contact",
      async () => {
        await contact.root.waitFor({ state: "visible" });
      },
      true,
    );

    const composer = new ComposerPage(page);
    await page.goto("/test/builder");
    await shootBothThemes(page, "composer", async () => {
      await composer.heading.waitFor({ state: "visible" });
      await composer.questionPickerSection.waitFor({ state: "visible" });
    });

    const schools = new SchoolsPage(page);
    await page.goto("/schools");
    await shootBothThemes(page, "schools", async () => {
      await schools.heroTitle.waitFor({ state: "visible" });
    });

    const sponsors = new SponsorsPage(page);
    await page.goto("/sponsors");
    await shootBothThemes(page, "sponsors", async () => {
      await sponsors.indexRoot.waitFor({ state: "visible" });
    });

    // An article (not a lesson) — for the Academy/articles doc.
    const article = new AcademyEntryPage(page);
    await page.goto("/academy/phishing-kompletny-sprievodca");
    await shootBothThemes(page, "article", async () => {
      await article.root.waitFor({ state: "visible" });
    });

    const privacy = new PrivacyPage(page);
    await page.goto("/privacy");
    await shootBothThemes(
      page,
      "privacy",
      async () => {
        await privacy.firstSection.waitFor({ state: "visible" });
      },
      true,
    );

    const changelog = new ChangelogPage(page);
    await page.goto("/changelog");
    await shootBothThemes(page, "changelog", async () => {
      await changelog.list.waitFor({ state: "visible" });
    });

    const testsFaq = new TestsIndexPage(page);
    await page.goto("/tests");
    await shootBothThemes(page, "faq", async () => {
      await testsFaq.faqSection.waitFor({ state: "visible" });
      await testsFaq.faqSection.scrollIntoViewIfNeeded();
    });
  });

  test("public — answer feedback (per-question explanation)", async ({ context, page }) => {
    // A full play-through to the score screen is timing-fragile against the
    // randomised live bank; the per-question FEEDBACK (the correct answer +
    // explanation shown right after you answer) is the part that matters for
    // the "understanding results" doc and captures reliably with one click.
    await primeConsent(context, "all");
    await page.setViewportSize({ width: 1180, height: 900 });
    const flow = new QuizFlowPage(page);
    await page.goto("/test"); // establish origin so localStorage is writable

    for (const { theme, suffix } of THEMES) {
      await page.evaluate((t) => window.localStorage.setItem("subenai-theme", t), theme);
      await page.goto("/test");
      await flow.questionCard.waitFor({ state: "visible" });
      await flow.option("a").click();
      // The answered state (right/wrong + explanation) persists on screen;
      // shoot shortly after so we never race the auto-advance.
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/feedback${suffix}.png`, fullPage: false });
    }
  });

  test("signed-in — account profile, DSR form", async ({ context, page }) => {
    const email = EDUCATOR_SESSION.user.email;
    await setupAppShell(context, page, {
      session: EDUCATOR_SESSION,
      onboarded: true,
      extras: {
        tables: {
          dsr_requests: [
            {
              id: "doc-sample-1",
              requester_email: email,
              type: "erase",
              note: "Žiadosť o vymazanie účtu a všetkých údajov.",
              status: "open",
              sla_due_at: "2026-07-28T00:00:00.000Z",
              created_at: "2026-06-28T00:00:00.000Z",
            },
          ],
        },
      },
    });
    await page.setViewportSize({ width: 1180, height: 1000 });

    const profile = new AppAccountProfilePage(page);
    await page.goto("/app/account/profile");
    await shootBothThemes(
      page,
      "account-profile",
      async () => {
        await profile.form.waitFor({ state: "visible" });
      },
      true,
    );

    const dsr = new DsrFormPage(page);
    await page.goto(DsrFormPage.PATH);
    await shootBothThemes(
      page,
      "dsr-form",
      async () => {
        await dsr.formCard.waitFor({ state: "visible" });
        await dsr.historyCard.waitFor({ state: "visible" });
      },
      true,
    );
  });

  test("public — shared result page (mocked attempt)", async ({ context, page }) => {
    // The shared-result page (/r/<share_id>) is what a recipient of a shared
    // link sees. We stub the attempt by share_id (no prod data) — reliable, no
    // play-through needed.
    await primeConsent(context, "all");
    await stubAttemptsByShareId(page, {
      row: makeAttemptRow({ share_id: "TESTAAAA", final_score: 78, percentile: 82 }),
    });
    await page.setViewportSize({ width: 1180, height: 1100 });
    const sr = new ShareResultPage(page);
    await page.goto("/r/TESTAAAA"); // establish origin

    for (const { theme, suffix } of THEMES) {
      await page.evaluate((t) => window.localStorage.setItem("subenai-theme", t), theme);
      await page.goto("/r/TESTAAAA");
      await sr.scoreValue.waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/shared-result${suffix}.png`, fullPage: true });
    }
  });

  test("verify the erasure doc embeds the themed screenshot", async ({ page }) => {
    const docs = new DocsPortal(page);
    await page.setViewportSize({ width: 1180, height: 1400 });
    await docs.gotoArticle("vymazanie-udajov");
    await docs.articleTitle.waitFor({ state: "visible" });
    await docs.bodyImage("/img/docs/dsr-form.png").waitFor({ state: "attached" });
    await docs.bodyImage("/img/docs/dsr-form-dark.png").waitFor({ state: "attached" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/_verify-erasure-doc.png", fullPage: false });
  });
});
