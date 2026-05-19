import { useId, useState, type FormEvent } from "react";
import { tFor } from "@/i18n/quiz";

interface Props {
  setId: string;
  onAuthenticated: () => void;
}

type SubmitState = "idle" | "submitting" | "error";

export function AuthorPasswordGate({ setId, onAuthenticated }: Props) {
  const t = tFor("author_gate");
  const tCommon = tFor("common");
  const formId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting" || password.length === 0) return;
    setState("submitting");
    setErrorCode(null);
    try {
      const response = await fetch("/api/verify-author-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ set_id: setId, password }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (response.ok && payload.ok) {
        setPassword("");
        onAuthenticated();
        return;
      }
      setErrorCode(payload.error ?? "submit_failed");
      setState("error");
    } catch {
      setErrorCode("network_error");
      setState("error");
    }
  }

  const errorMessage = (() => {
    switch (errorCode) {
      case "rate_limited":
      case "unauthorized":
      case "network_error":
        return t(`errors.${errorCode}`);
      default:
        return t("errors.generic");
    }
  })();

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6"
      aria-labelledby={`${formId}-h`}
    >
      <h2 id={`${formId}-h`} className="text-xl font-semibold text-foreground">
        {t("heading")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
      <div>
        <label htmlFor={passwordId} className="sr-only">
          {t("password_label")}
        </label>
        <div className="relative">
          <input
            id={passwordId}
            data-testid="vysledky-gate-password-input"
            type={revealed ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            aria-required="true"
            aria-describedby={state === "error" ? errorId : undefined}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-16 text-sm text-foreground"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {revealed ? t("hide") : t("reveal")}
          </button>
        </div>
      </div>
      {state === "error" && errorCode ? (
        <p
          id={errorId}
          data-testid="vysledky-gate-error-message"
          role="alert"
          aria-live="polite"
          className="rounded-md border border-destructive/60 bg-destructive/10 p-3 text-sm text-foreground"
        >
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        data-testid="vysledky-gate-submit-button"
        disabled={state === "submitting" || password.length === 0}
        className="w-full rounded-xl bg-accent-gradient px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "submitting" ? tCommon("verifying") : t("submit")}
      </button>
    </form>
  );
}
