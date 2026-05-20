import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, EyeOff, Download } from "lucide-react";

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
import { tFor } from "@/i18n/governance";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sk-SK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

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
    if (!window.confirm(t("anonymise_confirm"))) return;
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
                      {formatDate(row.created_at)}
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
    </div>
  );
}
