import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock,
  Download,
  EyeOff,
  Loader2,
  Pencil,
  ShieldAlert,
  Trash2,
  Undo2,
} from "lucide-react";

import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAnonymizeUser,
  useCancelPendingErasure,
  useEnqueueHardDelete,
  useRectifyUserData,
  useUserDossier,
  type UserDossier as DossierData,
} from "@/lib/admin/queries";
import { formatDateTimeSk } from "@/lib/format/date";
import { tFor } from "@/i18n/governance";

interface UserDossierProps {
  userId: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("sk-SK");
}

function avatarInitials(name: string | null | undefined, email: string | null | undefined): string {
  const source = name || email || "?";
  return source
    .split(/[\s@]/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserDossier({ userId }: UserDossierProps) {
  const t = tFor("user_dossier");
  const query = useUserDossier(userId);

  if (query.isLoading) {
    return <AdminListLoading testId="admin-user-dossier-loading" />;
  }
  if (query.error) {
    return <AdminListError error={query.error as Error} testId="admin-user-dossier-error" />;
  }
  if (!query.data) {
    return (
      <Card data-testid="admin-user-dossier-empty">
        <CardContent className="p-6 text-sm text-muted-foreground">{t("empty")}</CardContent>
      </Card>
    );
  }

  return <DossierContent userId={userId} dossier={query.data} />;
}

interface DossierContentProps {
  userId: string;
  dossier: DossierData;
}

function DossierContent({ userId, dossier }: DossierContentProps) {
  const t = tFor("user_dossier");
  const anonymize = useAnonymizeUser();
  const hardDelete = useEnqueueHardDelete();
  const cancelPending = useCancelPendingErasure();
  const rectify = useRectifyUserData();

  const [anonymizeOpen, setAnonymizeOpen] = useState(false);
  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);

  // E46.6 — rectification dialog state. The MVP wires ONE field
  // (profiles.display_name). The shape is generic enough to drop in
  // more fields once their DB whitelist entries land.
  const [rectifyOpen, setRectifyOpen] = useState(false);
  const [rectifyValue, setRectifyValue] = useState("");

  const profile = dossier.profile;
  const initials = avatarInitials(profile?.display_name, profile?.email);
  const targetEmail = profile?.email ?? null;
  const hasPending = dossier.pending_erasure !== null;

  const onExport = () => {
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dossier-${userId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(t("toast_exported"));
  };

  const onAnonymizeConfirm = () => {
    anonymize.mutate(
      { userId },
      {
        onSuccess: (data) => {
          toast.success(
            t("toast_anonymized", {
              total: Object.values(data.rows_affected).reduce((a, b) => a + b, 0),
            }),
          );
        },
        onError: (err: Error) => toast.error(`${t("toast_action_failed")} (${err.message})`),
      },
    );
  };

  const onHardDeleteConfirm = () => {
    hardDelete.mutate(
      { userId },
      {
        onSuccess: (data) => {
          const minutes = data.grace_window_minutes;
          toast.success(t("toast_hard_delete_enqueued", { minutes }));
        },
        onError: (err: Error) => toast.error(`${t("toast_action_failed")} (${err.message})`),
      },
    );
  };

  const onCancelPending = () => {
    cancelPending.mutate(
      { userId },
      {
        onSuccess: (ok) => {
          if (ok) toast.success(t("toast_cancel_success"));
          else toast.info(t("toast_cancel_too_late"));
        },
        onError: (err: Error) => toast.error(`${t("toast_action_failed")} (${err.message})`),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Sticky header ───────────────────────────────────────────── */}
      <Card
        className="border-border/60 sticky top-0 z-10 bg-background/95 backdrop-blur"
        data-testid="admin-user-dossier-header"
      >
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2
                className="text-lg font-semibold text-foreground"
                data-testid="admin-user-dossier-header-name"
              >
                {profile?.display_name ?? t("anonymized_marker")}
              </h2>
              <p
                className="text-sm text-muted-foreground"
                data-testid="admin-user-dossier-header-email"
              >
                {profile?.email ?? t("anonymized_marker")}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">{userId}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="admin-user-dossier-action-toolbar">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              data-testid="admin-user-dossier-export-button"
            >
              <Download className="mr-1.5 size-4" aria-hidden="true" />
              {t("action_export_json")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={anonymize.isPending || hasPending}
              onClick={() => setAnonymizeOpen(true)}
              data-testid="admin-user-dossier-anonymize-button"
            >
              <EyeOff className="mr-1.5 size-4" aria-hidden="true" />
              {t("action_anonymize")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={hardDelete.isPending || hasPending}
              onClick={() => setHardDeleteOpen(true)}
              data-testid="admin-user-dossier-hard-delete-button"
            >
              <Trash2 className="mr-1.5 size-4" aria-hidden="true" />
              {t("action_hard_delete")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Pending erasure banner ──────────────────────────────────── */}
      {hasPending && dossier.pending_erasure ? (
        <Card
          className="border-destructive/40 bg-destructive/5"
          data-testid="admin-user-dossier-pending-banner"
        >
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-destructive" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">{t("pending_heading")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("pending_body", {
                    when: formatDateTimeSk(dossier.pending_erasure.execute_at),
                  })}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={cancelPending.isPending}
              onClick={onCancelPending}
              data-testid="admin-user-dossier-cancel-pending-button"
            >
              {cancelPending.isPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Undo2 className="mr-1.5 size-4" aria-hidden="true" />
              )}
              {t("action_cancel_pending")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Identity section (always-visible MVP slice) ─────────────── */}
      <Card className="border-border/60" data-testid="admin-user-dossier-section-identity">
        <CardContent className="space-y-4 p-5">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{t("section_identity_title")}</h3>
            <Badge variant="outline">
              {t("section_identity_count", { n: dossier.user_roles.length + (profile ? 1 : 0) })}
            </Badge>
          </header>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DossierRow
              label={t("field_display_name")}
              value={profile?.display_name}
              onEdit={() => {
                setRectifyValue(profile?.display_name ?? "");
                setRectifyOpen(true);
              }}
              editTestId="admin-user-dossier-rectify-display-name"
              editAriaLabel={t("rectify_display_name_button")}
            />
            <DossierRow label={t("field_email")} value={profile?.email} />
            <DossierRow label={t("field_user_id")} value={userId} mono />
            <DossierRow label={t("field_created_at")} value={formatDate(profile?.created_at)} />
            <DossierRow
              label={t("field_roles")}
              value={
                dossier.user_roles.length
                  ? dossier.user_roles.map((r) => r.role).join(", ")
                  : t("anonymized_marker")
              }
            />
          </dl>
        </CardContent>
      </Card>

      {/* ── Governance section (DSR + DPA history) ──────────────────── */}
      <Card className="border-border/60" data-testid="admin-user-dossier-section-governance">
        <CardContent className="space-y-4 p-5">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {t("section_governance_title")}
            </h3>
            <Badge variant="outline">
              {t("section_governance_count", {
                n: dossier.dsr_requests.length + dossier.dpa_requests.length,
              })}
            </Badge>
          </header>
          {dossier.dsr_requests.length === 0 && dossier.dpa_requests.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="admin-user-dossier-governance-empty"
            >
              {t("section_governance_empty")}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dossier.dsr_requests.map((d, i) => (
                <li
                  key={`dsr-${i}`}
                  className="flex items-center gap-2 rounded-md border border-border/40 bg-card/40 px-3 py-2"
                >
                  <ShieldAlert className="size-4 text-amber-500" aria-hidden="true" />
                  <span className="font-medium">DSR · {String(d.type)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{String(d.status)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(String(d.created_at))}
                  </span>
                </li>
              ))}
              {dossier.dpa_requests.map((d, i) => (
                <li
                  key={`dpa-${i}`}
                  className="flex items-center gap-2 rounded-md border border-border/40 bg-card/40 px-3 py-2"
                >
                  <Clock className="size-4 text-sky-500" aria-hidden="true" />
                  <span className="font-medium">DPA · {String(d.school_name)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{String(d.status)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(String(d.created_at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Anonymize typed-confirm dialog ──────────────────────────── */}
      <ConfirmDialog
        open={anonymizeOpen}
        onOpenChange={setAnonymizeOpen}
        title={t("anonymize_dialog_title")}
        description={t("anonymize_dialog_description")}
        confirmLabel={t("anonymize_dialog_confirm")}
        cancelLabel={t("dialog_cancel")}
        severity="destructive"
        typedConfirm={{
          expected: targetEmail ?? "",
          label: t("hard_delete_dialog_input_label", { email: targetEmail ?? "(anonymized)" }),
        }}
        onConfirm={onAnonymizeConfirm}
      />

      {/* ── Hard delete typed-confirm dialog ────────────────────────── */}
      <ConfirmDialog
        open={hardDeleteOpen}
        onOpenChange={setHardDeleteOpen}
        title={t("hard_delete_dialog_title")}
        description={t("hard_delete_dialog_description")}
        confirmLabel={t("hard_delete_dialog_confirm")}
        cancelLabel={t("dialog_cancel")}
        severity="destructive"
        typedConfirm={{
          expected: targetEmail ?? "",
          label: t("hard_delete_dialog_input_label", { email: targetEmail ?? "(anonymized)" }),
        }}
        onConfirm={onHardDeleteConfirm}
      />

      {/* ── E46.6: Rectify display_name dialog ───────────────────────── */}
      <Dialog
        open={rectifyOpen}
        onOpenChange={(open) => {
          setRectifyOpen(open);
          if (!open) setRectifyValue("");
        }}
      >
        <DialogContent data-testid="admin-user-dossier-rectify-dialog">
          <DialogHeader>
            <DialogTitle>{t("rectify_dialog_title")}</DialogTitle>
            <DialogDescription>{t("rectify_dialog_description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rectify-input">{t("rectify_dialog_input_label")}</Label>
            <Input
              id="rectify-input"
              value={rectifyValue}
              onChange={(e) => setRectifyValue(e.target.value)}
              maxLength={200}
              data-testid="admin-user-dossier-rectify-input"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRectifyOpen(false)}
              data-testid="admin-user-dossier-rectify-cancel"
            >
              {t("dialog_cancel")}
            </Button>
            <Button
              type="button"
              data-testid="admin-user-dossier-rectify-confirm"
              disabled={
                rectify.isPending ||
                rectifyValue.trim() === "" ||
                rectifyValue.trim() === (profile?.display_name ?? "")
              }
              onClick={() => {
                rectify.mutate(
                  {
                    userId,
                    table: "profiles",
                    column: "display_name",
                    newValue: rectifyValue.trim(),
                  },
                  {
                    onSuccess: () => {
                      toast.success(t("toast_rectified"));
                      setRectifyOpen(false);
                      setRectifyValue("");
                    },
                    onError: (err: Error) => {
                      toast.error(t("toast_action_failed") + ": " + err.message);
                    },
                  },
                );
              }}
            >
              {rectify.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {t("rectify_dialog_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DossierRowProps {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  // E46.6 — when present, renders a small pencil button next to the
  // value that triggers `onEdit`. Used for fields where the dossier
  // supports Art. 16 rectification via `rectify_user_data` RPC.
  onEdit?: () => void;
  editTestId?: string;
  editAriaLabel?: string;
}

function DossierRow({ label, value, mono, onEdit, editTestId, editAriaLabel }: DossierRowProps) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1.5">
        <span className={`text-sm text-foreground ${mono ? "font-mono break-all" : ""}`}>
          {value ?? "—"}
        </span>
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
            data-testid={editTestId}
            aria-label={editAriaLabel}
            onClick={onEdit}
          >
            <Pencil className="size-3" />
          </Button>
        )}
      </dd>
    </div>
  );
}
