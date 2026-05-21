import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, LifeBuoy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/lib/platform/queries";
import { SupportContactForm } from "@/components/support/SupportContactForm";
import type {
  SupportContactFormData,
  SupportContactSubmitResult,
} from "@/components/support/support-form-config";
import { Button } from "@/components/ui/button";

// E48.4 — Authenticated contact form at /app/help/contact.
// Reuses <SupportContactForm variant="authenticated"> with prefill from
// the session-bound profile. Submits to the same CF function as the
// public /kontakt route but with an Authorization: Bearer header so the
// SECURITY DEFINER RPC sees auth.role()='authenticated' + auth.uid().
// No Turnstile (the JWT proves humanity); a tighter per-user rate
// limit is enforced server-side.

export const Route = createFileRoute("/app/help/contact")({
  head: () => ({
    meta: [{ title: "Kontakt podpory | subenai" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AppHelpContactPage,
});

function mapErrorCode(code: string | undefined): string {
  switch (code) {
    case "rate_limited_user":
      return "Odoslali ste príliš veľa žiadostí. Skúste neskôr.";
    case "subject_invalid":
    case "body_invalid":
    case "email_invalid":
    case "name_invalid":
    case "category_invalid":
      return "Skontrolujte vyplnené polia.";
    case "not_authenticated":
    case "user_id_must_match_auth_uid":
      return "Vaša relácia vypršala. Prihláste sa znova.";
    default:
      return "Nepodarilo sa odoslať. Skúste neskôr alebo nás kontaktujte e-mailom.";
  }
}

function AppHelpContactPage() {
  const profileQ = useCurrentProfile();
  const [submitted, setSubmitted] = useState<{ ticketId: string } | null>(null);

  const me = profileQ.data;

  async function handleSubmit(data: SupportContactFormData): Promise<SupportContactSubmitResult> {
    if (!me?.id) {
      throw new Error("Vaša relácia vypršala. Prihláste sa znova.");
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error("Vaša relácia vypršala. Prihláste sa znova.");
    }

    const res = await fetch("/api/support-ticket-create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...data, user_id: me.id }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(mapErrorCode(errBody.error));
    }

    const json = (await res.json()) as { ok: boolean; ticket_id: string; view_token: string };
    setSubmitted({ ticketId: json.ticket_id });
    toast.success("Žiadosť bola odoslaná. Odpovieme do dvoch pracovných dní.");
    return { ticketId: json.ticket_id, viewToken: json.view_token };
  }

  // E48.2 — Attachment upload for authenticated submitters. The CF
  // function accepts the JWT instead of the view_token; the user must
  // own the ticket (enforced server-side).
  async function handleAttachmentUpload(
    file: File,
    submitResult: SupportContactSubmitResult,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { ok: false, error: "Relácia vypršala." };

    const form = new FormData();
    form.append("file", file);
    form.append("ticket_id", submitResult.ticketId);

    const res = await fetch("/api/support-attachment-upload", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: errBody.error ?? "Nahranie zlyhalo." };
    }
    return { ok: true };
  }

  return (
    <div className="space-y-6" data-testid="app-help-contact-root">
      <div className="flex items-center justify-between gap-2">
        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          data-testid="app-help-contact-heading"
        >
          <LifeBuoy className="mr-2 inline-block size-6 align-text-bottom" aria-hidden="true" />
          Kontaktovať podporu
        </h1>
        <Button asChild variant="ghost" size="sm" data-testid="app-help-contact-back">
          <Link to="/app/help">
            <ArrowLeft className="mr-1 size-4" aria-hidden="true" /> Späť na pomoc
          </Link>
        </Button>
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground">
        Napíšte nám priamo z aplikácie — odpovieme do dvoch pracovných dní. E-mail a meno vyplníme
        automaticky z vášho účtu.
      </p>

      {submitted ? (
        <section
          className="max-w-2xl rounded-lg border border-emerald-500/40 bg-emerald-50 p-5 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
          aria-live="polite"
          data-testid="app-help-contact-success-state"
        >
          <h2 className="text-base font-semibold">Vašu žiadosť sme prijali</h2>
          <p className="mt-2 text-sm">
            Číslo žiadosti:{" "}
            <code data-testid="app-help-contact-success-ticket-id">{submitted.ticketId}</code>
          </p>
          <p className="mt-2 text-sm">
            Stav žiadosti uvidíte v sekcii Moje žiadosti (čoskoro). Odpovieme vám e-mailom.
          </p>
        </section>
      ) : profileQ.isLoading ? (
        <div data-testid="app-help-contact-loading" className="text-sm text-muted-foreground">
          Načítavam váš profil…
        </div>
      ) : (
        <div className="max-w-2xl">
          <SupportContactForm
            variant="authenticated"
            prefill={{
              email: me?.email ?? "",
              name: me?.display_name ?? "",
            }}
            onSubmit={handleSubmit}
            onAttachmentUpload={handleAttachmentUpload}
          />
        </div>
      )}
    </div>
  );
}
