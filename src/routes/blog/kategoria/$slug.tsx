import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { supabase } from "@/integrations/supabase/client";

// E16.4 — SSR loader + head for category archive pages. Loader fetches
// the category row so head() can emit the right title/description; if
// the row doesn't exist we still render (the lazy component handles
// the 404 UI) but emit noindex meta so Google doesn't index a junk
// page.

interface CategoryHead {
  slug: string;
  name: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export const Route = createFileRoute("/blog/kategoria/$slug")({
  loader: async ({ params }): Promise<CategoryHead | null> => {
    const { data, error } = await supabase
      .from("blog_categories")
      .select("slug, name, description, seo_title, seo_description")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as CategoryHead | null) ?? null;
  },
  head: ({ loaderData, params }) => {
    const cat = loaderData;
    if (!cat) {
      return {
        meta: [
          { title: "kategória nenájdená | akadémia subenai" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const url = `${SITE_ORIGIN}/blog/kategoria/${params.slug}`;
    const title = cat.seo_title ?? `${cat.name} | akadémia subenai`;
    const description =
      cat.seo_description ??
      cat.description ??
      `články o ${cat.name.toLowerCase()} na akadémia subenaiu.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});
