# Editorial Calendar — SubenAI Blog Content Engine (E16.5)

_Internal artifact. Day-by-day publish schedule for the 80-article bulk phase. Consumed by the agent orchestration pipeline (article slot assignment), the per-day end-of-day gate, and the carryover policy on D14. Updated in place as articles move through their status lifecycle._

## 1. Calendar overview

The bulk phase runs 14 calendar days starting Mon 2026-05-19 (D1) and ending Sun 2026-06-01 (D14). D1–D3 ship blog infrastructure (E16.1–E16.4) and the five strategic-foundation artifacts (E16.5) in parallel — no articles publish. D4–D5 publish the 10 pillar pages in two waves of 5 (one wave per day, 2-hour spacing). D6–D13 are the cluster blast: 70 cluster articles distributed across 8 days at 8–9 articles per day, capped at 5 simultaneously-active agent pipelines per day per the parallelism plan in `PLAN-2026-05-19-blog-content-engine.md`. Every article passes the per-article quality gate (research → outline → draft → brand → UX → a11y → SEO → CR, plus conditional legal) before status flips to `ready_to_publish`. D14 is reserved for distribution (E16.20), final audit (E16.21), and absorption of any article that slipped from an earlier day.

## 2. Publish-time stagger policy

The risk "Google bulk publishing pattern penalty" in `PLAN-2026-05-19-blog-content-engine.md` mandates per-article time staggering within each publishing day:

- All `published_at` timestamps are in Europe/Bratislava (UTC+1, UTC+2 during summer time; the dates D4–D14 fall inside CEST so the effective offset is UTC+2 for this calendar).
- Each day's first publish lands at **07:00 local**. Subsequent publishes follow at roughly equal spacing, with the last publish landing no later than 17:00 local. A 9-article day is spaced ~75 minutes apart (07:00, 08:15, 09:30, 10:45, 12:00, 13:15, 14:30, 15:45, 17:00). An 8-article day uses the same cadence and finishes at 15:45.
- For pillar days (D4, D5), spacing widens to **2 hours** (07:00, 09:00, 11:00, 13:00, 15:00) so each pillar receives individual indexer attention; pillar SEO weight is concentrated on the day, not diluted by adjacent publishes.
- The `published_at` field stores the stagger time, **not** the time the row was inserted. The seed script schedules `published_at` ahead of insertion; the row sits with `status='published'` and a future `published_at`, and the public route filter (`published_at <= now()`) gates visibility per the RLS policy.
- A failed gate that delays one article never compresses the stagger for the remaining articles in the day — the slipped article carries to the next day per the carryover policy (§6) and the remaining articles publish at their originally scheduled stagger times.

## 3. Day-by-day schedule

### D1 — 2026-05-19 (Monday) — Infrastructure kickoff
Status: planned
Articles publishing today (count: 0). Infrastructure-only.

Stories executing today:
- E16.1 — Supabase schema + RLS + types regen + `blog-images` storage bucket.
- E16.2 (start) — Routes + MDX rendering + `BlogScenarioCard` skeleton.
- E16.5 (parallel kickoff) — 5 strategic-foundation artifacts dispatched as parallel agents: keyword-map, competitor-gaps, link-graph, editorial-calendar (this file), voice-guide.

End-of-day gate: schema migration committed and mirrored in `DEPLOY_SETUP.sql`; types regenerated; storage bucket `blog-images` exists with public-read RLS; at least 3 of 5 E16.5 artifacts in `tasks/blog/` at draft quality.

### D2 — 2026-05-20 (Tuesday) — Routes + SEO scaffolding
Status: planned
Articles publishing today (count: 0). Infrastructure-only.

Stories executing today:
- E16.2 (finish) — `/blog`, `/blog/$slug`, `/blog/kategoria/$slug`, `/blog/autor/$slug`, `/blog/rss.xml` routes; MDX rendering pipeline; inline `BlogScenarioCard` component wired to the question bank.
- E16.3 (start) — `Article`/`BreadcrumbList`/`FAQPage` JSON-LD; OG image endpoint at `/blog/og/<slug>.png`; sitemap integration; RSS feed shape; GA4 integration behind consent.
- E16.5 (continue) — Remaining strategic artifacts hardened against user review.

