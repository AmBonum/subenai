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
//
// 2026-05-20 fix: dropped `<Collapsible asChild>` on the <section>.
// asChild composes refs + props via Slot, but a Slot wrapping a
// non-button element with internal Trigger children was producing a
// production-only click no-op (Radix tracks state correctly but the
// trigger's button click handler didn't update the controlled state).
// Default-Root (renders its own <div>) keeps the section as a child
// element inside; the extra div is a one-liner cost with zero semantic
// loss.
export function PillarsSection({ pillars }: PillarsSectionProps) {
  const t = tFor("index");
  const { open, setOpen, hydrated } = useBlogPillarsCollapsed();

  if (pillars.length === 0) return null;

  return (
    <section
      id="sprievodcovia"
      className="mt-12 scroll-mt-24 border-t border-border pt-10 md:mt-16 md:pt-12"
      data-testid="blog-index-pillars-section"
      data-hydrated={hydrated ? "true" : "false"}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg p-1 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          data-testid="blog-index-pillars-toggle"
          aria-label={open ? t("pillars_toggle_hide") : t("pillars_toggle_show")}
        >
          <div className="flex min-w-0 items-center gap-3">
            <ChevronDown
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
            <div className="min-w-0 flex-1">
              <h2
                className="text-2xl font-bold tracking-tight md:text-3xl"
                data-testid="blog-index-pillars-heading"
              >
                {t("pillar_heading")}
              </h2>
              {/* Mobile-only count under the heading. Lives inside the
                  text column so a 3-line wrapped heading (e.g.
                  "sprievodcovia digitálnou bezpečnosťou") doesn't get
                  shoulder-checked off-screen by the trailing trailing
                  count span — the prior layout did exactly that, the
                  span had `whitespace-nowrap` and pushed the heading
                  off the viewport. Desktop renders the count on the
                  right via the sibling span below. */}
              <p
                className="mt-1 text-xs text-muted-foreground md:hidden"
                data-testid="blog-index-pillars-subheading-mobile"
              >
                {formatPillarCount(pillars.length)}
              </p>
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
        </CollapsibleTrigger>

        {/* forceMount keeps pillar cards in the DOM when closed so
            search-engine crawlers and assistive tech still index the
            links. In forceMount mode Radix does NOT set the `hidden`
            attribute itself — it delegates visibility to CSS — so we
            add `data-[state=closed]:hidden` to actually hide the list
            when the user collapses the section. Without that class the
            toggle would flip data-state but nothing would change
            visually (regression: pre-2026-05-20 fix shipped without
            this class, click "did nothing"). */}
        <CollapsibleContent
          forceMount
          className="data-[state=closed]:hidden"
          data-testid="blog-index-pillars-content"
        >
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
      </Collapsible>
    </section>
  );
}
