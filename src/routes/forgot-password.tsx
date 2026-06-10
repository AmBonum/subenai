import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Zabudnuté heslo · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const t = tFor("forgot");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/reset-password`
            : undefined,
      });
      if (authError) {
        setError(t("error_generic"));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm" data-testid="forgot-card">
        <CardHeader>
          <CardTitle data-testid="forgot-heading">{t("title")}</CardTitle>
          <CardDescription data-testid="forgot-subtitle">{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-3" data-testid="forgot-success-message">
              <p className="text-sm font-medium">{t("success_title")}</p>
              <p className="text-sm text-muted-foreground">{t("success_body")}</p>
              <p className="pt-2 text-center text-xs text-muted-foreground">
                <Link to="/login" data-testid="forgot-success-to-login">
                  {t("back_to_login")}
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" data-testid="forgot-form" noValidate>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">{t("email_label")}</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="forgot-email-input"
                />
              </div>
              {error && (
                <p
                  className="text-sm text-destructive"
                  role="alert"
                  data-testid="forgot-error-message"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !email}
                data-testid="forgot-submit-button"
              >
                {submitting ? t("submitting") : t("submit")}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/login" data-testid="forgot-back-to-login">
                  {t("back_to_login")}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
