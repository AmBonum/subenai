import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ChevronDown, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SubmitTemplateError,
  useCurrentProfile,
  useSubmitTemplate,
  type SubmitTemplateAgeRating,
  type SubmitTemplateOutput,
} from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";
import type { Template } from "@/lib/platform/types";

interface TemplateSubmitDialogProps {
  template: Template | null;
  open: boolean;
  onClose: () => void;
}

type AgeOptionKey = "all" | "thirteen_plus" | "sixteen_plus" | "eighteen_plus";

const AGE_OPTIONS: { key: AgeOptionKey; value: SubmitTemplateAgeRating }[] = [
  { key: "all", value: "all" },
  { key: "thirteen_plus", value: "13+" },
  { key: "sixteen_plus", value: "16+" },
  { key: "eighteen_plus", value: "18+" },
];

function mapErrorCode(code: string): string {
  if (code === "rate_limit_user_daily") return "verdict_error_rate_limit_user";
  if (code === "rate_limit_global" || code === "rate_limit_ip")
    return "verdict_error_rate_limit_global";
  if (code === "rejected_cooldown_active") return "verdict_error_cooldown";
  if (code === "budget_exhausted") return "verdict_error_budget";
  return "verdict_error_generic";
}

export function TemplateSubmitDialog({ template, open, onClose }: TemplateSubmitDialogProps) {
  const t = tFor("templates");
  const profileQ = useCurrentProfile();
  const submitMut = useSubmitTemplate();

  const [ageRating, setAgeRating] = useState<SubmitTemplateAgeRating | "">("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [verdict, setVerdict] = useState<SubmitTemplateOutput | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAgeRating("");
      setConsentChecked(false);
      setDetailsOpen(false);
      setVerdict(null);
      setErrorCode(null);
      submitMut.reset();
    }
    // submitMut.reset is stable across renders from react-query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!template) return null;

  const profile = profileQ.data ?? null;
  const authorName = profile?.display_name?.trim() || profile?.email || "";
  const slug = template.slug ?? t("submission.attribution_preview_slug_placeholder");
  const attributionLine = t("submission.attribution_preview_template", {
    name: authorName || "—",
    slug,
  });

  const submitting = submitMut.isPending;
  const canSubmit = !!ageRating && consentChecked && !submitting;

  const handleSubmit = () => {
    if (!ageRating) return;
    setErrorCode(null);
    submitMut.mutate(
      { template, age_rating_self_declared: ageRating },
      {
        onSuccess: (res) => setVerdict(res),
        onError: (err) => {
          const code = err instanceof SubmitTemplateError ? err.code : "request_failed";
          setErrorCode(mapErrorCode(code));
        },
      },
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !submitting) onClose();
  };

  const showForm = !verdict && !errorCode && !submitting;
  const showLoading = submitting;
  const showSuccess = !!verdict && verdict.precheck_passed && !verdict.held_for_admin_review;
  const showHeld = !!verdict && verdict.held_for_admin_review;
  const showError = !!errorCode;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="templates-submit-dialog" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("submission.dialog_title")}</DialogTitle>
          <DialogDescription>{template.title}</DialogDescription>
        </DialogHeader>

        {showForm && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("submission.author_name_label")}</Label>
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <span
                  data-testid="templates-submit-dialog-author-name"
                  className="text-sm font-medium text-foreground"
                >
                  {authorName || "—"}
                </span>
                <Link
                  to="/app/account/profile"
                  data-testid="templates-submit-dialog-author-name-link"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  {t("submission.author_name_link")}
                </Link>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="templates-submit-dialog-age">
                {t("submission.age_rating_label")}
              </Label>
              <Select
                value={ageRating}
                onValueChange={(v) => setAgeRating(v as SubmitTemplateAgeRating)}
              >
                <SelectTrigger
                  id="templates-submit-dialog-age"
                  data-testid="templates-submit-dialog-age-rating-select"
                  className="max-sm:h-11"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      data-testid={`templates-submit-dialog-age-rating-option-${opt.key}`}
                    >
                      {t(`submission.age_rating_options.${opt.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="templates-submit-dialog-consent"
                data-testid="templates-submit-dialog-consent-checkbox"
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
                className="mt-0.5"
              />
              <Label
                htmlFor="templates-submit-dialog-consent"
                className="cursor-pointer text-xs font-normal leading-snug text-foreground"
              >
                {t("submission.consent_checkbox_label")}
              </Label>
            </div>

            <div className="rounded-md border border-border/60">
              <button
                type="button"
                data-testid="templates-submit-dialog-consent-details-toggle"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/30"
              >
                <span>{t("submission.consent_details_heading")}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    detailsOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {detailsOpen && (
                <p
                  data-testid="templates-submit-dialog-consent-details-body"
                  className="border-t border-border/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
                >
                  {t("submission.consent_details_body")}
                </p>
              )}
            </div>

            <div
              data-testid="templates-submit-dialog-attribution-preview"
              className="rounded-md border border-border/60 bg-muted/30 px-3 py-2"
            >
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {t("submission.attribution_preview_heading")}
              </p>
              <p className="text-xs font-medium text-foreground">{attributionLine}</p>
            </div>
          </div>
        )}

        {showLoading && (
          <div
            data-testid="templates-submit-dialog-loading-state"
            className="flex flex-col items-center gap-3 py-8 text-center"
          >
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">{t("submission.submitting_loading")}</p>
          </div>
        )}

        {showSuccess && (
          <div
            data-testid="templates-submit-dialog-verdict-success"
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-foreground">
              {t("submission.verdict_success_title")}
            </h4>
            <p className="text-xs text-muted-foreground">{t("submission.verdict_success_body")}</p>
          </div>
        )}

        {showHeld && verdict && (
          <div
            data-testid="templates-submit-dialog-verdict-held"
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <AlertTriangle className="h-10 w-10 text-warning" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-foreground">
              {t("submission.verdict_held_title")}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("submission.verdict_held_body", { reason: verdict.summary })}
            </p>
          </div>
        )}

        {showError && (
          <div
            data-testid="templates-submit-dialog-verdict-error"
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <XCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">
              {t(`submission.${errorCode}` as `submission.verdict_error_generic`)}
            </p>
          </div>
        )}

        <DialogFooter>
          {showForm && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="templates-submit-dialog-cancel-button"
                className="max-sm:h-11"
              >
                {t("submission.cancel_button")}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                data-testid="templates-submit-dialog-submit-button"
                className="max-sm:h-11"
              >
                {t("submission.submit_button")}
              </Button>
            </>
          )}
          {(showSuccess || showHeld || showError) && (
            <Button
              type="button"
              onClick={onClose}
              data-testid="templates-submit-dialog-close-after-verdict"
              className="max-sm:h-11"
            >
              {t("submission.verdict_close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
