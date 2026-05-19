import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { decidePostLoginTarget } from "@/lib/auth/post-login-redirect";
import { tFor } from "@/i18n/app-shell";
import { tFor as tAuth } from "@/i18n/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Prihlásenie · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const t = tFor("login");
  const tc = tAuth("common");
  const tx = tAuth("login_extras");
  const tColl = tAuth("oauth_only_collision");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetBanner, setResetBanner] = useState(false);
  // Phase 3: after a credentials failure we surface a "this email may be
  // registered via Google" hint. Supabase returns the same opaque error
  // for wrong-password vs OAuth-only, so we offer the Google path as a
  // fallback action alongside the generic message — no probing required.
  const [showOAuthCollision, setShowOAuthCollision] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") setResetBanner(true);
  }, []);

  const onGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
    } catch {
      setError(tc("google_error"));
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setShowOAuthCollision(false);
    setSubmitting(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        const isInvalid =
          authError.message.toLowerCase().includes("invalid") || authError.status === 400;
        setError(isInvalid ? t("error_invalid") : t("error_generic"));
        if (isInvalid) setShowOAuthCollision(true);
        return;
      }

      if (!data.session) {
        setError(t("error_generic"));
        return;
      }

      const target = await decidePostLoginTarget(data.session);
      navigate(target.search ? { to: target.to, search: target.search } : { to: target.to });
    } catch {
      setError(t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm" data-testid="login-card">
        <CardHeader>
          <CardTitle data-testid="login-heading">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {resetBanner && (
            <p
              className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-primary"
              role="status"
              data-testid="login-reset-success-banner"
            >
              {tx("login_success_after_reset")}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="flex w-full items-center justify-center gap-2"
            disabled={googleLoading || submitting}
            onClick={onGoogle}
            data-testid="login-google-button"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .55 4.13 1.62l3.07-3.07A12 12 0 0 0 0 12c0 1.93.46 3.75 1.28 5.37l3.6-2.79A7.2 7.2 0 0 1 4.8 12 7.2 7.2 0 0 1 12 4.8z"
              />
              <path
                fill="#34A853"
                d="M23.5 12.27c0-.87-.07-1.7-.2-2.5H12v4.74h6.5a5.56 5.56 0 0 1-2.4 3.66l3.7 2.87c2.16-2 3.7-4.93 3.7-8.77z"
              />
              <path
                fill="#4A90E2"
                d="M5.27 14.27 1.67 17.05A12 12 0 0 0 12 24c3.24 0 5.95-1.07 7.94-2.9l-3.7-2.87a7.2 7.2 0 0 1-10.97-3.96z"
              />
              <path
                fill="#FBBC05"
                d="M4.88 14.58a7.2 7.2 0 0 1 0-5.16L1.28 6.63a12 12 0 0 0 0 10.74l3.6-2.79z"
              />
            </svg>
            {googleLoading ? tc("google_loading") : tc("continue_with_google")}
          </Button>
          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>{tc("or_separator")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form" noValidate>
            <div className="space-y-2">
              <Label htmlFor="login-email">{t("email_label")}</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">{t("password_label")}</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
              />
            </div>
            {error && (
              <p
                className="text-sm text-destructive"
                role="alert"
                data-testid="login-error-message"
              >
                {error}
              </p>
            )}
            {showOAuthCollision && (
              <div
                className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm"
                role="status"
                data-testid="login-oauth-collision"
              >
                <p className="font-medium" data-testid="login-oauth-collision-title">
                  {tColl("title")}
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="login-oauth-collision-body"
                >
                  {tColl("body")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onGoogle}
                  disabled={googleLoading || submitting}
                  data-testid="login-oauth-collision-google"
                >
                  {tColl("cta_primary")}
                </Button>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !email || !password}
              data-testid="login-submit-button"
            >
              {submitting ? t("submitting") : t("submit")}
            </Button>
            <div className="flex flex-col gap-2 text-center text-base text-muted-foreground">
              <p>
                <Link to="/forgot-password" data-testid="login-forgot-password">
                  {tx("forgot_password")}
                </Link>
              </p>
              <p>
                {tx("no_account")}{" "}
                <Link
                  to="/signup"
                  className="text-lg font-semibold text-primary hover:underline"
                  data-testid="login-to-signup"
                >
                  {tx("to_signup")}
                </Link>
              </p>
              <p className="text-sm">
                <Link to="/" data-testid="login-back-home">
                  ← subenai.sk
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
