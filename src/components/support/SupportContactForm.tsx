import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SUPPORT_BODY_MAX,
  SUPPORT_TICKET_CATEGORIES,
  supportContactSchema,
  type SupportContactFormData,
  type SupportContactSubmitResult,
} from "./support-form-config";

// E48.3 — Public + /app support contact form. Pure presentational; the
// caller supplies `onSubmit` so the same component serves both
// surfaces (public /kontakt with Turnstile-wrapped submit, and the
// authenticated /app/help/contact form which skips Turnstile).
// Types + categories + zod schema live in ./support-form-config to
// satisfy react-refresh/only-export-components.

interface SupportContactFormProps {
  /**
   * `public` — shows email + name as editable inputs, expects the caller
   * to inject Turnstile elsewhere on the page and validate the token
   * server-side before calling the submit RPC.
   * `authenticated` — pre-fills email + name from the session as
   * read-only inputs; the caller skips Turnstile because the JWT proves
   * humanity.
   */
  variant: "public" | "authenticated";
  prefill?: {
    email?: string;
    name?: string;
  };
  /**
   * Caller is responsible for: invoking the CF endpoint, validating
   * Turnstile (public variant), and any toast / navigation on success.
   * The component only validates client-side and surfaces submit errors.
   */
  onSubmit: (data: SupportContactFormData) => Promise<SupportContactSubmitResult>;
  /**
   * Slot for the Turnstile widget. Only rendered when `variant='public'`.
   * The caller controls Turnstile entirely — the form just leaves a
   * place for it above the submit button.
   */
  turnstileSlot?: React.ReactNode;
}

