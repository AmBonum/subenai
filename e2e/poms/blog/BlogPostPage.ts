import { BasePage } from "../BasePage";

export class BlogPostPage extends BasePage {
  async openSlug(slug: string) {
    return this.goto(`/blog/${slug}`);
  }

  get root() {
    return this.page.getByTestId("blog-post-root");
  }

  get loading() {
    return this.page.getByTestId("blog-post-loading");
  }

  get title() {
    return this.page.getByTestId("blog-post-title");
  }

  get subtitle() {
    return this.page.getByTestId("blog-post-subtitle");
  }

  get publishedMeta() {
    return this.page.getByTestId("blog-post-published");
  }

  get publishedTime() {
    return this.page.getByTestId("blog-post-published-value");
  }

  get body() {
    return this.page.getByTestId("blog-post-body");
  }

  /** Markdown-generated heading inside the article body. Markdown output
   *  carries no test-ids (content is editorial), so the body root testid
   *  scopes an element-type lookup. */
  bodyHeading(text: string) {
    return this.body.locator("h2", { hasText: text });
  }

  bodyText(text: string) {
    return this.body.getByText(text);
  }

  /** Any <script> element react-markdown would have (wrongly) emitted
   *  inside the article body — must always resolve to 0 elements. */
  get bodyScripts() {
    return this.body.locator("script");
  }

  /** Document-wide probe for an injected payload script (XSS guard). */
  injectedScript(payload: string) {
    return this.page.locator("script", { hasText: payload });
  }

  get notFoundRoot() {
    return this.page.getByTestId("blog-post-not-found-root");
  }

  get notFoundTitle() {
    return this.page.getByTestId("blog-post-not-found-title");
  }

  get notFoundDescription() {
    return this.page.getByTestId("blog-post-not-found-description");
  }

  get notFoundBackLink() {
    return this.page.getByTestId("blog-post-not-found-back");
  }
}
