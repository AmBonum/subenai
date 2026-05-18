import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Users, UserPlus, Crown, Pencil, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// `useTeamMembers` is a flat list across all teams; queries.ts only exposes a
// scoped `useTeam(id)` join. Keep the flat read on mock-store until the
// schema gets a list-membership hook.
import {
  useTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
} from "@/lib/platform/mock-store";
import { useTeams } from "@/lib/platform/queries";
import type { Role } from "@/lib/platform/types";
import { PageHeader } from "@/components/app/page-header";
import { tFor } from "@/i18n/app-shell";

export const Route = createFileRoute("/app/teams")({
  head: () => ({
    meta: [{ title: "Tímy · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: TeamsPage,
});

const ROLE_ICON = { owner: Crown, editor: Pencil, viewer: Eye } as const;

function TeamsPage() {
  const t = tFor("teams");
  const teamsQ = useTeams();
  const teams = teamsQ.data ?? [];
  const members = useTeamMembers();
  const [activeTeam, setActiveTeam] = useState(teams[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");

  const teamMembers = members.filter((m) => m.team_id === activeTeam);

  const invite = () => {
    if (!email.includes("@")) {
      toast.error(t("invalid_email"));
      return;
    }
    addTeamMember(activeTeam, email, role);
    toast.success(t("invite_sent", { email }));
    setEmail("");
  };

  const roleLabel = (r: Role) => t(`role.${r}`);

  return (
    <div className="space-y-6" data-testid="app-teams-root">
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("page_header_title")}
        accentWords={1}
        icon={Users}
        subtitle={t("page_header_subtitle")}
        testId="app-teams-page-header"
      />

      <div className="grid gap-4 md:grid-cols-3" data-testid="app-teams-list">
        {teams.map((team) => (
          <Card
            key={team.id}
            data-testid={`app-teams-row-${team.id}`}
            onClick={() => setActiveTeam(team.id)}
            className={`cursor-pointer ${
              activeTeam === team.id ? "border-primary" : "border-border/60"
            }`}
          >
            <CardContent className="p-4">
              <p className="font-medium">{team.name}</p>
              <p className="text-xs text-muted-foreground">
                {t("team_member_count", {
                  count: members.filter((m) => m.team_id === team.id).length,
                })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="app-teams-invite-card">
        <CardHeader>
          <CardTitle>{t("invite_card_title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder={t("invite_email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="app-teams-invite-email-input"
          />
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="w-32" data-testid="app-teams-invite-role-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["owner", "editor", "viewer"] as Role[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {roleLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={invite} data-testid="app-teams-invite-button">
            <UserPlus className="mr-2 h-4 w-4" /> {t("invite_button")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("members_card_title")}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y" data-testid="app-teams-members-list">
          {teamMembers.map((m) => {
            const Icon = ROLE_ICON[m.role];
            return (
              <div
                key={m.id}
                className="flex items-center justify-between py-3"
                data-testid={`app-teams-member-row-${m.id}`}
              >
                <div>
                  <p className="text-sm font-medium">{m.display_name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <Icon className="mr-1 h-3 w-3" /> {roleLabel(m.role)}
                  </Badge>
                  <Select
                    value={m.role}
                    onValueChange={(v) => updateTeamMemberRole(m.id, v as Role)}
                  >
                    <SelectTrigger
                      className="h-8 w-28"
                      data-testid={`app-teams-member-role-select-${m.id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["owner", "editor", "viewer"] as Role[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      removeTeamMember(m.id);
                      toast.success(t("removed"));
                    }}
                    data-testid={`app-teams-member-remove-${m.id}`}
                    aria-label={t("removed")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {teamMembers.length === 0 && (
            <p
              className="py-4 text-center text-sm text-muted-foreground"
              data-testid="app-teams-empty-state"
            >
              {t("empty")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