End-of-day gate: empty `/blog` index route renders in a preview deploy; `/blog/rss.xml` returns valid empty-feed XML; OG endpoint returns a 1200×630 PNG for a placeholder slug; CONSENT_VERSION 1.5.0 banner copy reviewed.

### D3 — 2026-05-21 (Wednesday) — Admin CMS + GA4 + consent bump
Status: planned
Articles publishing today (count: 0). Infrastructure-only.

Stories executing today:
- E16.3 (finish) — Ship CONSENT_VERSION 1.5.0; delete the stale "no GA" claim from `src/i18n/locales/sk/legal.json:352` (and cs/en mirrors); add `_ga`/`_ga_*` cookies to `src/routes/cookies.tsx`; add Google LLC as third-party recipient in legal.json; lazy-load GA4 only after `hasConsent(record, "analytics")` returns true.
- E16.4 — Admin CMS minimal at `/admin/blog/*`: list, edit, publish/unpublish, delete. RLS negative test passes (non-admin INSERT returns 0 rows).
- E16.5 (finalize) — All 5 artifacts user-approved.

End-of-day gate: lint 0/0; full Vitest green; build clean; `/admin/blog` reachable behind `has_role('admin')`; CONSENT_VERSION 1.5.0 live in preview with the blog-aware banner copy.

### D4 — 2026-05-22 (Thursday) — Pillar wave A
Status: planned
Articles publishing today (count: 5):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | P1 | phishing-kompletny-sprievodca | Phishing — kompletný sprievodca: čo to je, ako funguje, ako sa brániť | phishing-a-emaily | subenai-editorial | planned | Anchor pillar; foundation for D6–D11 phishing clusters. SK-CERT + NBS citations mandatory. |
| 09:00 | P2 | scam-sms-a-podvodne-hovory | Scam SMS a podvodné hovory — ako rozpoznať a čo robiť | sms-a-telefon | subenai-editorial | planned | Anchor for SMS clusters D6–D10. 3 BlogScenarioCards. |
| 11:00 | P3 | fake-eshopy-ako-odhalit | Fake e-shopy: ako odhaliť podvodný obchod a chrániť svoje peniaze | fake-eshopy | subenai-editorial | planned | SOI register check. Anchor for D6–D9 e-shop clusters. |
| 13:00 | P4 | podvody-na-socialnych-sietach | Podvody na sociálnych sieťach — Facebook, Instagram, TikTok | socialne-siete | subenai-editorial | planned | Anchor for D6–D10 social clusters. FB/IG/TT/LinkedIn/Telegram coverage. |
| 15:00 | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | AI a moderné podvody — deepfake, voice cloning, AI phishing | ai-scamy | subenai-editorial | planned | Anchor for D6–D9 AI clusters + D8 crypto + D10 deepfake story. White-space topic; cite EU AI Act + SK-CERT 2026. |

Pipeline assignments:
- Slot A → P1
- Slot B → P2
- Slot C → P3
- Slot D → P4
- Slot E → P5

End-of-day gate: all 5 pillars merged to `feature/E16-blog`; lint 0/0; tests green; preview deploy shows `/blog/phishing-kompletny-sprievodca` (and the other 4 pillar URLs) rendering with JSON-LD validated; internal link slots open for cluster backlinks land tomorrow.

### D5 — 2026-05-23 (Friday) — Pillar wave B
Status: planned
Articles publishing today (count: 5):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | P6 | digitalna-bezpecnost-kompletny-navod | Digitálna bezpečnosť pre bežných ľudí — kompletný návod | digital-security | subenai-editorial | planned | Anchor for D6–D13 digital-security + product clusters. |
| 09:00 | P7 | psychologia-internetovych-podvodov | Psychológia internetových podvodov — prečo naletíme | psychologia | subenai-editorial | planned | Anchor for D11 psychology clusters + D9/D10 story clusters. |
| 11:00 | P8 | bezpecnost-pre-rodicov-deti-seniorov | Internetová bezpečnosť pre rodičov, deti a seniorov | rodicia-a-seniori | subenai-editorial | planned | Anchor for D11 rodičia/seniori clusters + D10 senior story + D13 parental-control product. |
| 13:00 | P9 | bezpecne-nakupovanie-online-slovensko | Bezpečné online nakupovanie — sprievodca pre Slovákov | nakupovanie | subenai-editorial | planned | Anchor for D13 virtual-card product cluster. Reuses C13/C15/C55 material at summary level. |
| 15:00 | P10 | internet-safety-pre-studentov | Internet safety pre študentov — od školských účtov po sociálne siete | studenti | subenai-editorial | planned | White-space pillar (no SK competitor). Anchor for D13 B2B IQ-test product article. |

