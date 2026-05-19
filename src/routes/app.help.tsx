import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Search, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { tFor } from "@/i18n/app-shell";
import { getCurrentLocale } from "@/i18n/locale-context";
import skBundle from "@/i18n/locales/sk/app-shell.json";
import enBundle from "@/i18n/locales/en/app-shell.json";
import csBundle from "@/i18n/locales/cs/app-shell.json";

const tRoutes = tFor("route_titles");

export const Route = createFileRoute("/app/help")({
  head: () => ({
    meta: [{ title: tRoutes("help") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: HelpPage,
});

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_BY_LOCALE = {
  sk: skBundle.help.faq.items as ReadonlyArray<FaqItem>,
  en: enBundle.help.faq.items as ReadonlyArray<FaqItem>,
  cs: csBundle.help.faq.items as ReadonlyArray<FaqItem>,
} as const;

function HelpPage() {
  const t = tFor("help");
  const locale = getCurrentLocale();
  const faq = FAQ_BY_LOCALE[locale] ?? FAQ_BY_LOCALE.sk;
  const [query, setQuery] = useState("");
  const filtered = faq.filter(
    ({ question, answer }) =>
      !query ||
      question.toLowerCase().includes(query.toLowerCase()) ||
      answer.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-8" data-testid="app-help-root">
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("page_header_title")}
        accentWords={1}
        icon={BookOpen}
        subtitle={t("page_header_subtitle")}
        testId="app-help-page-header"
      />

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="app-help-search-input"
            />
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full" data-testid="app-help-faq-list">
        {filtered.map(({ question, answer }, i) => (
          <AccordionItem key={question} value={`i${i}`} data-testid={`app-help-faq-item-${i}`}>
            <AccordionTrigger data-testid={`app-help-faq-trigger-${i}`}>
              {question}
            </AccordionTrigger>
            <AccordionContent data-testid={`app-help-faq-content-${i}`}>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Card data-testid="app-help-contact-card">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">{t("contact_question")}</p>
            <p className="text-sm text-muted-foreground" data-testid="app-help-contact-subtitle">
              {t("contact_subtitle")}
            </p>
          </div>
          <Button asChild className="btn-primary" data-testid="app-help-contact-cta">
            <a href="mailto:support@subenai.sk">
              <Mail className="mr-2 h-4 w-4" /> {t("contact_button")}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
