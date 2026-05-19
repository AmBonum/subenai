# Keyword Map — SubenAI Blog Content Engine (E16.5)

_Internal artifact. Source of truth for primary + secondary keywords across all 80 planned articles. Consumed by every downstream agent in the article pipeline (outline → draft → SEO audit)._

## Methodology

This map covers 80 articles: 10 pillar pages (P1–P10) and 70 cluster articles (C1–C70), grouped by the 15 content categories from `PLAN-2026-05-19-blog-content-engine.md`. Each row pins one **unique primary keyword** to one article — primaries do not duplicate across the catalogue, which prevents internal cannibalization on day one. Secondary keywords (3–5 per row) are intentionally allowed to overlap; that is how clusters reinforce a pillar in semantic search.

Volume and difficulty estimates are directional. SubenAI does not yet have Ahrefs/Semrush access, so figures are best-effort estimates based on (a) general SK SERP intuition, (b) known monthly search patterns for the underlying English keyword scaled down by ~10–20× for the SK market, (c) public SK news/Google Trends signals for scam vocabulary in 2026 (deepfake wave, post-Slovenská pošta rebrand to Slovak Post, AI voice cloning incidents, NBS / SK-CERT advisories). All numeric estimates carry a `~` prefix to mark them as estimates, not measurements. Difficulty is on a 1–100 scale where 1 = trivial long-tail and 100 = locked-up by NBS/SK-CERT/banking portals.

How to read a row:
- **id** — `P1`–`P10` for pillars, `C1`–`C70` for clusters. Cluster numbering follows the wave order in the Epic Map (C1–C7 = Phishing cluster, C8–C12 = SMS, etc.).
- **wave** — production wave per the revised 2-week bulk plan (`D4–D5` for pillars; `D6–D9` batch A; `D10–D13` batch B).
- **slug** — final URL slug. Kebab-case, diacritics stripped.
- **working_title** — Slovak title used as the H1 draft input. May be tightened by the outline agent before draft.
- **primary_keyword** — the single keyword the article ranks for. Unique across this file.
- **secondary_keywords** — 3–5 supporting SK terms / variants. Comma-separated.
- **search_intent** — `informational` / `commercial` / `navigational` / `transactional`.
- **est_volume_sk** — monthly SK search volume estimate (low / medium / high or a range, all prefixed `~`).
- **est_difficulty** — 1–100 directional KD score, prefixed `~`.
- **pillar_link** — the pillar this cluster links up to. `—` for pillars themselves.
- **notes** — production notes: SERP quirks, NBS/SK-CERT angle, FAQ block flags, BlogScenarioCard embed hints.

---

## 1. Phishing a emailové podvody (P1 + C1–C7)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | D4–D5 | phishing-kompletny-sprievodca | Phishing — kompletný sprievodca: čo to je, ako funguje, ako sa brániť | phishing | phishingový útok, ako rozpoznať phishing, phishingový email, ochrana pred phishingom, phishing slovensko | informational | ~2400/mo | ~58 | — | Pillar. NBS + SK-CERT citations mandatory. FAQ block (8 Q&A). 2 BlogScenarioCards. |
| C1 | D6–D9 | ako-rozpoznat-phishingovy-email-za-10-sekund | Ako rozpoznať phishingový email za 10 sekúnd | ako rozpoznat phishingovy email | znaky phishingu, podozrivy email, falosny email banka, kontrola odosielatela | informational | ~480/mo | ~32 | P1 | High-CTR listicle format. Inline screenshot grid. |
| C2 | D6–D9 | phishing-cez-google-formulare | Phishing cez Google formuláre — nová vlna 2026 | google forms phishing | google formular podvod, phishing cez formulare, podvodny dotaznik | informational | ~110/mo | ~22 | P1 | Trendy 2026; cite SK-CERT advisory. |
| C3 | D6–D9 | spear-phishing-vs-bezny-phishing | Spear phishing vs. bežný phishing — rozdiel ktorý vás môže stáť všetko | spear phishing | cieleny phishing, phishing na firmu, business email compromise sk | informational | ~140/mo | ~36 | P1 | B2B angle; link to "internet safety pre študentov" pillar for student-employee story. |
| C4 | D6–D9 | podvodne-emaily-z-banky-ako-spoznat | Podvodné emaily z banky — ako rýchlo spoznať falošnú správu | podvodny email banka | falosny email vub, falosny email slsp, banka phishing, overenie spravy z banky | informational | ~590/mo | ~44 | P1 | Heavy bank-specific entity coverage (VÚB, SLSP, ČSOB, Tatra, mBank). |
| C5 | D6–D9 | phishing-na-balikovu-zasielku | Phishing cez balíkové zásielky — Packeta, Slovak Post, GLS | phishing balikova zasielka | packeta podvod, slovenska posta phishing, gls podvodny email, dpd phishing | informational | ~720/mo | ~38 | P1 | Reflect Slovenská pošta → Slovak Post rebrand. Hot keyword in 2026. |
| C6 | D6–D9 | co-robit-ked-som-klikol-na-phishing | Čo robiť, keď som klikol na phishingový odkaz | klikol som na phishing | co robit po phishingu, zmena hesla po phishingu, ohlasenie phishingu sk | informational | ~210/mo | ~28 | P1 | Step-by-step action guide. CTA: nahlásiť na NBÚ + SK-CERT. |
| C7 | D6–D9 | ochrana-pred-phishingom-2fa-passkey | Ochrana pred phishingom — 2FA, passkeys a hardvérové kľúče vysvetlené | ochrana pred phishingom | dvojfaktorove overenie, passkey slovensko, yubikey, autentifikator aplikacia | informational | ~260/mo | ~40 | P1 | Commercial-lean intent; mention specific products (YubiKey, Authy, MS Authenticator). |