export function SupportContactForm({
  variant,
  prefill,
  onSubmit,
  turnstileSlot,
}: SupportContactFormProps) {
  const formId = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isAuthenticated = variant === "authenticated";

  const form = useForm<SupportContactFormData>({
    resolver: zodResolver(supportContactSchema),
    defaultValues: {
      subject: "",
      category: undefined,
      body: "",
      email: prefill?.email ?? "",
      name: prefill?.name ?? "",
      _h_addr: "",
    },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const bodyValue = watch("body") ?? "";
  const bodyRemaining = useMemo(() => SUPPORT_BODY_MAX - bodyValue.length, [bodyValue]);
  const categoryValue = watch("category");

  const submit = handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nepodarilo sa odoslať. Skúste neskôr.";
      setSubmitError(message);
    }
  });

  return (
    <form
      id={formId}
      onSubmit={submit}
      noValidate
      className="space-y-6"
      data-testid="kontakt-form"
      aria-describedby={submitError ? `${formId}-submit-error` : undefined}
    >
      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor={`${formId}-subject`}>
          Téma <span aria-hidden="true">*</span>
          <span className="sr-only"> (povinné)</span>
        </Label>
        <Input
          id={`${formId}-subject`}
          type="text"
          autoComplete="off"
          aria-required="true"
          aria-invalid={errors.subject ? "true" : undefined}
          aria-describedby={errors.subject ? `${formId}-subject-error` : undefined}
          data-testid="kontakt-form-subject-input"
          {...register("subject")}
        />
        {errors.subject && (
          <p
            id={`${formId}-subject-error`}
            className="text-sm text-destructive"
            data-testid="kontakt-form-error-subject"
          >
            {errors.subject.message}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor={`${formId}-category`}>
          Kategória <span aria-hidden="true">*</span>
          <span className="sr-only"> (povinné)</span>
        </Label>
        <Select
          value={categoryValue ?? ""}
          onValueChange={(v) =>
            setValue("category", v as SupportContactFormData["category"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger
            id={`${formId}-category`}
            aria-required="true"
            aria-invalid={errors.category ? "true" : undefined}
            aria-describedby={errors.category ? `${formId}-category-error` : undefined}
            data-testid="kontakt-form-category-select"
          >
            <SelectValue placeholder="Vyberte kategóriu" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORT_TICKET_CATEGORIES.map((c) => (
              <SelectItem
                key={c.value}
                value={c.value}
                data-testid={`kontakt-form-category-option-${c.value}`}
              >
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p
            id={`${formId}-category-error`}
            className="text-sm text-destructive"
            data-testid="kontakt-form-error-category"
          >
            {errors.category.message}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor={`${formId}-body`}>
            Správa <span aria-hidden="true">*</span>
            <span className="sr-only"> (povinné)</span>
          </Label>
          <span
            aria-live="polite"
            className={
              bodyRemaining < 0 ? "text-xs text-destructive" : "text-xs text-muted-foreground"
            }
            data-testid="kontakt-form-body-counter"
          >
            {bodyRemaining < 0
              ? `O ${-bodyRemaining} znakov priveľa`
              : `Zostáva ${bodyRemaining} znakov`}
          </span>
        </div>
        <Textarea
          id={`${formId}-body`}
          rows={6}
          aria-required="true"
          aria-invalid={errors.body ? "true" : undefined}
          aria-describedby={errors.body ? `${formId}-body-error` : undefined}
          data-testid="kontakt-form-body-textarea"
          {...register("body")}
        />
        {errors.body && (
          <p
            id={`${formId}-body-error`}
            className="text-sm text-destructive"
            data-testid="kontakt-form-error-body"
          >
            {errors.body.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor={`${formId}-email`}>
          E-mail <span aria-hidden="true">*</span>
          <span className="sr-only"> (povinné)</span>
        </Label>
        <Input
          id={`${formId}-email`}
          type="email"
          autoComplete="email"
          aria-required="true"
          aria-invalid={errors.email ? "true" : undefined}
          aria-describedby={errors.email ? `${formId}-email-error` : undefined}
          readOnly={isAuthenticated}
          data-testid="kontakt-form-email-input"
          {...register("email")}
        />
        {isAuthenticated && (
          <p className="text-xs text-muted-foreground">E-mail vyplníme automaticky z vášho účtu.</p>
        )}
        {errors.email && (
          <p
            id={`${formId}-email-error`}
            className="text-sm text-destructive"
            data-testid="kontakt-form-error-email"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Name (optional) */}
      <div className="space-y-2">
        <Label htmlFor={`${formId}-name`}>Meno (nepovinné)</Label>
        <Input
          id={`${formId}-name`}
          type="text"
          autoComplete="name"
          aria-invalid={errors.name ? "true" : undefined}
          aria-describedby={errors.name ? `${formId}-name-error` : undefined}
          readOnly={isAuthenticated}
          data-testid="kontakt-form-name-input"
          {...register("name")}
        />
        {errors.name && (
          <p
            id={`${formId}-name-error`}
            className="text-sm text-destructive"
            data-testid="kontakt-form-error-name"
          >
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Honeypot — visually + a11y hidden; real users never fill it.
          Server-side rejects non-empty submissions. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor={`${formId}-h-addr`}>Nevyplňujte (anti-spam)</label>
        <input
          id={`${formId}-h-addr`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-testid="kontakt-form-honeypot"
          {...register("_h_addr")}
        />
      </div>

      {/* Turnstile mount point (public variant). Caller injects the actual
          widget; we just reserve the layout slot. */}
      {variant === "public" && turnstileSlot && (
        <div data-testid="kontakt-form-turnstile-slot">{turnstileSlot}</div>
      )}

      {submitError && (
        <Alert variant="destructive" data-testid="kontakt-form-submit-error">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertDescription id={`${formId}-submit-error`}>{submitError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full sm:w-auto"
        data-testid="kontakt-form-submit-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Odosielam…
          </>
        ) : (
          <>
            <Send className="mr-2 size-4" aria-hidden="true" />
            Odoslať žiadosť
          </>
        )}
      </Button>
    </form>
  );
}
