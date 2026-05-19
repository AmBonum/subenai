import { BasePage } from "../BasePage";

/**
 * POM for `/app/onboarding` — the 3-question profile-preferences flow
 * that runs once after signup. `staticData.hideSiteHeader = true`, so
 * specs that need to assert the absence of the marketing chrome read
 * `siteHeader` directly from the page context (no POM getter needed).
 */
export class AppOnboardingPage extends BasePage {
  static readonly PATH = "/app/onboarding" as const;

  async open() {
    return this.goto(AppOnboardingPage.PATH);
  }

  // ---- Root & headings -------------------------------------------------
  get root() {
    return this.page.getByTestId("onboarding-root");
  }

  get card() {
    return this.page.getByTestId("onboarding-card");
  }

  get heading() {
    return this.page.getByTestId("onboarding-heading");
  }

  get subheading() {
    return this.page.getByTestId("onboarding-subheading");
  }

  get form() {
    return this.page.getByTestId("onboarding-form");
  }

  // ---- Q1 audience radio (class / colleagues / clients / other) -------
  get q1Group() {
    return this.page.getByTestId("onboarding-q1");
  }

  q1Radio(kind: "class" | "colleagues" | "clients" | "other") {
    return this.page.getByTestId(`onboarding-q1-${kind}`);
  }

  // ---- Q2 scam-interests checkboxes ------------------------------------
  get q2Group() {
    return this.page.getByTestId("onboarding-q2");
  }

  q2Checkbox(
    interest:
      | "phishing"
      | "voice_clone"
      | "marketplace"
      | "investment"
      | "romance"
      | "tech_support"
      | "delivery"
      | "deepfake",
  ) {
    return this.page.getByTestId(`onboarding-q2-${interest}`);
  }

  // ---- Q3 digest-cadence select ---------------------------------------
  get q3Group() {
    return this.page.getByTestId("onboarding-q3");
  }

  get q3Trigger() {
    return this.page.getByTestId("onboarding-q3-trigger");
  }

  q3Option(cadence: "weekly" | "monthly" | "off") {
    return this.page.getByTestId(`onboarding-q3-${cadence}`);
  }

  // ---- Actions + error -------------------------------------------------
  get submitButton() {
    return this.page.getByTestId("onboarding-submit-button");
  }

  get skipButton() {
    return this.page.getByTestId("onboarding-skip-button");
  }

  get errorMessage() {
    return this.page.getByTestId("onboarding-error-message");
  }
}
