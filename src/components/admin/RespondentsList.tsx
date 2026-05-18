import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";

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
import {
  useAdminRespondents,
  useAdminSessions,
  useAdminTests,
  useLogAuditEvent,
} from "@/lib/admin/queries";
import { buildRespondentsAccessAudit } from "@/lib/admin/respondents.functions";
import { tFor } from "@/i18n/governance";

export function RespondentsList() {
  const t = tFor("respondents_list");
  const respondentsQuery = useAdminRespondents();
  const respondents = useMemo(() => respondentsQuery.data ?? [], [respondentsQuery.data]);
  const sessionsQuery = useAdminSessions();
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const testsQuery = useAdminTests();
  const tests = useMemo(() => testsQuery.data ?? [], [testsQuery.data]);
  const logAudit = useLogAuditEvent();
  const [query, setQuery] = useState("");
  const [filterTest, setFilterTest] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Audit every "load" — initial mount + any filter change that re-queries.
  useEffect(() => {
    logAudit.mutate(
      buildRespondentsAccessAudit({
        filterTestId: filterTest === "all" ? undefined : filterTest,
        filterStatus: filterStatus === "all" ? undefined : filterStatus,
        query: query || undefined,
      }),
    );
    // logAudit.mutate identity is stable across renders via TanStack Query
    // — including it in deps would invalidate the dep array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTest, filterStatus, query]);

  const filtered = useMemo(() => {
    const respondentsByTest = new Set<string>(
      filterTest === "all"
        ? []
        : sessions.filter((s) => s.test_id === filterTest).map((s) => s.respondent_id),
    );
    return respondents.filter((r) => {
      if (filterStatus === "active" && r.anonymized_at) return false;
      if (filterStatus === "anonymized" && !r.anonymized_at) return false;
      if (filterTest !== "all" && !respondentsByTest.has(r.id)) return false;
      if (query) {
        const q = query.toLowerCase();
        const inEmail = (r.email ?? "").toLowerCase().includes(q);
        const inName = (r.display_name ?? "").toLowerCase().includes(q);
        if (!inEmail && !inName) return false;
      }
      return true;
    });
  }, [respondents, sessions, filterTest, filterStatus, query]);

  return (
    <div className="space-y-4" data-testid="respondents-list-root">
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            placeholder={t("search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
            data-testid="respondents-list-search-input"
          />
          <Select value={filterTest} onValueChange={setFilterTest}>
            <SelectTrigger
              className="w-full sm:w-[220px]"
              aria-label={t("filter_test_label")}
              data-testid="respondents-list-filter-test"
            >
              <SelectValue placeholder={t("filter_test_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_test_all")}</SelectItem>
              {tests.map((ts) => (
                <SelectItem key={ts.id} value={ts.id}>
                  {ts.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger
              className="w-full sm:w-[180px]"
              aria-label={t("filter_status_label")}
              data-testid="respondents-list-filter-status"
            >
              <SelectValue placeholder={t("filter_status_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_status_all")}</SelectItem>
              <SelectItem value="active">{t("status.active")}</SelectItem>
              <SelectItem value="anonymized">{t("status.anonymized")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-border/60" data-testid="respondents-list-empty-state">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t("empty_state")}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table data-testid="respondents-list-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table_header_respondent")}</TableHead>
                  <TableHead>{t("table_header_email")}</TableHead>
                  <TableHead className="w-[100px]">{t("table_header_sessions")}</TableHead>
                  <TableHead className="w-[140px]">{t("table_header_created")}</TableHead>
                  <TableHead className="w-[100px] text-right">
                    {t("table_header_actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const count = sessions.filter((s) => s.respondent_id === r.id).length;
                  return (
                    <TableRow key={r.id} data-testid={`respondents-list-row-${r.id}`}>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {r.display_name ?? t("anonymous_label")}{" "}
                          {r.anonymized_at && (
                            <Badge variant="outline" className="ml-1 text-[10px]">
                              {t("status.anonymized")}
                            </Badge>
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("sk-SK")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={t("action_view")}
                          data-testid={`respondents-list-row-view-button-${r.id}`}
                          onClick={() => {
                            logAudit.mutate({
                              action: "respondent.pii_access",
                              target_type: "respondent",
                              target_id: r.id,
                              pii_access: true,
                              details: { note: "Admin otvoril detail respondenta" },
                            });
                            toast.success(t("toast_pii_access"));
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t("action_view")}
                        </Button>
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
