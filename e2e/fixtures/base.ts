import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test as base } from "@playwright/test";
import { ConsentBanner } from "../poms/shared/ConsentBanner";
import { ConsentPreferencesDialog } from "../poms/shared/ConsentPreferencesDialog";
import { SiteHeader } from "../poms/shared/SiteHeader";
import { SiteFooter } from "../poms/shared/SiteFooter";
import { NotFoundPage } from "../poms/shared/NotFoundPage";
import { HomePage } from "../poms/quiz/HomePage";
import { ComposerPage } from "../poms/quiz/ComposerPage";
import { QuizFlowPage } from "../poms/quiz/QuizFlowPage";
import { ShareResultPage } from "../poms/quiz/ShareResultPage";
import { MarketingHomePage } from "../poms/marketing/HomePage";
import { AboutPage } from "../poms/marketing/AboutPage";
import { ContactPage } from "../poms/marketing/ContactPage";
import { SchoolsPage } from "../poms/marketing/SchoolsPage";
import { SchoolsDpaPage } from "../poms/marketing/SchoolsDpaPage";
import { SupportPage } from "../poms/marketing/SupportPage";
import { SponsorsPage } from "../poms/marketing/SponsorsPage";
import { ManageSupportPage } from "../poms/marketing/ManageSupportPage";
import { PodporaPage } from "../poms/sponsorship/PodporaPage";
import { PrivacyPage, CookiesPage, ChangelogPage } from "../poms/marketing/LegalPages";
import { TestsDirectoryPage } from "../poms/quiz/TestsDirectoryPage";
import { NetworkSentinel } from "../poms/security/NetworkSentinel";

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
  composer: ComposerPage;
  testsDirectory: TestsDirectoryPage;
  quizFlow: QuizFlowPage;
  shareResult: ShareResultPage;
  marketingHome: MarketingHomePage;
  about: AboutPage;
  contact: ContactPage;
  schools: SchoolsPage;
  schoolsDpa: SchoolsDpaPage;
  support: SupportPage;
  sponsors: SponsorsPage;
  manageSupport: ManageSupportPage;
  consent: ConsentBanner;
  consentDialog: ConsentPreferencesDialog;
  header: SiteHeader;
  footer: SiteFooter;
  notFound: NotFoundPage;
  podpora: PodporaPage;
  privacy: PrivacyPage;
  cookies: CookiesPage;
  changelog: ChangelogPage;
  sentinel: NetworkSentinel;
};

export const test = base.extend<Fixtures>({
  home: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  composer: async ({ page }, use) => {
    await use(new ComposerPage(page));
  },
  testsDirectory: async ({ page }, use) => {
    await use(new TestsDirectoryPage(page));
  },
  quizFlow: async ({ page }, use) => {
    await use(new QuizFlowPage(page));
  },
  shareResult: async ({ page }, use) => {
    await use(new ShareResultPage(page));
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
  schools: async ({ page }, use) => {
    await use(new SchoolsPage(page));
  },
  schoolsDpa: async ({ page }, use) => {
    await use(new SchoolsDpaPage(page));
  },
  support: async ({ page }, use) => {
    await use(new SupportPage(page));
  },
  sponsors: async ({ page }, use) => {
    await use(new SponsorsPage(page));
  },
  manageSupport: async ({ page }, use) => {
    await use(new ManageSupportPage(page));
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
  privacy: async ({ page }, use) => {
    await use(new PrivacyPage(page));
  },
  cookies: async ({ page }, use) => {
    await use(new CookiesPage(page));
  },
  changelog: async ({ page }, use) => {
    await use(new ChangelogPage(page));
  },
  sentinel: async ({ page }, use) => {
    // Construct BEFORE the spec's first navigation so the request
    // listener catches every request from the page-load onwards.
    await use(new NetworkSentinel(page));
  },
});

export { expect } from "@playwright/test";
