import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { supabase } from "@/integrations/supabase/client";

// E16.4 — SSR loader + head for author profile pages. The editorial
// byline 'subenai editorial' is the only author today (locked decision
// #1 in tasks/PLAN-2026-05-19-blog-content-engine.md); even so, every
// page on the site needs proper meta tags for OG/Twitter.

interface AuthorHead {
  slug: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

export const Route = createFileRoute("/blog/autor/$slug")({
  loader: async ({ params }): Promise<AuthorHead | null> => {
    const { data, error } = await supabase
      .from("blog_authors")
      .select("slug, display_name, bio, avatar_url")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as AuthorHead | null) ?? null;
  },
  head: ({ loaderData, params }) => {
    const author = loaderData;
    if (!author) {
      return {
        meta: [
          { title: "autor nenájdený | akadémia subenai" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const url = `${SITE_ORIGIN}/blog/autor/${params.slug}`;
    const title = `${author.display_name} | akadémia subenai`;
    const description =
      author.bio ?? `články od autora ${author.display_name} na akadémia subenaiu.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        ...(author.avatar_url ? [{ property: "og:image", content: author.avatar_url }] : []),
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});
