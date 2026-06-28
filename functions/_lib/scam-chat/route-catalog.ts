// E53.6 — hand-curated route catalog for the scam-chat assistant.
//
// Generated from src/routes/** at authoring time. Two audience tiers only:
//   - "public": reachable by an anonymous visitor
//   - "app":    signed-in /app/* functionality
//
// /admin/* is a corpus BLACKOUT, not a filter — no admin route may ever
// appear here (asserted by tests/functions/scam-chat-route-catalog.test.ts
// and by the audience guard in scripts/build-rag-index.ts). The assistant
// cannot leak knowledge it was never given.
//
// Title + description are Slovak because they are user-facing content the
// assistant quotes verbatim in answers. Redirect-only routes
// (/app/digest, /app/recommendations → /app/insights) and transient flows
// (onboarding, auth callbacks, dynamic share pages), and the /docs/app/*
// stubs (src/lib/docs/manifest.ts — no real content yet) are
// intentionally absent.

export type RouteAudience = "public" | "app";

export interface RouteCatalogEntry {
  path: string;
  title: string;
  description: string;
  audience: RouteAudience;
}

export const ROUTE_CATALOG: RouteCatalogEntry[] = [
  {
    path: "/",
    title: "Domov",
    description:
      "Úvodná stránka s bezplatným rýchlym testom a prehľadom kurzov digitálnej bezpečnosti.",
    audience: "public",
  },
  {
    path: "/test",
    title: "Rýchly test",
    description:
      "Bezplatný rýchly test, ktorý preverí, či rozoznáte podvodné správy od skutočných.",
    audience: "public",
  },
  {
    path: "/test/builder",
    title: "Zostav vlastný test",
    description: "Nástroj na zostavenie vlastného testu z banky otázok pre tím alebo triedu.",
    audience: "public",
  },
  {
    path: "/tests",
    title: "Testy podľa odvetví",
    description: "Prehľad pripravených testov pre firmy a tímy podľa odvetvia.",
    audience: "public",
  },
  {
    path: "/academy",
    title: "Akadémia",
    description:
      "Bezplatné interaktívne kurzy a články o podvodoch — phishing, podvodné SMS a telefonáty, falošné e-shopy, investičné podvody a praktické návody, ako sa chrániť.",
    audience: "public",
  },
  {
    path: "/sablony",
    title: "Test šablóny",
    description: "Bezplatné kvízové šablóny o online podvodoch pripravené na okamžité použitie.",
    audience: "public",
  },
  {
    path: "/schools",
    title: "Pre školy",
    description: "Informácie pre školy a vzdelávacie inštitúcie o využití testov vo výučbe.",
    audience: "public",
  },
  {
    path: "/schools/dpa",
    title: "Zmluva o spracúvaní údajov pre školy",
    description: "Žiadosť o zmluvu o spracúvaní osobných údajov (DPA) pre školy.",
    audience: "public",
  },
  {
    path: "/support",
    title: "Podpora projektu",
    description: "Možnosti, ako projekt finančne podporiť jednorazovo alebo opakovane.",
    audience: "public",
  },
  {
    path: "/sponsors",
    title: "Sponzori",
    description: "Zoznam sponzorov a podporovateľov projektu.",
    audience: "public",
  },
  {
    path: "/manage-support",
    title: "Správa podpory",
    description: "Zmena alebo zrušenie existujúcej finančnej podpory projektu.",
    audience: "public",
  },
  {
    path: "/contact",
    title: "Kontakt",
    description: "Kontaktné údaje na prevádzkovateľa projektu.",
    audience: "public",
  },
  {
    path: "/contact-form",
    title: "Kontaktný formulár",
    description: "Formulár na otázky a žiadosti — vytvorí tiket, ktorému sa venuje náš tím.",
    audience: "public",
  },
  {
    path: "/changelog",
    title: "Zmeny",
    description: "Prehľad noviniek a zmien v aplikácii podľa verzií.",
    audience: "public",
  },
  {
    path: "/about",
    title: "O projekte",
    description: "Kto za projektom stojí a prečo vznikol.",
    audience: "public",
  },
  {
    path: "/privacy",
    title: "Ochrana súkromia",
    description: "Zásady ochrany osobných údajov — čo spracúvame, prečo a ako dlho.",
    audience: "public",
  },
  {
    path: "/cookies",
    title: "Cookies",
    description: "Zásady používania cookies a podobných technológií.",
    audience: "public",
  },
  {
    path: "/login",
    title: "Prihlásenie",
    description: "Prihlásenie do existujúceho účtu.",
    audience: "public",
  },
  {
    path: "/signup",
    title: "Registrácia",
    description: "Vytvorenie bezplatného účtu.",
    audience: "public",
  },
  {
    path: "/forgot-password",
    title: "Zabudnuté heslo",
    description: "Obnovenie zabudnutého hesla k účtu.",
    audience: "public",
  },
  {
    path: "/app",
    title: "Môj prehľad",
    description: "Domovský prehľad účtu s aktivitou a odporúčaniami.",
    audience: "app",
  },
  {
    path: "/app/tests",
    title: "Moje testy",
    description: "Správa vlastných testov — koncepty, publikovanie a výsledky.",
    audience: "app",
  },
  {
    path: "/app/tests/new",
    title: "Nový test",
    description: "Vytvorenie nového testu z banky otázok.",
    audience: "app",
  },
  {
    path: "/app/edu-tests",
    title: "Moje edu testy",
    description: "Správa edu testov pre triedy a prehľad výsledkov žiakov.",
    audience: "app",
  },
  {
    path: "/app/history",
    title: "Moja história",
    description: "História absolvovaných testov a dosiahnutých výsledkov.",
    audience: "app",
  },
  {
    path: "/app/library",
    title: "Knižnica otázok",
    description: "Prehliadanie banky otázok použiteľných vo vlastných testoch.",
    audience: "app",
  },
  {
    path: "/app/templates",
    title: "Šablóny",
    description: "Šablóny testov pripravené na rýchle použitie.",
    audience: "app",
  },
  {
    path: "/app/teams",
    title: "Tímy",
    description: "Správa tímov a pozvánok pre členov.",
    audience: "app",
  },
  {
    path: "/app/audiences",
    title: "Skupiny respondentov",
    description: "Správa skupín respondentov pre rozosielanie testov.",
    audience: "app",
  },
  {
    path: "/app/notifications",
    title: "Notifikácie",
    description: "Nastavenie e-mailových notifikácií a pripomienok.",
    audience: "app",
  },
  {
    path: "/app/insights",
    title: "Pre teba",
    description: "Personalizované odporúčania a súhrny aktivity.",
    audience: "app",
  },
  {
    path: "/app/peer",
    title: "Porovnanie s ostatnými",
    description: "Porovnanie vlastných výsledkov s ostatnými používateľmi.",
    audience: "app",
  },
  {
    path: "/app/retest",
    title: "Pripomienky retestov",
    description: "Nastavenie pripomienok na zopakovanie testu.",
    audience: "app",
  },
  {
    path: "/app/account/profile",
    title: "Môj profil",
    description: "Úprava profilových údajov účtu.",
    audience: "app",
  },
  {
    path: "/app/account/security",
    title: "Bezpečnosť účtu",
    description: "Zmena hesla a nastavenie dvojfaktorového overenia.",
    audience: "app",
  },
  {
    path: "/app/help",
    title: "Pomoc",
    description: "Pomocník a najčastejšie otázky k aplikácii.",
    audience: "app",
  },
  {
    path: "/app/help/contact",
    title: "Kontakt na podporu",
    description: "Kontaktovanie podpory priamo z aplikácie.",
    audience: "app",
  },
  {
    path: "/app/legal/dsr",
    title: "GDPR žiadosť",
    description: "Podanie žiadosti dotknutej osoby — export alebo vymazanie údajov.",
    audience: "app",
  },
];
