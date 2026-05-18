import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/layout/Footer";
import { SITE_ORIGIN, CONTACT_EMAIL } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";
const tManage = tFor("spravovat_podporu");
const PAGE_URL = `${SITE_ORIGIN}/spravovat-podporu`;
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

export const Route = createFileRoute("/spravovat-podporu")({
  head: () => ({
    meta: [
      { title: tManage("head_title") },
      { name: "description", content: tManage("head_description") },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: SpravovatPodporuPage,
});

function SpravovatPodporuPage() {
  return <ManageSupportForm />;
}

export function ManageSupportForm() {
  const t = tFor("spravovat_podporu");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (submitted) return;
    if (!TURNSTILE_SITE_KEY) {
      // Fallback for misconfigured envs — accept submit without token. The
      // server will reject with a clear error so the misconfig is visible.
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
          // ignore — widget may already be gone
        }
        widgetIdRef.current = null;
      }
    };
  }, [submitted]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!emailValid || submitting) return;
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("turnstile_pending");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/portal-magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), turnstile_token: turnstileToken }),
      });
      if (!response.ok && response.status !== 200) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "send_failed");
        setSubmitting(false);
        if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken(null);
        return;
      }
      setSubmitted(true);
      setSubmitting(false);
    } catch {
      setError("network_error");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-8">
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            {t("back_home")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            {t("hero_prefix")}
            <Link
              to={ROUTES.podpora}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {t("hero_link")}
            </Link>
            {t("hero_middle")}
            <strong>{t("hero_cancel")}</strong>
            {t("hero_suffix")}
          </p>
        </header>

        {submitted ? (
          <SubmittedState email={email} />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
            aria-labelledby="manage-h1"
          >
            <h2 id="manage-h1" className="sr-only">
              {t("form_aria")}
            </h2>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                {t("field_email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("email_hint")}</p>
            </div>

            <div
              ref={turnstileContainerRef}
              aria-label={t("turnstile_aria")}
              className="min-h-[65px]"
            />

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/60 bg-destructive/10 p-3 text-sm text-foreground"
              >
                {t("error_prefix")}
                <code>{error}</code>
                {t("error_suffix")}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
                .
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                !emailValid || submitting || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-3 text-base font-bold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t("submit_sending") : t("submit")}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        <Footer />
      </main>
    </div>
  );
}

function SubmittedState({ email }: { email: string }) {
  const t = tFor("spravovat_podporu");
  return (
    <section
      role="status"
      aria-live="polite"
      className="space-y-4 rounded-2xl border border-primary/40 bg-card p-8 text-center"
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("submitted_title")}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("submitted_body_prefix")} <strong>{email}</strong> {t("submitted_body_suffix")}{" "}
        <strong>{t("submitted_body_hours")}</strong>
        {t("submitted_body_end")}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("submitted_footer_prefix")}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </section>
  );
}
