import { DocBody } from "@/components/docs/DocBody";
import { DocsLayout } from "@/components/docs/DocsLayout";
import type { PublicDoc } from "@/content/docs/types";

// E54.4 — a public /docs/<slug> page. Renders inside the public DocsLayout
// (category sidebar) and renders the body via DocBody (Markdown + 3D scenes).

export interface DocsArticlePageProps {
  doc: PublicDoc;
}

export function DocsArticlePage({ doc }: DocsArticlePageProps) {
  return (
    <DocsLayout activeSlug={doc.slug}>
      <article data-testid="docs-article-root" data-doc-slug={doc.slug} className="max-w-3xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {doc.category}
        </p>
        <h1
          data-testid="docs-article-title"
          className="mb-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          {doc.title}
        </h1>
        <DocBody body={doc.body} />
      </article>
    </DocsLayout>
  );
}
