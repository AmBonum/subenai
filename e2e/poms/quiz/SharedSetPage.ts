import { BasePage } from "../BasePage";

export class SharedSetPage extends BasePage {
  static readonly BASE_PATH = "/test/builder" as const;

  static pathFor(id: string) {
    return `${SharedSetPage.BASE_PATH}/${id}` as const;
  }

  // E33 — public path is now /results (was /vysledky). Method name
  // kept as `vysledkyPathFor` (and the corresponding testids below)
  // because the underlying UI testid contract is unchanged; renaming
  // those would be a separate cleanup PR (E33 follow-up).
  static vysledkyPathFor(id: string) {
    return `${SharedSetPage.BASE_PATH}/${id}/results` as const;
  }

  // --- landing page (non-edu, collects_responses = false) ---

  get page_() {
    return this.page.getByTestId("shared-set-page");
  }

  get heading() {
    // E34 Phase 2 — the `shared-set-heading` testid is now on the wrapper
    // that includes the eyebrow + heading + subline + trust line. To keep
    // `toHaveText(creator_label)` assertions exact, this getter resolves
    // to the inner `<h1>` (respondent-hero-heading) instead, which carries
    // only the heading string. The outer wrapper is still queryable via
    // `headingArea` below if a test wants to assert on the whole hero.
    return this.page.getByTestId("respondent-hero-heading");
  }

  /** The entire hero block (eyebrow + heading + subline + trust line). */
  get headingArea() {
    return this.page.getByTestId("shared-set-heading");
  }

  get questionCount() {
    return this.page.getByTestId("shared-set-question-count");
  }

  // E34 Phase 2 senior hero parts (eyebrow + subline + trust line).

  get heroEyebrow() {
    return this.page.getByTestId("respondent-hero-eyebrow");
  }

  get heroSubline() {
    return this.page.getByTestId("respondent-hero-subline");
  }

  get heroTrust() {
    return this.page.getByTestId("respondent-hero-trust");
  }

  get startButton() {
    return this.page.getByTestId("shared-set-start-button");
  }

  // --- not-found state ---

  get notFoundHeading() {
    return this.page.getByTestId("shared-set-not-found-heading");
  }

  get notFoundBody() {
    return this.page.getByTestId("shared-set-not-found-body");
  }

  // --- /vysledky auth gate ---

  get vysledkyAuthGate() {
    return this.page.getByTestId("vysledky-auth-gate");
  }

  get vysledkyGateHeading() {
    return this.page.getByTestId("vysledky-gate-heading");
  }

  get vysledkyGatePasswordInput() {
    return this.page.getByTestId("vysledky-gate-password-input");
  }

  get vysledkyDashboard() {
    return this.page.getByTestId("vysledky-dashboard");
  }

  // --- actions ---

  async open(id: string) {
    return this.goto(SharedSetPage.pathFor(id));
  }

  async openVysledky(id: string) {
    return this.goto(SharedSetPage.vysledkyPathFor(id));
  }

  async clickStart() {
    await this.startButton.click();
  }
}