## 2. Scam SMS a telefonické podvody (P2 + C8–C12)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P2 | D4–D5 | scam-sms-a-podvodne-hovory | Scam SMS a podvodné hovory — ako rozpoznať a čo robiť | scam sms | podvodne sms, podvodny hovor, smishing, vishing, podvod telefonom | informational | ~1300/mo | ~52 | — | Pillar. 3 BlogScenarioCards (SMS, hovor, kombinácia). FAQ block. |
| C8 | D6–D9 | 12-najcastejsich-podvodnych-sms-2026 | 12 najčastejších podvodných SMS na Slovensku v roku 2026 | podvodne sms slovensko | najcastejsie scam sms, falosna sms, sms podvod priklady | informational | ~390/mo | ~30 | P2 | Listicle with real screenshots (anonymized). High share-bait potential. |
| C9 | D6–D9 | sms-z-banky-overit-ci-je-pravda | SMS z banky — ako za 20 sekúnd overiť, či je pravá | falosna sms z banky | sms podvod banka, overit sms banka, sms slsp podvod, vub sms phishing | informational | ~620/mo | ~42 | P2 | Bank-by-bank verification steps. |
| C10 | D6–D9 | hovor-od-falosneho-policajta-co-robit | Hovor od „policajta" alebo „úradníka" — taktika, znaky, obrana | falosny policajt telefon | podvodny hovor policia, hovor od uradnika podvod, sociálne inzinierstvo telefon | informational | ~270/mo | ~26 | P2 | Reference recent SK news cases (anonymized). |
| C11 | D6–D9 | one-ring-scam-zmeskany-hovor-zo-zahranicia | „One-ring" scam — zmeškaný hovor zo zahraničia a prémiová linka | one ring scam | zmeskany hovor zo zahranicia, premiove cislo podvod, wangiri scam | informational | ~95/mo | ~18 | P2 | Add country code blocklist table. |
| C12 | D6–D9 | ako-blokovat-spam-volania-android-iphone | Ako účinne blokovať spam volania na Androide a iPhone | blokovanie spam volani | blokovat cislo iphone, blokovat spam android, hiya, truecaller slovensko | commercial | ~480/mo | ~34 | P2 | App comparison. Strong commercial intent. |

