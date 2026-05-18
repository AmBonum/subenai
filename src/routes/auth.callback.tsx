// AH-13.2 — Generic post-auth landing for OAuth + email verification.
//
// Supabase JS redirects here with either:
//   - a PKCE `code` query param (OAuth + magic-link flows)
//   - access/refresh tokens in the URL hash (legacy implicit flows)
//   - an `error` / `error_description` query (provider returned a failure)
//
// We exchange the code for a session (PKCE), then route the user to
// `?redirect=<path>` if present, else /app. Errors bounce to /login
// with a friendly toast.

import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/auth";

type CallbackSearch = {
  code?: string;
  redirect?: string;
  error?: string;
  error_description?: string;
};

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Prihlasujem · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const t = tFor("callback");
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/callback" }) as CallbackSearch;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (search.error) {
        if (!cancelled) {
          setError(t("error_generic"));
          setTimeout(() => {
            if (!cancelled) {
              void navigate({ to: "/login" });
            }
          }, 1500);
        }
        return;
      }
      try {
        if (search.code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(search.code);
          if (exErr) throw exErr;
        }
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          const target =
            search.redirect && search.redirect.startsWith("/") ? search.redirect : "/app";
          void navigate({ to: target });
          return;
        }
        setError(t("error_generic"));
        setTimeout(() => {
          if (!cancelled) {
            void navigate({ to: "/login" });
          }
        }, 1500);
      } catch {
        if (!cancelled) {
          setError(t("error_generic"));
          setTimeout(() => {
            if (!cancelled) {
              void navigate({ to: "/login" });
            }
          }, 1500);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, search.code, search.error, search.redirect, t]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12"
      data-testid="auth-callback-root"
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert" data-testid="auth-callback-error">
          {error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="auth-callback-loading">
          {t("loading")}
        </p>
      )}
    </main>
  );
}
