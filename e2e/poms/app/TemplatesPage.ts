// POM for the E39.3 rewrite of `/app/templates`. Built ahead of the UI
// rebuild from Appendix D's test-id catalog (`tasks/E39-appendix-D.md` § 9)
// so the spec can land the moment the UI ships. Until the new UI lands,
// `e2e/poms/app/AppTemplatesPage.ts` remains the source of truth for the
// LEGACY page.
//
// All locators flow through POM getters per CLAUDE.md — specs never call
// `page.getByTestId(...)` directly.

import { BasePage } from "../BasePage";

export type TemplatesTab = "public" | "mine";

export class TemplatesPage extends BasePage {
  static readonly PATH = "/app/templates" as const;

  async open(tab?: TemplatesTab) {
    const path = tab ? `${TemplatesPage.PATH}?tab=${tab}` : TemplatesPage.PATH;
    return this.goto(path);
  }

  // -- Page shell --------------------------------------------------------

  get root() {
    return this.page.getByTestId("templates-root");
  }

  get pageHeader() {
    return this.page.getByTestId("templates-page-header");
  }

  // -- Tabs --------------------------------------------------------------

  get tabsRoot() {
    return this.page.getByTestId("templates-tabs-root");
  }

  get tabPublic() {
    return this.page.getByTestId("templates-tab-public");
  }

  get tabMine() {
    return this.page.getByTestId("templates-tab-mine");
  }

  get tabPublicPanel() {
    return this.page.getByTestId("templates-tab-public-panel");
  }

  get tabMinePanel() {
    return this.page.getByTestId("templates-tab-mine-panel");
  }

  async switchToMine() {
    await this.tabMine.click();
  }

  async switchToPublic() {
    await this.tabPublic.click();
  }

  // -- Filter bar --------------------------------------------------------

  get filterBar() {
    return this.page.getByTestId("templates-filter-bar");
  }

  get searchInput() {
    return this.page.getByTestId("templates-filter-search-input");
  }

  get categoryFilter() {
    return this.page.getByTestId("templates-filter-category-select");
  }

  get sortFilter() {
    return this.page.getByTestId("templates-filter-sort-select");
  }

  get resultsCount() {
    return this.page.getByTestId("templates-filter-results-count");
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  // -- Grid + cards ------------------------------------------------------

  get grid() {
    return this.page.getByTestId("templates-grid");
  }

  get gridSkeleton() {
    return this.page.getByTestId("templates-grid-skeleton");
  }

  get allCards() {
    return this.page.locator('[data-testid^="templates-card-"]:not([data-testid*="-action-"])');
  }

  card(id: string) {
    return this.page.getByTestId(`templates-card-${id}`);
  }

  cardTitle(id: string) {
    return this.page.getByTestId(`templates-card-title-${id}`);
  }

  cardDescription(id: string) {
    return this.page.getByTestId(`templates-card-description-${id}`);
  }

  cardQuestionsCount(id: string) {
    return this.page.getByTestId(`templates-card-questions-count-${id}`);
  }

  cardPurposeChip(id: string) {
    return this.page.getByTestId(`templates-card-purpose-chip-${id}`);
  }

  cardAgeRatingBadge(id: string) {
    return this.page.getByTestId(`templates-card-age-rating-badge-${id}`);
  }

  cardOwnershipBadge(id: string) {
    return this.page.getByTestId(`templates-card-ownership-badge-${id}`);
  }

  cardUseButton(id: string) {
    return this.page.getByTestId(`templates-card-use-button-${id}`);
  }

  cardActionMenuTrigger(id: string) {
    return this.page.getByTestId(`templates-card-action-menu-trigger-${id}`);
  }

  cardActionMenu(id: string) {
    return this.page.getByTestId(`templates-card-action-menu-${id}`);
  }

  cardActionEdit(id: string) {
    return this.page.getByTestId(`templates-card-action-edit-${id}`);
  }

  cardActionDuplicate(id: string) {
    return this.page.getByTestId(`templates-card-action-duplicate-${id}`);
  }

  cardActionSubmitPublic(id: string) {
    return this.page.getByTestId(`templates-card-action-submit-public-${id}`);
  }

  cardActionDelete(id: string) {
    return this.page.getByTestId(`templates-card-action-delete-${id}`);
  }

  async openCardActionMenu(id: string) {
    await this.cardActionMenuTrigger(id).click();
  }

  async clickDuplicate(id: string) {
    await this.openCardActionMenu(id);
    await this.cardActionDuplicate(id).click();
  }

  async clickEdit(id: string) {
    await this.openCardActionMenu(id);
    await this.cardActionEdit(id).click();
  }

  async clickDelete(id: string) {
    await this.openCardActionMenu(id);
    await this.cardActionDelete(id).click();
  }

  async clickUse(id: string) {
    await this.cardUseButton(id).click();
  }

  // -- Empty states ------------------------------------------------------

  get emptyStatePublicFilter() {
    return this.page.getByTestId("templates-empty-state-public-filter");
  }

  get emptyStatePublicNoData() {
    return this.page.getByTestId("templates-empty-state-public-no-data");
  }

  get emptyStateMineNoCopies() {
    return this.page.getByTestId("templates-empty-state-mine-no-copies");
  }

  get emptyStateMineNoCopiesCta() {
    return this.page.getByTestId("templates-empty-state-mine-no-copies-cta");
  }

  get emptyStateMineFilter() {
    return this.page.getByTestId("templates-empty-state-mine-filter");
  }

  // -- Edit dialog -------------------------------------------------------

  get editDialog() {
    return this.page.getByTestId("templates-edit-dialog-root");
  }

  get editDialogTitleInput() {
    return this.page.getByTestId("templates-edit-dialog-title-input");
  }

  get editDialogDescriptionInput() {
    return this.page.getByTestId("templates-edit-dialog-description-input");
  }

  get editDialogCategorySelect() {
    return this.page.getByTestId("templates-edit-dialog-category-select");
  }

  get editDialogQuestionsButton() {
    return this.page.getByTestId("templates-edit-dialog-questions-button");
  }

  get editDialogCancel() {
    return this.page.getByTestId("templates-edit-dialog-cancel");
  }

  get editDialogSave() {
    return this.page.getByTestId("templates-edit-dialog-save");
  }

  // -- Duplicate dialog --------------------------------------------------

  get duplicateDialog() {
    return this.page.getByTestId("templates-duplicate-dialog-root");
  }

  get duplicateDialogTitleInput() {
    return this.page.getByTestId("templates-duplicate-dialog-title-input");
  }

  get duplicateDialogCancel() {
    return this.page.getByTestId("templates-duplicate-dialog-cancel");
  }

  get duplicateDialogConfirm() {
    return this.page.getByTestId("templates-duplicate-dialog-confirm");
  }

  // -- Delete dialog -----------------------------------------------------

  get deleteDialog() {
    return this.page.getByTestId("templates-delete-dialog-root");
  }

  get deleteDialogCancel() {
    return this.page.getByTestId("templates-delete-dialog-cancel");
  }

  get deleteDialogConfirm() {
    return this.page.getByTestId("templates-delete-dialog-confirm");
  }
}