## 3. Fake e-shopy a marketplace podvody (P3 + C13–C17)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P3 | D4–D5 | fake-eshopy-ako-odhalit | Fake e-shopy: ako odhaliť podvodný obchod a chrániť svoje peniaze | fake eshop | falosny eshop, podvodny eshop, overit eshop, eshop podvod | informational | ~720/mo | ~46 | — | Pillar. Link to SOI register check. |
| C13 | D6–D9 | ako-overit-eshop-pred-nakupom-7-krokov | Ako overiť e-shop pred nákupom — 7 krokov za 2 minúty | overit eshop pred nakupom | kontrola eshopu, dovera eshop, soi register, heureka overeny | informational | ~310/mo | ~32 | P3 | Includes SOI + Heureka + WHOIS lookup. |
| C14 | D6–D9 | podvodne-reklamy-facebook-instagram-eshop | Podvodné reklamy na Facebooku a Instagrame — falošné e-shopy s neuveriteľnými zľavami | podvodna reklama facebook | falosny eshop facebook, instagram reklama podvod, neuveritelne zlavy podvod | informational | ~440/mo | ~40 | P3 | Crossover with social-media cluster; secondary link to P4. |
| C15 | D6–D9 | bazos-vinted-marketplace-podvody | Bazoš, Vinted a marketplace podvody — ako sa nedať okradnúť | bazos podvod | vinted podvod, marketplace podvod, fake kupujuci, fake predavajuci | informational | ~860/mo | ~36 | P3 | Top-traffic page; SK marketplace ecosystem. Strong NBS angle on cash-on-delivery scams. |
| C16 | D6–D9 | dropshipping-vs-podvodny-eshop | Dropshipping vs. podvodný e-shop — kde je hranica | dropshipping podvod | dropshipping slovensko, lacny eshop podvod, podvodny obchod cina | informational | ~150/mo | ~26 | P3 | Nuanced; not all dropshipping is scam. |
| C17 | D6–D9 | reklamacia-z-podvodneho-eshopu | Nedostal som tovar z e-shopu — ako reklamovať a získať peniaze späť | reklamacia eshop podvod | chargeback slovensko, vratenie penazi karta, soi staznost eshop | informational | ~340/mo | ~30 | P3 | Strong transactional/action-oriented secondary intent. |

## 4. Sociálne siete a manipulácia (P4 + C18–C22)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P4 | D4–D5 | podvody-na-socialnych-sietach | Podvody na sociálnych sieťach — Facebook, Instagram, TikTok | podvody na socialnych sietach | facebook podvod, instagram podvod, tiktok podvod, social media scam | informational | ~590/mo | ~48 | — | Pillar covers FB/IG/TT/LinkedIn/Telegram. |
| C18 | D6–D9 | hacknuty-facebook-ucet-co-robit | Hacknutý Facebook účet — krok za krokom k obnove | hacknuty facebook | ukradnuty facebook, obnova facebook uctu, facebook bezpecnost | informational | ~1100/mo | ~50 | P4 | Massive volume; SERP dominated by FB help docs — we differentiate with SK-specific recovery flow. |
| C19 | D6–D9 | romance-scam-laska-cez-internet | Romance scam — keď „láska z internetu" pýta peniaze | romance scam | online laska podvod, podvod cez tinder, znamost cez facebook podvod | informational | ~210/mo | ~24 | P4 | Sensitive topic; legal:compliance-check gate. |
| C20 | D6–D9 | fake-profily-instagram-tiktok | Fake profily na Instagrame a TikToku — ako spoznať falošný účet | fake profil instagram | falosny ucet instagram, overit profil instagram, bot ucet tiktok | informational | ~260/mo | ~28 | P4 | Visual-heavy; lots of inline examples. |
| C21 | D6–D9 | podvodne-sutaze-a-giveawayy | Podvodné súťaže a giveawayy na sociálnych sieťach | podvodne sutaze facebook | fake giveaway, podvodna sutaz instagram, fake vyhra | informational | ~180/mo | ~24 | P4 | Crossover with Phishing cluster (link-clicks). |
| C22 | D6–D9 | telegram-whatsapp-scam-skupiny | Telegram a WhatsApp scam skupiny — investičné, krypto, „práca z domu" | telegram podvod | whatsapp investicna skupina podvod, krypto skupina podvod telegram, praca z domu podvod | informational | ~330/mo | ~32 | P4 | Hot 2026 vector; link to AI pillar (deepfake CEO). |

