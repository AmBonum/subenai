import { test } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { DsrFormPage } from "../../poms/user/DsrFormPage";
import { DocsPortal } from "../../poms/docs/DocsPortal";

// E57 — generates the documentation screenshots WITHOUT prod, a password, or
// Docker: the existing e2e mock layer (mocked Supabase auth + PostgREST)
// renders the real /app UI against fully synthetic data, captured in BOTH
// themes so the docs can show whichever matches the reader's current theme.
//
//   CAPTURE_DOCS=1 VITE_SUPABASE_PROJECT_ID=<ref> \
//     npx playwright test e2e/specs/docs/capture-docs-screenshots.spec.ts \
//     --project=e2e-chromium
//
// Output → public/img/docs/<name>.png (light) + <name>-dark.png (dark),
// referenced from src/content/docs/index.ts via the `#themed` convention.

const OUT = "public/img/docs";
const THEMES = [
  { theme: "light", suffix: "" },
  { theme: "dark", suffix: "-dark" },
] as const;

// Generator, not a regression test — only runs when explicitly invoked with
// CAPTURE_DOCS=1, so the normal e2e suite never rewrites committed assets.
test.describe("docs screenshots (mocked signed-in surfaces)", () => {
  test.skip(!process.env.CAPTURE_DOCS, "set CAPTURE_DOCS=1 to (re)generate doc screenshots");

  test("DSR / data-request form with history (light + dark)", async ({ context, page }) => {
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

    const dsr = new DsrFormPage(page);
    await page.setViewportSize({ width: 1180, height: 1000 });
    await dsr.open();

    for (const { theme, suffix } of THEMES) {
      await page.evaluate((t) => window.localStorage.setItem("subenai-theme", t), theme);
      await page.reload();
      await dsr.formCard.waitFor({ state: "visible" });
      await dsr.historyCard.waitFor({ state: "visible" });
      // Let fonts/icons settle so the shot is crisp.
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/dsr-form${suffix}.png`, fullPage: true });
    }
  });

  test("rendered erasure doc with the embedded themed screenshot", async ({ page }) => {
    const docs = new DocsPortal(page);
    await page.setViewportSize({ width: 1180, height: 1400 });
    await docs.gotoArticle("vymazanie-udajov");
    await docs.articleTitle.waitFor({ state: "visible" });
    // Both theme variants are present in the DOM (one hidden per theme).
    await docs.bodyImage("/img/docs/dsr-form.png").waitFor({ state: "attached" });
    await docs.bodyImage("/img/docs/dsr-form-dark.png").waitFor({ state: "attached" });
    // Self-check only: written to the gitignored test-results dir.
    await page.waitForTimeout(400);
    await page.screenshot({ path: "test-results/_verify-erasure-doc.png", fullPage: false });
  });
});
