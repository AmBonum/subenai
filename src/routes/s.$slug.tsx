import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { usePublishedCmsPage } from "@/lib/admin/queries";
import type { CmsBlock, CmsPage } from "@/lib/admin/cms-mock-store";

export const Route = createFileRoute("/s/$slug")({
  component: PublicCmsPageRoute,
});

interface PublicCmsPage {
  id: string;
  slug: string;
  title: string;
  seo_description: string;
  content_blocks: CmsBlock[];
  published_at: string;
}

// AH-11.5a — safe-column projection. Drops owner_id / updated_at / status so
// nothing leaks beyond what was rendered by the AH-9 loader.
function project(page: CmsPage): PublicCmsPage {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    seo_description: page.seo_description,
    content_blocks: page.content_blocks.map((b) => ({ ...b })),
    published_at: page.published_at ?? "",
  };
}

function PublicCmsPageRoute() {
  const { slug } = Route.useParams();
  const query = usePublishedCmsPage(slug);

  if (query.isLoading) return null;
  if (!query.data) throw notFound();

  const page = project(query.data);

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
