import { BasePage } from "../BasePage";

export class AdminBlogListPage extends BasePage {
  static readonly PATH = "/admin/blog" as const;

  async open() {
    return this.goto(AdminBlogListPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-blog-list-root");
  }

  get emptyState() {
    return this.page.getByTestId("admin-blog-list-empty");
  }

  get newButton() {
    return this.page.getByTestId("admin-blog-list-new");
  }

  get tableRoot() {
    return this.page.getByTestId("admin-blog-table-root");
  }

  get resultCount() {
    return this.page.getByTestId("admin-blog-result-count");
  }

  listRow(slug: string) {
    return this.page.getByTestId(`admin-blog-list-row-${slug}`);
  }

  listRowLink(slug: string) {
    return this.page.getByTestId(`admin-blog-list-row-link-${slug}`);
  }
}

export class AdminBlogNewPage extends BasePage {
  static readonly PATH = "/admin/blog/new" as const;

  async open() {
    return this.goto(AdminBlogNewPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-blog-new-root");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("admin-page-header-title");
  }

  get editorRoot() {
    return this.page.getByTestId("admin-blog-editor-root");
  }

  get titleInput() {
    return this.page.getByTestId("admin-blog-editor-title");
  }

  get slugInput() {
    return this.page.getByTestId("admin-blog-editor-slug");
  }

  get saveButton() {
    return this.page.getByTestId("admin-blog-editor-save");
  }
}

export class AdminBlogEditPage extends BasePage {
  static readonly PATH = "/admin/blog" as const;

  async openPost(id: string) {
    return this.goto(`${AdminBlogEditPage.PATH}/${id}`);
  }

  get root() {
    return this.page.getByTestId("admin-blog-edit-root");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("admin-page-header-title");
  }

  get editorRoot() {
    return this.page.getByTestId("admin-blog-editor-root");
  }

  get titleInput() {
    return this.page.getByTestId("admin-blog-editor-title");
  }

  get statusLabel() {
    return this.page.getByTestId("admin-blog-editor-status-label");
  }
}
