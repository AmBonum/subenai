import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SITE_ORIGIN } from "@/config/site";
import { SupportContactForm } from "@/components/support/SupportContactForm";
import type {
  SupportContactFormData,
  SupportContactSubmitResult,
} from "@/components/support/support-form-config";

// E48.3 — Public /kontakt route. Posts to /api/support-ticket-create
// (CF Pages Function) which handles Turnstile + honeypot + rate limit
// + the submit_support_ticket() SECURITY DEFINER RPC.
// The view_token returned here is the plain server-generated token
// that lets the anonymous submitter open the read-only thread page
// for 90 days.

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

function mapAttachmentErrorCode(code: string | undefined): string {
  switch (code) {
    case "attachment_too_large":
    case "attachment_size_too_large":
      return "Príloha presahuje 5 MB.";
    case "attachment_size_zero":
      return "Príloha je prázdna.";
    case "attachment_mime_not_allowed":
      return "Nepodporovaný formát (povolené: PNG, JPEG, PDF).";
    case "attachment_magic_mismatch":
      return "Súbor sa nezhoduje s deklarovaným typom.";
    case "attachment_filename_invalid":
      return "Nepovolený názov súboru.";
    case "attachment_pdf_parse_failed":
      return "PDF sa nepodarilo spracovať.";
    case "attachment_limit_reached":
      return "Maximum 3 prílohy na žiadosť.";
    case "storage_upload_failed":
      return "Úložisko zlyhalo. Skúste neskôr.";
    default:
      return code ?? "Nahranie prílohy zlyhalo.";
  }
}

function mapErrorCode(code: string | undefined): string {
  switch (code) {
    case "rate_limited_ip":
    case "rate_limited_user":
      return "Z tejto IP adresy ste odoslali príliš veľa žiadostí. Skúste neskôr.";
    case "email_cooldown":
      return "Z tejto e-mailovej adresy ste pred chvíľou odoslali žiadosť. Skúste o pár minút.";
    case "turnstile_failed":
      return "Overenie proti spamu zlyhalo. Obnovte stránku a skúste znova.";
    case "subject_invalid":
    case "body_invalid":
    case "email_invalid":
    case "name_invalid":
    case "category_invalid":
      return "Skontrolujte vyplnené polia.";
    default:
      return "Nepodarilo sa odoslať. Skúste neskôr alebo nás kontaktujte iným spôsobom.";
  }
}

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
  const [submitted, setSubmitted] = useState<{ ticketId: string; viewToken?: string } | null>(null);

  async function handleSubmit(data: SupportContactFormData): Promise<SupportContactSubmitResult> {
    const res = await fetch("/api/support-ticket-create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      const message = mapErrorCode(errBody.error);
      throw new Error(message);
    }

    const json = (await res.json()) as {
      ok: boolean;
      ticket_id: string;
      view_token: string;
    };

    setSubmitted({ ticketId: json.ticket_id, viewToken: json.view_token });
    toast.success("Vašu žiadosť sme prijali. Odpovieme do dvoch pracovných dní.");
    return { ticketId: json.ticket_id, viewToken: json.view_token };
  }

  // E48.2 — upload one attachment after the parent ticket exists.
  // Returns { ok, error? } so the form can surface per-file status.
  async function handleAttachmentUpload(
    file: File,
    submitResult: SupportContactSubmitResult,
  ): Promise<{ ok: boolean; error?: string }> {
    const form = new FormData();
    form.append("file", file);
    form.append("ticket_id", submitResult.ticketId);
    if (submitResult.viewToken) form.append("view_token", submitResult.viewToken);

    const res = await fetch("/api/support-attachment-upload", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: mapAttachmentErrorCode(errBody.error) };
    }
    return { ok: true };
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
          {submitted.viewToken && (
            <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
              Tip: na zobrazenie vlákna použite odkaz z e-mailu. Token má 90 dní platnosti.
            </p>
          )}
        </section>
      ) : (
        <SupportContactForm
          variant="public"
          onSubmit={handleSubmit}
          onAttachmentUpload={handleAttachmentUpload}
        />
      )}
    </main>
  );
}
