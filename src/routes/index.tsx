import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ROUTES } from "@/config/routes";
import { SITE_ORIGIN } from "@/config/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "subenai — Bezplatný phishing test a kurzy digitálnej bezpečnosti" },
      {
        name: "description",
        content:
          "Phishing, podvodné SMS, falošné e-shopy — 10 otázok, 90 sekúnd. Bezplatný test digitálnej bezpečnosti bez registrácie.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "language", content: "sk-SK" },
      {
        property: "og:title",
        content: "subenai — Bezplatný phishing test a kurzy digitálnej bezpečnosti",
      },
      {
        property: "og:description",
        content:
          "Phishing, podvodné SMS, falošné e-shopy — 10 otázok, 90 sekúnd. Bezplatný test digitálnej bezpečnosti bez registrácie.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_ORIGIN },
      { property: "og:locale", content: "sk_SK" },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: "subenai — Bezplatný phishing test a kurzy digitálnej bezpečnosti",
      },
      {
        name: "twitter:description",
        content:
          "Phishing, podvodné SMS, falošné e-shopy — 10 otázok, 90 sekúnd. Bezplatný test digitálnej bezpečnosti bez registrácie.",
      },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN }],
  }),
  component: Index,
});

const FAQ_SECTIONS: {
  title: string;
  items: { id: string; question: string; answer: ReactNode }[];
}[] = [
  {
    title: "Rýchly test",
    items: [
      {
        id: "vazne",
        question: "Je to seriózne použiteľné?",
        answer:
          "Otázky sú stavané podľa reálnych scam vzorcov, ktoré sa na Slovensku objavili v posledných mesiacoch. Nie je to bezpečnostný audit, ale pošli to rodičom alebo kolegom — uvidíš, kde majú slabinu.",
      },
      {
        id: "podvadzanie",
        question: "Dá sa to podvádzať?",
        answer:
          "Skús. Časový limit beží, otázky sa miešajú, googliť asi nestihneš. Uvidíme, kto z nás je chytrejší.",
      },
      {
        id: "vysledok",
        question: "Čo dostanem po skončení testu?",
        answer:
          "Skóre, kategóriu (Skúsený / Pozorný / Zraniteľný / Ľahká korisť) a prehľad každej otázky s vysvetlením. Výsledok si môžeš uložiť ako obrázok alebo zdieľať — nikomu neukáže tvoje konkrétne odpovede.",
      },
    ],
  },
  {
    title: "Testy",
    items: [
      {
        id: "testy",
        question: "Čo sú testy pre firmy?",
        answer: (
          <>
            Predpripravené sady otázok prispôsobené konkrétnej branži. E-shop dostane otázky o
            falošných objednávkach, gastro o fake kontrolách, IT o BEC podvodoch. Stačí zdieľať link
            s tímom — výsledok dostane každý sám pre seba.{" "}
            <Link
              to={ROUTES.testy}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              Pozrieť testy
            </Link>
            .
          </>
        ),
      },
      {
        id: "demograficke",
        question: "Existujú testy pre bežných ľudí, nie len firmy?",
        answer: (
          <>
            Áno — máme sady pre žiakov do 16 rokov (herné a školské scam-y), študentov (fake
            prenájmy, falošné štipendiá), seniorov (AI klonovanie hlasu, dverové podvody) a
            všeobecný test pre každého. Nájdeš ich vsekcii{" "}
            <Link
              to={ROUTES.testy}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              Testy
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    title: "Školenia",
    items: [
      {
        id: "skolenia-co",
        question: "Čo sú bezplatné školenia?",
        answer: (
          <>
            Krátke texty so slovenskými scenármi pre každý typ podvodu — phishing, smishing,
            vishing, BEC, marketplace, investičné a romance scam-y, hygiena hesiel. Môžeš ich čítať
            v ľubovoľnom poradí v{" "}
            <Link
              to={ROUTES.skolenia}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              bezplatných školeniach
            </Link>
            , nie sú za paywall.
          </>
        ),
      },
      {
        id: "skolenia-odbornik",
        question: "Musím byť IT odborník?",
        answer:
          "Nie. Školenia sú písané pre administrátorku, recepčnú, dôchodcu aj gymnazistu rovnako. Žiadny žargón bez výkladu.",
      },
    ],
  },
  {
    title: "Podpora projektu",
    items: [
      {
        id: "zadarmo",
        question: "Je to zadarmo?",
        answer: (
          <>
            Áno.{" "}
            <Link
              to={ROUTES.test}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              Test
            </Link>
            ,{" "}
            <Link
              to={ROUTES.testy}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              testy
            </Link>
            ,{" "}
            <Link
              to={ROUTES.skolenia}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              školenia
            </Link>
            , výsledok aj zdieľanie sú bezplatné. Žiadne reklamy, žiadna registrácia, žiadne
            paywally. Projekt funguje z dobrovoľných príspevkov.
          </>
        ),
      },
      {
        id: "podpora-preco",
        question: "Prečo je to zadarmo a ako to udržiavate?",
        answer: (
          <>
            Projekt vznikol z presvedčenia, že digitálna bezpečnosť nesmie byť len pre tých, čo si
            môžu dovoliť školenia za stovky eur. Chod pokrývajú dobrovoľné príspevky od sponzorov.
            Ak chceš pomôcť, prejdi na stránku{" "}
            <Link
              to={ROUTES.podpora}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              Podpora projektu
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    title: "Bezpečnosť a súkromie",
    items: [
      {
        id: "data",
        question: "Aké údaje o mne ukladáte?",
        answer: (
          <>
            Iba tvoje odpovede a skóre — anonymne, bez mena, bez e-mailu, bez IP adresy. Detaily
            nájdeš v{" "}
            <Link
              to={ROUTES.privacy}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              Zásadách ochrany súkromia
            </Link>
            .
          </>
        ),
      },
      {
        id: "cookies",
        question: "Používate cookies?",
        answer: (
          <>
            Používame len technicky nevyhnutné cookies (relácia, súhlas). Analytické alebo reklamné
            cookies nespúšťame bez tvojho výslovného súhlasu. Nastavenia kedykoľvek zmeníš alebo
            odvoláš cez banner „Spravovať cookies" v päte stránky alebo v{" "}
            <Link
              to={ROUTES.cookies}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              Zásadách cookies
            </Link>
            .
          </>
        ),
      },
      {
        id: "zmazanie",
        question: "Môžem si zmazať svoje dáta?",
        answer:
          "Áno. Anonymný výsledok je zviazaný len s ID relácii v tvojom prehliadači — nie s tvojou identitou. Stačí vymazať cookies a lokálne úložisko prehliadača (Nastavenia → Súkromie → Vymazať dáta prehliadania). Ak si použil zdieľateľný link, napíš nám cez stránku Kontakt v päte a konkrétny záznam odstránime.",
      },
    ],
  },
];

function Index() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count: c } = await supabase
        .from("attempts")
        .select("id", { count: "exact", head: true });
      if (!cancelled && typeof c === "number") setCount(c);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Display: real count + a small offset so first visitors don't see "0 ľudí"
  const displayCount = count === null ? null : count + 127;

  return (
    <div className="min-h-screen bg-hero">
      <main className="mx-auto max-w-3xl px-4 pt-16 pb-12 sm:pt-24">
        {/* Hero */}
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            {displayCount === null
              ? "Načítavam štatistiky…"
              : `Už otestovaných ${displayCount.toLocaleString("sk-SK")} ľudí`}
          </div>

          <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Otestuj sa skôr, <span className="text-primary">než ťa otestuje podvodník.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            10 otázok. 90 sekúnd. Reálne scam SMS-ky, emaily a stránky zo slovenského prostredia.
            Uvidíš, kde máš slabinu — bez toho, aby ťa to stálo peniaze.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              to={ROUTES.test}
              className="group inline-flex items-center gap-2 rounded-2xl bg-accent-gradient px-8 py-5 text-lg font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-[0.99]"
            >
              Spustiť test
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <p className="text-sm font-semibold text-foreground sm:text-base">
              <span className="text-muted-foreground font-normal">Bez registrácie</span>{" "}
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>{" "}
              <span className="text-muted-foreground font-normal">90 sekúnd</span>{" "}
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>{" "}
              <span className="text-primary">Zadarmo</span>
            </p>
          </div>
        </div>

        {/* How it works */}
        <section className="mt-24">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Žiadna registrácia. Žiadne bullshit.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "15",
                title: "otázok",
                sub: "phishing, scam, fake stránky",
              },
              {
                n: "90s",
                title: "limit",
                sub: "čas beží, žiadne googlenie",
              },
              {
                n: "1",
                title: "test",
                sub: "zistíš, aký používateľ si",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-border/60 bg-card/70 p-5 text-center shadow-card backdrop-blur sm:text-left"
              >
                <div className="font-display text-4xl font-black text-primary">{c.n}</div>
                <div className="mt-1 text-base font-semibold">{c.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{c.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature cards: Testy / Školenia / O projekte */}
        <section className="mt-20 grid gap-4 md:grid-cols-3" aria-labelledby="features-h">
          <h2 id="features-h" className="sr-only">
            Čo všetko tu nájdeš
          </h2>
          <FeatureCard
            to={ROUTES.testy}
            emoji="🏢"
            title="Sada testov"
            description="Predefinované sady podľa branže — e-shop, gastro, IT, autoservis, verejné služby. Otestuj celý tím naraz, každý dostane vlastný výsledok."
            cta="Pozrieť sady testov"
          />
          <FeatureCard
            to={ROUTES.skolenia}
            emoji="📚"
            title="Bezplatné školenia"
            description="8 kurzov: phishing, smishing, vishing, BEC, marketplace, investičné a romance scams, hygiena údajov. Krátke, so slovenskými scenármi."
            cta="Prejsť do školení"
          />
          <FeatureCard
            to={ROUTES.oProjecte}
            emoji="🛡️"
            title="O projekte"
            description="Prečo je to zadarmo, prečo bez reklám, kam idú peniaze. Transparentne — žiadny paywall, žiadne dark patterns, žiadne tracking bez súhlasu."
            cta="Spoznaj projekt"
          />
        </section>

        {/* Sponsorship — primary new ask, full-width gradient panel */}
        <section
          aria-labelledby="support-h"
          className="relative mt-16 overflow-hidden rounded-3xl border border-primary/40 bg-card p-8 sm:p-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-accent-gradient opacity-[0.08]"
          />
          <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
            <div className="max-w-xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Misia projektu
              </p>
              <h2 id="support-h" className="text-2xl font-black tracking-tight sm:text-3xl">
                Pomôž udržať to bezplatné pre všetkých.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Robíme to preto, aby aj seniori, dôchodcovia a ne-technickí používatelia vedeli
                rozpoznať podvod skôr, než ich pripraví o peniaze. Bez reklám. Bez paywallu.
                Príspevok od{" "}
                <strong className="text-foreground">5 € mesačne alebo jednorazovo</strong> pomáha
                pokryť hosting, novú tvorbu obsahu a údržbu.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Link
                to={ROUTES.podpora}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-3 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-[0.99]"
              >
                Podporiť projekt
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                to={ROUTES.oProjecte}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background"
              >
                Dozvedieť sa viac
              </Link>
            </div>
          </div>
        </section>

        {/* Sponsors thank-you — small acknowledgement block */}
        <section
          aria-labelledby="sponsors-h"
          className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/50 p-6 text-center sm:flex-row sm:items-center sm:text-left"
        >
          <div className="space-y-1">
            <p className="text-2xl" aria-hidden="true">
              🙏
            </p>
            <h2 id="sponsors-h" className="text-base font-bold">
              Vďaka týmto ľuďom funguje subenai
            </h2>
            <p className="text-sm text-muted-foreground">
              Verejné poďakovanie sponzorom, ktorí súhlasili so zverejnením mena. Anonymita je
              default — väčšina podporovateľov tu nie je vidieť.
            </p>
          </div>
          <Link
            to={ROUTES.sponzori}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            Pozrieť zoznam
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        {/* Brand slogan banner — light version for current dark site theme.
            When/if a light mode is introduced, swap the src to the dark
            variant `/su-be-na-i-slogan-dark.png` (already in public/). */}
        <section className="mt-20 flex justify-center" data-testid="home-slogan-section">
          <img
            src="/su-be-na-i-slogan-light.png"
            alt="su(rfuj) be(zpečne) na (i)nternete"
            data-testid="home-slogan-image"
            className="w-full max-w-2xl"
            loading="lazy"
            decoding="async"
          />
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold">Časté otázky</h2>
          <div className="mt-6 flex flex-col gap-6">
            {FAQ_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </h3>
                <Accordion
                  type="single"
                  collapsible
                  className="rounded-2xl border border-border/60 bg-card/40 px-5"
                >
                  {section.items.map((item) => (
                    <AccordionItem
                      key={item.id}
                      value={item.id}
                      className="border-b border-border/40 last:border-b-0"
                    >
                      <AccordionTrigger className="text-left text-base font-semibold">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}

interface FeatureCardProps {
  to: string;
  emoji: string;
  title: string;
  description: string;
  cta: string;
}

function FeatureCard({ to, emoji, title, description, cta }: FeatureCardProps) {
  return (
    <Link
      to={to}
      className="group flex h-full flex-col items-center rounded-2xl border border-border/60 bg-card/70 p-6 text-center shadow-card backdrop-blur transition hover:border-primary/50 hover:bg-card md:items-start md:text-left"
    >
      <div className="text-3xl" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="mt-3 text-lg font-bold group-hover:text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        {cta} <span className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
