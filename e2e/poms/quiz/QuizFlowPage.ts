import { BasePage } from "../BasePage";

export class QuizFlowPage extends BasePage {
  static readonly PATH = "/test" as const;

  // --- intro / loading phase ---

  get readyCard() {
    return this.page.getByTestId("test-loading");
  }

  // --- playing phase ---

  get questionCard() {
    return this.page.getByTestId("quiz-flow-question-card");
  }

  get progressIndicator() {
    return this.page.getByTestId("quiz-flow-progress");
  }

  /** The progress indicator narrowed to a specific "Otázka X / Y" label. */
  progressWithText(label: string) {
    return this.progressIndicator.filter({ hasText: label });
  }

  get timer() {
    return this.page.getByTestId("quiz-flow-timer");
  }

  get prompt() {
    return this.page.getByTestId("quiz-flow-prompt");
  }

  option(id: "a" | "b" | "c") {
    return this.page.getByTestId(`quiz-flow-option-${id}`);
  }

  // --- results phase ---

  get scoreValue() {
    return this.page.getByTestId("quiz-results-score-value");
  }

  get breakdown() {
    return this.page.getByTestId("quiz-results-breakdown");
  }

  get shareSection() {
    return this.page.getByTestId("quiz-results-share-section");
  }

  get shareUrlInput() {
    return this.page.getByTestId("quiz-results-share-url");
  }

  get restartButton() {
    return this.page.getByTestId("quiz-results-restart");
  }

  // --- actions ---

  async open() {
    return this.goto(QuizFlowPage.PATH);
  }

  async waitForPlayingPhase() {
    await this.questionCard.waitFor({ state: "visible" });
  }

  async waitForResultsPhase() {
    await this.scoreValue.waitFor({ state: "visible" });
  }

  async clickOption(id: "a" | "b" | "c") {
    await this.option(id).click();
  }

  /**
   * Drive through all 10 questions by always picking option `b` (the
   * correct answer in the fixture set) and waiting for each question to
   * advance after the 1300 ms feedback delay.
   */
  async answerAllQuestions(total = 10) {
    for (let i = 0; i < total; i++) {
      await this.questionCard.waitFor({ state: "visible" });
      await this.clickOption("b");
      if (i < total - 1) {
        // Wait for the card to reflect the next question before proceeding.
        const expectedProgress = `Otázka ${i + 2} / ${total}`;
        await this.progressIndicator.waitFor({ state: "visible" });
        await this.page
          .getByTestId("quiz-flow-progress")
          .filter({ hasText: expectedProgress })
          .waitFor({ state: "visible", timeout: 5000 });
      }
    }
  }
}
