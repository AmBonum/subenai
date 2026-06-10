// AH-13.4 — New-password capture for users arriving from a reset-email link.
//
// Supabase JS auto-establishes the recovery session when the user lands
// here via the password-reset email. We update the password via
// updateUser() and bounce to /login with a success flag.

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/auth";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [{ title: "Nové heslo · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: ResetPasswordPage,
});

const score = (p: string) => {
  let s = 0;
  if (p.length >= 8) s += 25;
  if (p.length >= 12) s += 25;
  if (/[A-Z]/.test(p)) s += 15;
  if (/[0-9]/.test(p)) s += 15;
  if (/[^a-zA-Z0-9]/.test(p)) s += 20;
  return Math.min(100, s);
};

function ResetPasswordPage() {
  const t = tFor("reset");
  const ts = tFor("strength");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const strength = useMemo(() => score(password), [password]);
  const strengthLabel = strength < 50 ? ts("weak") : strength < 80 ? ts("medium") : ts("strong");

  useEffect(() => {
    let cancelled = false;
    // Listen for the implicit token exchange that Supabase performs on
    // recovery links — without this, a brief window after mount renders
    // blank because getSession() may resolve before the exchange completes.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
        setHasSession(true);
      } else if (event === "SIGNED_OUT") {
        setHasSession(false);
      } else if (session) {
        setHasSession(true);
      }
    });
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) setHasSession(true);
        else if (!cancelled) setHasSession((prev) => (prev === null ? false : prev));
      } catch {
        if (!cancelled) setHasSession((prev) => (prev === null ? false : prev));
      }
    })();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError(t("error_password_mismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("error_weak_password"));
      return;
    }
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError(t("error_generic"));
        return;
      }
      void navigate({ to: "/login", search: { reset: "1" } as never });
    } catch {
      setError(t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm" data-testid="reset-card">
        <CardHeader>
          <CardTitle data-testid="reset-heading">{t("title")}</CardTitle>
          <CardDescription data-testid="reset-subtitle">{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession === false ? (
            <div className="space-y-3" data-testid="reset-no-session">
              <p className="text-sm text-destructive" role="alert">
                {t("error_no_session")}
              </p>
              <p className="pt-2 text-center text-xs text-muted-foreground">
                <Link to="/forgot-password" data-testid="reset-to-forgot">
                  {t("link_request_new")}
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" data-testid="reset-form" noValidate>
              <div className="space-y-2">
                <Label htmlFor="reset-password">{t("password_label")}</Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="reset-password-input"
                />
                {password && (
                  <div className="space-y-1" data-testid="reset-password-strength">
                    <Progress value={strength} />
                    <p className="text-xs text-muted-foreground">
                      {ts("label")}: {strengthLabel}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-password-confirm">{t("password_confirm_label")}</Label>
                <Input
                  id="reset-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  data-testid="reset-password-confirm-input"
                />
              </div>
              {error && (
                <p
                  className="text-sm text-destructive"
                  role="alert"
                  data-testid="reset-error-message"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !password || !password2}
                data-testid="reset-submit-button"
              >
                {submitting ? t("submitting") : t("submit")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
