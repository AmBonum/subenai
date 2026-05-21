import { useState, type FormEvent } from "react";

import { CONTACT_EMAIL } from "@/config/site";
import { tFor } from "@/i18n/marketing";
import { TurnstileWidget } from "@/components/common/TurnstileWidget";

interface SuccessState {
  requestId: string;
  email: string;
  emailDelivered: boolean;
  /**
   * True when the server inserted the row but the client could not
   * complete the PDF render or email POST (stale chunk hash after a
   * rolling deploy, WASM init blocked by CSP, etc.). The user's
   * request IS in the queue — the admin sees it and can re-send.
   * UX message reflects "queued, not failed" instead of the scary
   * "DPA generation failed".
   */
  partial?: boolean;
  /**
   * True when the partial-success was caused by a dynamic-import
   * fetch failure (stale chunk hash). UI prompts a hard reload so
   * the next click hits the fresh chunk bundle.
   */
  staleChunk?: boolean;
}

/**
 * Detects the classic "stale-chunk after rolling deploy" failure mode:
 * the page HTML was served from deploy N but a lazy `import()` later
 * tries to fetch a chunk hash that no longer exists, so the SPA
 * fallback returns the index HTML instead of the JS module. The
 * browser's error message is exact and stable.
 */
function isStaleChunkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message ?? "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    // Strict MIME check rejects the HTML fallback (Chromium).
    msg.includes("Expected a JavaScript-or-Wasm module script")
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error("read_blob_failed"));
    reader.readAsDataURL(blob);
  });
}

