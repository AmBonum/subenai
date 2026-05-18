import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Registrácia · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: SignupPage,
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

function SignupPage() {
  const t = tFor("signup");
  const tc = tFor("common");
  const ts = tFor("strength");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => score(password), [password]);
  const strengthLabel = strength < 50 ? ts("weak") : strength < 80 ? ts("medium") : ts("strong");

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
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          setError(t("error_email_exists"));
        } else if (msg.includes("password") || msg.includes("weak")) {
          setError(t("error_weak_password"));
        } else {
          setError(t("error_generic"));
        }
        return;
      }
      setSuccess(true);
    } catch {
      setError(t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm" data-testid="signup-card">
        <CardHeader>
          <CardTitle data-testid="signup-heading">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-3" data-testid="signup-success-message">
              <p className="text-sm font-medium">{t("success_title")}</p>
              <p className="text-sm text-muted-foreground">{t("success_body")}</p>
              <p className="pt-2 text-center text-xs text-muted-foreground">
                <Link to="/login" data-testid="signup-success-to-login">
                  {t("to_login")}
                </Link>
              </p>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex w-full items-center justify-center gap-2"
                disabled={googleLoading || submitting}
                onClick={onGoogle}
                data-testid="signup-google-button"
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
              <form onSubmit={onSubmit} className="space-y-4" data-testid="signup-form" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("email_label")}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="signup-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("password_label")}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="signup-password-input"
                  />
                  {password && (
                    <div className="space-y-1" data-testid="signup-password-strength">
                      <Progress value={strength} />
                      <p className="text-xs text-muted-foreground">
                        {ts("label")}: {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password-confirm">{t("password_confirm_label")}</Label>
                  <Input
                    id="signup-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    data-testid="signup-password-confirm-input"
                  />
                </div>
                {error && (
                  <p
                    className="text-sm text-destructive"
                    role="alert"
                    data-testid="signup-error-message"
                  >
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || !email || !password || !password2}
                  data-testid="signup-submit-button"
                >
                  {submitting ? t("submitting") : t("submit")}
                </Button>
                <p className="text-center text-base text-muted-foreground">
                  {t("already_have_account")}{" "}
                  <Link
                    to="/login"
                    className="text-lg font-semibold text-primary hover:underline"
                    data-testid="signup-to-login"
                  >
                    {t("to_login")}
                  </Link>
                </p>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