Pipeline assignments:
- Slot A → P6
- Slot B → P7
- Slot C → P8
- Slot D → P9
- Slot E → P10

End-of-day gate: all 10 pillars (D4 + D5) live on preview deploy; pillar-to-pillar cross-links resolve; cluster pages can begin pointing up to a published pillar starting D6.

### D6 — 2026-05-24 (Saturday) — Cluster blast day 1 (white-space front-load)
Status: planned
Articles publishing today (count: 9):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | C24 | klonovanie-hlasu-podvod-volanie-rodina | Klonovanie hlasu — keď vám zavolá „dcéra" a pýta peniaze | ai-scamy | subenai-editorial | planned | White-space #1. Links up to P5. Senior crossover with P8. |
| 08:15 | C13 | ako-overit-eshop-pred-nakupom-7-krokov | Ako overiť e-shop pred nákupom — 7 krokov za 2 minúty | fake-eshopy | subenai-editorial | planned | White-space #5. SOI + Heureka + WHOIS lookup. Links up to P3. |
| 09:30 | C6 | co-robit-ked-som-klikol-na-phishing | Čo robiť, keď som klikol na phishingový odkaz | phishing-a-emaily | subenai-editorial | planned | White-space #10 (first 60 mins). Links up to P1. |
| 10:45 | C1 | ako-rozpoznat-phishingovy-email-za-10-sekund | Ako rozpoznať phishingový email za 10 sekúnd | phishing-a-emaily | subenai-editorial | planned | High-CTR listicle. Inline screenshot grid. |
| 12:00 | C8 | 12-najcastejsich-podvodnych-sms-2026 | 12 najčastejších podvodných SMS na Slovensku v roku 2026 | sms-a-telefon | subenai-editorial | planned | Listicle, share-bait. Links up to P2. |
| 13:15 | C18 | hacknuty-facebook-ucet-co-robit | Hacknutý Facebook účet — krok za krokom k obnove | socialne-siete | subenai-editorial | planned | High-volume keyword; SK-specific recovery flow. |
| 14:30 | C23 | deepfake-video-ako-spoznat | Deepfake video — ako spoznať umelo vytvorené tváre a hlasy | ai-scamy | subenai-editorial | planned | Visual artifacts examples. Links up to P5. |
| 15:45 | C28 | silne-heslo-2026-vs-passkey | Silné heslo v roku 2026 vs. passkey — čo je naozaj bezpečné | digital-security | subenai-editorial | planned | Links up to P6. |
| 17:00 | C34 | kviz-rozpoznas-phishingovy-email | Kvíz: Rozpoznáš phishingový email? Otestuj sa za 3 minúty | kvizy | subenai-editorial | planned | Multiple BlogScenarioCards inline. Heavy CTA to `/test`. |

Pipeline assignments (5 parallel slots; cycle through articles as gates clear):
- Slot A → C24 → C8 → C28
- Slot B → C13 → C18 → C34
- Slot C → C6 → C23
- Slot D → C1
- Slot E → research-ahead on D7 batch

End-of-day gate: 9 cluster articles live; every article links up to its pillar; lateral sibling links resolve; lint 0/0; no console errors on rendered preview pages.