## 5. AI a moderné online podvody (P5 + C23–C27)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P5 | D4–D5 | ai-a-moderne-podvody-deepfake-voice-cloning | AI a moderné podvody — deepfake, voice cloning, AI phishing | ai podvody | deepfake podvod, voice cloning podvod, ai phishing, umela inteligencia podvod | informational | ~520/mo | ~44 | — | Pillar. Rapidly growing 2026 topic. Cite EU AI Act + SK-CERT 2025/2026 reports. |
| C23 | D6–D9 | deepfake-video-ako-spoznat | Deepfake video — ako spoznať umelo vytvorené tváre a hlasy | deepfake ako spoznat | deepfake detekcia, falosne video, ai vygenerovane video, fake video celebrita | informational | ~410/mo | ~38 | P5 | Visual examples (artifacts on teeth, blinks, edges). |
| C24 | D6–D9 | klonovanie-hlasu-podvod-volanie-rodina | Klonovanie hlasu — keď vám zavolá „dcéra" a pýta peniaze | klonovanie hlasu podvod | voice cloning slovensko, ai hlas podvod, telefonat od rodiny podvod | informational | ~120/mo | ~20 | P5 | Senior-targeted; crossover with P8. |
| C25 | D6–D9 | chatgpt-podvody-falosne-investicie | ChatGPT, AI bot a falošné investičné poradenstvo | chatgpt podvod | falosna ai investicia, ai bot podvod, chat gpt poradca podvod | informational | ~180/mo | ~22 | P5 | Cite ESMA / NBS warnings on AI investment shilling. |
| C26 | D6–D9 | ai-generovane-fotky-fake-profily | AI generované fotky vo falošných profiloch — thispersondoesnotexist signály | ai generovane fotky | fake profil ai fotka, thispersondoesnotexist, stylegan fake fotka | informational | ~95/mo | ~26 | P5 | Technical-but-accessible; image forensics tips. |
| C27 | D6–D9 | ai-phishing-personalizovany-podvod | AI phishing — keď AI píše podvody na mieru | ai phishing | personalizovany phishing, llm phishing, gpt phishing email | informational | ~70/mo | ~28 | P5 | Forward-looking; cite Anthropic / OpenAI safety reports. |

## 6. Digitálna bezpečnosť pre bežných ľudí (P6 + C28–C33)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P6 | D4–D5 | digitalna-bezpecnost-kompletny-navod | Digitálna bezpečnosť pre bežných ľudí — kompletný návod | digitalna bezpecnost | online bezpecnost, kyberneticka bezpecnost pre laikov, internet a bezpecnost | informational | ~720/mo | ~50 | — | Pillar. Anchors all "cyber hygiene" clusters too. |
| C28 | D6–D9 | silne-heslo-2026-vs-passkey | Silné heslo v roku 2026 vs. passkey — čo je naozaj bezpečné | silne heslo | bezpecne heslo, passkey vs heslo, manazer hesiel, generator hesiel | informational | ~480/mo | ~36 | P6 | Mention 1Password, Bitwarden, iCloud Keychain, Google PM. |
| C29 | D6–D9 | spravca-hesiel-porovnanie | Správca hesiel — porovnanie 5 najlepších pre rok 2026 | spravca hesiel | password manager slovensko, 1password vs bitwarden, najlepsi spravca hesiel | commercial | ~310/mo | ~38 | P6 | Affiliate-ready; commercial intent. |
| C30 | D6–D9 | vpn-ci-naozaj-potrebujem | VPN — naozaj ju potrebujete a kedy nie | vpn slovensko | potrebujem vpn, vpn na verejnej wifi, najlepsie vpn 2026, vpn alebo nie | commercial | ~880/mo | ~52 | P6 | High-competition; differentiate with anti-hype angle. |
| C31 | D6–D9 | verejna-wifi-rizika-a-obrana | Verejná Wi-Fi — riziká, mýty a reálna obrana | verejna wifi bezpecnost | rizika verejnej wifi, kavarna wifi, hotspot bezpecnost, wifi cudzia siet | informational | ~190/mo | ~30 | P6 | Bust common myths (HTTPS already protects much). |
| C32 | D6–D9 | aktualizacie-systemu-preco-su-dolezite | Prečo sú aktualizácie systému dôležitejšie, než si myslíte | aktualizacie systemu bezpecnost | windows update bezpecnost, ios update preco, android aktualizacie | informational | ~150/mo | ~24 | P6 | Cite real CVE → exploit timelines. |
| C33 | D6–D9 | zalohovanie-dat-3-2-1-pravidlo | Zálohovanie dát — pravidlo 3-2-1 pre normálnych ľudí | zalohovanie dat | 3-2-1 zaloha, backup pravidlo, cloudovy backup, externy disk zaloha | informational | ~220/mo | ~28 | P6 | Touches ransomware angle; secondary link to phishing pillar. |

