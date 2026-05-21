# PLAN — Rast & vzdelávanie (2026-04-25)

> ## ✅ Plán kompletne hotový (2026-05-01)
>
> Všetky stories vo všetkých 6 epicoch (E1, E2, E3, E4, E5, E6) sú v stave
> ✅ Done. Tento dokument zostáva ako historický záznam — nové práce idú
> do [PLAN-2026-04-26](./PLAN-2026-04-26-custom-tests-sponsorship.md).
>
> Súhrn stavov všetkých stories: [tasks/stories/README.md](./stories/README.md).

> **Source request**: pridať rastové prieskumové otázky do post-test
> formuláru, povoliť používateľovi prezerať si svoje odpovede po teste
> s rovnakým hodnotením, doplniť edukačný "data-trap" popup,
> vybudovať sekciu bezplatných kurzov a opraviť drobnú chybu na
> consent dialógu.

**Format:** Tento dokument je iba **index** — každá user story žije
v samostatnom súbore v [`stories/`](./stories/). Toto je single-page
overview pre product owner, vývojára a code reviewera.

## Obsah

- [Discovery — čo už máme](#discovery--čo-už-máme)
- [Cross-cutting decisions](#cross-cutting-decisions)
- [Suggested execution order](#suggested-execution-order)
- [Open questions for product owner](#open-questions-for-product-owner)
- [Epic & story mapa](#epic--story-mapa)
- [Risk & non-functional matrix](#risk--non-functional-matrix)

---

## Discovery — čo už máme

(Stav k 2026-04-25, po consent commite.)

| Vec | Stav | Dôsledok pre plán |
|---|---|---|
| `TestFlow.tsx` (intro → playing → done) | Hotové | Hook-points pre review/trap popup pôjdu cez `phase === "done"` v `ResultsView` |
| `QuestionCard.tsx` reveal/feedback UI | Hotové, používa `revealed` state + `question.explanation` | E3.2 extrahuje `<AnswerFeedback>` ako single source of truth pre live + review |
| `AnswerRecord` type s `optionId`, `correct`, `severity`, `responseMs`, `category`, `difficulty` | Hotové | Stačí ho serializovať do JSON pre persistenciu (E3.1) |
| Supabase tabuľka `attempts` — má `breakdown`, `flags`, `insights`, `stats` (Json) | **Nemá `answers` JSONB stĺpec** | E3.1 vyžaduje migráciu (`ALTER TABLE ... ADD COLUMN answers JSONB ...`) |
| `SurveyCard.tsx` — už zbiera nickname/age/gender/city/country/self_caution | Existuje, integrované do `attempts` cez UPDATE podľa `share_id` | E2.3 ho rozšíri o nové rastové polia + samostatné typy otázok |
| Routing — file-based TanStack Router (`src/routes/`) | Hotové | Školenia: `routes/skolenia.index.tsx` + `routes/skolenia.$slug.tsx` (premenované z `kurzy.*` 2026-04-27) |
| Consent banner + dialog | Hotové, otvorené 2026-04-25 | E1.1 fixuje len jeden bug v dialógu |
| `attempts` typy v `src/integrations/supabase/types.ts` | Auto-generované | Po každej migrácii treba `npx supabase gen types typescript` |
| Translations | Iba SK | Stories píšu po slovensky; i18n infra nie je predmetom tohto plánu |
| Analytics | **Nezapojené** (PostHog v roadmape, gated cez `lib/tracking.ts`) | Stories využívajú `track()` helper — bez consent je no-op |

---

## Cross-cutting decisions

Tieto rozhodnutia platia pre celý plán. Ak ich budeme meniť, treba
update všetkých dotknutých stories.

1. **Persistencia odpovedí (E3.1)** — pridáme JSONB stĺpec `answers`
   do `attempts`. Alternatíva (localStorage-only) zlyhá pri otvorení
   share linku v inom prehliadači. Schválené v rámci tohto plánu.
2. **Data-trap NIKDY neukladá vstup používateľa** (E4.2) — žiadny
   field neopustí klientský `useState`. Validácia + warning je
   čisto vizuálna. Privacy policy to musí explicitne hovoriť.
3. **Kurzy = static content na one-pageroch** (E5) — žiadna admin
   CMS, žiadna DB tabuľka pre kurzy. Obsah je v
   `src/content/courses/{slug}.ts` (TS modul s typovanou schémou).
   Refaktor na CMS je out-of-scope.
4. **Screenshoty kurzov** — vytvoríme **vlastné mock-ups** pomocou
   existujúcich `screenshots/` komponentov (`SmsScreen`, `EmailScreen`,
   `CallScreen`, `AdListing`, `InstagramAd`, `UrlBar`). Žiadne
   reálne PII obete. E5.9 pridá nový `<ChatScreen>` re-použiteľný
   v ďalších kurzoch.
5. **Right-of-access** — keďže nezbierame e-mail, používateľ nemá
   ako uplatniť GDPR Art. 15 retroactívne na svoje odpovede mimo
   `share_id`. Tento fakt sa **musí** uviesť v `/privacy` (E3.1
   docs subtask).
6. **Gating cez consent** — `analytics` events o course progress
   a trap-popup interakciách sa firujú len ak
   `isAllowed("analytics")`. `tracking.ts` to už rieši.
7. **CONSENT_VERSION bump** — koordinovať na konci batchy E2+E3,
   bumpnúť **iba raz** (E3.1 docs subtask) aby používatelia
   nedostali banner 3×. **Aktuálna verzia 1.1.0 (po E3.1).**
   Stories E3.4, E3.5, E6.1, E6.2 **nebumpujú** — žiadne nové
   persistentné dáta na našej strane (E3.4/E3.5 = reuse + UI,
   E6.x = outbound query strings, read-side gated cez existujúci
   `analytics` consent z 1.1.0).
8. **Outbound tracking — žiadne 3rd-party SDK** (E6.1 AC-6) —
   share intenty sú plain `window.open` na verejné share URL.
   Žiadny FB Pixel, X widget, TikTok pixel sa neloaduje. Bundle
   audit cez `scripts/check-bundle-no-trackers.sh` (zavedie E6.1).
   UTM parametre na outgoing share URL sú GDPR-compliant
   (žiadny tracker, len source attribution po kliku späť k nám,
   čítanie gated cez analytics consent).
9. **Review komponent = single source of truth** (E3.2/E3.3/E3.4) —
   `<AnswerReviewSection>` + `<AnswerReviewCard>` sú zdieľané
   medzi `ResultsView` a `r.$shareId.tsx`. Akákoľvek zmena
   feedback copy / vizuálu sa robí v jednom mieste a prejaví sa
   na oboch stranách. Žiadny copy-paste fork.

---

## Suggested execution order

Hlavný driver: **bug-fixy ako prvé, potom hodnotovo najvyššie story
s najmenšou závislosťou**, posledné najväčšie content-heavy práce.

```
1.  E1.1   Consent dialog bug fix         (XS, P0)  ✅ Done
2.  E3.1   answers JSONB migration        (S,  P1)  ✅ Done
3.  E3.2   AnswerFeedback komponent       (S,  P1)  ✅ Done
4.  E3.3   /r/$shareId answer-review UI   (M,  P1)  ✅ Done
5.  E3.4   Review na results page         (S,  P1)  ✅ Done
6.  E6.1   Social share grid + UTM        (M,  P1)  ✅ Done
7.  E2.1   Survey schema migration        (S,  P1)  ✅ Done
8.  E2.2   QuestionType abstrakcia        (M,  P1)  ✅ Done
9.  E2.3   Pridanie nových rast otázok    (S,  P1)  ✅ Done
10. E4.1   Data-trap copy & taxonómia     (S,  P1)  ✅ Done
11. E4.2   TrapDialog komponent           (M,  P1)  ✅ Done
12. E4.3   Integrácia do ResultsView      (S,  P1)  ✅ Done
13. E6.2   IG/TikTok manual share card    (S,  P2)  ✅ Done
14. E5.1   Course content schema          (S,  P2)  ✅ Done
15. E5.2   /kurzy index route             (M,  P2) ✅ Done
16. E5.3   Course one-pager template      (M,  P2)  ✅ Done (MVP)
17. E5.4   Course #1 SMS smishing         (M,  P2) ✅ Done
18. E5.5   Course #2 Email phishing       (M,  P2) ✅ Done
19. E5.6   Course #3 Vishing              (M,  P2) ✅ Done
20. E5.7   Course #4 Marketplace          (M,  P2) ✅ Done
21. E5.11  Course #8 Data hygiene         (M,  P2) ✅ Done
22. E3.5   Per-question course CTA        (S,  P2)  ✅ Done
23. E5.12  Sitemap + SEO                  (S,  P2) ✅ Done
24. E5.13  Navigation links               (XS, P2) ✅ Done
25. E5.8   Course #5 Investment scams     (M,  P3)  ✅ Done
26. E5.9   Course #6 Romance scams        (M,  P3)  ✅ Done
27. E5.10  Course #7 BEC pracovisko       (M,  P3)  ✅ Done
```

E2, E3.4, E6.1 môžu ísť **paralelne** (rôzne komponenty, rôzne
časti DB schémy). E4 závisí len na hotovom ResultsView (po E3.4
je ResultsView "tučnejší", treba dať pozor na poradie sekcií).
E3.5 sa odomyká postupne s pribúdajúcimi kurzmi (čiastočne
funkčné už po E5.4 + E5.5). P3 kurzy sú vzdialený horizont.

---

## Open questions for product owner

Treba zatvoriť pred štartom epicu (alebo na hranici):

1. **E2** — koľko nových rast otázok max? Príliš dlhý survey klesá
   completion rate. Návrh: **6 nových otázok**, jednu kategóriu
   za jednu obrazovku — rozhodneš pri E2.3.
2. **E2** — má byť odpoveď na "kde si sa o nás dozvedel" povinná?
   Návrh: **nie** (všetko optional, matchne tone existujúceho
   `SurveyCard.tsx`).
3. **E4** — chceš trap-popup len jednorázovo (po prvom teste)
   alebo pri každom dokončení testu? Návrh: **každý raz** —
   edukačný moment, no harm in repeating. Implementované v E4.3
   ako "auto popup iba ak `iiq_trap_seen` flag NIE je nastavený".
4. **E4** — aké polia použiť? Návrh v [E4.1](./stories/E4.1-data-trap-copy-and-taxonomy.md);
   finalizuje sa tam.
5. **E5** — chceš kurzy mapovať 1:1 na kategórie otázok v teste
   (`phishing | url | fake_vs_real | scenario`)? Alebo navrhneš
   vlastné kategórie? Návrh: **8 vlastných kurzov** s
   `relatedQuestionsCategory` mapovaním tam kde dáva zmysel.
6. **E5** — potrebujeme certifikát po dokončení kurzu? Návrh:
   **odkladáme do v2** (vyžadovalo by auth + uloženie pokroku).
7. **E5** — prístup ku kurzom verejný (bez registrácie) alebo
   gated cez prejdený test? Návrh: **verejný**, žiadne gates,
   matchne hodnotu "free knowledge".
8. **E6** — primárny share text. Návrh:
   `"Mám subenai {score}/100. Lepší než {pct}% ľudí. Som {personality}. Skús aj ty:"`.
   Konzistentný naprieč Web Share API, share grid (E6.1) aj
   IG/TikTok caption (E6.2). Final wording: schválené tu.
9. **E6** — UTM `campaign` value. Návrh: **`results`** —
   matchne pôvod kliku ("share priamo z výsledkov"). Ak budeme
   neskôr mať ďalšie share entry pointy (napr. po dokončení
   kurzu), použijú vlastné campaign label-y (`course-complete`).

**Akciu spustím až keď tieto otázky odsúhlasíš** (alebo
zvolíš inak).

---

## Epic & story mapa

### Epic 1 — Consent dialog UX bug

| ID | Title | Effort | Priority | Status | Závislosti |
|---|---|---|---|---|---|
| [E1.1](./stories/E1.1-consent-link-closes-dialog.md) | Zavretie dialógu po klike na link na politiku | XS | P0 | ✅ Done | — |

### Epic 2 — Growth & insight survey

| ID | Title | Effort | Priority | Status | Závislosti |
|---|---|---|---|---|---|
| [E2.1](./stories/E2.1-attempts-schema-growth-fields.md) | Migrácia `attempts`: rastové polia | S | P1 | ✅ Done | — |
| [E2.2](./stories/E2.2-survey-question-component.md) | Abstrakcia `<SurveyQuestion />` | M | P1 | ✅ Done | — |
| [E2.3](./stories/E2.3-add-growth-survey-questions.md) | Pridanie nových rast otázok do `SurveyCard` | S | P1 | ✅ Done | — |

### Epic 3 — Post-test answer review & learning

| ID | Title | Effort | Priority | Status | Závislosti |
|---|---|---|---|---|---|
| [E3.1](./stories/E3.1-persist-answers-jsonb.md) | Persistencia odpovedí: JSONB stĺpec `answers` | S | P1 | ✅ Done | — |
| [E3.2](./stories/E3.2-extract-answer-feedback-component.md) | Extrakcia `<AnswerFeedback />` z `QuestionCard` | S | P1 | ✅ Done | — |
| [E3.3](./stories/E3.3-share-page-answer-review-ui.md) | `/r/$shareId` — Answer review UI | M | P1 | ✅ Done | E3.1, E3.2 |
| [E3.4](./stories/E3.4-results-page-answer-review.md) | Review odpovedí priamo na results page | S | P1 | ✅ Done | E3.3 |
| [E3.5](./stories/E3.5-per-question-course-cta.md) | Per-question course CTA v review karte | S | P2 | ✅ Done | E5.1 + kurz |

### Epic 4 — Data-trap edukačný popup

| ID | Title | Effort | Priority | Status | Závislosti |
|---|---|---|---|---|---|
| [E4.1](./stories/E4.1-data-trap-copy-and-taxonomy.md) | Copy & taxonómia citlivých polí | S | P1 | ✅ Done | — |
| [E4.2](./stories/E4.2-trap-dialog-component.md) | `<TrapDialog />` komponent | M | P1 | ✅ Done | — |
| [E4.3](./stories/E4.3-trap-dialog-integration.md) | Integrácia `TrapDialog` do `ResultsView` | S | P1 | ✅ Done | — |

### Epic 5 — Sekcia bezplatných kurzov

| ID | Title | Effort | Priority | Status | Závislosti |
|---|---|---|---|---|---|
| [E5.1](./stories/E5.1-course-content-schema.md) | Course content schema + registry | S | P2 | ✅ Done | — |
| [E5.2](./stories/E5.2-courses-index-route.md) | `/skolenia` — index route (bolo `/kurzy`) | M | P2 | ✅ Done | — |
| [E5.3](./stories/E5.3-course-onepager-template.md) | `/skolenia/$slug` — one-pager template (bolo `/kurzy/$slug`) | M | P2 | ✅ Done (MVP) | — |
| [E5.4](./stories/E5.4-course-sms-smishing.md) | Kurz #1: SMS smishing | M | P2 | ✅ Done | E5.1, E5.3 |
| [E5.5](./stories/E5.5-course-email-phishing.md) | Kurz #2: Email phishing | M | P2 | ✅ Done | E5.1, E5.3 |
| [E5.6](./stories/E5.6-course-vishing.md) | Kurz #3: Vishing (telefonické podvody) | M | P2 | ✅ Done | E5.1, E5.3 |
| [E5.7](./stories/E5.7-course-marketplace.md) | Kurz #4: Marketplace & Bazoš podvody | M | P2 | ✅ Done | E5.1, E5.3 |
| [E5.8](./stories/E5.8-course-investment-scams.md) | Kurz #5: Investičné podvody (krypto, AI) | M | P3 | ✅ Done | E5.1, E5.3 |
| [E5.9](./stories/E5.9-course-romance-scams.md) | Kurz #6: Romance scams | M | P3 | ✅ Done | E5.1, E5.3 |
| [E5.10](./stories/E5.10-course-bec-workplace.md) | Kurz #7: BEC pracovisko | M | P3 | ✅ Done | E5.1, E5.3 |
| [E5.11](./stories/E5.11-course-data-hygiene.md) | Kurz #8: Data hygiene (preventívny) | M | P2 | ✅ Done | E5.1, E5.3 |
| [E5.12](./stories/E5.12-sitemap-seo.md) | Sitemap + SEO + JSON-LD | S | P2 | ✅ Done | E5.1 |
| [E5.13](./stories/E5.13-navigation-links.md) | Footer + index page links | XS | P2 | ✅ Done | E5.2 |

### Epic 6 — Social distribution

| ID | Title | Effort | Priority | Status | Závislosti |
|---|---|---|---|---|---|
| [E6.1](./stories/E6.1-social-share-grid.md) | Multi-platform share intent grid (FB/Messenger/WhatsApp/X/LinkedIn/Telegram) + UTM | M | P1 | ✅ Done | — |
| [E6.2](./stories/E6.2-instagram-tiktok-manual-share.md) | Instagram / TikTok manual share card | S | P2 | ✅ Done | E6.1 |

**Sumár**: 27 user stories, 6 epicov, plánovaný total effort
~5–6 týždňov 1 dev (P3 kurzy mimo MVP).

---

## Risk & non-functional matrix

| ID | Riziko | Pravdepodobnosť | Dopad | Mitigácia |
|---|---|---|---|---|
| R-1 | E4 — false-positive regex (omyl detekuje nevinný vstup ako kartu) | Stredná | Stredný | 3+3 test sample na matcher; Luhn checksum pre karty (E4.2) |
| R-2 | E4 — používateľ obíde no-submit garanciu cez DevTools console | Nízka | Nízky | Žiadny endpoint neexistuje, console tracing iba pre dev |
| R-3 | E5 — defamácia konkrétnej značky v course content | Nízka | Vysoký (právny) | CR review obsahu; precízna formulácia "podvodník zneužíva", nie "X je vinný" (každá course story to vyžaduje v AC) |
| R-4 | E2 — survey fatigue, drop completion rate | Stredná | Stredný | Limit 4 nové sekcie, všetko optional (E2.3) |
| R-5 | E3 — JSONB column rastie pri škálovaní | Nízka | Nízky | 10 záznamov × ~150 B = 1.5 KB / attempt; pri 100k = 150 MB |
| R-6 | E5 — content tvorba bude trvať dlhšie ako odhad | Vysoká | Stredný | Začať s 2 kurzmi (E5.4, E5.5), ostatné v ďalšom sprinte |
| R-7 | Zmena privacy/cookies policy by vyžadovala bumpu CONSENT_VERSION 3× | Stredná | Nízky (UX) | Bumpiť raz na konci E2+E3 batchy |
| R-8 | E5.8 — celebrity reklama defamácia | Stredná | Vysoký (právny) | Copy "fake celebrity reklama" generic, žiadne meno priamo (E5.8 AC-7) |
| R-9 | E5.9 — sextortion citlivá téma | Stredná | Vysoký (etický) | Empatický tone, žiadny posmech (E5.9 AC-8) |
| R-10 | E6.1 — UTM v share URL roztrhne SEO equity (canonical drift) | Nízka | Nízky | `r.$shareId.tsx` musí mať `<link rel="canonical">` bez UTM (koordinovať s E5.12 SEO) |
| R-11 | E6.1 — Messenger deep link `fb-messenger://` zlyhá | Stredná | Nízky | Fallback na FB dialog po 1.5s timeout, alebo desktop-only FB dialog (AC-11 zjednodušenie) |
| R-12 | E6.1/E6.2 — share platform zmení intent URL formát | Nízka | Stredný | Helper `buildShareIntentUrl` centralizovaný; unit testy zachytia regresiu pri update |
| R-13 | E3.4/E3.5 — duplicitný DOM `id` ak by sa review section vyrenderovala 2× | Veľmi nízka | Nízky | ResultsView má `id="results-review-section"`, share page má `id="review-section"` (rôzne routes, kolízia nemôže) |

---

## Definition of Ready / Done

Pozri [`tasks/README.md`](./README.md).