### D7 — 2026-05-25 (Sunday) — Cluster blast day 2 (white-space continued)
Status: planned
Articles publishing today (count: 9):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | C15 | bazos-vinted-marketplace-podvody | Bazoš, Vinted a marketplace podvody — ako sa nedať okradnúť | fake-eshopy | subenai-editorial | planned | White-space #3. High-traffic. Cash-on-delivery NBS angle. |
| 08:15 | C19 | romance-scam-laska-cez-internet | Romance scam — keď „láska z internetu" pýta peniaze | socialne-siete | subenai-editorial | planned | White-space #7. legal:compliance-check mandatory. Links up to P4. |
| 09:30 | C52 | overit-telefonne-cislo-kto-mi-vola | Ako zistiť, kto mi volal — overenie podozrivého čísla | seo-magnets | subenai-editorial | planned | White-space #12. Massive volume (~1900/mo). Links up to P2. |
| 10:45 | C2 | phishing-cez-google-formulare | Phishing cez Google formuláre — nová vlna 2026 | phishing-a-emaily | subenai-editorial | planned | Trendy 2026; cite SK-CERT advisory. |
| 12:00 | C9 | sms-z-banky-overit-ci-je-pravda | SMS z banky — ako za 20 sekúnd overiť, či je pravá | sms-a-telefon | subenai-editorial | planned | Bank-by-bank verification steps. |
| 13:15 | C14 | podvodne-reklamy-facebook-instagram-eshop | Podvodné reklamy na Facebooku a Instagrame — falošné e-shopy s neuveriteľnými zľavami | fake-eshopy | subenai-editorial | planned | Crossover with P4. |
| 14:30 | C25 | chatgpt-podvody-falosne-investicie | ChatGPT, AI bot a falošné investičné poradenstvo | ai-scamy | subenai-editorial | planned | Cite ESMA / NBS warnings. |
| 15:45 | C29 | spravca-hesiel-porovnanie | Správca hesiel — porovnanie 5 najlepších pre rok 2026 | digital-security | subenai-editorial | planned | Pairs with C63 (D13). |
| 17:00 | C35 | kviz-falosny-eshop-alebo-pravy | Kvíz: Falošný e-shop alebo pravý? 10 obchodov, 10 rozhodnutí | kvizy | subenai-editorial | planned | Visual quiz; share-card prominent. |

Pipeline assignments:
- Slot A → C15 → C9 → C29
- Slot B → C19 → C14 → C35
- Slot C → C52 → C25
- Slot D → C2
- Slot E → research-ahead on D8 batch

End-of-day gate: D6 + D7 = 18 cluster articles live; sitemap regen verified.

### D8 — 2026-05-26 (Monday) — Cluster blast day 3 (news + trends + crypto)
Status: planned
Articles publishing today (count: 9):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | C57 | nove-techniky-phishingu-2026 | Nové techniky phishingu, ktoré sa objavili v roku 2026 | news-trendy | subenai-editorial | planned | White-space #11 (quishing). Links up to P1. |
| 08:15 | C59 | krypto-podvody-2026-pump-and-dump | Krypto podvody 2026 — pump-and-dump, rug pull, fake ICO | news-trendy | subenai-editorial | planned | White-space #8. YMYL; extra source rigor. Links up to P5. |
| 09:30 | C3 | spear-phishing-vs-bezny-phishing | Spear phishing vs. bežný phishing — rozdiel ktorý vás môže stáť všetko | phishing-a-emaily | subenai-editorial | planned | B2B angle. |
| 10:45 | C10 | hovor-od-falosneho-policajta-co-robit | Hovor od „policajta" alebo „úradníka" — taktika, znaky, obrana | sms-a-telefon | subenai-editorial | planned | Reference recent SK cases (anonymized). |
| 12:00 | C16 | dropshipping-vs-podvodny-eshop | Dropshipping vs. podvodný e-shop — kde je hranica | fake-eshopy | subenai-editorial | planned | Nuanced framing. |
| 13:15 | C20 | fake-profily-instagram-tiktok | Fake profily na Instagrame a TikToku — ako spoznať falošný účet | socialne-siete | subenai-editorial | planned | Visual examples. |
| 14:30 | C26 | ai-generovane-fotky-fake-profily | AI generované fotky vo falošných profiloch — thispersondoesnotexist signály | ai-scamy | subenai-editorial | planned | Image forensics tips. |
| 15:45 | C30 | vpn-ci-naozaj-potrebujem | VPN — naozaj ju potrebujete a kedy nie | digital-security | subenai-editorial | planned | Anti-hype angle. Pairs with C64 (D13). |
| 17:00 | C36 | kviz-scam-sms-rozpozna | Kvíz: Rozpoznáš scam SMS od pravej? | kvizy | subenai-editorial | planned | Mobile-first design. |

Pipeline assignments:
- Slot A → C57 → C10 → C30
- Slot B → C59 → C16 → C36
- Slot C → C3 → C20
- Slot D → C26
- Slot E → research-ahead on D9 batch