## 7. Kvízy a interaktívne (C34–C38, cluster-only — links to P6)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| C34 | D6–D9 | kviz-rozpoznas-phishingovy-email | Kvíz: Rozpoznáš phishingový email? Otestuj sa za 3 minúty | kviz phishing | test phishing, rozpoznas phishing, internetova bezpecnost test | informational | ~140/mo | ~24 | P1 | Strong embed slot — multiple BlogScenarioCards inline. |
| C35 | D6–D9 | kviz-falosny-eshop-alebo-pravy | Kvíz: Falošný e-shop alebo pravý? 10 obchodov, 10 rozhodnutí | kviz eshop podvod | test eshop, fake eshop kviz, pozri ci je eshop falosny | informational | ~85/mo | ~20 | P3 | Visual quiz; share-card prominent. |
| C36 | D6–D9 | kviz-scam-sms-rozpozna | Kvíz: Rozpoznáš scam SMS od pravej? | kviz scam sms | test sms podvod, sms kviz bezpecnost | informational | ~60/mo | ~18 | P2 | Mobile-first design. |
| C37 | D6–D9 | kviz-internetova-bezpecnost-pre-rodicov | Kvíz pre rodičov: Ako dobre poznáte digitálny svet svojich detí? | kviz pre rodicov internet | test pre rodicov digitalna bezpecnost, deti a internet kviz | informational | ~50/mo | ~16 | P8 | Emotional hook; share to FB groups. |
| C38 | D6–D9 | kviz-iq-internet-bezpecnost | Internet IQ test — aký je váš skutočný digitálny rozum? | internet iq test | digitalne iq, iq test online sk, test digitalnej gramotnosti | informational | ~390/mo | ~34 | P6 | Brand-anchored: this is SubenAI's core hook. Strong CTA to `/test`. |

## 8. Príbehy a reálne prípady (C39–C42, cluster-only — links to P7)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| C39 | D10–D13 | pribeh-naletela-som-na-podvod-banka | „Naletela som na bankový podvod" — príbeh Slovenky, ktorá prišla o 4 800 € | pribeh bankovy podvod | obet phishingu pribeh, naletel som na podvod, podvod banka skusenost | informational | ~120/mo | ~22 | P7 | Anonymized real case; legal:compliance-check mandatory. |
| C40 | D10–D13 | pribeh-romance-scam-rok-laska | Rok lásky, ktorá neexistovala — príbeh romance scamu zo Slovenska | romance scam pribeh | obet romance scam, podvod laska pribeh, online vztah podvod skusenost | informational | ~80/mo | ~18 | P7 | Sensitive; victim anonymization checklist. |
| C41 | D10–D13 | pribeh-senior-falosny-policajt | „Volali z polície" — ako starší pán prišiel o úspory za 20 minút | pribeh senior podvod | starsi clovek podvod telefonom, podvod na seniora pribeh, falosny policajt pribeh | informational | ~95/mo | ~20 | P7 | Frame as cautionary tale; link to P8 (seniors). |
| C42 | D10–D13 | pribeh-deepfake-ceo-firma | Deepfake CEO — ako firma stratila 50 000 € v jednom hovore | deepfake firma pribeh | ai podvod firma pribeh, ceo fraud slovensko, deepfake biznis podvod | informational | ~50/mo | ~22 | P5 | B2B-ish; cite real EU/UK cases by name. |

## 9. Rodičia, deti, seniori (P8 + C43–C46)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P8 | D4–D5 | bezpecnost-pre-rodicov-deti-seniorov | Internetová bezpečnosť pre rodičov, deti a seniorov | bezpecnost na internete pre deti | bezpecnost pre seniorov internet, rodicovska kontrola, internet a stari ludia | informational | ~480/mo | ~46 | — | Pillar. Three audiences; sub-sections. |
| C43 | D10–D13 | rodicovska-kontrola-iphone-android | Rodičovská kontrola na iPhone a Androide — praktický návod | rodicovska kontrola iphone | screen time, family link, rodicovska kontrola android, kontrola dietata mobil | commercial | ~620/mo | ~42 | P8 | High volume; competitive SERP (operator pages dominate). |
| C44 | D10–D13 | kyberšikana-co-robit | Kyberšikana — ako spoznať, čo robiť, kam volať | kybersikana | online sikana, sikana facebook, linka detskej istoty, ipcko sk | informational | ~340/mo | ~32 | P8 | Cite IPčko, Linka detskej istoty 116 111. |
| C45 | D10–D13 | senior-prvy-smartfon-bezpecnost | Senior dostal prvý smartfón — bezpečnostné minimum pre rodinu | senior smartfon bezpecnost | starsi clovek mobil, senior internet zaciatok, prvy mobil senior | informational | ~110/mo | ~20 | P8 | Practical setup guide. |
| C46 | D10–D13 | ako-hovorit-s-detmi-o-podvodoch | Ako hovoriť s deťmi o podvodoch online — podľa veku | rozhovor s detmi internet | deti a internetove podvody, vychova k digitalnej bezpecnosti, podvody deti komunikacia | informational | ~80/mo | ~18 | P8 | Age-bracketed advice (6–9, 10–13, 14–17). |

