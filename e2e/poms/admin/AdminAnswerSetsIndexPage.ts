import { BasePage } from "../BasePage";

export class AdminAnswerSetsIndexPage extends BasePage {
  static readonly PATH = "/admin/answer-sets" as const;

  async open() {
    return this.goto(AdminAnswerSetsIndexPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-answer-sets-root");
  }

  get searchInput() {
    return this.page.getByTestId("answer-sets-list-search");
  }

  get emptyState() {
    return this.page.getByTestId("answer-sets-list-empty-state");
  }

  get newButton() {
    return this.page.getByTestId("answer-sets-list-new-button");
  }

  row(setId: string) {
    return this.page.getByTestId(`answer-sets-list-row-${setId}`);
  }

  editLink(setId: string) {
    return this.page.getByTestId(`answer-sets-row-edit-${setId}`);
  }

  menuTrigger(setId: string) {
    return this.page.getByTestId(`answer-sets-row-menu-${setId}`);
  }
}