End-of-day gate: 27 cluster articles total; news/trends category fully launched; quishing pillar reference live.

### D9 — 2026-05-27 (Tuesday) — Cluster blast day 4 (action guides + first stories)
Status: planned
Articles publishing today (count: 9):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | C51 | nechcene-platby-z-uctu-co-robit | Nechcené platby z účtu — ako reagovať, ak sa vám niekto dostal ku karte | seo-magnets | subenai-editorial | planned | White-space #10 (first-60-min surface). Links up to P6. |
| 08:15 | C40 | pribeh-romance-scam-rok-laska | Rok lásky, ktorá neexistovala — príbeh romance scamu zo Slovenska | pribehy | subenai-editorial | planned | White-space #7 (story layer). Sensitive; legal gate. Links up to P7. |
| 09:30 | C4 | podvodne-emaily-z-banky-ako-spoznat | Podvodné emaily z banky — ako rýchlo spoznať falošnú správu | phishing-a-emaily | subenai-editorial | planned | Heavy bank-entity coverage (VÚB, SLSP, ČSOB, Tatra, mBank). |
| 10:45 | C11 | one-ring-scam-zmeskany-hovor-zo-zahranicia | „One-ring" scam — zmeškaný hovor zo zahraničia a prémiová linka | sms-a-telefon | subenai-editorial | planned | Country-code blocklist table. |
| 12:00 | C17 | reklamacia-z-podvodneho-eshopu | Nedostal som tovar z e-shopu — ako reklamovať a získať peniaze späť | fake-eshopy | subenai-editorial | planned | Transactional secondary intent. Links up to P3. |
| 13:15 | C21 | podvodne-sutaze-a-giveawayy | Podvodné súťaže a giveawayy na sociálnych sieťach | socialne-siete | subenai-editorial | planned | Phishing crossover. |
| 14:30 | C27 | ai-phishing-personalizovany-podvod | AI phishing — keď AI píše podvody na mieru | ai-scamy | subenai-editorial | planned | Forward-looking; cite Anthropic / OpenAI reports. |
| 15:45 | C31 | verejna-wifi-rizika-a-obrana | Verejná Wi-Fi — riziká, mýty a reálna obrana | digital-security | subenai-editorial | planned | Bust HTTPS myths. |
| 17:00 | C37 | kviz-internetova-bezpecnost-pre-rodicov | Kvíz pre rodičov: Ako dobre poznáte digitálny svet svojich detí? | kvizy | subenai-editorial | planned | Emotional hook; FB group share-bait. Links up to P8. |

Pipeline assignments:
- Slot A → C51 → C11 → C31
- Slot B → C40 → C17 → C37
- Slot C → C4 → C21
- Slot D → C27
- Slot E → research-ahead on D10 batch

End-of-day gate: 36 cluster articles total; D6–D9 = 36 ≈ batch A target of 35 (one carryforward absorbed); E-shop and Phishing primary clusters fully published.

### D10 — 2026-05-28 (Wednesday) — Cluster blast day 5 (stories + Telegram + brand quiz)
Status: planned
Articles publishing today (count: 9):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | C42 | pribeh-deepfake-ceo-firma | Deepfake CEO — ako firma stratila 50 000 € v jednom hovore | pribehy | subenai-editorial | planned | B2B-leaning. Cite real EU/UK cases by name. Links up to P5. |
| 08:15 | C41 | pribeh-senior-falosny-policajt | „Volali z polície" — ako starší pán prišiel o úspory za 20 minút | pribehy | subenai-editorial | planned | Cautionary tale; links up to P7 (story) + P8 (audience). |
| 09:30 | C39 | pribeh-naletela-som-na-podvod-banka | „Naletela som na bankový podvod" — príbeh Slovenky, ktorá prišla o 4 800 € | pribehy | subenai-editorial | planned | Anonymized real case; legal gate. |
| 10:45 | C5 | phishing-na-balikovu-zasielku | Phishing cez balíkové zásielky — Packeta, Slovak Post, GLS | phishing-a-emaily | subenai-editorial | planned | Reflect Slovenská pošta → Slovak Post rebrand. |
| 12:00 | C12 | ako-blokovat-spam-volania-android-iphone | Ako účinne blokovať spam volania na Androide a iPhone | sms-a-telefon | subenai-editorial | planned | App comparison. Commercial intent. |
| 13:15 | C22 | telegram-whatsapp-scam-skupiny | Telegram a WhatsApp scam skupiny — investičné, krypto, „práca z domu" | socialne-siete | subenai-editorial | planned | Links up to P5 (deepfake CEO crossover). |
| 14:30 | C32 | aktualizacie-systemu-preco-su-dolezite | Prečo sú aktualizácie systému dôležitejšie, než si myslíte | digital-security | subenai-editorial | planned | Cite real CVE → exploit timelines. |
| 15:45 | C33 | zalohovanie-dat-3-2-1-pravidlo | Zálohovanie dát — pravidlo 3-2-1 pre normálnych ľudí | digital-security | subenai-editorial | planned | Ransomware angle; secondary link to P1. |
| 17:00 | C38 | kviz-iq-internet-bezpecnost | Internet IQ test — aký je váš skutočný digitálny rozum? | kvizy | subenai-editorial | planned | Brand-anchored. Strongest CTA to `/test` in the corpus. |

