import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAudit } from "@/lib/platform/mock-store";
import { tFor } from "@/i18n/governance";

const PAGE_SIZE = 25;

export function AuditLogViewer() {
  const t = tFor("audit_log");
  const audit = useAudit();

  const actions = useMemo(() => {
    const set = new Set<string>();
    audit.forEach((a) => set.add(a.action));
    return Array.from(set).sort();
  }, [audit]);

  const [actor, setActor] = useState("");
  const [action, setAction] = useState<string>("all");
  const [pii, setPii] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    // Inclusive end of day: snap dateTo to 23:59:59.999 local.
    const toTs = dateTo ? new Date(dateTo).getTime() + 86_399_999 : null;
    return audit.filter((a) => {
      if (actor && !a.actor_name.toLowerCase().includes(actor.toLowerCase())) return false;
      if (action !== "all" && a.action !== action) return false;
      if (pii === "only" && !a.pii_access) return false;
      const ts = new Date(a.at).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [audit, actor, action, pii, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-4" data-testid="audit-log-root">
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <Input
            placeholder={t("filter_actor_placeholder")}
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              setPage(0);
            }}
            className="max-w-sm"
            data-testid="audit-log-filter-actor"
          />
          <Select
            value={action}
            onValueChange={(v) => {
              setAction(v);
              setPage(0);
            }}
          >
            <SelectTrigger
              className="w-full lg:w-[220px]"
              aria-label={t("filter_action_label")}
              data-testid="audit-log-filter-action"
            >
              <SelectValue placeholder={t("filter_action_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_action_all")}</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={pii}
            onValueChange={(v) => {
              setPii(v);
              setPage(0);
            }}
          >
            <SelectTrigger
              className="w-full lg:w-[180px]"
              aria-label={t("filter_pii_label")}
              data-testid="audit-log-filter-pii"
            >
              <SelectValue placeholder={t("filter_pii_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_pii_all")}</SelectItem>
              <SelectItem value="only">{t("filter_pii_only")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            aria-label={t("filter_date_from_label")}
            data-testid="audit-log-filter-date-from"
            className="w-full lg:w-[160px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            aria-label={t("filter_date_to_label")}
            data-testid="audit-log-filter-date-to"
            className="w-full lg:w-[160px]"
          />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-border/60" data-testid="audit-log-empty-state">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t("empty_state")}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/60">
            <CardContent className="p-0">
              <Table data-testid="audit-log-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">{t("table_header_at")}</TableHead>
                    <TableHead className="w-[160px]">{t("table_header_actor")}</TableHead>
                    <TableHead>{t("table_header_action")}</TableHead>
                    <TableHead className="w-[160px]">{t("table_header_target")}</TableHead>
                    <TableHead className="w-[80px]">{t("table_header_pii")}</TableHead>
                    <TableHead>{t("table_header_details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slice.map((a) => (
                    <TableRow key={a.id} data-testid={`audit-log-row-${a.id}`}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(a.at).toLocaleString("sk-SK")}
                      </TableCell>
                      <TableCell className="text-sm">{a.actor_name}</TableCell>
                      <TableCell>
                        <code className="text-xs">{a.action}</code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.target_type} · {a.target_id}
                      </TableCell>
                      <TableCell>
                        {a.pii_access ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/40 text-amber-600"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            {t("pii_flag_yes")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("pii_flag_no")}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{a.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {safePage + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                data-testid="audit-log-pagination-prev"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                {t("pagination_prev")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                data-testid="audit-log-pagination-next"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                {t("pagination_next")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
