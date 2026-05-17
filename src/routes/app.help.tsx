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

export const Route = createFileRoute("/app/help")({
  head: () => ({
    meta: [{ title: "Help centrum · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: HelpPage,
});

const FAQ: ReadonlyArray<readonly [string, string]> = [
  ["Ako vytvorím nový test?", "Klikni na 'Nový test' v ľavom menu a prejdi 3-krokovým wizardom."],
  [
    "Ako zdieľam test s respondentmi?",
    "V editore testu otvor záložku 'Detaily' → tlačidlo Zdieľať vygeneruje link /t/{shareId}.",
  ],
  [
    "Môžem si test chrániť heslom?",
    "Áno, v 'Detaily' nastav heslo. Respondent ho zadá pred začiatkom.",
  ],
  [
    "Aké typy otázok podporujete?",
    "15 typov: jednovýber, viacvýber, NPS, škála, matrix, ranking, slider, text, dátum, čas, image, yes/no, file.",
  ],
  ["Aký je limit otázok v sade?", "Maximálne 50 otázok na jeden test."],
  [
    "Sú dáta respondentov anonymizované?",
    "Ak zapneš 'Anonymizovať po 90 dňoch', PII sa automaticky odstránia.",
  ],
  ["Ako exportujem výsledky?", "V detaile testu → 'Exporty' → vyber CSV, JSON alebo PDF."],
  [
    "Čo robí podmienené vetvenie?",
    "Umožňuje preskočiť otázky podľa predošlých odpovedí (v Pokročilých funkciách).",
  ],
  [
    "Aké roly môžem priradiť v tíme?",
    "Owner (plný prístup), Editor (úpravy obsahu), Viewer (iba čítanie).",
  ],
  [
    "Ako verzionujem test?",
    "Pri každom publishe sa vytvorí nová verzia — vidíš ich v záložke 'Verzie' editora.",
  ],
  [
    "Čo je GDPR DSR?",
    "Data Subject Request — formulár na prístup/výmaz/portabilitu osobných údajov, SLA 30 dní.",
  ],
  ["Ako funguje rate-limit pre heslá?", "Po 5 nesprávnych pokusoch je IP zablokovaná na 15 minút."],
  ["Aký typ hashu používate?", "Argon2id pre heslá testov, bcrypt pre user heslá."],
  [
    "Mám viacero respondentov — môžem im poslať pozvánky?",
    "Áno, v Share dialogu zadaj viacero emailov oddelených čiarkou.",
  ],
  ["Kde nájdem audit log?", "Per-test v editore záložka 'Audit'; globálny v Admin panele."],
  ["Ako nastavím notifikácie?", "V editore testu záložka 'Notifikácie' — 5 typov udalostí."],
  [
    "Ako exportujem dáta jedného respondenta?",
    "V detaile sedenia klikni 'Export JSON' (zapíše sa do audit logu).",
  ],
  ["Môžem vytvoriť test zo šablóny?", "Áno, vo wizarde vyber 'Šablóna' v kroku 1."],
  [
    "Aký je rozdiel medzi privátnym a verejným testom?",
    "Privátny: iba ty. Unlisted: cez link. Verejné: index v zozname.",
  ],
  ["Akú podporu poskytujete?", "Email support@subenai.sk, odpovedáme do 24 h v pracovných dňoch."],
] as const;

function HelpPage() {
  const t = tFor("help");
  const [query, setQuery] = useState("");
  const filtered = FAQ.filter(
    ([k, v]) =>
      !query ||
      k.toLowerCase().includes(query.toLowerCase()) ||
      v.toLowerCase().includes(query.toLowerCase()),
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
        {filtered.map(([k, v], i) => (
          <AccordionItem key={k} value={`i${i}`} data-testid={`app-help-faq-item-${i}`}>
            <AccordionTrigger>{k}</AccordionTrigger>
            <AccordionContent>{v}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Card data-testid="app-help-contact-card">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">{t("contact_question")}</p>
            <p className="text-sm text-muted-foreground">{t("contact_subtitle")}</p>
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
