import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test as base } from "@playwright/test";
import { ConsentBanner } from "../poms/shared/ConsentBanner";
import { ConsentPreferencesDialog } from "../poms/shared/ConsentPreferencesDialog";
import { SiteHeader } from "../poms/shared/SiteHeader";
import { SiteFooter } from "../poms/shared/SiteFooter";
import { NotFoundPage } from "../poms/shared/NotFoundPage";
import { HomePage } from "../poms/quiz/HomePage";
import { MarketingHomePage } from "../poms/marketing/HomePage";
import { AboutPage } from "../poms/marketing/AboutPage";
import { ContactPage } from "../poms/marketing/ContactPage";
import { PodporaPage } from "../poms/sponsorship/PodporaPage";

// Minimal .env loader so specs don't need playwright.config.ts to import
// dotenv (kept dependency-free). `VITE_SUPABASE_PROJECT_ID` is read by
// the auth fixture to derive the `sb-<ref>-auth-token` localStorage key.
// Idempotent: re-importing this module does not overwrite already-set vars.
(() => {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
})();

/**
 * Composed test fixture — the canonical way to access POMs and shared
 * mocks across this suite.
 *
 * Spec files import `test` from here, NOT from "@playwright/test":
 *
 *   import { test, expect } from "../../fixtures/base";
 *
 *   test("CTA opens the quiz", async ({ home, consent }) => {
 *     await home.open();
 *     if (await consent.isVisible()) await consent.acceptAll();
 *     await home.clickStart();
 *     await expect(...).toBeVisible();
 *   });
 *
 * Why fixtures and not `new HomePage(page)` per test:
 *   - fixtures are lazy — `home` is only constructed if the test names it
 *   - they unify async setup/teardown (auth tokens, seeded data)
 *   - they keep specs short — no boilerplate POM wiring per test
 */
type Fixtures = {
  home: HomePage;
  marketingHome: MarketingHomePage;
  about: AboutPage;
  contact: ContactPage;
  consent: ConsentBanner;
  consentDialog: ConsentPreferencesDialog;
  header: SiteHeader;
  footer: SiteFooter;
  notFound: NotFoundPage;
  podpora: PodporaPage;
};

export const test = base.extend<Fixtures>({
  home: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  marketingHome: async ({ page }, use) => {
    await use(new MarketingHomePage(page));
  },
  about: async ({ page }, use) => {
    await use(new AboutPage(page));
  },
  contact: async ({ page }, use) => {
    await use(new ContactPage(page));
  },
  consent: async ({ page }, use) => {
    await use(new ConsentBanner(page));
  },
  consentDialog: async ({ page }, use) => {
    await use(new ConsentPreferencesDialog(page));
  },
  header: async ({ page }, use) => {
    await use(new SiteHeader(page));
  },
  footer: async ({ page }, use) => {
    await use(new SiteFooter(page));
  },
  notFound: async ({ page }, use) => {
    await use(new NotFoundPage(page));
  },
  podpora: async ({ page }, use) => {
    await use(new PodporaPage(page));
  },
});

export { expect } from "@playwright/test";
