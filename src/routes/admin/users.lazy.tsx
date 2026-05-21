import { createLazyFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useAdminUsers } from "@/lib/admin/queries";
import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { tFor } from "@/i18n/admin";

export const Route = createLazyFileRoute("/admin/users")({
  component: AdminUsersPage,
});

const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function AdminUsersPage() {
  const t = tFor("users");
  const usersQuery = useAdminUsers();
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("all");

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (role !== "all" && u.role !== role) return false;
        if (
          query &&
          !u.display_name.toLowerCase().includes(query.toLowerCase()) &&
          !u.email.toLowerCase().includes(query.toLowerCase())
        )
          return false;
        return true;
      }),
    [users, query, role],
  );

  return (
    <div className="space-y-6" data-testid="admin-users-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-users-page-header"
      />

      <AdminPageExplainer pageKey="users" />

      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            placeholder={t("search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
            data-testid="admin-users-search-input"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger
              className="w-full sm:w-[200px]"
              aria-label={t("role_filter_label")}
              data-testid="admin-users-role-filter"
            >
              <SelectValue placeholder={t("role_filter_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("role_filter_all")}</SelectItem>
              <SelectItem value="admin">{t("role_admin")}</SelectItem>
              <SelectItem value="user">{t("role_user")}</SelectItem>
              <SelectItem value="pending">{t("role_pending")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {usersQuery.isLoading ? (
        <AdminListLoading testId="admin-users-loading" />
      ) : usersQuery.error ? (
        <AdminListError error={usersQuery.error as Error} testId="admin-users-error" />
      ) : filtered.length === 0 ? (
        <Card className="border-border/60" data-testid="admin-users-empty-state">
          <CardContent className="space-y-1 p-6 text-center">
            <p className="text-sm font-medium text-foreground">{t("empty_state_title")}</p>
            <p className="text-sm text-muted-foreground">{t("empty_state_description")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table data-testid="admin-users-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table_header_user")}</TableHead>
                  <TableHead className="w-[140px]">{t("table_header_role")}</TableHead>
                  <TableHead className="w-[120px]">{t("table_header_status")}</TableHead>
                  <TableHead className="w-[100px]">{t("table_header_questions")}</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} data-testid={`admin-users-row-${u.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {initials(u.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.display_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span data-testid={`admin-users-role-badge-${u.id}`}>
                        <StatusBadge status={u.role} />
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.questions_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("edit_role")}
                        data-testid={`admin-users-edit-role-${u.id}`}
                        onClick={() => toast.info(t("edit_role"))}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
