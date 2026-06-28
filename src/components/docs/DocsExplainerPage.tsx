import { tFor as tForApp } from "@/i18n/app-explainers";
import { tFor as tForAdmin } from "@/i18n/admin";

// E54.3 / E54.6 — renders a gated /docs/{app,admin}/<slug> page from the
// existing explainer i18n (`explainers.<key>`), the same content that powers
// the inline AppPageExplainer / AdminPageExplainer panels. App and admin
// explainers share the same shape (both feed the PageExplainer component),
// so one renderer covers both — only the i18n namespace differs.
// Defensive against entries without `sections`.

interface ExplainerSection {
  heading: string;
  items: string[];
}

export interface DocsExplainerPageProps {
  /** Explainer key, e.g. "dashboard" (from the manifest DocEntry). */
  explainerKey: string;
  /** Which explainer namespace to read. */
  area?: "app" | "admin";
}

export function DocsExplainerPage({ explainerKey, area = "app" }: DocsExplainerPageProps) {
  const resolver = area === "admin" ? tForAdmin : tForApp;
  const t = resolver("explainers");
  const tObj = resolver.object("explainers");

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
      data-doc-area={area}
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
