import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, EyeOff, Download, FileDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminDpaRequests,
  useUpdateDpaRequestStatus,
  useAnonymiseDpaRequest,
  useResendDpaEmail,
  useDownloadDpaPdf,
  type AdminDpaRequest,
  type DpaRequestStatus,
  type DpaEmailStatus,
} from "@/lib/admin/queries";
import { exportToCSV } from "@/lib/admin/export";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { tFor } from "@/i18n/governance";
import { formatDateSk } from "@/lib/format/date";

const STATUSES: DpaRequestStatus[] = ["pending", "delivered", "signed", "cancelled"];
const EMAIL_STATUSES: DpaEmailStatus[] = ["pending", "sent", "failed"];

const STATUS_BADGE: Record<DpaRequestStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  delivered: "border-sky-500/40 bg-sky-500/10 text-sky-700",
  signed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  cancelled: "border-muted/40 bg-muted/10 text-muted-foreground",
};

const EMAIL_BADGE: Record<DpaEmailStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  sent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function DpaRequestsQueue() {
  const t = tFor("dpa_queue");
  const dpaQuery = useAdminDpaRequests();
  const updateStatus = useUpdateDpaRequestStatus();
  const anonymise = useAnonymiseDpaRequest();
  const resend = useResendDpaEmail();
  const download = useDownloadDpaPdf();

  const rows = useMemo(() => dpaQuery.data ?? [], [dpaQuery.data]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [emailFilter, setEmailFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [anonymiseTarget, setAnonymiseTarget] = useState<AdminDpaRequest | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (emailFilter !== "all" && r.email_status !== emailFilter) return false;
      if (needle) {
        const haystack =
          `${r.school_name} ${r.contact_email ?? ""} ${r.contact_name ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, emailFilter, search]);

  const onStatusChange = (id: string, status: DpaRequestStatus) => {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(t("toast_status_updated")),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const onAnonymise = (row: AdminDpaRequest) => {
    // Senior modal rule (CLAUDE.md): NO window.confirm/alert/prompt.
    // We open the severity-aware ConfirmDialog and wait for the user
    // to click the destructive-styled confirm button.
    setAnonymiseTarget(row);
  };

  const runAnonymise = (row: AdminDpaRequest) => {
    anonymise.mutate(
      { id: row.id },
      {
        onSuccess: () => toast.success(t("toast_anonymised")),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const onResend = (row: AdminDpaRequest) => {
    resend.mutate(
      { row },
      {
        onSuccess: () => toast.success(t("toast_resent")),
        onError: (err: Error) => toast.error(`${t("toast_resend_failed")} (${err.message})`),
      },
    );
  };

  const onDownload = (row: AdminDpaRequest) => {
    download.mutate(
      { row },
      {
        onSuccess: () => toast.success(t("toast_downloaded")),
        onError: (err: Error) => toast.error(`${t("toast_download_failed")} (${err.message})`),
      },
    );
  };

  const onExport = () => {
    // GDPR Art. 30 ("records of processing activities") + Art. 28(9)
    // ("written agreement") — operator may need to show counsel /
    // supervisory authority the full DPA queue with timestamps + email
    // delivery status. Export the current filtered view so the operator
    // can scope by date/status before exporting (Excel-friendly: BOM +
    // RFC 4180 quoting handled by exportToCSV).
    exportToCSV(
      filtered,
      [
        { key: "id", label: t("csv_id") },
        { key: "created_at", label: t("csv_created") },
        { key: "school_name", label: t("csv_school") },
        { key: "contact_name", label: t("csv_contact_name") },
        { key: "contact_email", label: t("csv_contact_email") },
        { key: "dpa_version", label: t("csv_version") },
        { key: "status", label: t("csv_status") },
        { key: "email_status", label: t("csv_email_status") },
        { key: "email_error", label: t("csv_email_error") },
        { key: "anonymized_at", label: t("csv_anonymized_at") },
      ],
      `dpa-requests-${new Date().toISOString().slice(0, 10)}`,
    );
    toast.success(t("toast_exported", { count: filtered.length }));
  };

  return (
    <div className="space-y-4" data-testid="dpa-queue-root">
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            aria-label={t("search_placeholder")}
            data-testid="dpa-queue-search"
            className="w-full sm:max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="w-full sm:w-[180px]"
              aria-label={t("filter_status_label")}
              data-testid="dpa-queue-filter-status"
            >
              <SelectValue placeholder={t("filter_status_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_status_all")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status_${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={emailFilter} onValueChange={setEmailFilter}>
            <SelectTrigger
              className="w-full sm:w-[180px]"
              aria-label={t("filter_email_label")}
              data-testid="dpa-queue-filter-email"
            >
              <SelectValue placeholder={t("filter_email_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_email_all")}</SelectItem>
              {EMAIL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`email_status_${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={filtered.length === 0}
            data-testid="dpa-queue-export-csv"
            className="sm:ml-auto"
          >
            <FileDown className="mr-1.5 size-4" />
            {t("action_export_csv")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60" data-testid="dpa-queue-table-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table_header_school")}</TableHead>
                <TableHead>{t("table_header_contact")}</TableHead>
                <TableHead>{t("table_header_status")}</TableHead>
                <TableHead>{t("table_header_email")}</TableHead>
                <TableHead>{t("table_header_version")}</TableHead>
                <TableHead>{t("table_header_created")}</TableHead>
                <TableHead className="text-right">{t("table_header_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                    data-testid="dpa-queue-empty"
                  >
                    {t("empty_state")}
                  </TableCell>
                </TableRow>
              ) : null}
              {filtered.map((row) => {
                const anonymised = row.anonymized_at !== null;
                return (
                  <TableRow
                    key={row.id}
                    data-testid={`dpa-queue-row-${row.id}`}
                    className={anonymised ? "opacity-60" : undefined}
                  >
                    <TableCell className="font-medium">{row.school_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{row.contact_name ?? t("anonymised_marker")}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.contact_email ?? t("anonymised_marker")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.status}
                        onValueChange={(value) => onStatusChange(row.id, value as DpaRequestStatus)}
                      >
                        <SelectTrigger
                          aria-label={t("filter_status_label")}
                          data-testid={`dpa-queue-status-${row.id}`}
                          className={`h-8 min-w-[150px] border ${STATUS_BADGE[row.status]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`status_${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${EMAIL_BADGE[row.email_status]}`}
                          data-testid={`dpa-queue-email-${row.id}`}
                        >
                          {t(`email_status_${row.email_status}`)}
                        </Badge>
                        {row.email_status === "failed" && row.email_error ? (
                          <span className="text-xs text-destructive">{row.email_error}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.dpa_version}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateSk(row.created_at)}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={anonymised || download.isPending}
                        onClick={() => onDownload(row)}
                        data-testid={`dpa-queue-download-${row.id}`}
                      >
                        <Download className="mr-1 size-3" />
                        {t("action_download")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={anonymised || resend.isPending}
                        onClick={() => onResend(row)}
                        data-testid={`dpa-queue-resend-${row.id}`}
                      >
                        <RotateCcw className="mr-1 size-3" />
                        {t("action_resend")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={anonymised || anonymise.isPending}
                        onClick={() => onAnonymise(row)}
                        data-testid={`dpa-queue-anonymise-${row.id}`}
                      >
                        <EyeOff className="mr-1 size-3" />
                        {t("action_anonymise")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={anonymiseTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAnonymiseTarget(null);
        }}
        severity="destructive"
        title={t("anonymise_dialog_title")}
        description={
          anonymiseTarget
            ? t("anonymise_dialog_body", {
                school: anonymiseTarget.school_name,
                email: anonymiseTarget.contact_email ?? "—",
              })
            : t("anonymise_confirm")
        }
        confirmLabel={t("action_anonymise")}
        typedConfirm={
          anonymiseTarget
            ? {
                expected: anonymiseTarget.contact_email ?? anonymiseTarget.school_name,
                label: tFor("user_dossier")("hard_delete_dialog_input_label", {
                  email: anonymiseTarget.contact_email ?? anonymiseTarget.school_name,
                }),
              }
            : undefined
        }
        onConfirm={() => {
          if (anonymiseTarget) runAnonymise(anonymiseTarget);
          setAnonymiseTarget(null);
        }}
      />
    </div>
  );
}
