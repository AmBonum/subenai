import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Paperclip, Send, X } from "lucide-react";

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
    /** Initial subject — e.g. from a /contact topic card deep-link. Stays editable. */
    subject?: string;
    /** Initially selected category — e.g. from a /contact topic card deep-link. Stays editable. */
    category?: SupportContactFormData["category"];
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
  /**
   * E48.2 — Optional attachment upload callback. When provided, the
   * form renders a file picker (PNG / JPEG / PDF, max 3 files, 5 MB
   * each) and, after a successful `onSubmit`, iterates through the
   * selected files and invokes this callback once per file. The
   * caller is responsible for the actual POST to
   * `/api/support-attachment-upload` (so the form stays presentational).
   *
   * Per-file failures are surfaced inline but never block the success
   * state of the parent submission — the ticket is created either
   * way. Mirrors the production guarantee that ticket creation is
   * atomic, attachments are best-effort.
   */
  onAttachmentUpload?: (
    file: File,
    submitResult: SupportContactSubmitResult,
  ) => Promise<{ ok: boolean; error?: string }>;
}

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_ACCEPT = "image/png,image/jpeg,application/pdf";

type AttachmentStatus = "pending" | "uploading" | "ok" | "error";

interface AttachmentState {
  file: File;
  status: AttachmentStatus;
  errorCode?: string;
}

export function SupportContactForm({
  variant,
  prefill,
  onSubmit,
  turnstileSlot,
  onAttachmentUpload,
}: SupportContactFormProps) {
  const formId = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const isAuthenticated = variant === "authenticated";
  const attachmentsEnabled = typeof onAttachmentUpload === "function";

  function handleAttachmentPick(input: HTMLInputElement) {
    setAttachmentError(null);
    const incoming = Array.from(input.files ?? []);
    input.value = ""; // allow re-selecting the same file later
    if (incoming.length === 0) return;

    const next: AttachmentState[] = [...attachments];
    for (const file of incoming) {
      if (next.length >= MAX_ATTACHMENTS) {
        setAttachmentError(`Maximum je ${MAX_ATTACHMENTS} prílohy.`);
        break;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setAttachmentError(`Príloha "${file.name}" je väčšia ako 5 MB.`);
        continue;
      }
      if (!ATTACHMENT_ACCEPT.split(",").includes(file.type)) {
        setAttachmentError(
          `Príloha "${file.name}" má nepodporovaný formát. Povolené: PNG, JPEG, PDF.`,
        );
        continue;
      }
      next.push({ file, status: "pending" });
    }
    setAttachments(next);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentError(null);
  }

  const form = useForm<SupportContactFormData>({
    resolver: zodResolver(supportContactSchema),
    defaultValues: {
      subject: prefill?.subject ?? "",
      category: prefill?.category,
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
    setAttachmentError(null);
    try {
      const result = await onSubmit(data);

      // After the ticket is created, sequentially upload each
      // selected attachment. We do it serially (not Promise.all) so
      // the user sees deterministic progress; with a 5 MB cap and a
      // 3-file ceiling the total time is bounded.
      if (attachmentsEnabled && attachments.length > 0 && result) {
        for (let i = 0; i < attachments.length; i++) {
          setAttachments((prev) =>
            prev.map((a, idx) => (idx === i ? { ...a, status: "uploading" } : a)),
          );
          const r = await onAttachmentUpload!(attachments[i].file, result).catch(
            (err: unknown): { ok: boolean; error?: string } => ({
              ok: false,
              error: err instanceof Error ? err.message : "upload_failed",
            }),
          );
          setAttachments((prev) =>
            prev.map((a, idx) =>
              idx === i
                ? { ...a, status: r.ok ? "ok" : "error", errorCode: r.ok ? undefined : r.error }
                : a,
            ),
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nepodarilo sa odoslať. Skús to neskôr.";
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
          <p className="text-xs text-muted-foreground">
            E-mail vyplníme automaticky z tvojho účtu.
          </p>
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

      {/* E48.2 attachment picker — only when caller provides an upload
          callback. Stays hidden on the /app variant if the caller chose
          not to wire uploads there. */}
      {attachmentsEnabled && (
        <div className="space-y-2" data-testid="kontakt-form-attachments">
          <Label htmlFor={`${formId}-files`} className="flex items-center gap-2 text-sm">
            <Paperclip className="size-4" aria-hidden="true" />
            Prílohy (PNG, JPEG, PDF; max {MAX_ATTACHMENTS} súbory po 5 MB)
          </Label>
          <input
            id={`${formId}-files`}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            disabled={isSubmitting || attachments.length >= MAX_ATTACHMENTS}
            onChange={(e) => handleAttachmentPick(e.target)}
            data-testid="kontakt-form-attachments-input"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
          />
          {attachments.length > 0 && (
            <ul className="space-y-1.5" data-testid="kontakt-form-attachments-list">
              {attachments.map((a, idx) => (
                <li
                  key={`${a.file.name}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 px-3 py-1.5 text-xs"
                  data-testid={`kontakt-form-attachment-${idx}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {a.status === "uploading" && (
                      <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />
                    )}
                    {a.status === "ok" && (
                      <span className="shrink-0 text-emerald-600" aria-hidden="true">
                        ✓
                      </span>
                    )}
                    {a.status === "error" && (
                      <span className="shrink-0 text-destructive" aria-hidden="true">
                        ⚠
                      </span>
                    )}
                    <span className="truncate font-medium text-foreground">{a.file.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      ({Math.round(a.file.size / 1024)} kB)
                    </span>
                    {a.status === "error" && a.errorCode && (
                      <span
                        className="ml-2 truncate text-destructive"
                        data-testid={`kontakt-form-attachment-${idx}-error`}
                      >
                        {a.errorCode}
                      </span>
                    )}
                  </div>
                  {a.status !== "uploading" && a.status !== "ok" && (
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      disabled={isSubmitting}
                      aria-label={`Odstrániť ${a.file.name}`}
                      data-testid={`kontakt-form-attachment-${idx}-remove`}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {attachmentError && (
            <p className="text-xs text-destructive" data-testid="kontakt-form-attachments-error">
              {attachmentError}
            </p>
          )}
        </div>
      )}

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
