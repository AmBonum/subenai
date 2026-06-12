import { useMemo, useState } from "react";
import { Check, X, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminReports, useResolveReport } from "@/lib/admin/queries";
import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { formatDateSk } from "@/lib/format/date";
import { tFor } from "@/i18n/governance";

const STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;
const REASONS = ["spam", "inappropriate", "harassment", "misinformation", "other"] as const;

export function ReportsQueue() {
  const t = tFor("reports_queue");
  const reportsQuery = useAdminReports();
  const resolveReport = useResolveReport();
  const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);
  const onMutationError = (err: Error) => toast.error(err.message);
  const [status, setStatus] = useState<string>("all");
  const [reason, setReason] = useState<string>("all");

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (reason !== "all" && r.reason !== reason) return false;
      return true;
    });
  }, [reports, status, reason]);

  return (
    <div className="space-y-4" data-testid="reports-queue-root">
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              className="w-full sm:w-[200px]"
              aria-label={t("filter_status_label")}
              data-testid="reports-queue-filter-status"
            >
              <SelectValue placeholder={t("filter_status_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_status_all")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger
              className="w-full sm:w-[200px]"
              aria-label={t("filter_reason_label")}
              data-testid="reports-queue-filter-reason"
            >
              <SelectValue placeholder={t("filter_reason_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_reason_all")}</SelectItem>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`reason.${r}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {reportsQuery.isLoading ? (
        <AdminListLoading testId="reports-queue-loading" />
      ) : reportsQuery.error ? (
        <AdminListError error={reportsQuery.error as Error} testId="reports-queue-error" />
      ) : filtered.length === 0 ? (
        <Card className="border-border/60" data-testid="reports-queue-empty-state">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t("empty_state")}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table data-testid="reports-queue-table">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>{t("table_header_target")}</TableHead>
                  <TableHead>{t("table_header_reason")}</TableHead>
                  <TableHead>{t("table_header_status")}</TableHead>
                  <TableHead>{t("table_header_reporter")}</TableHead>
                  <TableHead>{t("table_header_created")}</TableHead>
                  <TableHead className="text-right">{t("table_header_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} data-testid={`reports-queue-row-${r.id}`}>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-1 text-sm font-medium">{r.target_label}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.target_type} · {r.target_id}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{t(`reason.${r.reason}`)}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{r.reporter_name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDateSk(r.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={t("action_review")}
                          data-testid={`reports-queue-row-review-button-${r.id}`}
                          onClick={() =>
                            resolveReport.mutate(
                              { id: r.id, status: "reviewing" },
                              {
                                onSuccess: () => toast.info(t("toast_review")),
                                onError: onMutationError,
                              },
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600"
                          aria-label={t("action_resolve")}
                          data-testid={`reports-queue-row-resolve-button-${r.id}`}
                          onClick={() =>
                            resolveReport.mutate(
                              { id: r.id, status: "resolved" },
                              {
                                onSuccess: () => toast.success(t("toast_resolved")),
                                onError: onMutationError,
                              },
                            )
                          }
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label={t("action_dismiss")}
                          data-testid={`reports-queue-row-dismiss-button-${r.id}`}
                          onClick={() =>
                            resolveReport.mutate(
                              { id: r.id, status: "dismissed" },
                              {
                                onSuccess: () => toast(t("toast_dismissed")),
                                onError: onMutationError,
                              },
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
