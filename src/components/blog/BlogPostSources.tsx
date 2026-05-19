import { tFor } from "@/i18n/blog";
import type { BlogPostSource } from "@/lib/blog/queries";

// Structured citation list rendered at the end of every article. Returns
// null if the post ships without sources so the heading doesn't appear
// for legacy or in-draft rows. Outbound links use `rel="nofollow"` so we
// don't leak PageRank to every cited site.
export function BlogPostSources({ sources }: { sources: BlogPostSource[] }) {
  const t = tFor("sources");

  if (sources.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-16 max-w-3xl border-t border-border pt-8"
      data-testid="blog-post-sources"
    >
      <h2 className="text-2xl font-bold" data-testid="blog-post-sources-heading">
        {t("heading")}
      </h2>
      <ol className="mt-6 space-y-3 text-sm" data-testid="blog-post-sources-list">
        {sources.map((source, index) => {
          const ref = `${index + 1}`;
          return (
            <li
              key={`${source.url}-${index}`}
              className="flex gap-3"
              data-testid={`blog-post-source-${ref}`}
            >
              <span className="font-mono text-muted-foreground">[{ref}]</span>
              <span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium underline underline-offset-2 hover:text-foreground"
                  data-testid={`blog-post-source-link-${ref}`}
                >
                  {source.label}
                </a>
                {source.publisher && (
                  <span
                    className="text-muted-foreground"
                    data-testid={`blog-post-source-publisher-${ref}`}
                  >
                    {" "}
                    · {source.publisher}
                  </span>
                )}
                {source.accessed_at && (
                  <span
                    className="text-muted-foreground"
                    data-testid={`blog-post-source-accessed-${ref}`}
                  >
                    {" "}
                    · {t("accessed", { date: source.accessed_at })}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
