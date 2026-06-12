import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SITE_ORIGIN } from "@/config/site";
import { SupportContactForm } from "@/components/support/SupportContactForm";
import { TurnstileWidget } from "@/components/common/TurnstileWidget";
import type {
  SupportContactFormData,
  SupportContactSubmitResult,
} from "@/components/support/support-form-config";
import { tFor } from "@/i18n/marketing";

// E48.3 — Public /contact-form route. Posts to /api/support-ticket-create
// (CF Pages Function) which handles Turnstile + honeypot + rate limit
// + the submit_support_ticket() SECURITY DEFINER RPC.
// The view_token returned here is the plain server-generated token
// that lets the anonymous submitter open the read-only thread page
// for 90 days.

const tKontakt = tFor("kontakt");

const PAGE_URL = `${SITE_ORIGIN}/contact-form`;
const PAGE_TITLE = "Kontakt | subenai";
const PAGE_DESCRIPTION =
  "Napíš nám. Odpovieme do dvoch pracovných dní. Pre nahlásenie problému, otázku alebo žiadosť o úpravu údajov použi tento formulár.";

// /contact topic cards deep-link here with ?topic=<slug>; each slug
// preselects a ticket category and prefills the subject from the same
// i18n label the card shows, honouring the "Predvyplníme predmet aj
// kategóriu" promise on the hub page.
export const TOPIC_PREFILL = {
  tech: { category: "bug", subjectKey: "topic_tech_subject" },
  content: { category: "question", subjectKey: "topic_content_subject" },
  sponsor: { category: "billing", subjectKey: "topic_sponsor_subject" },
  gdpr: { category: "gdpr", subjectKey: "topic_gdpr_subject" },
  press: { category: "other", subjectKey: "topic_press_subject" },
  other: { category: "other", subjectKey: "topic_other_subject" },
} as const satisfies Record<
  string,
  { category: SupportContactFormData["category"]; subjectKey: string }
>;

export type ContactTopic = keyof typeof TOPIC_PREFILL;

interface ContactFormSearch {
  topic?: ContactTopic;
}

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
      return tKontakt("form.error_attachment_too_large");
    case "attachment_size_zero":
      return tKontakt("form.error_attachment_empty");
    case "attachment_mime_not_allowed":
      return tKontakt("form.error_attachment_mime");
    case "attachment_magic_mismatch":
      return tKontakt("form.error_attachment_magic");
    case "attachment_filename_invalid":
      return tKontakt("form.error_attachment_filename");
    case "attachment_pdf_parse_failed":
      return tKontakt("form.error_attachment_pdf");
    case "attachment_limit_reached":
      return tKontakt("form.error_attachment_limit");
    case "storage_upload_failed":
      return tKontakt("form.error_attachment_storage");
    default:
      return code ?? tKontakt("form.error_attachment_generic");
  }
}

function mapErrorCode(code: string | undefined): string {
  switch (code) {
    case "rate_limited_ip":
    case "rate_limited_user":
      return tKontakt("form.error_rate_limited");
    case "email_cooldown":
      return tKontakt("form.error_email_cooldown");
    case "turnstile_failed":
      return tKontakt("form.error_turnstile_failed");
    case "subject_invalid":
    case "body_invalid":
    case "email_invalid":
    case "name_invalid":
    case "category_invalid":
      return tKontakt("form.error_fields_invalid");
    default:
      return tKontakt("form.error_generic");
  }
}

export const Route = createFileRoute("/contact-form/")({
  validateSearch: (search): ContactFormSearch => ({
    topic:
      typeof search.topic === "string" && search.topic in TOPIC_PREFILL
        ? (search.topic as ContactTopic)
        : undefined,
  }),
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
  component: ContactFormRoute,
});

function ContactFormRoute() {
  const { topic } = Route.useSearch();
  return <KontaktPage topic={topic} />;
}

export function KontaktPage({ topic }: { topic?: ContactTopic }) {
  const [submitted, setSubmitted] = useState<{ ticketId: string; viewToken?: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const prefillFromTopic = topic ? TOPIC_PREFILL[topic] : undefined;

  async function handleSubmit(data: SupportContactFormData): Promise<SupportContactSubmitResult> {
    if (!turnstileToken) {
      throw new Error(tKontakt("form.error_turnstile_pending"));
    }
    const res = await fetch("/api/support-ticket-create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, turnstile_token: turnstileToken }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      const message = mapErrorCode(errBody.error);
      setTurnstileToken(null);
      throw new Error(message);
    }

    const json = (await res.json()) as {
      ok: boolean;
      ticket_id: string;
      view_token: string;
    };

    setSubmitted({ ticketId: json.ticket_id, viewToken: json.view_token });
    toast.success("Tvoju žiadosť sme prijali. Odpovieme do dvoch pracovných dní.");
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
          Kontaktuj nás
        </h1>
        <p className="text-base text-muted-foreground" data-testid="kontakt-subtitle">
          Máš otázku, nahlasuješ problém, alebo si pýtaš svoje údaje? Napíš nám — odpovieme do dvoch
          pracovných dní.
        </p>
      </header>

      {submitted ? (
        <section
          className="rounded-lg border border-emerald-500/40 bg-emerald-50 p-6 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
          aria-live="polite"
          data-testid="kontakt-success-state"
        >
          <h2 className="text-lg font-semibold">Tvoju žiadosť sme prijali</h2>
          <p className="mt-2 text-sm">
            Číslo žiadosti:{" "}
            <code data-testid="kontakt-success-ticket-id">{submitted.ticketId}</code>
          </p>
          <p className="mt-2 text-sm">
            Odpovieme čo najskôr, najneskôr do dvoch pracovných dní. Skontroluj si e-mail — poslali
            sme ti potvrdenie s kópiou žiadosti.
          </p>
          {submitted.viewToken && (
            <p className="mt-3 text-sm">
              <Link
                to="/contact-form/ticket/$id"
                params={{ id: submitted.ticketId }}
                search={{ token: submitted.viewToken }}
                className="font-semibold underline underline-offset-2"
                data-testid="kontakt-success-thread-link"
              >
                Sleduj stav svojej žiadosti tu
              </Link>{" "}
              — odkaz platí 90 dní a je aj v potvrdzovacom e-maile.
            </p>
          )}
        </section>
      ) : (
        <SupportContactForm
          variant="public"
          prefill={
            prefillFromTopic && {
              subject: tKontakt(prefillFromTopic.subjectKey),
              category: prefillFromTopic.category,
            }
          }
          onSubmit={handleSubmit}
          onAttachmentUpload={handleAttachmentUpload}
          turnstileSlot={<TurnstileWidget onToken={setTurnstileToken} />}
        />
      )}
    </main>
  );
}
