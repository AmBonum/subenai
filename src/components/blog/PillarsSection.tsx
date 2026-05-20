import { ChevronDown } from "lucide-react";

import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBlogPillarsCollapsed } from "@/hooks/useBlogPillarsCollapsed";
import { tFor } from "@/i18n/blog";
import type { BlogPostListItem } from "@/lib/blog/queries";
import { formatPillarCount } from "@/lib/blog/slovak-plurals";

interface PillarsSectionProps {
  pillars: BlogPostListItem[];
}

// Editorial anchors section, now collapsible. Default-state is per
// breakpoint and persisted across sessions in localStorage (see
// useBlogPillarsCollapsed). The trigger is the heading row itself —
// large hit target, no separate icon button to discover. Caller is
// responsible for hiding the section entirely during ≥2-char search
// (the trigger doesn't render at all then); the Collapsible is only
// for the open/closed user choice within the visible state.
export function PillarsSection({ pillars }: PillarsSectionProps) {
  const t = tFor("index");
  const { open, setOpen, hydrated } = useBlogPillarsCollapsed();

  if (pillars.length === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      asChild
      // Inert until hydrated so a server-rendered "closed" state doesn't
      // briefly animate open on desktop. Radix manages its own data-state
      // attribute we hook into for the chevron rotation below.
    >
      <section
        id="sprievodcovia"
        className="mt-12 scroll-mt-24 border-t border-border pt-10 md:mt-16 md:pt-12"
        data-testid="blog-index-pillars-section"
        data-hydrated={hydrated ? "true" : "false"}
      >
        <CollapsibleTrigger
          className="group flex w-full items-center justify-between gap-4 text-left"
          data-testid="blog-index-pillars-toggle"
          aria-label={open ? t("pillars_toggle_hide") : t("pillars_toggle_show")}
        >
          <div className="flex items-center gap-3">
            <ChevronDown
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
            <div>
              <h2
                className="text-2xl font-bold tracking-tight md:text-3xl"
                data-testid="blog-index-pillars-heading"
              >
                {t("pillar_heading")}
              </h2>
              <p
                className="mt-1 hidden max-w-2xl text-sm text-muted-foreground md:block"
                data-testid="blog-index-pillars-description"
              >
                {t("pillar_description")}
              </p>
            </div>
          </div>
          <span
            className="hidden whitespace-nowrap text-sm text-muted-foreground md:inline"
            data-testid="blog-index-pillars-subheading"
          >
            {formatPillarCount(pillars.length)}
          </span>
          <span
            className="whitespace-nowrap text-xs text-muted-foreground md:hidden"
            data-testid="blog-index-pillars-subheading-mobile"
          >
            {formatPillarCount(pillars.length)}
          </span>
        </CollapsibleTrigger>

        {/* forceMount keeps pillar cards in the DOM (with `hidden`
            attribute when closed) so search engines + assistive tech
            still see them when the user has the section collapsed. */}
        <CollapsibleContent forceMount data-testid="blog-index-pillars-content">
          <ul
            className="mt-6 grid gap-6 md:mt-8 md:grid-cols-2 lg:grid-cols-3"
            data-testid="blog-index-pillars-list"
          >
            {pillars.map((post) => (
              <li key={post.id} data-testid={`blog-pillar-card-${post.slug}`}>
                <BlogPostCard post={post} variant="featured" />
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
