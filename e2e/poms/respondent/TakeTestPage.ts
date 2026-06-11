import { BasePage } from "../BasePage";

/**
 * POM for the public anonymous respondent flow at /t/:shareId.
 *
 * Covers all three route states (loading / not-found / runner) plus the
 * runner's stages (intake, questions, thank-you). Question locators are
 * parameterised by the zero-based display index — the testids in
 * QuestionStep.tsx embed the index, not the question id.
 */
export class TakeTestPage extends BasePage {
  async open(shareId: string) {
    return this.goto(`/t/${shareId}`);
  }

  // ---- Route-level states --------------------------------------------------
  get root() {
    return this.page.getByTestId("respondent-flow-root");
  }

  get notFound() {
    return this.page.getByTestId("respondent-flow-error-not-found");
  }

  get notFoundMessage() {
    return this.page.getByTestId("respondent-flow-not-found-message");
  }

  get notFoundHomeLink() {
    return this.page.getByTestId("respondent-flow-not-found-home-link");
  }

  // ---- Intake stage --------------------------------------------------------
  get testTitle() {
    return this.page.getByTestId("respondent-flow-test-title");
  }

  get testDescription() {
    return this.page.getByTestId("respondent-flow-test-description");
  }

  get intakeConsentCheckbox() {
    return this.page.getByTestId("respondent-flow-intake-consent-checkbox");
  }

  get intakeSubmitButton() {
    return this.page.getByTestId("respondent-flow-intake-submit-button");
  }

  get intakeError() {
    return this.page.getByTestId("respondent-flow-intake-error");
  }

  /** Intake field whose label contains "meno" gets a dedicated testid. */
  get intakeNameInput() {
    return this.page.getByTestId("respondent-flow-intake-name");
  }

  intakeField(fieldId: string) {
    return this.page.getByTestId(`respondent-flow-intake-field-${fieldId}`);
  }

  // ---- Questions stage -----------------------------------------------------
  questionPrompt(index: number) {
    return this.page.getByTestId(`respondent-flow-question-${index}-prompt`);
  }

  /** Choice-option label (wraps the radio input) for question `index`. */
  answerOption(index: number, optionIndex: number) {
    return this.page.getByTestId(`respondent-flow-question-${index}-answer-${optionIndex}`);
  }

  /** The radio input inside a choice-option label — for checked-state asserts. */
  answerOptionRadio(index: number, optionIndex: number) {
    return this.answerOption(index, optionIndex).locator("input[type='radio']");
  }

  /** Free-text answer input for question `index`. */
  answerInput(index: number) {
    return this.page.getByTestId(`respondent-flow-question-${index}-answer-input`);
  }

  get nextButton() {
    return this.page.getByTestId("respondent-flow-next-button");
  }

  get prevButton() {
    return this.page.getByTestId("respondent-flow-prev-button");
  }

  get submitButton() {
    return this.page.getByTestId("respondent-flow-submit-button");
  }

  get submitError() {
    return this.page.getByTestId("respondent-flow-submit-error");
  }

  // ---- Thank-you stage -----------------------------------------------------
  get thankYou() {
    return this.page.getByTestId("respondent-flow-thank-you");
  }

  get thankYouTitle() {
    return this.page.getByTestId("respondent-flow-thank-you-title");
  }

  get thankYouSubtitle() {
    return this.page.getByTestId("respondent-flow-thank-you-subtitle");
  }
}
