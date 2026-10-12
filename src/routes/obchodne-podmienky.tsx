import { createFileRoute, Link } from "@tanstack/react-router";

import { CONTACT_EMAIL, SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/billing";

const t = tFor("terms");
const tObj = tFor.object("terms");

interface TermsSection {
  id: string;
  heading: string;
  paragraphs: string[];
}

export const Route = createFileRoute("/obchodne-podmienky")({
  head: () => {
    const url = `${SITE_ORIGIN}/obchodne-podmienky`;
    return {
      meta: [
        { title: t("meta_title") },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: t("meta_title") },
        { property: "og:description", content: t("meta_description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TermsPage,
});

function TermsPage() {
  const sections = tObj<TermsSection[]>("sections") ?? [];
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6" data-testid="terms-main">
      <Link
        to="/cennik"
        className="text-sm text-muted-foreground hover:text-foreground"
        data-testid="terms-back-link"
      >
        ← {t("back")}
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight" data-testid="terms-heading">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground" data-testid="terms-effective">
        {t("effective")}
      </p>
      {sections.map((s) => (
        <section
          key={s.id}
          id={`terms-${s.id}`}
          className="mt-8 space-y-3"
          data-testid={`terms-section-${s.id}`}
        >
          <h2 className="text-xl font-semibold">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="leading-relaxed text-foreground/90">
              {p.replaceAll("{email}", CONTACT_EMAIL)}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
