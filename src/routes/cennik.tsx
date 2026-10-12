import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { PlanCards } from "@/components/billing/PlanCards";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/billing";
import { PLANS } from "@/lib/billing/plans";

const t = tFor("pricing");
const tObj = tFor.object("pricing");

interface Search {
  checkout?: "cancelled";
}

function buildHead() {
  const url = `${SITE_ORIGIN}/cennik`;
  const faq = tObj<Array<{ q: string; a: string }>>("faq") ?? [];
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "subenai — doklad o preškolení zamestnancov",
    description: t("meta_description"),
    brand: { "@type": "Brand", name: "subenai" },
    offers: PLANS.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.priceEur,
      priceCurrency: "EUR",
      url,
      availability: "https://schema.org/InStock",
    })),
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return {
    meta: [
      { title: t("meta_title") },
      { name: "description", content: t("meta_description") },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: t("meta_title") },
      { property: "og:description", content: t("meta_description") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
      { property: "og:locale", content: "sk_SK" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
      },
      { type: "application/ld+json", children: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") },
    ],
  };
}

export const Route = createFileRoute("/cennik")({
  validateSearch: (search: Record<string, unknown>): Search =>
    search.checkout === "cancelled" ? { checkout: "cancelled" } : {},
  head: buildHead,
  component: PricingPage,
});

function PricingPage() {
  const { checkout } = Route.useSearch();
  const faq = tObj<Array<{ q: string; a: string }>>("faq") ?? [];
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6" data-testid="pricing-main">
      {checkout === "cancelled" && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-border bg-muted px-4 py-3 text-sm"
          data-testid="pricing-checkout-cancelled"
        >
          {t("checkout_cancelled")}
        </p>
      )}
      <section
        className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]"
        data-testid="pricing-hero"
      >
        <div>
          <p
            className="text-sm font-semibold uppercase tracking-wide text-primary"
            data-testid="pricing-kicker"
          >
            {t("kicker")}
          </p>
          <h1
            className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl"
            data-testid="pricing-title"
          >
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground" data-testid="pricing-lead">
            {t("lead")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#plany"
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              data-testid="pricing-cta-plans"
            >
              {t("cta_primary")}
            </a>
            <Link
              to="/sablony"
              className="inline-flex h-11 items-center rounded-md border border-input px-5 text-sm font-semibold hover:bg-accent"
              data-testid="pricing-cta-templates"
            >
              {t("cta_secondary")}
            </Link>
          </div>
        </div>
        <div data-testid="pricing-hero-visual" aria-hidden />
      </section>

      <section id="plany" className="mt-16 scroll-mt-24" data-testid="pricing-plans">
        <PlanCards />
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border p-6" data-testid="pricing-free-forever">
          <h2 className="text-xl font-semibold">{t("free_forever_title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("free_forever_text")}</p>
        </div>
        <div className="rounded-2xl border border-border p-6" data-testid="pricing-evidence">
          <h2 className="text-xl font-semibold">{t("evidence_title")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(tObj<string[]>("evidence_points") ?? []).map((p) => (
              <li key={p} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-16" data-testid="pricing-faq">
        <h2 className="text-2xl font-semibold">{t("faq_title")}</h2>
        <div className="mt-4 divide-y divide-border rounded-2xl border border-border">
          {faq.map((f, i) => (
            <details key={f.q} className="group p-5" data-testid={`pricing-faq-item-${i}`}>
              <summary className="cursor-pointer list-none font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
