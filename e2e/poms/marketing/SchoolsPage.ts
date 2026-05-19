import { BasePage } from "../BasePage";

/**
 * /schools — public marketing + documentation landing for the edu-mode
 * flow (school principals, IT coordinators, teachers / lectors).
 *
 * The page is composed of focused sections — every interactive or
 * asserted element has a stable `schools-*` test-id. POM mirrors that
 * structure so specs read like a guided tour of the page.
 */
export class SchoolsPage extends BasePage {
  static readonly PATH = "/schools" as const;

  async open() {
    return this.goto(SchoolsPage.PATH);
  }

  // Breadcrumb + JSON-LD
  get breadcrumb() {
    return this.page.getByTestId("schools-breadcrumb");
  }
  get breadcrumbHomeLink() {
    return this.page.getByTestId("schools-breadcrumb-home");
  }

  // Hero
  get hero() {
    return this.page.getByTestId("schools-hero");
  }
  get heroKicker() {
    return this.page.getByTestId("schools-hero-kicker");
  }
  get heroTitle() {
    return this.page.getByTestId("schools-hero-title");
  }
  get heroSubtitle() {
    return this.page.getByTestId("schools-hero-subtitle");
  }
  get heroCta() {
    return this.page.getByTestId("schools-hero-cta");
  }
  get heroCtaSecondary() {
    return this.page.getByTestId("schools-hero-cta-secondary");
  }
  personaChip(slug: "riaditel" | "itkoord" | "ucitel") {
    return this.page.getByTestId(`schools-hero-persona-${slug}`);
  }

  // Persona comparison table
  get personaComparison() {
    return this.page.getByTestId("schools-persona-comparison");
  }
  personaColumn(slug: "riaditel" | "itkoord" | "ucitel") {
    return this.page.getByTestId(`schools-persona-col-${slug}`);
  }

  // Workflow steps
  get workflow() {
    return this.page.getByTestId("schools-workflow");
  }
  workflowStep(n: 1 | 2 | 3 | 4) {
    return this.page.getByTestId(`schools-workflow-step-${n}`);
  }
  workflowStepHeading(n: 1 | 2 | 3 | 4) {
    return this.page.getByTestId(`schools-workflow-step-${n}-heading`);
  }

  // GDPR card + DPA callout
  get gdprCard() {
    return this.page.getByTestId("schools-gdpr-card");
  }
  get dpaBox() {
    return this.page.getByTestId("schools-gdpr-dpa-box");
  }
  get dpaLink() {
    return this.page.getByTestId("schools-gdpr-dpa-link");
  }

  // FAQ accordion (adapter wrapping HomeFaqSection with prefix "schools-faq")
  get faqSection() {
    return this.page.getByTestId("schools-faq-section");
  }
  faqCategoryTrigger(slug: "pristup" | "data") {
    return this.page.getByTestId(`schools-faq-category-trigger-${slug}`);
  }
  faqCategory(slug: "pristup" | "data") {
    return this.page.getByTestId(`schools-faq-category-${slug}`);
  }

  // Footer cross-link triangle
  get footerCta() {
    return this.page.getByTestId("schools-footer-cta");
  }
  footerCard(target: "composer" | "test" | "blog") {
    return this.page.getByTestId(`schools-footer-cta-${target}`);
  }

  // Sticky mobile CTA (rendered always; visibility gated by Tailwind md:hidden)
  get stickyCta() {
    return this.page.getByTestId("schools-sticky-cta");
  }

  // SEO JSON-LD blocks — checked indirectly by counting <script
  // type="application/ld+json"> nodes the route emits. The route emits
  // three: EducationalOrganization + HowTo + FAQPage. SchoolsBreadcrumb
  // adds a fourth one inline. Total: 4.
  get jsonLdScripts() {
    return this.page.locator('script[type="application/ld+json"]');
  }
}