Pipeline assignments:
- Slot A → C42 → C12 → C33
- Slot B → C41 → C22 → C38
- Slot C → C39 → C32
- Slot D → C5
- Slot E → research-ahead on D11 batch

End-of-day gate: 45 cluster articles total. Stories category fully published. Quiz category fully published.

### D11 — 2026-05-29 (Thursday) — Cluster blast day 6 (rodičia + psychológia complete)
Status: planned
Articles publishing today (count: 9):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | C7 | ochrana-pred-phishingom-2fa-passkey | Ochrana pred phishingom — 2FA, passkeys a hardvérové kľúče vysvetlené | phishing-a-emaily | subenai-editorial | planned | Commercial-lean. Pairs with C65 (D13). Closes phishing cluster. |
| 08:15 | C43 | rodicovska-kontrola-iphone-android | Rodičovská kontrola na iPhone a Androide — praktický návod | rodicia-a-seniori | subenai-editorial | planned | High-volume; pairs with C69 (D13). |
| 09:30 | C44 | kyberšikana-co-robit | Kyberšikana — ako spoznať, čo robiť, kam volať | rodicia-a-seniori | subenai-editorial | planned | Cite IPčko, Linka detskej istoty 116 111. |
| 10:45 | C45 | senior-prvy-smartfon-bezpecnost | Senior dostal prvý smartfón — bezpečnostné minimum pre rodinu | rodicia-a-seniori | subenai-editorial | planned | Practical setup guide. |
| 12:00 | C46 | ako-hovorit-s-detmi-o-podvodoch | Ako hovoriť s deťmi o podvodoch online — podľa veku | rodicia-a-seniori | subenai-editorial | planned | Age-bracketed (6–9, 10–13, 14–17). |
| 13:15 | C47 | naliehavost-ako-zbran-podvodnika | Naliehavosť ako zbraň — prečo „okamžite konajte" funguje | psychologia | subenai-editorial | planned | Behavioral econ angle. |
| 14:30 | C48 | autorita-policia-banka-manipulacia | Autorita ako trik — keď podvodník hrá políciu alebo banku | psychologia | subenai-editorial | planned | Crossover with C10 + C4. |
| 15:45 | C49 | strach-vs-hramotnost-strachu | Strach ako spúšťač — ako podvodníci využívajú paniku | psychologia | subenai-editorial | planned | Short, evergreen explainer. |
| 17:00 | C50 | preco-aj-inteligentni-ludia-naletia | Prečo aj inteligentní ľudia naletia na podvody — 5 kognitívnych pascí | psychologia | subenai-editorial | planned | Removes shame stigma; share-bait. |

Pipeline assignments:
- Slot A → C7 → C46 → C50
- Slot B → C43 → C47
- Slot C → C44 → C48
- Slot D → C45 → C49
- Slot E → research-ahead on D12 batch

End-of-day gate: 54 cluster articles total. Phishing, rodičia/seniori, and psychológia categories all 100% complete.

