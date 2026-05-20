import { useEffect, useRef, useState, type FormEvent } from "react";

import { CONTACT_EMAIL } from "@/config/site";
import { tFor } from "@/i18n/marketing";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ): string;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface SuccessState {
  requestId: string;
  email: string;
  emailDelivered: boolean;
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
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
  const nameValid = contactName.trim().length >= 2;
  const schoolValid = schoolName.trim().length >= 2;
  const turnstileReady = !TURNSTILE_SITE_KEY || Boolean(turnstileToken);
  const canSubmit =
    nameValid && emailValid && schoolValid && consent && turnstileReady && !submitting;

  useEffect(() => {
    if (success) return;
    if (!TURNSTILE_SITE_KEY) {
      setTurnstileToken("disabled");
      return;
    }
    let cancelled = false;
    let scriptEl: HTMLScriptElement | null = null;

    function ensureScript(): Promise<void> {
      if (window.turnstile) return Promise.resolve();
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
      );
      if (existing) {
        return new Promise((resolve) =>
          existing.addEventListener("load", () => resolve(), { once: true }),
        );
      }
      return new Promise((resolve, reject) => {
        scriptEl = document.createElement("script");
        scriptEl.src = TURNSTILE_SCRIPT_SRC;
        scriptEl.async = true;
        scriptEl.defer = true;
        scriptEl.addEventListener("load", () => resolve());
        scriptEl.addEventListener("error", () => reject(new Error("turnstile_script_failed")));
        document.head.appendChild(scriptEl);
      });
    }

    ensureScript()
      .then(() => {
        if (cancelled || !window.turnstile || !turnstileContainerRef.current) return;
        widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          "timeout-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
        });
      })
      .catch(() => {
        if (!cancelled) setError("turnstile_load_failed");
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget may already be gone
        }
        widgetIdRef.current = null;
      }
    };
  }, [success]);

  function resetTurnstile() {
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    setTurnstileToken(null);
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

      // Client-side PDF render (E40.3) — lazy-imports @react-pdf/renderer
      // and the Slovak Art. 28 template only when the form is actually
      // submitted, keeping the route's initial bundle small.
      const { renderDpaPdfBlob } = await import("@/lib/dpa/render.client");
      const blob = await renderDpaPdfBlob({
        schoolName: schoolName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        requestId: payload.requestId,
        version: payload.templateVersion,
        generatedAt: payload.generatedAt ? new Date(payload.generatedAt) : new Date(),
      });
      triggerDownload(blob, payload.fileName);

      // E40.4 — best-effort e-mail copy. Failure here does NOT roll back
      // the download; the user keeps the PDF either way and the admin
      // can re-send manually via /admin/dpa-requests.
      const pdfBase64 = await blobToBase64(blob);
      const emailDelivered = await postDpaEmail({
        requestId: payload.requestId,
        fileName: payload.fileName,
        pdfBase64,
      });

      setSuccess({
        requestId: payload.requestId,
        email: contactEmail.trim(),
        emailDelivered,
      });
      setSubmitting(false);
    } catch {
      setError("render_failed");
      setSubmitting(false);
      resetTurnstile();
    }
  }

  if (success) {
    return (
      <section
        role="status"
        aria-live="polite"
        data-testid="schools-dpa-form-success"
        className="space-y-4 rounded-2xl border border-success/40 bg-card p-8"
      >
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {t("skoly_dpa.success_heading")}
        </h2>
        {success.emailDelivered ? (
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
        ref={turnstileContainerRef}
        aria-label={t("skoly_dpa.turnstile_aria")}
        data-testid="schools-dpa-form-turnstile"
        className="min-h-[65px]"
      />

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