## 10. Psychológia podvodov (P7 + C47–C50)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P7 | D4–D5 | psychologia-internetovych-podvodov | Psychológia internetových podvodov — prečo naletíme | psychologia podvodu | preco ludia naletia, manipulacia podvod, socialne inzinierstvo psychologia | informational | ~210/mo | ~36 | — | Pillar. Cite Cialdini, Kahneman; SK academic sources if available. |
| C47 | D10–D13 | naliehavost-ako-zbran-podvodnika | Naliehavosť ako zbraň — prečo „okamžite konajte" funguje | nalieha vost manipulacia | technika podvodu nalieha vost, urgentnost podvod, casovy tlak podvod | informational | ~60/mo | ~18 | P7 | Behavioral econ angle. |
| C48 | D10–D13 | autorita-policia-banka-manipulacia | Autorita ako trik — keď podvodník hrá políciu alebo banku | autorita podvod | falosna autorita manipulacia, podvod predstiera policiu, podvodnik banka | informational | ~50/mo | ~16 | P7 | Crossover with C10 + C4. |
| C49 | D10–D13 | strach-vs-hramotnost-strachu | Strach ako spúšťač — ako podvodníci využívajú paniku | strach manipulacia podvod | panika podvod, fear appeal manipulacia, podvod cez strach | informational | ~40/mo | ~16 | P7 | Short, evergreen explainer. |
| C50 | D10–D13 | preco-aj-inteligentni-ludia-naletia | Prečo aj inteligentní ľudia naletia na podvody — 5 kognitívnych pascí | preco ludia naletia | kognitivne skreslenia podvod, inteligentny clovek podvod, naletel som hanba | informational | ~140/mo | ~24 | P7 | Removes shame stigma; share-bait. |

## 11. SEO traffic magnets (C51–C55, cluster-only — distributed across pillars)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| C51 | D10–D13 | nechcene-platby-z-uctu-co-robit | Nechcené platby z účtu — ako reagovať, ak sa vám niekto dostal ku karte | nechcene platby z uctu | neoznamene platby karty, neopravnena platba banka, blokacia karty | informational | ~430/mo | ~38 | P6 | High-intent help-page format. |
| C52 | D10–D13 | overit-telefonne-cislo-kto-mi-vola | Ako zistiť, kto mi volal — overenie podozrivého čísla | kto mi volal | overit telefonne cislo, neznamy hovor, podozrive cislo overenie | informational | ~1900/mo | ~58 | P2 | Massive volume; competitive (operator pages, kto-volal.sk). |
| C53 | D10–D13 | uniknute-heslo-overit-haveibeenpwned | Uniklo mi heslo? Ako overiť na haveibeenpwned a čo robiť ďalej | uniknute heslo | haveibeenpwned sk, leak hesla, overit ci mi uniklo heslo | informational | ~260/mo | ~28 | P6 | Tool tutorial. |
| C54 | D10–D13 | falosna-faktura-email-co-robit | Falošná faktúra v emaile — ako sa nedať okradnúť | falosna faktura email | podvodna faktura, faktura phishing, fake invoice slovensko | informational | ~180/mo | ~26 | P1 | SMB-leaning; entity coverage of common SK suppliers. |
| C55 | D10–D13 | recenzie-na-eshope-falosne-rozpoznat | Falošné recenzie — ako spoznať platené hodnotenia | falosne recenzie | platene recenzie eshop, kupena recenzia, recenzia podvod, heureka recenzia falosna | informational | ~210/mo | ~30 | P3 | Tools: ReviewMeta, Fakespot alternatives. |

