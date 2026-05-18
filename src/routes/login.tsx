import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getAALStatus, listFactors } from "@/lib/auth/mfa";
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        const isInvalid =
          authError.message.toLowerCase().includes("invalid") || authError.status === 400;
        setError(isInvalid ? t("error_invalid") : t("error_generic"));
        return;
      }

      // AH-12.5: route by 2FA state. Admin must hold a verified TOTP
      // factor AND have AAL2 before reaching /admin. The AAL2 gate in
      // role-middleware (commit AH-12.7) enforces this on every admin
      // page load; here we just deliver the user to the right next step
      // so they don't bounce through a redirect chain.
      const uid = data.session?.user.id;
      let isAdmin = false;
      if (uid) {
        const { data: roleOk } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        isAdmin = roleOk === true;
      }

      if (isAdmin) {
        const factors = await listFactors();
        const hasFactor = factors.totp.some((f) => f.status === "verified");
        if (!hasFactor) {
          navigate({ to: "/login/enroll-2fa" });
          return;
        }
        const aal = await getAALStatus();
        if (aal.currentLevel !== "aal2") {
          navigate({
            to: "/login/verify-2fa",
            search: { redirect: "/admin" },
          });
          return;
        }
        navigate({ to: "/admin" });
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