### D12 — 2026-05-30 (Friday) — Cluster blast day 7 (SEO magnets + news + product start)
Status: planned
Articles publishing today (count: 8):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | C53 | uniknute-heslo-overit-haveibeenpwned | Uniklo mi heslo? Ako overiť na haveibeenpwned a čo robiť ďalej | seo-magnets | subenai-editorial | planned | Tool tutorial. Links up to P6. |
| 08:15 | C54 | falosna-faktura-email-co-robit | Falošná faktúra v emaile — ako sa nedať okradnúť | seo-magnets | subenai-editorial | planned | SMB-leaning. Links up to P1. |
| 09:30 | C55 | recenzie-na-eshope-falosne-rozpoznat | Falošné recenzie — ako spoznať platené hodnotenia | seo-magnets | subenai-editorial | planned | Tools: ReviewMeta, Fakespot. Links up to P3. |
| 10:45 | C56 | top-podvody-slovensko-2026 | TOP podvody na Slovensku v roku 2026 — prehľad od polície a SK-CERT | news-trendy | subenai-editorial | planned | Live-updated; quarterly refresh. |
| 12:00 | C58 | rebrand-slovenska-posta-slovak-post-podvody | Rebrand Slovenská pošta → Slovak Post — pozor na nové podvodné domény | news-trendy | subenai-editorial | planned | 2026-specific. Verify via WebSearch before publish. |
| 13:15 | C60 | ai-akt-eu-co-znamena-pre-bezneho-cloveka | EU AI Act 2026 — čo znamená pre bežného Slováka pri ochrane pred AI podvodmi | news-trendy | subenai-editorial | planned | Cite official EU sources. |
| 14:30 | C61 | najlepsi-antivirus-2026-slovensko | Najlepší antivírus 2026 pre Slovensko — porovnanie 6 možností | produkty | subenai-editorial | planned | Affiliate-ready; ESET (SK!) fair treatment. |
| 15:45 | C62 | eset-vs-bitdefender-vs-kaspersky | ESET vs. Bitdefender vs. Kaspersky — ktorý vyhráva v roku 2026 | produkty | subenai-editorial | planned | Detection / perf / privacy comparison. |

Pipeline assignments:
- Slot A → C53 → C56 → C61
- Slot B → C54 → C58 → C62
- Slot C → C55 → C60
- Slot D → research-ahead on D13 batch
- Slot E → research-ahead on D13 batch

End-of-day gate: 62 cluster articles total. SEO magnets and news/trendy categories 100% complete.

### D13 — 2026-05-31 (Saturday) — Cluster blast day 8 (product completion + distribution start)
Status: planned
Articles publishing today (count: 8):

| publish_time_sk | id | slug | working_title | category | author | status | notes |
|---|---|---|---|---|---|---|---|
| 07:00 | C63 | najlepsi-spravca-hesiel-porovnanie-2026 | Najlepší správca hesiel 2026 — 1Password, Bitwarden, Proton Pass | produkty | subenai-editorial | planned | Comparison-pad; pairs with C29. |
| 08:15 | C64 | najlepsia-vpn-2026-slovensko | Najlepšia VPN 2026 pre Slovákov — Mullvad, Proton, NordVPN | produkty | subenai-editorial | planned | High competition; privacy-ethics differentiation. |
| 09:30 | C65 | yubikey-vs-google-titan-vs-passkey | YubiKey vs. Google Titan vs. softvérový passkey | produkty | subenai-editorial | planned | High-intent niche. Links up to P1. |
| 10:45 | C66 | platobne-karty-virtualne-revolut-wise | Virtuálne platobné karty na bezpečné online nákupy — Revolut, Wise, banky | produkty | subenai-editorial | planned | Highly transactional. Links up to P9. |
| 12:00 | C67 | poistenie-proti-kybernetickym-podvodom | Poistenie proti kybernetickým podvodom — má zmysel pre bežnú rodinu? | produkty | subenai-editorial | planned | Emerging SK category; cite Allianz / Kooperativa. |
| 13:15 | C68 | sluzby-monitoring-uniku-dat | Služby monitoringu úniku osobných údajov — porovnanie | produkty | subenai-editorial | planned | HIBP, Mozilla Monitor, dedicated services. |
| 14:30 | C69 | rodicovska-kontrola-aplikacie-porovnanie | Rodičovská kontrola — porovnanie 5 aplikácií pre rok 2026 | produkty | subenai-editorial | planned | Comparison-pad; pairs with C43. |
| 15:45 | C70 | internet-iq-test-pre-firmy-zamestnancov | Internet IQ test pre firmy — vyškoľte zamestnancov za 15 minút | produkty | subenai-editorial | planned | B2B CTA → custom test product. Highest commercial intent in catalogue. |

