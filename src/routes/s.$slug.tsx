import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { getPublicCmsPage, type PublicCmsPage } from "@/lib/cms/get-page.functions";
import type { CmsBlock } from "@/lib/admin/cms-mock-store";

export const Route = createFileRoute("/s/$slug")({
  loader: ({ params }) => {
    const page = getPublicCmsPage(params.slug);
    if (!page) throw notFound();
    return { page };
  },
  component: PublicCmsPageRoute,
});

function PublicCmsPageRoute() {
  const { page } = Route.useLoaderData() as { page: PublicCmsPage };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10" data-testid="public-cms-page-content">
      <h1 className="text-4xl font-bold" data-testid="public-cms-page-title">
        {page.title}
      </h1>
      {page.seo_description && (
        <p className="mt-2 text-muted-foreground" data-testid="public-cms-page-description">
          {page.seo_description}
        </p>
      )}
      <div className="mt-8 space-y-6">
        {page.content_blocks.map((block, idx) => (
          <BlockView key={block.id} block={block} index={idx} />
        ))}
      </div>
    </main>
  );
}

function BlockView({ block, index }: { block: CmsBlock; index: number }) {
  const testid = `public-cms-page-block-${index}`;

  if (block.kind === "heading") {
    return (
      <h2 className="text-2xl font-semibold" data-testid={testid}>
        {block.text ?? ""}
      </h2>
    );
  }
  if (block.kind === "paragraph") {
    return (
      <p className="leading-relaxed text-foreground" data-testid={testid}>
        {block.text ?? ""}
      </p>
    );
  }
  if (block.kind === "image") {
    return (
      <img
        src={block.url ?? ""}
        alt={block.alt ?? ""}
        className="w-full rounded-md border"
        data-testid={testid}
      />
    );
  }
  return (
    <div data-testid={testid}>
      <Link
        to={block.url ?? "/"}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {block.label ?? ""}
      </Link>
    </div>
  );
}
