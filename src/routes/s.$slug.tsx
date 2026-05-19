import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { supabase } from "@/integrations/supabase/client";
import { usePublishedCmsPage } from "@/lib/admin/queries";
import type { CmsBlock, CmsPage } from "@/lib/admin/cms-types";

// E24 — admin-authored CMS pages (/s/$slug) are listed in sitemap.xml
// and meant to rank in Google, but the route previously shipped zero
// head() metadata: no <title>, no description, no canonical, no OG.
// Google would crawl the sitemap, follow the URL, and find only what
// the static HTML shell provided — effectively un-indexable despite
// being in the sitemap.
//
// Pattern reused from blog/$slug.tsx: a server-side loader runs during
// SSR so the page row is available to head() before client hydration.
// The component still uses usePublishedCmsPage() for React Query cache
// + revalidation on subsequent navigations — the SSR load is a
// one-shot for first paint + meta tags, not a replacement for the
// query layer.
export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params }): Promise<CmsPage | null> => {
    const { data, error } = await supabase
      .from("cms_pages")
      .select("id, slug, title, seo_description, blocks, status, published_at, updated_at")
      .eq("slug", params.slug)
      .eq("status", "published")
      .not("published_at", "is", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as {
      id: string;
      slug: string;
      title: string;
      seo_description: string;
      blocks: CmsBlock[];
      status: "draft" | "published";
      published_at: string | null;
      updated_at: string;
    };
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      seo_description: row.seo_description,
      content_blocks: row.blocks,
      status: row.status,
      published_at: row.published_at,
      updated_at: row.updated_at,
    };
  },
  head: ({ loaderData }) => {
    const page = loaderData;
    if (!page) {
      return {
        meta: [
          { title: "Stránka nenájdená | subenai" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const url = `${SITE_ORIGIN}/s/${page.slug}`;
    const ogImage = `${SITE_ORIGIN}/og-default.png`;
    return {
      meta: [
        { title: `${page.title} | subenai` },
        { name: "description", content: page.seo_description },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: page.title },
        { property: "og:description", content: page.seo_description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: page.title },
        { name: "twitter:description", content: page.seo_description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: page.title,
            description: page.seo_description,
            url,
            inLanguage: "sk-SK",
            isPartOf: {
              "@type": "WebSite",
              name: "subenai",
              url: SITE_ORIGIN,
            },
            ...(page.published_at && { datePublished: page.published_at }),
            ...(page.updated_at && { dateModified: page.updated_at }),
          }),
        },
      ],
    };
  },
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
