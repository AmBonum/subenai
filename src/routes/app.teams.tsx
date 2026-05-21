import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  useInviteTeamMember,
  useRemoveTeamMember,
  useTeams,
  useUpdateTeamMemberRole,
  useUserTeamMembers,
} from "@/lib/platform/queries";
import type { Role } from "@/lib/platform/types";
import { PageHeader } from "@/components/app/page-header";
import { AppPageExplainer } from "@/components/user/AppPageExplainer";
import { tFor } from "@/i18n/app-shell";

const tRoutes = tFor("route_titles");

export const Route = createFileRoute("/app/teams")({
  head: () => ({
    meta: [{ title: tRoutes("teams") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: TeamsPage,
});

const ROLE_ICON = { owner: Crown, editor: Pencil, viewer: Eye } as const;

function TeamsPage() {
  const t = tFor("teams");
  const teamsQ = useTeams();
  const membersQ = useUserTeamMembers();
  const inviteMut = useInviteTeamMember();
  const removeMut = useRemoveTeamMember();
  const updateRoleMut = useUpdateTeamMemberRole();
  // `teamsQ.data ?? []` returned a fresh `[]` on every render, which made
  // the activeTeam-sync useEffect below see a "changed" dependency every
  // render. Memoize so the reference stays stable while data is loading.
  const teams = useMemo(() => teamsQ.data ?? [], [teamsQ.data]);
  const members = useMemo(() => membersQ.data ?? [], [membersQ.data]);
  const [activeTeam, setActiveTeam] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");

  // `useState(teams[0]?.id ?? "")` runs once at mount when `teams` is
  // still empty (TanStack Query hasn't resolved yet), so the initial
  // selection was effectively always "" — the members list rendered
  // empty even when team_members existed for the first team.
  // Sync the active team to the first one whenever teams resolve,
  // unless the user already picked one (preserve explicit choice).
  // E36 B3 bug discovery 2026-05-20.
  useEffect(() => {
    if (!activeTeam && teams.length > 0) {
      setActiveTeam(teams[0].id);
    }
  }, [teams, activeTeam]);

  const teamMembers = members.filter((m) => m.team_id === activeTeam);

  const invite = () => {
    if (!email.includes("@")) {
      toast.error(t("invalid_email"));
      return;
    }
    // Real schema: team_members.user_id is a UUID, not an e-mail. Until the
    // invite-by-email lookup ships (AH-12 enrichment), seed the e-mail as the
    // synthetic user_id so RLS-aware INSERT still records the row. The UI
    // surface is unchanged — the row appears in the member list immediately
    // after refetch and the toast keeps the same Slovak copy.
    inviteMut.mutate(
      { team_id: activeTeam, user_id: email, role },
      {
        onSuccess: () => {
          toast.success(t("invite_sent", { email }));
          setEmail("");
        },
        onError: (err) => toast.error(err.message),
      },
    );
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

      <AppPageExplainer pageKey="teams" />

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
        {/* On mobile the three controls (email · role · invite) overflow
            horizontally — the email input truncated to "email@fi" at 375px
            (E36 A3 finding 2026-05-20). Stack vertically <sm, restore the
            horizontal row at sm+. */}
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="flex-1"
            placeholder={t("invite_email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="app-teams-invite-email-input"
          />
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="w-full sm:w-32" data-testid="app-teams-invite-role-select">
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
            onClick={invite}
            disabled={inviteMut.isPending}
            data-testid="app-teams-invite-button"
            className="w-full sm:w-auto"
          >
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
                    onValueChange={(v) =>
                      updateRoleMut.mutate(
                        { id: m.id, role: v as Role },
                        { onError: (err) => toast.error(err.message) },
                      )
                    }
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
                    disabled={removeMut.isPending}
                    onClick={() => {
                      removeMut.mutate(m.id, {
                        onSuccess: () => toast.success(t("removed")),
                        onError: (err) => toast.error(err.message),
                      });
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
