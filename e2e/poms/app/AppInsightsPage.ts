import { BasePage } from "../BasePage";

export type InsightsTab = "digest" | "recommendations" | "retest" | "peer";

/**
 * POM for /app/insights (M4 — the merged retention surface).
 *
 * The four former pages (/app/digest, /app/recommendations, /app/retest,
 * /app/peer) render as tabs; their section markup kept the original
 * data-testids, so the per-section getters below are unchanged from the
 * pre-merge POMs.
 */
export class AppInsightsPage extends BasePage {
  static readonly PATH = "/app/insights" as const;

  async open(tab?: InsightsTab) {
    return this.goto(tab ? `${AppInsightsPage.PATH}?tab=${tab}` : AppInsightsPage.PATH);
  }

  // ---- page chrome -------------------------------------------------------

  get root() {
    return this.page.getByTestId("app-insights-root");
  }

  get pageHeader() {
    return this.page.getByTestId("app-insights-page-header");
  }

  get pageHeaderEyebrow() {
    return this.page.getByTestId("app-shell-page-header-eyebrow");
  }

  get tabsList() {
    return this.page.getByTestId("app-insights-tabs-list");
  }

  tab(tab: InsightsTab) {
    return this.page.getByTestId(`app-insights-tab-${tab}`);
  }

  panel(tab: InsightsTab) {
    return this.page.getByTestId(`app-insights-panel-${tab}`);
  }

  // ---- digest section ------------------------------------------------------

  get digestRoot() {
    return this.page.getByTestId("app-digest-root");
  }

  get digestEmptyState() {
    return this.page.getByTestId("app-digest-empty-state");
  }

  get digestEmptyTitle() {
    return this.page.getByTestId("app-digest-empty-title");
  }

  get digestList() {
    return this.page.getByTestId("app-digest-list");
  }

  digestCard(id: string) {
    return this.page.getByTestId(`app-digest-card-${id}`);
  }

  digestCardPeriod(id: string) {
    return this.page.getByTestId(`app-digest-card-period-${id}`);
  }

  digestCardSessions(id: string) {
    return this.page.getByTestId(`app-digest-card-sessions-${id}`);
  }

  digestCardCompletion(id: string) {
    return this.page.getByTestId(`app-digest-card-completion-${id}`);
  }

  digestCardTopTest(id: string) {
    return this.page.getByTestId(`app-digest-card-top-test-${id}`);
  }

  digestCardTopTestCta(id: string) {
    return this.page.getByTestId(`app-digest-card-top-test-cta-${id}`);
  }

  digestCardWeakest(id: string) {
    return this.page.getByTestId(`app-digest-card-weakest-${id}`);
  }

  // ---- recommendations section ---------------------------------------------

  get recommendationsRoot() {
    return this.page.getByTestId("app-recommendations-root");
  }

  get recommendationsEmptyState() {
    return this.page.getByTestId("app-recommendations-empty-state");
  }

  get recommendationsEmptyTitle() {
    return this.page.getByTestId("app-recommendations-empty-title");
  }

  get recommendationsList() {
    return this.page.getByTestId("app-recommendations-list");
  }

  recommendationsCard(id: string) {
    return this.page.getByTestId(`app-recommendations-card-${id}`);
  }

  recommendationsCardTitle(id: string) {
    return this.page.getByTestId(`app-recommendations-card-title-${id}`);
  }

  recommendationsCardReason(id: string) {
    return this.page.getByTestId(`app-recommendations-card-reason-${id}`);
  }

  recommendationsCardViewCta(id: string) {
    return this.page.getByTestId(`app-recommendations-card-view-${id}`);
  }

  // ---- retest section --------------------------------------------------------

  get retestRoot() {
    return this.page.getByTestId("app-retest-root");
  }

  get retestEmptyState() {
    return this.page.getByTestId("app-retest-empty-state");
  }

  get retestEmptyTitle() {
    return this.page.getByTestId("app-retest-empty-title");
  }

  get retestDueSection() {
    return this.page.getByTestId("app-retest-due-section");
  }

  get retestUpcomingSection() {
    return this.page.getByTestId("app-retest-upcoming-section");
  }

  retestCard(id: string) {
    return this.page.getByTestId(`app-retest-card-${id}`);
  }

  retestCardTitle(id: string) {
    return this.page.getByTestId(`app-retest-card-title-${id}`);
  }

  retestCardDueIn(id: string) {
    return this.page.getByTestId(`app-retest-card-due-in-${id}`);
  }

  retestCardRunCta(id: string) {
    return this.page.getByTestId(`app-retest-card-run-${id}`);
  }

  // ---- peer section -----------------------------------------------------------

  get peerRoot() {
    return this.page.getByTestId("app-peer-root");
  }

  get peerEmptyInsufficientCard() {
    return this.page.getByTestId("app-peer-empty-cohort");
  }

  get peerEmptyInsufficientBody() {
    return this.page.getByTestId("app-peer-empty-cohort-body");
  }

  get peerPercentileCard() {
    return this.page.getByTestId("app-peer-percentile-card");
  }

  get peerPercentileHeadline() {
    return this.page.getByTestId("app-peer-percentile-headline");
  }

  get peerScoreUserValue() {
    return this.page.getByTestId("app-peer-score-user-value");
  }

  get peerScoreCohortValue() {
    return this.page.getByTestId("app-peer-score-cohort-value");
  }

  get peerShareDownloadButton() {
    return this.page.getByTestId("app-peer-share-download");
  }

  get peerPrivacyNote() {
    return this.page.getByTestId("app-peer-privacy-note");
  }
}
