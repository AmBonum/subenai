import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tFor } from "@/i18n/tests";

export type TemplatesTab = "public" | "mine";

interface TemplatesTabsProps {
  value: TemplatesTab;
  onChange: (value: TemplatesTab) => void;
  publicCount: number;
  mineCount: number;
}

export function TemplatesTabs({ value, onChange, publicCount, mineCount }: TemplatesTabsProps) {
  const t = tFor("templates");
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TemplatesTab)} className="w-full">
      <TabsList
        data-testid="templates-tabs-list"
        className="grid w-full max-w-sm grid-cols-2 max-sm:h-11"
      >
        <TabsTrigger value="public" data-testid="templates-tab-public" className="max-sm:h-9">
          {t("tab_public")}
          <span
            data-testid="templates-tab-public-count"
            className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-semibold tabular-nums"
          >
            {publicCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="mine" data-testid="templates-tab-mine" className="max-sm:h-9">
          {t("tab_mine")}
          <span
            data-testid="templates-tab-mine-count"
            className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-semibold tabular-nums"
          >
            {mineCount}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