## 12. News a trendy (C56–C60, cluster-only)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| C56 | D10–D13 | top-podvody-slovensko-2026 | TOP podvody na Slovensku v roku 2026 — prehľad od polície a SK-CERT | podvody slovensko 2026 | aktualne podvody, sk-cert podvody, top podvody 2026, policia podvody | informational | ~330/mo | ~36 | P6 | Live-updated; refresh quarterly. |
| C57 | D10–D13 | nove-techniky-phishingu-2026 | Nové techniky phishingu, ktoré sa objavili v roku 2026 | nove phishingove techniky | phishing trendy 2026, najnovsie podvody email, qr phishing quishing | informational | ~110/mo | ~24 | P1 | Includes quishing (QR phishing). |
| C58 | D10–D13 | rebrand-slovenska-posta-slovak-post-podvody | Rebrand Slovenská pošta → Slovak Post — pozor na nové podvodné domény | slovak post podvod | slovenska posta nova domena, slovak post falosne emaily, rebrand posty podvod | informational | ~520/mo | ~32 | P1 | 2026-specific; high topical relevance. Verify with WebSearch before publish. |
| C59 | D10–D13 | krypto-podvody-2026-pump-and-dump | Krypto podvody 2026 — pump-and-dump, rug pull, fake ICO | krypto podvod | bitcoin podvod, krypto investicia podvod, pump and dump slovensko | commercial | ~440/mo | ~46 | P5 | High commercial intent; YMYL — extra source rigor. |
| C60 | D10–D13 | ai-akt-eu-co-znamena-pre-bezneho-cloveka | EU AI Act 2026 — čo znamená pre bežného Slováka pri ochrane pred AI podvodmi | eu ai akt | ai regulacia eu, ai act slovensko, ochrana pred ai podvodmi zakon | informational | ~85/mo | ~24 | P5 | Explainer; cite official EU sources. |

## 13. Bezpečné nakupovanie online (P9 + cluster overlap)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P9 | D4–D5 | bezpecne-nakupovanie-online-slovensko | Bezpečné online nakupovanie — sprievodca pre Slovákov | bezpecne nakupovanie online | nakupovanie internet bezpecnost, ako bezpecne nakupovat online, platba kartou bezpecnost | informational | ~390/mo | ~42 | — | Pillar. Re-uses some C13/C15/C55 material at summary level. |

## 14. Internet safety pre študentov (P10 + cluster overlap)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| P10 | D4–D5 | internet-safety-pre-studentov | Internet safety pre študentov — od školských účtov po sociálne siete | internet bezpecnost studenti | studenti a internet, skolske konto bezpecnost, vysoka skola online bezpecnost | informational | ~140/mo | ~30 | — | Pillar. Audience: VŠ + maturanti. |

## 15. Product / money pages (C61–C70, cluster-only)

| id | wave | slug | working_title | primary_keyword | secondary_keywords | search_intent | est_volume_sk | est_difficulty | pillar_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| C61 | D10–D13 | najlepsi-antivirus-2026-slovensko | Najlepší antivírus 2026 pre Slovensko — porovnanie 6 možností | najlepsi antivirus 2026 | antivirus slovensko porovnanie, bitdefender vs eset, antivirus pre windows 11 | commercial | ~880/mo | ~58 | P6 | Affiliate; ESET (SK!) gets fair treatment. |
| C62 | D10–D13 | eset-vs-bitdefender-vs-kaspersky | ESET vs. Bitdefender vs. Kaspersky — ktorý vyhráva v roku 2026 | eset vs bitdefender | porovnanie antivirusov, kaspersky alternativa, eset recenzia 2026 | commercial | ~340/mo | ~50 | P6 | Compare on detection, perf, privacy posture. |
| C63 | D10–D13 | najlepsi-spravca-hesiel-porovnanie-2026 | Najlepší správca hesiel 2026 — 1Password, Bitwarden, Proton Pass | najlepsi spravca hesiel 2026 | 1password recenzia, bitwarden vs 1password, proton pass slovensko | commercial | ~260/mo | ~44 | P6 | Pairs with C29 (broader); this one is the comparison-pad. |
| C64 | D10–D13 | najlepsia-vpn-2026-slovensko | Najlepšia VPN 2026 pre Slovákov — Mullvad, Proton, NordVPN | najlepsia vpn 2026 | vpn porovnanie slovensko, nordvpn recenzia, proton vpn recenzia, mullvad slovensko | commercial | ~720/mo | ~62 | P6 | Highly competitive. Differentiate via privacy ethics angle. |
| C65 | D10–D13 | yubikey-vs-google-titan-vs-passkey | YubiKey vs. Google Titan vs. softvérový passkey | yubikey slovensko | hardverovy kluc bezpecnost, google titan slovensko, passkey hardverovy kluc | commercial | ~95/mo | ~32 | P1 | Niche but high-intent buyers. |
| C66 | D10–D13 | platobne-karty-virtualne-revolut-wise | Virtuálne platobné karty na bezpečné online nákupy — Revolut, Wise, banky | virtualna platobna karta | revolut virtualna karta, wise karta, jednorazova karta nakup online | commercial | ~580/mo | ~46 | P9 | Highly transactional. |
| C67 | D10–D13 | poistenie-proti-kybernetickym-podvodom | Poistenie proti kybernetickým podvodom — má zmysel pre bežnú rodinu? | kyberneticke poistenie | poistenie proti podvodom, cyber poistenie slovensko, poistenie zneužitia karty | commercial | ~70/mo | ~26 | P6 | Emerging product category in SK; cite Allianz/Kooperativa offerings. |
| C68 | D10–D13 | sluzby-monitoring-uniku-dat | Služby monitoringu úniku osobných údajov — porovnanie | monitoring uniku dat | dark web monitoring, monitoring identity, ochrana udajov sluzba | commercial | ~80/mo | ~30 | P6 | HIBP, Mozilla Monitor, dedicated services. |
| C69 | D10–D13 | rodicovska-kontrola-aplikacie-porovnanie | Rodičovská kontrola — porovnanie 5 aplikácií pre rok 2026 | rodicovska kontrola aplikacie | qustodio, family link slovensko, screen time aplikacia, kaspersky safe kids | commercial | ~280/mo | ~40 | P8 | Pairs with C43; this is the comparison-pad. |
| C70 | D10–D13 | internet-iq-test-pre-firmy-zamestnancov | Internet IQ test pre firmy — vyškoľte zamestnancov za 15 minút | internet iq test firma | bezpecnostne skolenie zamestnancov, phishing test pre firmy, sluzba pre firmy bezpecnost | commercial | ~50/mo | ~22 | P10 | B2B CTA → custom test product. Highest commercial intent in catalogue. |