async function postDpaEmail(args: {
  requestId: string;
  fileName: string;
  pdfBase64: string;
}): Promise<boolean> {
  try {
    const response = await fetch("/api/dpa-email-attach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!response.ok) return false;
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };
    return Boolean(payload.ok);
  } catch {
    return false;
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SchoolsDpaForm() {
  const t = tFor("marketing");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
  const nameValid = contactName.trim().length >= 2;
  const schoolValid = schoolName.trim().length >= 2;
  const turnstileReady = Boolean(turnstileToken);
  const canSubmit =
    nameValid && emailValid && schoolValid && consent && turnstileReady && !submitting;

  function resetTurnstile() {
    setTurnstileToken(null);
    setTurnstileResetKey((k) => k + 1);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/dpa-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim(),
          school_name: schoolName.trim(),
          consent_dpa_processing: consent,
          turnstile_token: turnstileToken,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        requestId?: string;
        fileName?: string;
        templateVersion?: string;
        generatedAt?: string;
        error?: string;
        reason?: string;
      };
      if (
        !response.ok ||
        !payload.ok ||
        !payload.requestId ||
        !payload.fileName ||
        !payload.templateVersion
      ) {
        const errorCode = payload.error ?? "error_generic";
        // Append the server-supplied `reason` (e.g. Postgres SQLSTATE
        // 42P01 = undefined_table) so operators can diagnose without
        // diving into CF Pages real-time logs.
        setError(payload.reason ? `${errorCode}:${payload.reason}` : errorCode);
        setSubmitting(false);
        resetTurnstile();
        return;
      }

      // Past this point the server has already inserted the row in
      // dpa_requests — `payload.requestId` is the proof. Anything that
      // throws below is a CLIENT-side delivery problem (stale chunk
      // hash after a rolling deploy, WASM blocked by CSP, template
      // runtime bug). The admin still sees the row in /admin/dpa-requests
      // and can manually resend, so we must NOT pretend the whole
      // submission failed. The success UI shows a different state
      // ("queued, we'll deliver from the server") instead of the scary
      // red render_failed card the user got before this fix.
      const acceptedRequestId = payload.requestId;
      try {
        // Client-side PDF render (E40.3) — lazy-imports @react-pdf/renderer
        // and the Slovak Art. 28 template only when the form is actually
        // submitted, keeping the route's initial bundle small.
        const { renderDpaPdfBlob } = await import("@/lib/dpa/render.client");
        const blob = await renderDpaPdfBlob({
          schoolName: schoolName.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          requestId: acceptedRequestId,
          version: payload.templateVersion,
          generatedAt: payload.generatedAt ? new Date(payload.generatedAt) : new Date(),
        });
        triggerDownload(blob, payload.fileName);

        // E40.4 — best-effort e-mail copy. Failure here does NOT roll back
        // the download; the user keeps the PDF either way and the admin
        // can re-send manually via /admin/dpa-requests.
        const pdfBase64 = await blobToBase64(blob);
        const emailDelivered = await postDpaEmail({
          requestId: acceptedRequestId,
          fileName: payload.fileName,
          pdfBase64,
        });

        setSuccess({
          requestId: acceptedRequestId,
          email: contactEmail.trim(),
          emailDelivered,
        });
      } catch (clientErr) {
        // The row IS in the queue — degrade to "partial success" UX
        // instead of a scary error. The admin queue picks the row up
        // with email_status='pending' and a single click on
        // /admin/dpa-requests → Znovu poslať delivers the PDF + email
        // (we saw this end-to-end on prod when chunk-hash mismatched
        // after the 1.14.0 deploy).
        const stale = isStaleChunkError(clientErr);
        console.error("DPA client-side render/post failed", clientErr);
        setSuccess({
          requestId: acceptedRequestId,
          email: contactEmail.trim(),
          emailDelivered: false,
          partial: true,
          staleChunk: stale,
        });
      }
      setSubmitting(false);
    } catch (e) {
      // This catch only fires for failures BEFORE the server accepted
      // the row (network down, CORS, Turnstile reject after request).
      // Show the verbose error code so operators can diagnose.
      const err = e as Error;
      const name = err?.name ?? "Error";
      const msg = (err?.message ?? "").replace(/[^a-zA-Z0-9_ :/-]/g, "").slice(0, 40);
      console.error("DPA submit failed before row was accepted", err);
      setError(msg ? `submit_failed:${name}:${msg}` : `submit_failed:${name}`);
      setSubmitting(false);
      resetTurnstile();
    }
  }

  if (success) {
    // Three states (visually distinct so operator + user both get
    // accurate info — single source of truth: success.partial):
    //   - full success: PDF downloaded + email delivered (green border)
    //   - partial: row saved, client-side delivery failed (amber border).
    //     Sub-state `staleChunk` adds a "Refresh the page" CTA — that's
    //     the specific failure where the user's tab held a chunk hash
    //     from a previous deploy.
    const partial = success.partial === true;
    const stale = success.staleChunk === true;
    const borderClass = partial ? "border-amber-500/40" : "border-success/40";
    return (
      <section
        role="status"
        aria-live="polite"
        data-testid="schools-dpa-form-success"
        data-partial={partial ? "true" : undefined}
        data-stale-chunk={stale ? "true" : undefined}
        className={`space-y-4 rounded-2xl border ${borderClass} bg-card p-8`}
      >
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {partial ? t("skoly_dpa.success_partial_heading") : t("skoly_dpa.success_heading")}
        </h2>
        {partial ? (
          <p
            className="text-sm leading-relaxed text-muted-foreground"
            data-testid="schools-dpa-form-success-partial"
          >
            {stale
              ? t("skoly_dpa.success_partial_stale_body")
              : t("skoly_dpa.success_partial_body")}{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        ) : success.emailDelivered ? (
          <p
            className="text-sm leading-relaxed text-muted-foreground"
            data-testid="schools-dpa-form-success-with-email"
          >
            {t("skoly_dpa.success_with_email_prefix")} <strong>{success.email}</strong>.{" "}
            {t("skoly_dpa.success_body")}{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        ) : (
          <p
            className="text-sm leading-relaxed text-muted-foreground"
            data-testid="schools-dpa-form-success-no-email"
          >
            {t("skoly_dpa.success_no_email")}{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        )}
        {partial && stale ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            data-testid="schools-dpa-form-success-reload"
            className="inline-flex items-center gap-1.5 rounded-full bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground transition-transform hover:-translate-y-0.5"
          >
            {t("skoly_dpa.success_partial_reload_cta")}
          </button>
        ) : null}
        {success.requestId ? (
          <p className="text-xs text-muted-foreground">
            {t("skoly_dpa.success_request_id")} <code>{success.requestId}</code>
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
      data-testid="schools-dpa-form"
    >
      <div>
        <label htmlFor="dpa-name" className="text-sm font-medium text-foreground">
          {t("skoly_dpa.field_name_label")}
        </label>
        <input
          id="dpa-name"
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          autoComplete="name"
          required
          data-testid="schools-dpa-form-name"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div>
        <label htmlFor="dpa-email" className="text-sm font-medium text-foreground">
          {t("skoly_dpa.field_email_label")}
        </label>
        <input
          id="dpa-email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          autoComplete="email"
          required
          data-testid="schools-dpa-form-email"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div>
        <label htmlFor="dpa-school" className="text-sm font-medium text-foreground">
          {t("skoly_dpa.field_school_label")}
        </label>
        <input
          id="dpa-school"
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          autoComplete="organization"
          required
          data-testid="schools-dpa-form-school"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          data-testid="schools-dpa-form-consent"
          className="mt-1 size-4 shrink-0 rounded border-border"
        />
        <span>{t("skoly_dpa.consent_label")}</span>
      </label>

      <div
        aria-label={t("skoly_dpa.turnstile_aria")}
        data-testid="schools-dpa-form-turnstile"
        className="min-h-[65px]"
      >
        {!success && <TurnstileWidget key={turnstileResetKey} onToken={setTurnstileToken} />}
      </div>

      {error ? (
        <div
          role="alert"
          data-testid="schools-dpa-form-status"
          className="rounded-xl border border-destructive/60 bg-destructive/10 p-3 text-sm text-foreground"
        >
          {(() => {
            const map: Record<string, string> = {
              consent_required: t("skoly_dpa.error_consent_required"),
              turnstile_pending: t("skoly_dpa.error_turnstile_pending"),
              turnstile_failed: t("skoly_dpa.error_turnstile_failed"),
              name_invalid: t("skoly_dpa.error_name_invalid"),
              email_invalid: t("skoly_dpa.error_email_invalid"),
              school_invalid: t("skoly_dpa.error_school_invalid"),
              rate_limited: t("skoly_dpa.error_rate_limited"),
              school_cooldown: t("skoly_dpa.error_school_cooldown"),
              daily_cap_reached: t("skoly_dpa.error_daily_cap"),
              render_failed: t("skoly_dpa.error_render_failed"),
            };
            const friendly = map[error];
            if (friendly) {
              return (
                <span>
                  {friendly}{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </span>
              );
            }
            return (
              <span>
                {t("skoly_dpa.error_generic")}{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
                . (<code>{error}</code>)
              </span>
            );
          })()}
        </div>
      ) : null}

      <button
        type="submit"
        data-testid="schools-dpa-form-submit"
        disabled={!canSubmit}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-success px-6 py-3 text-base font-bold text-success-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? t("skoly_dpa.submit_sending") : t("skoly_dpa.submit_button")}
      </button>
    </form>
  );
}