Pipeline assignments:
- Slot A → C63 → C67
- Slot B → C64 → C68
- Slot C → C65 → C69
- Slot D → C66 → C70
- Slot E → E16.20 distribution prep starts in parallel (social snippets per pillar)

End-of-day gate: 70 cluster articles total; all 80 articles (10 pillars + 70 clusters) live on preview deploy; E16.20 distribution snippets drafted; CHANGELOG entry for the wave staged.

### D14 — 2026-06-01 (Sunday) — Distribution, final audit, carryover absorption
Status: planned
Articles publishing today (count: 0 base; up to N if any carry over from earlier days).

Stories executing today:
- E16.20 — Distribution: 5 social snippets per pillar (50 total) prepared and queued; admin dashboard widget for blog metrics wired.
- E16.21 — Performance audit: Lighthouse on a sample of 5 articles (1 pillar, 4 clusters across categories); JSON-LD revalidation; sitemap.xml diff vs. published rows; RSS feed validation; lint 0/0; full Vitest green; build clean; fresh-context code review on the entire `feature/E16-blog` branch.
- Carryover absorption — any article still in `drafting` or `gates_pending` at the end of D13 publishes today at the next free stagger slot starting 07:00.
- Merge `feature/E16-blog` → `main` once E16.21 audit passes. CHANGELOG entry for the bulk phase finalized.

End-of-day gate: branch pushed, PR open, all gates green. (Per CLAUDE.md, the agent stops at "PR ready to open"; user merges.)

## 4. Author / publisher metadata

- All 80 articles authored by `subenai-editorial` (single byline, per locked decision #1 in `PLAN-2026-05-19-blog-content-engine.md`). Frontmatter on every MDX seed file sets `author_slug: subenai-editorial`. One row in `blog_authors` seeded in E16.1.
- All 80 articles are in Slovak (`language: sk` on every `blog_posts` row, per locked decision #4). The `language` column is reserved for future EN/CS translations deferred to E18; no translation routes ship in E16.

## 5. Tracking columns reference

Each row in §3 carries a `status` field. The lifecycle:

`planned` → `research_done` → `outline_done` → `drafting` → `gates_pending` → `ready_to_publish` → `published`

Per-step semantics:
- `planned` — calendar row exists; no work started.
- `research_done` — `tasks/blog/research/<slug>.md` exists; ≥3 unique sources cited; recency check passes.
- `outline_done` — `tasks/blog/outlines/<slug>.md` exists; H1 matches primary keyword (or top-10 semantic variant); H2 tree covers top-5 PAA questions.
- `drafting` — `src/content/blog/<slug>.mdx` exists; word count in target band (pillar 2200–3000; cluster 1100–1800).
- `gates_pending` — draft complete; brand / UX / a11y / SEO / engineering / (conditional) legal gates running.
- `ready_to_publish` — all gates green; row ready for seed-script insertion into `blog_posts`.
- `published` — `blog_posts` row exists with `status='published'` and the day's stagger `published_at`; URL renders on preview deploy.

A draft that fails any quality gate flips back to `drafting`, the failing gate's feedback is incorporated, and the article re-enters the pipeline at the gate that failed. The status column in §3 is updated in place as work progresses so the calendar always shows current state without needing a separate kanban.

## 6. Carryover policy

If a wave slips — e.g., D4 publishes only 4 of 5 pillars because one fails the SEO audit gate mid-day — the unsent article carries to the **next day's leading slot**, displacing nothing else. The slipped article inherits the next day's earliest stagger time (07:00 on pillar days, 07:00 on cluster days) and the originally scheduled D+1 articles shift one slot later in the cadence. If D+1 was already at capacity (9-article day), the last D+1 article carries to D+2 instead, propagating forward. D14 is the catch-up day: anything still unpublished by end-of-D13 ships on D14 alongside distribution work, with stagger times allocated starting 07:00 and spaced ≥45 minutes apart. No article is dropped from the corpus; the contract is that all 80 articles (10 pillars + 70 clusters) ship by end-of-D14.
