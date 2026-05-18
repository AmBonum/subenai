import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DsrSubmitForm } from "@/components/user/DsrSubmitForm";
// queries.ts ships `useSubmitDSR` (mutation) but no list hook for the user's
// own DSR history. Keep on mock-store; AH-11.2c is the right place to add a
// `useUserDSR()` read.
import { useDSR } from "@/lib/platform/mock-store";
import { tFor } from "@/i18n/governance";

export const Route = createFileRoute("/app/legal/dsr")({
  head: () => ({
    meta: [{ title: "GDPR žiadosť · SubenAI" }, { name: "robots", content: "noindex" }],
  }),
  component: DsrPage,
});

function DsrPage() {
  const t = tFor("dsr_form");
  const dsr = useDSR();
  const recent = dsr.slice(0, 5);

  return (
    <div className="space-y-6" data-testid="app-legal-dsr-root">
      <header className="flex items-start gap-3">
        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="app-legal-dsr-title">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </header>

      <DsrSubmitForm />

      <Card data-testid="app-legal-dsr-history-card">
        <CardHeader>
          <CardTitle>{t("history_title")}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {recent.length === 0 ? (
            <p
              className="py-3 text-sm text-muted-foreground"
              data-testid="app-legal-dsr-history-empty"
            >
              {t("history_empty")}
            </p>
          ) : (
            recent.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-3"
                data-testid={`app-legal-dsr-history-row-${d.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {d.requester_email} · {t(`type.${d.type}`)}
                  </p>
                  {d.note && <p className="text-xs text-muted-foreground">{d.note}</p>}
                  <p className="text-xs text-muted-foreground">
                    {t("sla_due", { date: new Date(d.sla_due_at).toLocaleDateString("sk-SK") })}
                  </p>
                </div>
                <Badge variant={d.status === "completed" ? "default" : "secondary"}>
                  {t(`status.${d.status}`)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
