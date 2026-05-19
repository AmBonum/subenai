import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Cookie, FileText, History, Mail, Search, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app/page-header";
import { ROUTES } from "@/config/routes";
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

interface QuickLink {
  testId: string;
  to: keyof typeof ROUTES;
  icon: LucideIcon;
  labelKey: string;
}

// E21.7 — quick-links bridge from the in-app help to the public legal +
// changelog surfaces. Previously /app/help was an island; this resolves
// the audit finding that a 2026 user expects "Privacy", "Cookies",
// "Recent changes" deep-links from a help center.
const QUICK_LINKS: QuickLink[] = [
  { testId: "privacy", to: "privacy", icon: ShieldCheck, labelKey: "quick_links.privacy" },
  { testId: "cookies", to: "cookies", icon: Cookie, labelKey: "quick_links.cookies" },
  { testId: "changelog", to: "zmeny", icon: History, labelKey: "quick_links.changelog" },
  { testId: "schools", to: "skoly", icon: FileText, labelKey: "quick_links.schools" },
];

// Empty-state illustration — inline SVG, no external asset. Matches the
// pattern from EduWorkflowSteps (geometric, currentColor, aria-hidden).
function EmptyStateIllustration() {
  return (
    <svg
      width="160"
      height="100"
      viewBox="0 0 160 100"
      aria-hidden="true"
      focusable="false"
      className="mx-auto opacity-60"
    >
      <circle
        cx="80"
        cy="50"
        r="32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground"
      />
      <path
        d="M105 75l15 15"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-muted-foreground"
      />
      <path
        d="M68 38l24 24M92 38L68 62"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-muted-foreground/60"
      />
    </svg>
  );
}

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

      {/* Quick links — bridge from the help center to deep docs.
          Replaces the previous island state where the only outbound
          link was a mailto. */}
      <section aria-labelledby="app-help-quick-links-heading" data-testid="app-help-quick-links">
        <h2
          id="app-help-quick-links-heading"
          className="text-sm font-bold uppercase tracking-widest text-muted-foreground"
        >
          {t("quick_links.heading")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.testId}
                to={ROUTES[link.to]}
                className="group inline-flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/60"
                data-testid={`app-help-quick-link-${link.testId}`}
              >
                <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex-1 text-sm font-semibold text-foreground">
                  {t(link.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <Card>
        <CardContent className="p-3">
          <Label htmlFor="app-help-search" className="sr-only">
            {t("search_placeholder")}
          </Label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="app-help-search"
              className="pl-9"
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="app-help-search-input"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && query.length > 0 ? (
        <Card data-testid="app-help-empty-state">
          <CardContent className="space-y-3 p-8 text-center">
            <EmptyStateIllustration />
            <p className="text-base font-semibold" data-testid="app-help-empty-title">
              {t("empty.title", { query })}
            </p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">{t("empty.body")}</p>
            <Button asChild variant="outline" data-testid="app-help-empty-cta">
              <a href="mailto:support@subenai.sk">
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" /> {t("contact_button")}
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full" data-testid="app-help-faq-list">
          {filtered.map(({ question, answer }, i) => (
            <AccordionItem key={question} value={`i${i}`} data-testid={`app-help-faq-item-${i}`}>
              <AccordionTrigger data-testid={`app-help-faq-trigger-${i}`}>
                {question}
              </AccordionTrigger>
              <AccordionContent data-testid={`app-help-faq-content-${i}`}>
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

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
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" /> {t("contact_button")}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
