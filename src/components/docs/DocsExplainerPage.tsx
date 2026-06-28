import { tFor } from "@/i18n/app-explainers";

// E54.3 — renders an authenticated /docs/app/<slug> page from the existing
// explainer i18n (`explainers.<key>` in app-explainers.json), the same
// content that powers the inline AppPageExplainer panels. No public-docs
// sidebar here: this is the gated app reference, reached from in-product
// explainer "viac" links. Defensive against entries with no `sections`.

interface ExplainerSection {
  heading: string;
  items: string[];
}

export interface DocsExplainerPageProps {
  /** Explainer key, e.g. "dashboard" (from the manifest DocEntry). */
  explainerKey: string;
}

export function DocsExplainerPage({ explainerKey }: DocsExplainerPageProps) {
  const t = tFor("explainers");
  const tObj = tFor.object("explainers");

  const title = t(`${explainerKey}.title`);
  const lead = t(`${explainerKey}.lead`);
  const rawSections =
    (tObj(`${explainerKey}.sections`) as Record<string, ExplainerSection> | null) ?? {};
  const sections = Object.entries(rawSections).filter(
    ([, s]) => s && typeof s === "object" && typeof s.heading === "string",
  );

  return (
    <article
      data-testid="docs-explainer-root"
      data-explainer-key={explainerKey}
      className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:py-14"
    >
      <header className="space-y-3">
        <h1
          data-testid="docs-explainer-title"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          {title}
        </h1>
        {lead ? <p className="text-lg text-muted-foreground">{lead}</p> : null}
      </header>

      {sections.map(([key, section]) => (
        <section key={key} data-testid="docs-explainer-section" className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{section.heading}</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {(section.items ?? []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
