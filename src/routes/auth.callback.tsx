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
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decidePostLoginTarget } from "@/lib/auth/post-login-redirect";
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
  // Defense-in-depth against re-entry. The effect resolves exactly one
  // navigate() per page load. If TanStack re-renders this component during
  // a pending route transition (which DID happen in production on
  // 2026-05-19: the prior `t` instability re-fired the effect, navigate
  // re-issued, transition restarted, ad infinitum — 352+ profile_preferences
  // queries before the user closed the tab), this ref guarantees the redirect
  // logic only runs once regardless of how many times the effect fires.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
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
          // Explicit ?redirect=/path wins over role-based default — it's
          // how the 2FA verify flow returns the admin to their target.
          // "//evil.example" is protocol-relative, so a single leading
          // slash is not enough.
          if (
            search.redirect &&
            search.redirect.startsWith("/") &&
            !search.redirect.startsWith("//")
          ) {
            void navigate({ to: search.redirect });
            return;
          }
          const target = await decidePostLoginTarget(data.session);
          if (cancelled) return;
          void navigate(
            target.search ? { to: target.to, search: target.search } : { to: target.to },
          );
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
