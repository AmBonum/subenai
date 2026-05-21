import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SITE_ORIGIN } from "@/config/site";
import { SupportContactForm } from "@/components/support/SupportContactForm";
import type {
  SupportContactFormData,
  SupportContactSubmitResult,
} from "@/components/support/support-form-config";

// E48.3 — Public /kontakt route. Stub submit while E48.2 (CF function +
// Turnstile wiring) is still in flight. Once the CF function ships, the
// onSubmit handler will POST to /api/support-ticket-create with the
// Turnstile token, then redirect to /kontakt/odoslane on success.

const PAGE_URL = `${SITE_ORIGIN}/kontakt`;
const PAGE_TITLE = "Kontakt | subenai";
const PAGE_DESCRIPTION =
  "Napíšte nám. Odpovieme do dvoch pracovných dní. Pre nahlásenie problému, otázku, alebo žiadosť o úpravu údajov použite tento formulár.";

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  url: PAGE_URL,
  name: PAGE_TITLE,
  inLanguage: "sk-SK",
  description: PAGE_DESCRIPTION,
  isPartOf: {
    "@type": "WebSite",
    name: "subenai",
    url: SITE_ORIGIN,
  },
  publisher: {
    "@type": "Organization",
    name: "am.bonum s. r. o.",
    url: SITE_ORIGIN,
  },
};

export const Route = createFileRoute("/kontakt/")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:url", content: PAGE_URL },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(contactJsonLd),
      },
    ],
  }),
  component: KontaktPage,
});

function KontaktPage() {
  const [submitted, setSubmitted] = useState<{ ticketId: string } | null>(null);

  // Stub submit — replaced by real CF call in E48.3 implementation.
  // Logs to console + shows a toast so the form is end-to-end testable
  // in the browser during Phase A.
  async function handleSubmit(data: SupportContactFormData): Promise<SupportContactSubmitResult> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    console.info("[kontakt] stub submission", data);
    const fakeId = `stub-${Date.now()}`;
    setSubmitted({ ticketId: fakeId });
    toast.success("Žiadosť bola prijatá (demo). Pripojenie k backendu pribudne v E48.3.");
    return { ticketId: fakeId };
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16" data-testid="kontakt-page-root">
      <header className="space-y-3 pb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" data-testid="kontakt-heading">
          Kontaktujte nás
        </h1>
        <p className="text-base text-muted-foreground" data-testid="kontakt-subtitle">
          Máte otázku, nahlasujete problém, alebo si pýtate svoje údaje? Napíšte nám — odpovieme do
          dvoch pracovných dní.
        </p>
      </header>

      {submitted ? (
        <section
          className="rounded-lg border border-emerald-500/40 bg-emerald-50 p-6 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
          aria-live="polite"
          data-testid="kontakt-success-state"
        >
          <h2 className="text-lg font-semibold">Vašu žiadosť sme prijali</h2>
          <p className="mt-2 text-sm">
            Číslo žiadosti:{" "}
            <code data-testid="kontakt-success-ticket-id">{submitted.ticketId}</code>
          </p>
          <p className="mt-2 text-sm">
            Odpovieme čo najskôr, najneskôr do dvoch pracovných dní. Skontrolujte si e-mail —
            pošleme vám potvrdenie spolu s odkazom na zobrazenie vlákna.
          </p>
        </section>
      ) : (
        <SupportContactForm variant="public" onSubmit={handleSubmit} />
      )}
    </main>
  );
}