---

## Keyword cannibalization audit

The catalogue was scanned for near-duplicate primary keywords. Resolutions below — every primary keyword in the table is unique after these adjustments.

1. **Password managers (C29 vs. C63).** Both target the password-manager comparison space. Resolved by scoping:
   - **C29** → `spravca hesiel` (broad explainer + comparison framing).
   - **C63** → `najlepsi spravca hesiel 2026` (year-tagged, transactional/commercial intent comparison-pad).
   They link to each other; C29 ranks the informational SERP, C63 captures the bottom-of-funnel "buy now" SERP.

2. **VPN (C30 vs. C64).** Same problem.
   - **C30** → `vpn slovensko` (educational: "do I even need a VPN").
   - **C64** → `najlepsia vpn 2026` (commercial comparison).

3. **Parental controls (C43 vs. C69).** Resolved by intent split.
   - **C43** → `rodicovska kontrola iphone` (informational, platform-specific tutorial).
   - **C69** → `rodicovska kontrola aplikacie` (commercial, cross-platform app comparison).

4. **Phishing email recognition (C1 vs. C4).** Both touch "ako rozpoznať phishing".
   - **C1** → `ako rozpoznat phishingovy email` (generic, 10-second checklist).
   - **C4** → `podvodny email banka` (bank-specific entity coverage).
   Both link up to P1 (`phishing`).

5. **Bank-related SMS phishing (C4 email vs. C9 SMS).** Different channel, different SERP. No collision after primary keywords were split into `podvodny email banka` and `falosna sms z banky`.

6. **Quizzes (C34–C38).** All five quiz articles initially competed for `kviz phishing`. Resolved by giving each a distinct primary tied to its underlying topic (phishing email, e-shop, SMS, parent audience, generic IQ test). C38's `internet iq test` is the brand-anchored hero quiz article.

7. **Romance scam (P4 reference vs. C19 vs. C40).** Pillar P4 covers the surface; C19 is the explainer; C40 is the narrative case. Primaries split as `podvody na socialnych sietach` / `romance scam` / `romance scam pribeh` — three distinct intent layers (overview / how-to-recognize / story-driven empathy).

8. **Senior-targeted articles (C24, C41, C45).** Resolved:
   - **C24** → `klonovanie hlasu podvod` (AI-vector specific).
   - **C41** → `pribeh senior podvod` (story).
   - **C45** → `senior smartfon bezpecnost` (setup guide).
   All link up to P8.

9. **Slovak Post / packages (C5 vs. C58).** Could have collided on "Slovenská pošta podvod".
   - **C5** → `phishing balikova zasielka` (evergreen, multi-carrier).
   - **C58** → `slovak post podvod` (2026-specific rebrand news angle).

10. **Top-of-funnel "what scams are happening" (C56 vs. C8).** Resolved:
    - **C8** → `podvodne sms slovensko` (channel-specific, evergreen listicle).
    - **C56** → `podvody slovensko 2026` (year-tagged news roundup, refreshed quarterly).

No remaining duplicate primaries detected. Secondary keyword overlap is intentional and supports the pillar-and-cluster topical-authority model.
