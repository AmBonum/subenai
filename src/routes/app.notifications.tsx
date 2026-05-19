import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useCurrentProfile,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/platform/queries";
import { PageHeader } from "@/components/app/page-header";
import { tFor } from "@/i18n/app-shell";

const tRoutes = tFor("route_titles");

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [{ title: tRoutes("notifications") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: NotificationsPage,
});

const TYPE_TONE = {
  new_respondent: "bg-emerald-500/10 text-emerald-600",
  milestone: "bg-blue-500/10 text-blue-600",
  anomaly: "bg-amber-500/10 text-amber-600",
  expiry: "bg-rose-500/10 text-rose-600",
  daily_summary: "bg-muted text-foreground",
} as const;

function NotificationsPage() {
  const t = tFor("notifications");
  const notifsQ = useNotifications();
  const profileQ = useCurrentProfile();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const notifs = notifsQ.data ?? [];
  const [onlyUnread, setOnlyUnread] = useState(false);
  const visible = onlyUnread ? notifs.filter((n) => !n.read_at) : notifs;
  const unread = notifs.filter((n) => !n.read_at).length;

  const onMarkOne = (id: string) =>
    markOne.mutate(id, {
      onError: (err) => toast.error(err.message),
    });

  const onMarkAll = () => {
    const uid = profileQ.data?.id;
    if (!uid) {
      toast.error(t("mark_all"));
      return;
    }
    markAll.mutate(uid, {
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6" data-testid="app-notifications-root">
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("page_header_title")}
        accentWords={1}
        icon={Bell}
        subtitle={t("page_header_unread", { count: unread })}
        testId="app-notifications-page-header"
        actions={
          <>
            <Button
              variant={onlyUnread ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyUnread((v) => !v)}
              data-testid="app-notifications-filter-unread"
              aria-pressed={onlyUnread}
            >
              {t("filter_unread")}
            </Button>
            {unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkAll}
                disabled={markAll.isPending}
                data-testid="app-notifications-mark-all"
              >
                <CheckCheck className="mr-2 h-4 w-4" /> {t("mark_all")}
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-2" data-testid="app-notifications-list">
        {visible.map((n) => (
          <Card
            key={n.id}
            className={`border-border/60 ${!n.read_at ? "bg-primary/5" : ""}`}
            data-testid={`app-notifications-row-${n.id}`}
          >
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    className={TYPE_TONE[n.event_type]}
                    data-testid={`app-notifications-badge-${n.id}`}
                  >
                    {n.event_type}
                  </Badge>
                  <span
                    className="text-sm font-medium"
                    data-testid={`app-notifications-title-${n.id}`}
                  >
                    {n.title}
                  </span>
                  {!n.read_at && (
                    <span
                      className="h-2 w-2 rounded-full bg-primary"
                      data-testid={`app-notifications-unread-dot-${n.id}`}
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("sk-SK")}
                </p>
              </div>
              {!n.read_at && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkOne(n.id)}
                  disabled={markOne.isPending}
                  data-testid={`app-notifications-mark-read-${n.id}`}
                >
                  {t("mark_one")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {visible.length === 0 && (
          <p
            className="py-8 text-center text-sm text-muted-foreground"
            data-testid="app-notifications-empty-state"
          >
            {t("empty")}
          </p>
        )}
      </div>
    </div>
  );
}
