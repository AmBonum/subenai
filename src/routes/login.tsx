import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/app-shell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Prihlásenie · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const t = tFor("login");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        const isInvalid =
          authError.message.toLowerCase().includes("invalid") || authError.status === 400;
        setError(isInvalid ? t("error_invalid") : t("error_generic"));
        return;
      }
      navigate({ to: "/app" });
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
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !email || !password}
              data-testid="login-submit-button"
            >
              {submitting ? t("submitting") : t("submit")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/" data-testid="login-back-home">
                ← subenai.sk
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
