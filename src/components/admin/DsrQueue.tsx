import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { updateDSR } from "@/lib/platform/mock-store";
import { useAdminDSRQueue } from "@/lib/admin/queries";
import type { DSRRequest, DSRType } from "@/lib/platform/types";
import { classifyDsrSla, daysRemaining, type DsrSlaVariant } from "@/lib/admin/dsr-sla";
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
  const dsr = useMemo(() => dsrQuery.data ?? [], [dsrQuery.data]);
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");

  const filtered = useMemo(() => {
    return dsr.filter((d) => {
      if (status !== "all" && d.status !== status) return false;
      if (type !== "all" && d.type !== type) return false;
      return true;
    });
  }, [dsr, status, type]);

  const now = new Date();

  const onResolve = (id: string) => {
    updateDSR(id, "completed");
    toast.success(t("toast_resolved"));
  };
  const onReject = (id: string) => {
    updateDSR(id, "rejected");
    toast(t("toast_rejected"));
  };

  return (
    <div className="space-y-4" data-testid="dsr-queue-root">
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
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
                        {d.status !== "completed" && d.status !== "rejected" && (
                          <div className="inline-flex gap-1">
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
                          </div>
                        )}
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
