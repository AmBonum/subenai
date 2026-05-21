import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, Clock, FileDown, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
import { useAdminDSRQueue, useUpdateDSRStatus, useUsersByEmails } from "@/lib/admin/queries";
import type { DSRRequest, DSRType } from "@/lib/platform/types";
import { classifyDsrSla, daysRemaining, type DsrSlaVariant } from "@/lib/admin/dsr-sla";
import { exportToCSV } from "@/lib/admin/export";
import { tFor } from "@/i18n/governance";

const STATUSES: DSRRequest["status"][] = ["open", "in_progress", "completed", "rejected"];
const TYPES: DSRType[] = [
  "access",
  "rectification",
  "erase",
  "restriction",
  "portability",
  "objection",
];

const SLA_CLASS: Record<DsrSlaVariant, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  overdue: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function DsrQueue() {
  const t = tFor("dsr_queue");
  const dsrQuery = useAdminDSRQueue();
  const updateDsrStatus = useUpdateDSRStatus();
  const dsr = useMemo(() => dsrQuery.data ?? [], [dsrQuery.data]);
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return dsr.filter((d) => {
      if (status !== "all" && d.status !== status) return false;
      if (type !== "all" && d.type !== type) return false;
      if (needle) {
        const haystack = `${d.requester_email} ${d.note ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [dsr, status, type, search]);

  // E46.4: resolve requester_email → user_id so we can deep-link each
  // DSR row to the unified /admin/users/<id> dossier. The lookup runs
  // against the filtered set (cheaper + only what's on screen needs
  // a link). DSRs from non-users (e.g. parent of a minor) won't have
  // a matching profile — the icon stays disabled with a tooltip.
  const requesterEmails = useMemo(
    () => filtered.map((d) => d.requester_email).filter((e): e is string => Boolean(e)),
    [filtered],
  );
  const emailToUserId = useUsersByEmails(requesterEmails).data ?? {};

  const now = new Date();

  const onMutationError = (err: Error) => toast.error(err.message);
  const onResolve = (id: string) => {
    updateDsrStatus.mutate(
      { id, status: "completed" },
      { onSuccess: () => toast.success(t("toast_resolved")), onError: onMutationError },
    );
  };
  const onReject = (id: string) => {
    updateDsrStatus.mutate(
      { id, status: "rejected" },
      { onSuccess: () => toast(t("toast_rejected")), onError: onMutationError },
    );
  };

  const onExport = () => {
    // GDPR Art. 12(3) — controller must respond to DSRs "without undue
    // delay and in any event within one month". Auditors / DPOs need
    // historical visibility on response times to prove compliance.
    // Export the current filtered view (date / status / type / search).
    exportToCSV(
      filtered,
      [
        { key: "id", label: t("csv_id") },
        { key: "created_at", label: t("csv_created") },
        { key: "requester_email", label: t("csv_requester") },
        { key: "type", label: t("csv_type") },
        { key: "status", label: t("csv_status") },
        { key: "note", label: t("csv_note") },
      ],
      `dsr-requests-${new Date().toISOString().slice(0, 10)}`,
    );
    toast.success(t("toast_exported", { count: filtered.length }));
  };

  return (
    <div className="space-y-4" data-testid="dsr-queue-root">
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            aria-label={t("search_placeholder")}
            data-testid="dsr-queue-search"
            className="w-full sm:max-w-xs"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              className="w-full sm:w-[200px]"
              aria-label={t("filter_status_label")}
              data-testid="dsr-queue-filter-status"
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
          <Select value={type} onValueChange={setType}>
            <SelectTrigger
              className="w-full sm:w-[200px]"
              aria-label={t("filter_type_label")}
              data-testid="dsr-queue-filter-type"
            >
              <SelectValue placeholder={t("filter_type_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_type_all")}</SelectItem>
              {TYPES.map((tp) => (
                <SelectItem key={tp} value={tp}>
                  {t(`type.${tp}`)}
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
            data-testid="dsr-queue-export-csv"
            className="sm:ml-auto"
          >
            <FileDown className="mr-1.5 size-4" />
            {t("action_export_csv")}
          </Button>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-border/60" data-testid="dsr-queue-empty-state">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t("empty_state")}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table data-testid="dsr-queue-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table_header_requester")}</TableHead>
                  <TableHead className="w-[140px]">{t("table_header_type")}</TableHead>
                  <TableHead className="w-[140px]">{t("table_header_status")}</TableHead>
                  <TableHead className="w-[200px]">{t("table_header_sla")}</TableHead>
                  <TableHead className="w-[140px]">{t("table_header_created")}</TableHead>
                  <TableHead className="text-right">{t("table_header_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const variant = classifyDsrSla(new Date(d.created_at), now);
                  const days = daysRemaining(new Date(d.created_at), now);
                  const slaLabel =
                    variant === "overdue"
                      ? t("sla.overdue", { days: Math.abs(days) })
                      : t(`sla.${variant}`, { days });
                  return (
                    <TableRow key={d.id} data-testid={`dsr-queue-row-${d.id}`}>
                      <TableCell>
                        <p className="text-sm font-medium">{d.requester_email}</p>
                        {d.note && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">{d.note}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t(`type.${d.type}`)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t(`status.${d.status}`)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 ${SLA_CLASS[variant]}`}
                          data-testid={`dsr-queue-row-sla-badge-${d.id}`}
                          data-variant={variant}
                        >
                          <Clock className="h-3 w-3" />
                          {slaLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString("sk-SK")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {(() => {
                            const linkedUserId = emailToUserId[d.requester_email.toLowerCase()];
                            return linkedUserId ? (
                              <Button
                                asChild
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="px-2 text-muted-foreground hover:text-foreground"
                                data-testid={`dsr-queue-row-dossier-link-${d.id}`}
                                title={t("action_open_dossier")}
                              >
                                <Link
                                  to="/admin/users/$userId"
                                  params={{ userId: linkedUserId }}
                                  aria-label={t("action_open_dossier")}
                                >
                                  <FileText className="h-4 w-4" />
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="px-2 text-muted-foreground/40"
                                data-testid={`dsr-queue-row-dossier-link-${d.id}`}
                                disabled
                                title={t("action_open_dossier_disabled")}
                                aria-label={t("action_open_dossier_disabled")}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            );
                          })()}
                          {d.status !== "completed" && d.status !== "rejected" && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                data-testid={`dsr-queue-row-resolve-button-${d.id}`}
                                onClick={() => onResolve(d.id)}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                {t("action_resolve")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                data-testid={`dsr-queue-row-reject-button-${d.id}`}
                                onClick={() => onReject(d.id)}
                              >
                                <X className="mr-1 h-4 w-4" />
                                {t("action_reject")}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
