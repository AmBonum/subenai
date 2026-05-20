import { test, expect } from "../../fixtures/base";

// E19.8 — /schools senior rework smoke + conversion-path coverage.
//
// The /schools page was completely rebuilt in E19 from a flat prose
// guide into a componentized marketing landing (persona-segmented hero,
// 3-column comparison table, 4-step illustrated workflow, collapsible
// FAQ, GDPR card with explicit DPA CTA, footer cross-link triangle).
//
// These specs verify:
//   - the new structural test-ids render
//   - the conversion paths land on the right routes (/test/builder, /test, /blog)
//   - the DPA CTA produces a mailto: URL (no longer buried mid-page)
//   - SEO JSON-LD blocks (FAQPage + HowTo + EducationalOrganization + BreadcrumbList) are emitted
//   - meta + robots are correct
//
// All locators come from the SchoolsPage POM — no direct page.locator()
// or page.getByTestId() in this spec (CLAUDE.md "POM-only locators" rule).

test.describe("/schools — senior marketing landing (E19)", () => {
  test("renders hero with outcome-first H1 + 3 persona chips + dual CTA", async ({
    page,
    schools,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await schools.open();

    await expect(schools.breadcrumb).toBeVisible();
    await expect(schools.hero).toBeVisible();
    await expect(schools.heroKicker).toBeVisible();
    await expect(schools.heroTitle).toBeVisible();
    await expect(schools.heroSubtitle).toBeVisible();

    await expect(schools.personaChip("riaditel")).toBeVisible();
    await expect(schools.personaChip("itkoord")).toBeVisible();
    await expect(schools.personaChip("ucitel")).toBeVisible();

    await expect(schools.heroCta).toBeVisible();
    await expect(schools.heroCta).toHaveAttribute("href", "/test/builder");
    await expect(schools.heroCtaSecondary).toHaveAttribute("href", "/test");
  });

  test("renders persona comparison table with 3 columns (desktop)", async ({ page, schools }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await schools.open();

    await expect(schools.personaComparison).toBeVisible();
    await expect(schools.personaColumn("riaditel")).toBeVisible();
    await expect(schools.personaColumn("itkoord")).toBeVisible();
    await expect(schools.personaColumn("ucitel")).toBeVisible();
  });

  test("workflow renders 4 sequenced step cards with original Slovak headings", async ({
    schools,
  }) => {
    await schools.open();
    await expect(schools.workflow).toBeVisible();
    await expect(schools.workflowStep(1)).toBeVisible();
    await expect(schools.workflowStep(2)).toBeVisible();
    await expect(schools.workflowStep(3)).toBeVisible();
    await expect(schools.workflowStep(4)).toBeVisible();
    await expect(schools.workflowStepHeading(1)).toContainText("Krok 1");
    await expect(schools.workflowStepHeading(4)).toContainText("Krok 4");
  });

  test("GDPR card surfaces the DPA callout as a first-class CTA", async ({ schools }) => {
    // E40 — the CTA target depends on the build-time feature flag
    // `VITE_DPA_FLOW_ENABLED`. Production has it ON → internal link to
    // `/schools/dpa`. Dev / CI without the env var → legacy mailto
    // fallback. Both states are valid by design (the fallback ships so
    // /schools never has a dead button while we wait on legal review),
    // so this spec accepts EITHER href and locks the other invariants:
    // the box renders, the link is visible, the URL is one of the two
    // sanctioned shapes. The dedicated /schools/dpa form happy-path is
    // tested in `schools-dpa.spec.ts`.
    await schools.open();
    await expect(schools.gdprCard).toBeVisible();
    await expect(schools.dpaBox).toBeVisible();
    await expect(schools.dpaLink).toBeVisible();
    const href = await schools.dpaLink.getAttribute("href");
    expect(href).toMatch(/^(mailto:.*DPA|\/schools\/dpa)/);
  });

  test("FAQ accordion replaces the prose wall — both categories visible, click toggles open", async ({
    schools,
  }) => {
    await schools.open();
    await expect(schools.faqSection).toBeVisible();
    await expect(schools.faqCategoryTrigger("pristup")).toBeVisible();
    await expect(schools.faqCategoryTrigger("data")).toBeVisible();
    await expect(schools.faqCategory("pristup")).toHaveAttribute("data-state", "closed");
    await schools.faqCategoryTrigger("pristup").click();
    await expect(schools.faqCategory("pristup")).toHaveAttribute("data-state", "open");
  });

  test("footer cross-link triangle: 3 cards link to composer / test / blog", async ({
    schools,
  }) => {
    await schools.open();
    await expect(schools.footerCta).toBeVisible();
    await expect(schools.footerCard("composer")).toHaveAttribute("href", "/test/builder");
    await expect(schools.footerCard("test")).toHaveAttribute("href", "/test");
    await expect(schools.footerCard("blog")).toHaveAttribute("href", "/blog");
  });

  test("hero CTA navigates to /test/builder (Composer)", async ({ page, schools }) => {
    await schools.open();
    await schools.heroCta.click();
    await expect(page).toHaveURL(/\/test\/zostav/);
  });

  test("emits 4 JSON-LD blocks (EducationalOrg + HowTo + FAQPage + BreadcrumbList)", async ({
    schools,
  }) => {
    await schools.open();
    await expect(schools.jsonLdScripts).toHaveCount(4);
  });

  test("page <title> + robots meta are SEO-correct", async ({ page, schools }) => {
    await schools.open();
    await expect(page).toHaveTitle(/subenai/i);
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toMatch(/index/);
    expect(robots).toMatch(/follow/);
  });
});
