import { createLazyFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/page-header";
import { AppPageExplainer } from "@/components/user/AppPageExplainer";
import { DigestSection } from "@/components/user/insights/DigestSection";
import { RecommendationsSection } from "@/components/user/insights/RecommendationsSection";
import { RetestSection } from "@/components/user/insights/RetestSection";
import { PeerSection } from "@/components/user/insights/PeerSection";
import { INSIGHTS_TABS, type InsightsTab } from "./app.insights";
import { tFor } from "@/i18n/app-shell";

export const Route = createLazyFileRoute("/app/insights")({
  component: InsightsPage,
});

function InsightsPage() {
  const t = tFor("insights");
  const nav = useNavigate({ from: "/app/insights" });
  const search = useSearch({ from: "/app/insights" });
  const activeTab: InsightsTab = search.tab ?? "digest";

  const setTab = (next: string) => {
    void nav({ search: { tab: next as InsightsTab }, replace: true });
  };

  return (
    <div className="space-y-6" data-testid="app-insights-root">
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("heading")}
        accentWords={1}
        icon={Sparkles}
        subtitle={t("subheading")}
        testId="app-insights-page-header"
      />

      <AppPageExplainer pageKey="insights" />

      <Tabs value={activeTab} onValueChange={setTab} data-testid="app-insights-tabs">
        <TabsList className="h-auto flex-wrap" data-testid="app-insights-tabs-list">
          {INSIGHTS_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} data-testid={`app-insights-tab-${tab}`}>
              {t(`tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="digest" className="mt-4" data-testid="app-insights-panel-digest">
          <DigestSection />
        </TabsContent>
        <TabsContent
          value="recommendations"
          className="mt-4"
          data-testid="app-insights-panel-recommendations"
        >
          <RecommendationsSection />
        </TabsContent>
        <TabsContent value="retest" className="mt-4" data-testid="app-insights-panel-retest">
          <RetestSection />
        </TabsContent>
        <TabsContent value="peer" className="mt-4" data-testid="app-insights-panel-peer">
          <PeerSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
