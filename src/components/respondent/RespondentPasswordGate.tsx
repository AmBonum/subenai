// E45 Phase 2 — password gate shown before TakeTestFlow when a test is
// password-locked and the visitor has no valid cookie. POSTs to
// /api/tests/verify-password; on 200 the HttpOnly cookie is set, the
// component calls `onVerified()` to swap the parent into the open state.
//
// Error states (Slovak verbatim copy in i18n):
//   * 401 unauthorized   → wrong_password
//   * 429 rate_limited   → rate_limited + retry_after if present
//   * 429 share_locked   → share_locked (24h daily cap)
//   * network / 5xx      → submit_failed

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

import { tFor } from "@/i18n/respondent-flow";

interface Props {
  shareId: string;
  /** Optional reason carried from preflight (cookie expired, password rotated, etc.). */
  reason?: string | null;
  onVerified: () => void;
}

type ErrorKey =
  | "wrong_password"
  | "rate_limited"
  | "share_locked"
  | "submit_failed"
  | "missing_password";

interface VerifyResponseBody {
  ok?: true;
  error?: string;
  retry_after?: number;
}

export function RespondentPasswordGate({ shareId, reason, onVerified }: Props) {
  const t = tFor("password_gate");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Surface reason from preflight as an informational banner (not blocking).
  const reasonHint =
    reason === "expired"
      ? t("hint_expired")
      : reason === "password_changed"
        ? t("hint_password_changed")
        : reason === "wrong_share" || reason === "bad_signature"
          ? t("hint_session_invalid")
          : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRetryAfter(null);
    if (password.length === 0) {
      setError("missing_password");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tests/verify-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ share_id: shareId, password }),
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as VerifyResponseBody;
      if (res.status === 200 && body.ok) {
        onVerified();
        return;
      }
      if (res.status === 429 && body.error === "share_locked") {
        setError("share_locked");
        return;
      }
      if (res.status === 429) {
        setError("rate_limited");
        if (typeof body.retry_after === "number") setRetryAfter(body.retry_after);
        return;
      }
      if (res.status === 401) {
        setError("wrong_password");
        setPassword("");
        return;
      }
      setError("submit_failed");
    } catch {
      setError("submit_failed");
    } finally {
      setSubmitting(false);
    }
  };

  const retryAfterMinutes = retryAfter !== null ? Math.ceil(retryAfter / 60) : null;

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-subtle)] p-6"
      data-testid="respondent-password-gate-root"
    >
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-8">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-4 w-4" aria-hidden />
            </span>
            <span>{t("title")}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>

          {reasonHint && (
            <p
              className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900"
              data-testid="respondent-password-gate-reason"
              role="status"
            >
              {reasonHint}
            </p>
          )}

          <form className="space-y-3" onSubmit={onSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="resp-pwd" className="text-xs">
                {t("input_label")}
              </Label>
              <Input
                id="resp-pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                aria-invalid={error === "wrong_password"}
                data-testid="respondent-password-gate-input"
                disabled={submitting || error === "share_locked"}
              />
            </div>

            {error && (
              <p
                className="text-xs text-destructive"
                data-testid="respondent-password-gate-error"
                role="alert"
              >
                {error === "rate_limited" && retryAfterMinutes !== null
                  ? t("err_rate_limited_retry", { minutes: retryAfterMinutes })
                  : t(`err_${error}` as never)}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || error === "share_locked" || password.length === 0}
              data-testid="respondent-password-gate-submit"
            >
              {submitting ? t("submitting") : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
