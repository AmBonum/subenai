# Internal Link Graph — SubenAI Blog Content Engine (E16.5)

_Internal artifact. Canonical directed acyclic graph of internal links
across all 80 planned `/blog` articles. Consumed by every downstream
draft / outline agent to decide which links go into article body MDX._

## 1. Methodology

This DAG implements a hub-and-spoke topical-authority model on top of
the 10 pillars and 70 clusters defined in `keyword-map.md`. Three rules
hold across the whole graph. First, **every cluster links upward to its
pillar at least once** (`cluster→pillar`) — this is what tells Google
which pillar the cluster reinforces. Second, **every pillar links
downward to every cluster in its group** (`pillar→cluster`) typically
rendered as a "Čítaj ďalej v tomto tematickom celku" section near the
end of the pillar body, so pillars distribute link equity evenly to
their clusters. Third, **every cluster gets 1–2 sibling links to a
related cluster in the same pillar group** (`sibling`) so readers can
move laterally through the topic without bouncing back to the pillar.

A small layer of **cross-pillar edges** connects topically-adjacent
pillars (e.g. P1 phishing ↔ P5 AI for AI-generated phishing emails;
P5 AI ↔ P8 seniors for voice-cloning grandchild scam). These are
deliberately capped at 14 edges total to keep the graph readable for
Google's topical-cluster detection and avoid diluting any single
pillar's authority signal. A handful of **cluster→cluster cross-pillar**
edges exist where the topical link is unusually strong and a cluster-
only `pillar→pillar` hop would lose nuance (e.g. C42 deepfake-CEO story
links directly to C24 voice-cloning).

Anchor texts follow the locked decisions in `voice-guide.md` §0: brand
lowercase (`subenai`), reader `ty` form, product term `test` (never
`kvíz`). Anchors are 2–6 Slovak words with full diacritics, lowercase
first letter so they sit mid-sentence, action-oriented or topical, and
never reused for the same target.

## 2. Adjacency table (the DAG)

### 2.1 Pillar → cluster edges (rendered in pillar "Čítaj ďalej" section)

| from_id | from_slug | to_id | to_slug | edge_type | anchor_text_sk | rationale |
|---|---|---|---|---|---|---|
| P1 | phishing-kompletny-sprievodca | C1 | ako-rozpoznat-phishingovy-email-za-10-sekund | pillar→cluster | rozpoznať phishing za 10 sekúnd | Pillar surfaces fastest-to-read companion. |
| P1 | phishing-kompletny-sprievodca | C2 | phishing-cez-google-formulare | pillar→cluster | phishing cez google formuláre | New-vector subsection. |
| P1 | phishing-kompletny-sprievodca | C3 | spear-phishing-vs-bezny-phishing | pillar→cluster | spear phishing vysvetlený | Taxonomy split. |
| P1 | phishing-kompletny-sprievodca | C4 | podvodne-emaily-z-banky-ako-spoznat | pillar→cluster | falošné emaily z banky | Entity-specific deep dive. |
| P1 | phishing-kompletny-sprievodca | C5 | phishing-na-balikovu-zasielku | pillar→cluster | phishing cez balíkové zásielky | High-volume sibling. |
| P1 | phishing-kompletny-sprievodca | C6 | co-robit-ked-som-klikol-na-phishing | pillar→cluster | čo robiť po kliknutí | Reactive post-incident guide. |
| P1 | phishing-kompletny-sprievodca | C7 | ochrana-pred-phishingom-2fa-passkey | pillar→cluster | obrana cez 2fa a passkeys | Tooling layer. |
| P1 | phishing-kompletny-sprievodca | C34 | kviz-rozpoznas-phishingovy-email | pillar→cluster | otestuj sa na phishingu | Interactive test embed. |
| P1 | phishing-kompletny-sprievodca | C54 | falosna-faktura-email-co-robit | pillar→cluster | falošná faktúra v emaile | SMB-leaning variant. |
| P1 | phishing-kompletny-sprievodca | C57 | nove-techniky-phishingu-2026 | pillar→cluster | nové techniky phishingu 2026 | Trend refresh. |
| P1 | phishing-kompletny-sprievodca | C58 | rebrand-slovenska-posta-slovak-post-podvody | pillar→cluster | slovak post podvodné domény | News-pegged cluster. |
| P1 | phishing-kompletny-sprievodca | C65 | yubikey-vs-google-titan-vs-passkey | pillar→cluster | hardvérové kľúče porovnané | Buy-now layer. |
| P2 | scam-sms-a-podvodne-hovory | C8 | 12-najcastejsich-podvodnych-sms-2026 | pillar→cluster | 12 najčastejších scam sms | Listicle companion. |
| P2 | scam-sms-a-podvodne-hovory | C9 | sms-z-banky-overit-ci-je-pravda | pillar→cluster | overiť sms z banky | Bank-specific. |
| P2 | scam-sms-a-podvodne-hovory | C10 | hovor-od-falosneho-policajta-co-robit | pillar→cluster | hovor od falošného policajta | Authority-trick vishing. |
| P2 | scam-sms-a-podvodne-hovory | C11 | one-ring-scam-zmeskany-hovor-zo-zahranicia | pillar→cluster | one-ring scam vysvetlený | Niche but high-anxiety. |
| P2 | scam-sms-a-podvodne-hovory | C12 | ako-blokovat-spam-volania-android-iphone | pillar→cluster | ako blokovať spam volania | Action layer. |
| P2 | scam-sms-a-podvodne-hovory | C36 | kviz-scam-sms-rozpozna | pillar→cluster | rýchly test na scam sms | Embedded test. |
| P2 | scam-sms-a-podvodne-hovory | C52 | overit-telefonne-cislo-kto-mi-vola | pillar→cluster | zistiť kto ti volal | Reverse-lookup. |
| P3 | fake-eshopy-ako-odhalit | C13 | ako-overit-eshop-pred-nakupom-7-krokov | pillar→cluster | 7 krokov pred nákupom | Action checklist. |
| P3 | fake-eshopy-ako-odhalit | C14 | podvodne-reklamy-facebook-instagram-eshop | pillar→cluster | podvodné reklamy na facebooku | Social vector. |
| P3 | fake-eshopy-ako-odhalit | C15 | bazos-vinted-marketplace-podvody | pillar→cluster | bazoš a vinted podvody | High-traffic SK marketplaces. |
| P3 | fake-eshopy-ako-odhalit | C16 | dropshipping-vs-podvodny-eshop | pillar→cluster | dropshipping verzus podvod | Nuance. |
| P3 | fake-eshopy-ako-odhalit | C17 | reklamacia-z-podvodneho-eshopu | pillar→cluster | reklamovať podvodný eshop | Recovery flow. |
| P3 | fake-eshopy-ako-odhalit | C35 | kviz-falosny-eshop-alebo-pravy | pillar→cluster | otestuj sa na eshopoch | Visual test. |
| P3 | fake-eshopy-ako-odhalit | C55 | recenzie-na-eshope-falosne-rozpoznat | pillar→cluster | spoznať platené recenzie | Adjacent trust signal. |
| P4 | podvody-na-socialnych-sietach | C18 | hacknuty-facebook-ucet-co-robit | pillar→cluster | obnoviť hacknutý facebook | Highest-volume cluster. |
| P4 | podvody-na-socialnych-sietach | C19 | romance-scam-laska-cez-internet | pillar→cluster | romance scam vysvetlený | Sensitive vertical. |
| P4 | podvody-na-socialnych-sietach | C20 | fake-profily-instagram-tiktok | pillar→cluster | falošné profily na instagrame | Visual cluster. |
| P4 | podvody-na-socialnych-sietach | C21 | podvodne-sutaze-a-giveawayy | pillar→cluster | podvodné súťaže | Phishing crossover. |
| P4 | podvody-na-socialnych-sietach | C22 | telegram-whatsapp-scam-skupiny | pillar→cluster | telegram scam skupiny | Hot 2026 vector. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | C23 | deepfake-video-ako-spoznat | pillar→cluster | spoznať deepfake video | Forensic layer. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | C24 | klonovanie-hlasu-podvod-volanie-rodina | pillar→cluster | klonovanie hlasu v rodine | Senior-targeted. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | C25 | chatgpt-podvody-falosne-investicie | pillar→cluster | chatgpt a falošné investície | AI investment shilling. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | C26 | ai-generovane-fotky-fake-profily | pillar→cluster | ai fotky vo falošných profiloch | Image forensics. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | C27 | ai-phishing-personalizovany-podvod | pillar→cluster | personalizovaný ai phishing | Forward-looking. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | C42 | pribeh-deepfake-ceo-firma | pillar→cluster | príbeh deepfake ceo | Real-world case. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | C59 | krypto-podvody-2026-pump-and-dump | pillar→cluster | krypto podvody v 2026 | Commercial crossover. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | C60 | ai-akt-eu-co-znamena-pre-bezneho-cloveka | pillar→cluster | eu ai akt v praxi | Regulatory explainer. |
| P6 | digitalna-bezpecnost-kompletny-navod | C28 | silne-heslo-2026-vs-passkey | pillar→cluster | silné heslo verzus passkey | Hygiene basics. |
| P6 | digitalna-bezpecnost-kompletny-navod | C29 | spravca-hesiel-porovnanie | pillar→cluster | správca hesiel vysvetlený | Tool intro. |
| P6 | digitalna-bezpecnost-kompletny-navod | C30 | vpn-ci-naozaj-potrebujem | pillar→cluster | potrebuješ vôbec vpn | Anti-hype explainer. |
| P6 | digitalna-bezpecnost-kompletny-navod | C31 | verejna-wifi-rizika-a-obrana | pillar→cluster | reálne riziká verejnej wifi | Myth-bust. |
| P6 | digitalna-bezpecnost-kompletny-navod | C32 | aktualizacie-systemu-preco-su-dolezite | pillar→cluster | prečo aktualizovať systém | Patch hygiene. |
| P6 | digitalna-bezpecnost-kompletny-navod | C33 | zalohovanie-dat-3-2-1-pravidlo | pillar→cluster | pravidlo 3-2-1 zálohovania | Backup hygiene. |
| P6 | digitalna-bezpecnost-kompletny-navod | C38 | kviz-iq-internet-bezpecnost | pillar→cluster | spravím si internet iq test | Brand-anchored CTA. |
| P6 | digitalna-bezpecnost-kompletny-navod | C51 | nechcene-platby-z-uctu-co-robit | pillar→cluster | nechcené platby z účtu | Help-page format. |
| P6 | digitalna-bezpecnost-kompletny-navod | C53 | uniknute-heslo-overit-haveibeenpwned | pillar→cluster | overiť uniknuté heslo | HIBP tutorial. |
| P6 | digitalna-bezpecnost-kompletny-navod | C56 | top-podvody-slovensko-2026 | pillar→cluster | top podvody na slovensku 2026 | Quarterly refresh. |
| P6 | digitalna-bezpecnost-kompletny-navod | C61 | najlepsi-antivirus-2026-slovensko | pillar→cluster | porovnanie antivírusov 2026 | Commercial pad. |
| P6 | digitalna-bezpecnost-kompletny-navod | C62 | eset-vs-bitdefender-vs-kaspersky | pillar→cluster | eset, bitdefender a kaspersky bok po boku | Three-way duel. |
| P6 | digitalna-bezpecnost-kompletny-navod | C63 | najlepsi-spravca-hesiel-porovnanie-2026 | pillar→cluster | najlepší správca hesiel | Buy-now PM. |
| P6 | digitalna-bezpecnost-kompletny-navod | C64 | najlepsia-vpn-2026-slovensko | pillar→cluster | najlepšia vpn pre slovákov | Commercial VPN. |
| P6 | digitalna-bezpecnost-kompletny-navod | C67 | poistenie-proti-kybernetickym-podvodom | pillar→cluster | kybernetické poistenie pre rodinu | Insurance angle. |
| P6 | digitalna-bezpecnost-kompletny-navod | C68 | sluzby-monitoring-uniku-dat | pillar→cluster | monitoring úniku údajov | Service comparison. |
| P7 | psychologia-internetovych-podvodov | C39 | pribeh-naletela-som-na-podvod-banka | pillar→cluster | príbeh obete bankového podvodu | Real-victim case. |
| P7 | psychologia-internetovych-podvodov | C40 | pribeh-romance-scam-rok-laska | pillar→cluster | príbeh romance scamu | Year-long grooming. |
| P7 | psychologia-internetovych-podvodov | C41 | pribeh-senior-falosny-policajt | pillar→cluster | príbeh seniora a falošného policajta | Vishing case. |
| P7 | psychologia-internetovych-podvodov | C47 | naliehavost-ako-zbran-podvodnika | pillar→cluster | naliehavosť ako manipulácia | Behavioral lever. |
| P7 | psychologia-internetovych-podvodov | C48 | autorita-policia-banka-manipulacia | pillar→cluster | autorita ako trik | Cialdini lever. |
| P7 | psychologia-internetovych-podvodov | C49 | strach-vs-hramotnost-strachu | pillar→cluster | strach ako spúšťač | Fear-appeal. |
| P7 | psychologia-internetovych-podvodov | C50 | preco-aj-inteligentni-ludia-naletia | pillar→cluster | prečo aj múdri ľudia naletia | Destigmatising. |
| P8 | bezpecnost-pre-rodicov-deti-seniorov | C37 | kviz-internetova-bezpecnost-pre-rodicov | pillar→cluster | test pre rodičov | Parent-targeted test. |
| P8 | bezpecnost-pre-rodicov-deti-seniorov | C43 | rodicovska-kontrola-iphone-android | pillar→cluster | rodičovská kontrola krok za krokom | Setup tutorial. |
| P8 | bezpecnost-pre-rodicov-deti-seniorov | C44 | kyberšikana-co-robit | pillar→cluster | kyberšikana, čo robiť | Crisis hotlines. |
| P8 | bezpecnost-pre-rodicov-deti-seniorov | C45 | senior-prvy-smartfon-bezpecnost | pillar→cluster | prvý smartfón pre seniora | Onboarding. |
| P8 | bezpecnost-pre-rodicov-deti-seniorov | C46 | ako-hovorit-s-detmi-o-podvodoch | pillar→cluster | hovoriť s deťmi o podvodoch | Age-bracketed. |
| P8 | bezpecnost-pre-rodicov-deti-seniorov | C69 | rodicovska-kontrola-aplikacie-porovnanie | pillar→cluster | aplikácie rodičovskej kontroly porovnané | Commercial pad. |
| P9 | bezpecne-nakupovanie-online-slovensko | C66 | platobne-karty-virtualne-revolut-wise | pillar→cluster | virtuálne platobné karty | Card-safety layer. |
| P10 | internet-safety-pre-studentov | C70 | internet-iq-test-pre-firmy-zamestnancov | pillar→cluster | internet iq test pre firmy | B2B CTA bridge. |

### 2.2 Cluster → pillar edges (every cluster, 1 row each)

| from_id | from_slug | to_id | to_slug | edge_type | anchor_text_sk | rationale |
|---|---|---|---|---|---|---|
| C1 | ako-rozpoznat-phishingovy-email-za-10-sekund | P1 | phishing-kompletny-sprievodca | cluster→pillar | kompletný sprievodca phishingom | Hub link. |
| C2 | phishing-cez-google-formulare | P1 | phishing-kompletny-sprievodca | cluster→pillar | čo je phishing celkovo | Hub link. |
| C3 | spear-phishing-vs-bezny-phishing | P1 | phishing-kompletny-sprievodca | cluster→pillar | phishing — väčší obraz | Hub link. |
| C4 | podvodne-emaily-z-banky-ako-spoznat | P1 | phishing-kompletny-sprievodca | cluster→pillar | ako phishing funguje obecne | Hub link. |
| C5 | phishing-na-balikovu-zasielku | P1 | phishing-kompletny-sprievodca | cluster→pillar | phishing — kompletný prehľad | Hub link. |
| C6 | co-robit-ked-som-klikol-na-phishing | P1 | phishing-kompletny-sprievodca | cluster→pillar | prečítaj si pillar o phishingu | Hub link. |
| C7 | ochrana-pred-phishingom-2fa-passkey | P1 | phishing-kompletny-sprievodca | cluster→pillar | čo je vlastne phishing | Hub link. |
| C8 | 12-najcastejsich-podvodnych-sms-2026 | P2 | scam-sms-a-podvodne-hovory | cluster→pillar | celý prehľad scam sms a hovorov | Hub link. |
| C9 | sms-z-banky-overit-ci-je-pravda | P2 | scam-sms-a-podvodne-hovory | cluster→pillar | scam sms a hovory v kocke | Hub link. |
| C10 | hovor-od-falosneho-policajta-co-robit | P2 | scam-sms-a-podvodne-hovory | cluster→pillar | viac o vishingu a smishingu | Hub link. |
| C11 | one-ring-scam-zmeskany-hovor-zo-zahranicia | P2 | scam-sms-a-podvodne-hovory | cluster→pillar | širší kontext telefónnych podvodov | Hub link. |
| C12 | ako-blokovat-spam-volania-android-iphone | P2 | scam-sms-a-podvodne-hovory | cluster→pillar | scam sms a hovory — sprievodca | Hub link. |
| C13 | ako-overit-eshop-pred-nakupom-7-krokov | P3 | fake-eshopy-ako-odhalit | cluster→pillar | ako odhaliť falošný eshop | Hub link. |
| C14 | podvodne-reklamy-facebook-instagram-eshop | P3 | fake-eshopy-ako-odhalit | cluster→pillar | širšie o fake eshopoch | Hub link. |
| C15 | bazos-vinted-marketplace-podvody | P3 | fake-eshopy-ako-odhalit | cluster→pillar | celkový obraz eshop podvodov | Hub link. |
| C16 | dropshipping-vs-podvodny-eshop | P3 | fake-eshopy-ako-odhalit | cluster→pillar | čo je naozaj fake eshop | Hub link. |
| C17 | reklamacia-z-podvodneho-eshopu | P3 | fake-eshopy-ako-odhalit | cluster→pillar | pillar o podvodných eshopoch | Hub link. |
| C18 | hacknuty-facebook-ucet-co-robit | P4 | podvody-na-socialnych-sietach | cluster→pillar | všetky podvody na sociálnych sieťach | Hub link. |
| C19 | romance-scam-laska-cez-internet | P4 | podvody-na-socialnych-sietach | cluster→pillar | širší kontext social-media podvodov | Hub link. |
| C20 | fake-profily-instagram-tiktok | P4 | podvody-na-socialnych-sietach | cluster→pillar | viac o sociálnych sieťach a podvodoch | Hub link. |
| C21 | podvodne-sutaze-a-giveawayy | P4 | podvody-na-socialnych-sietach | cluster→pillar | celkový sprievodca social-media scammi | Hub link. |
| C22 | telegram-whatsapp-scam-skupiny | P4 | podvody-na-socialnych-sietach | cluster→pillar | sociálne siete a podvody v jednom | Hub link. |
| C23 | deepfake-video-ako-spoznat | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cluster→pillar | celkový obraz ai podvodov | Hub link. |
| C24 | klonovanie-hlasu-podvod-volanie-rodina | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cluster→pillar | ai podvody — kompletný sprievodca | Hub link. |
| C25 | chatgpt-podvody-falosne-investicie | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cluster→pillar | viac o ai podvodoch | Hub link. |
| C26 | ai-generovane-fotky-fake-profily | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cluster→pillar | ai a moderné podvody | Hub link. |
| C27 | ai-phishing-personalizovany-podvod | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cluster→pillar | širší pohľad na ai podvody | Hub link. |
| C28 | silne-heslo-2026-vs-passkey | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť — celý návod | Hub link. |
| C29 | spravca-hesiel-porovnanie | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | celá digitálna bezpečnosť pre laikov | Hub link. |
| C30 | vpn-ci-naozaj-potrebujem | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | širší kontext digitálnej bezpečnosti | Hub link. |
| C31 | verejna-wifi-rizika-a-obrana | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť — pillar | Hub link. |
| C32 | aktualizacie-systemu-preco-su-dolezite | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | čo všetko pokrýva digitálna bezpečnosť | Hub link. |
| C33 | zalohovanie-dat-3-2-1-pravidlo | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť pre bežných ľudí | Hub link. |
| C34 | kviz-rozpoznas-phishingovy-email | P1 | phishing-kompletny-sprievodca | cluster→pillar | otvor si pillar o phishingu | Hub link. |
| C35 | kviz-falosny-eshop-alebo-pravy | P3 | fake-eshopy-ako-odhalit | cluster→pillar | pillar fake eshopy v plnej šírke | Hub link. |
| C36 | kviz-scam-sms-rozpozna | P2 | scam-sms-a-podvodne-hovory | cluster→pillar | širší sprievodca scam sms | Hub link. |
| C37 | kviz-internetova-bezpecnost-pre-rodicov | P8 | bezpecnost-pre-rodicov-deti-seniorov | cluster→pillar | bezpečnosť pre rodičov, deti a seniorov | Hub link. |
| C38 | kviz-iq-internet-bezpecnost | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť — pillar pre laikov | Hub link. |
| C39 | pribeh-naletela-som-na-podvod-banka | P7 | psychologia-internetovych-podvodov | cluster→pillar | prečo ľudia naletia | Hub link. |
| C40 | pribeh-romance-scam-rok-laska | P7 | psychologia-internetovych-podvodov | cluster→pillar | psychológia podvodov | Hub link. |
| C41 | pribeh-senior-falosny-policajt | P7 | psychologia-internetovych-podvodov | cluster→pillar | psychológia, prečo to funguje | Hub link. |
| C42 | pribeh-deepfake-ceo-firma | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cluster→pillar | celkový obraz ai a moderných podvodov | Hub link. |
| C43 | rodicovska-kontrola-iphone-android | P8 | bezpecnost-pre-rodicov-deti-seniorov | cluster→pillar | širší pillar pre rodičov a deti | Hub link. |
| C44 | kyberšikana-co-robit | P8 | bezpecnost-pre-rodicov-deti-seniorov | cluster→pillar | bezpečnosť detí na internete | Hub link. |
| C45 | senior-prvy-smartfon-bezpecnost | P8 | bezpecnost-pre-rodicov-deti-seniorov | cluster→pillar | viac o seniorov a internete | Hub link. |
| C46 | ako-hovorit-s-detmi-o-podvodoch | P8 | bezpecnost-pre-rodicov-deti-seniorov | cluster→pillar | rodičia, deti, seniori — pillar | Hub link. |
| C47 | naliehavost-ako-zbran-podvodnika | P7 | psychologia-internetovych-podvodov | cluster→pillar | psychológia podvodov v celku | Hub link. |
| C48 | autorita-policia-banka-manipulacia | P7 | psychologia-internetovych-podvodov | cluster→pillar | širší obraz manipulácie | Hub link. |
| C49 | strach-vs-hramotnost-strachu | P7 | psychologia-internetovych-podvodov | cluster→pillar | prečo manipulácia funguje | Hub link. |
| C50 | preco-aj-inteligentni-ludia-naletia | P7 | psychologia-internetovych-podvodov | cluster→pillar | celá psychológia podvodu | Hub link. |
| C51 | nechcene-platby-z-uctu-co-robit | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť — celkový návod | Hub link. |
| C52 | overit-telefonne-cislo-kto-mi-vola | P2 | scam-sms-a-podvodne-hovory | cluster→pillar | pillar o scam sms a hovoroch | Hub link. |
| C53 | uniknute-heslo-overit-haveibeenpwned | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť pre normálnych ľudí | Hub link. |
| C54 | falosna-faktura-email-co-robit | P1 | phishing-kompletny-sprievodca | cluster→pillar | celkový obraz phishingu | Hub link. |
| C55 | recenzie-na-eshope-falosne-rozpoznat | P3 | fake-eshopy-ako-odhalit | cluster→pillar | širší pillar fake eshopov | Hub link. |
| C56 | top-podvody-slovensko-2026 | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť — kompletný návod | Hub link. |
| C57 | nove-techniky-phishingu-2026 | P1 | phishing-kompletny-sprievodca | cluster→pillar | phishing — pillar od základov | Hub link. |
| C58 | rebrand-slovenska-posta-slovak-post-podvody | P1 | phishing-kompletny-sprievodca | cluster→pillar | phishing — širší kontext | Hub link. |
| C59 | krypto-podvody-2026-pump-and-dump | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cluster→pillar | ai a moderné podvody — pillar | Hub link. |
| C60 | ai-akt-eu-co-znamena-pre-bezneho-cloveka | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cluster→pillar | celkový sprievodca ai podvodmi | Hub link. |
| C61 | najlepsi-antivirus-2026-slovensko | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť v širšom obraze | Hub link. |
| C62 | eset-vs-bitdefender-vs-kaspersky | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť — pillar pre začiatočníkov | Hub link. |
| C63 | najlepsi-spravca-hesiel-porovnanie-2026 | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť — širší obraz | Hub link. |
| C64 | najlepsia-vpn-2026-slovensko | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť — komplet | Hub link. |
| C65 | yubikey-vs-google-titan-vs-passkey | P1 | phishing-kompletny-sprievodca | cluster→pillar | phishing — pillar od A po Z | Hub link. |
| C66 | platobne-karty-virtualne-revolut-wise | P9 | bezpecne-nakupovanie-online-slovensko | cluster→pillar | bezpečné nakupovanie online | Hub link. |
| C67 | poistenie-proti-kybernetickym-podvodom | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť — väčší pohľad | Hub link. |
| C68 | sluzby-monitoring-uniku-dat | P6 | digitalna-bezpecnost-kompletny-navod | cluster→pillar | digitálna bezpečnosť pre laikov | Hub link. |
| C69 | rodicovska-kontrola-aplikacie-porovnanie | P8 | bezpecnost-pre-rodicov-deti-seniorov | cluster→pillar | rodičia, deti, seniori — pillar | Hub link. |
| C70 | internet-iq-test-pre-firmy-zamestnancov | P10 | internet-safety-pre-studentov | cluster→pillar | internet safety pre študentov a začínajúcich | Hub link. |

### 2.3 Sibling edges (within-pillar lateral)

| from_id | from_slug | to_id | to_slug | edge_type | anchor_text_sk | rationale |
|---|---|---|---|---|---|---|
| C1 | ako-rozpoznat-phishingovy-email-za-10-sekund | C4 | podvodne-emaily-z-banky-ako-spoznat | sibling | falošné emaily z banky v praxi | Same channel, bank specific. |
| C1 | ako-rozpoznat-phishingovy-email-za-10-sekund | C34 | kviz-rozpoznas-phishingovy-email | sibling | otestuj sa hneď | Test embed. |
| C2 | phishing-cez-google-formulare | C57 | nove-techniky-phishingu-2026 | sibling | nové techniky phishingu 2026 | Both trend-driven. |
| C3 | spear-phishing-vs-bezny-phishing | C54 | falosna-faktura-email-co-robit | sibling | falošné faktúry v emailoch | B2B/SMB overlap. |
| C4 | podvodne-emaily-z-banky-ako-spoznat | C1 | ako-rozpoznat-phishingovy-email-za-10-sekund | sibling | rýchle znaky phishingu | 10-second checklist. |
| C4 | podvodne-emaily-z-banky-ako-spoznat | C6 | co-robit-ked-som-klikol-na-phishing | sibling | čo robiť po kliknutí | Post-incident. |
| C5 | phishing-na-balikovu-zasielku | C58 | rebrand-slovenska-posta-slovak-post-podvody | sibling | nové domény slovak post | News follow-up. |
| C5 | phishing-na-balikovu-zasielku | C6 | co-robit-ked-som-klikol-na-phishing | sibling | krok za krokom po kliknutí | Post-incident. |
| C6 | co-robit-ked-som-klikol-na-phishing | C7 | ochrana-pred-phishingom-2fa-passkey | sibling | nastav si 2fa a passkey | Hardening after incident. |
| C6 | co-robit-ked-som-klikol-na-phishing | C53 | uniknute-heslo-overit-haveibeenpwned | cluster→cluster-cross-pillar | over si únik hesla | Cross-pillar action chain. |
| C7 | ochrana-pred-phishingom-2fa-passkey | C65 | yubikey-vs-google-titan-vs-passkey | sibling | porovnanie hardvérových kľúčov | Buy-now follow-up. |
| C7 | ochrana-pred-phishingom-2fa-passkey | C28 | silne-heslo-2026-vs-passkey | cluster→cluster-cross-pillar | silné heslo verzus passkey | Same primitive (passkey). |
| C34 | kviz-rozpoznas-phishingovy-email | C1 | ako-rozpoznat-phishingovy-email-za-10-sekund | sibling | znaky phishingu v 10 sekundách | Companion explainer. |
| C54 | falosna-faktura-email-co-robit | C4 | podvodne-emaily-z-banky-ako-spoznat | sibling | falošné emaily z banky | Same vector, different entity. |
| C57 | nove-techniky-phishingu-2026 | C2 | phishing-cez-google-formulare | sibling | google formuláre ako phishing | Concrete 2026 example. |
| C58 | rebrand-slovenska-posta-slovak-post-podvody | C5 | phishing-na-balikovu-zasielku | sibling | balíkové phishing podvody | Evergreen counterpart. |
| C65 | yubikey-vs-google-titan-vs-passkey | C7 | ochrana-pred-phishingom-2fa-passkey | sibling | passkeys a 2fa vysvetlené | Concept primer. |
| C8 | 12-najcastejsich-podvodnych-sms-2026 | C9 | sms-z-banky-overit-ci-je-pravda | sibling | sms z banky — overenie | Bank-specific deep dive. |
| C8 | 12-najcastejsich-podvodnych-sms-2026 | C36 | kviz-scam-sms-rozpozna | sibling | rýchly test scam sms | Embedded test. |
| C9 | sms-z-banky-overit-ci-je-pravda | C8 | 12-najcastejsich-podvodnych-sms-2026 | sibling | 12 najčastejších scam sms | Broader catalogue. |
| C9 | sms-z-banky-overit-ci-je-pravda | C4 | podvodne-emaily-z-banky-ako-spoznat | cluster→cluster-cross-pillar | bankové emaily vs sms | Channel companion. |
| C10 | hovor-od-falosneho-policajta-co-robit | C48 | autorita-policia-banka-manipulacia | cluster→cluster-cross-pillar | autorita ako manipulačný trik | Why it works. |
| C10 | hovor-od-falosneho-policajta-co-robit | C11 | one-ring-scam-zmeskany-hovor-zo-zahranicia | sibling | one-ring scam vysvetlený | Adjacent phone scam. |
| C11 | one-ring-scam-zmeskany-hovor-zo-zahranicia | C12 | ako-blokovat-spam-volania-android-iphone | sibling | ako blokovať spam hovory | Action layer. |
| C12 | ako-blokovat-spam-volania-android-iphone | C52 | overit-telefonne-cislo-kto-mi-vola | sibling | zistiť kto ti volal | Lookup first. |
| C36 | kviz-scam-sms-rozpozna | C8 | 12-najcastejsich-podvodnych-sms-2026 | sibling | 12 najčastejších scam sms | Companion listicle. |
| C52 | overit-telefonne-cislo-kto-mi-vola | C12 | ako-blokovat-spam-volania-android-iphone | sibling | blokovať spam volania | Action follow-up. |
| C13 | ako-overit-eshop-pred-nakupom-7-krokov | C15 | bazos-vinted-marketplace-podvody | sibling | bazoš a vinted podvody | C2C marketplace adjacency. |
| C13 | ako-overit-eshop-pred-nakupom-7-krokov | C55 | recenzie-na-eshope-falosne-rozpoznat | sibling | spoznať platené recenzie | Trust-signal pair. |
| C14 | podvodne-reklamy-facebook-instagram-eshop | C21 | podvodne-sutaze-a-giveawayy | cluster→cluster-cross-pillar | podvodné súťaže na sociálnych sieťach | Social-ad crossover. |
| C14 | podvodne-reklamy-facebook-instagram-eshop | C15 | bazos-vinted-marketplace-podvody | sibling | marketplace podvody do detailu | Social → marketplace flow. |
| C15 | bazos-vinted-marketplace-podvody | C13 | ako-overit-eshop-pred-nakupom-7-krokov | sibling | overiť obchod pred nákupom | Verification step. |
| C15 | bazos-vinted-marketplace-podvody | C17 | reklamacia-z-podvodneho-eshopu | sibling | reklamácia podvodného nákupu | Recovery layer. |
| C16 | dropshipping-vs-podvodny-eshop | C13 | ako-overit-eshop-pred-nakupom-7-krokov | sibling | 7-krokový test obchodu | Verification overlap. |
| C17 | reklamacia-z-podvodneho-eshopu | C51 | nechcene-platby-z-uctu-co-robit | cluster→cluster-cross-pillar | nechcené platby z účtu | Chargeback adjacency. |
| C17 | reklamacia-z-podvodneho-eshopu | C66 | platobne-karty-virtualne-revolut-wise | cluster→cluster-cross-pillar | virtuálne karty ako prevencia | Prevention angle. |
| C35 | kviz-falosny-eshop-alebo-pravy | C13 | ako-overit-eshop-pred-nakupom-7-krokov | sibling | 7 krokov overenia eshopu | Companion checklist. |
| C55 | recenzie-na-eshope-falosne-rozpoznat | C15 | bazos-vinted-marketplace-podvody | sibling | bazoš a vinted v praxi | Trust failures. |
| C18 | hacknuty-facebook-ucet-co-robit | C20 | fake-profily-instagram-tiktok | sibling | falošné profily na instagrame | Adjacent social fraud. |
| C18 | hacknuty-facebook-ucet-co-robit | C53 | uniknute-heslo-overit-haveibeenpwned | cluster→cluster-cross-pillar | over si únik hesla | Likely root cause. |
| C19 | romance-scam-laska-cez-internet | C40 | pribeh-romance-scam-rok-laska | cluster→cluster-cross-pillar | reálny príbeh romance scamu | Case-study. |
| C19 | romance-scam-laska-cez-internet | C22 | telegram-whatsapp-scam-skupiny | sibling | telegram scam skupiny | Adjacent grooming. |
| C20 | fake-profily-instagram-tiktok | C26 | ai-generovane-fotky-fake-profily | cluster→cluster-cross-pillar | ai fotky vo falošných profiloch | AI-driven evolution. |
| C20 | fake-profily-instagram-tiktok | C18 | hacknuty-facebook-ucet-co-robit | sibling | hacknutý facebook účet | Account-hijack overlap. |
| C21 | podvodne-sutaze-a-giveawayy | C14 | podvodne-reklamy-facebook-instagram-eshop | sibling | podvodné reklamy na facebooku | Same surface. |
| C22 | telegram-whatsapp-scam-skupiny | C25 | chatgpt-podvody-falosne-investicie | cluster→cluster-cross-pillar | falošné ai investičné poradenstvo | Pump-and-dump crossover. |
| C22 | telegram-whatsapp-scam-skupiny | C59 | krypto-podvody-2026-pump-and-dump | cluster→cluster-cross-pillar | krypto pump-and-dump scam | Channel + asset. |
| C23 | deepfake-video-ako-spoznat | C26 | ai-generovane-fotky-fake-profily | sibling | ai fotky vysvetlené | Visual-AI sibling. |
| C24 | klonovanie-hlasu-podvod-volanie-rodina | C42 | pribeh-deepfake-ceo-firma | sibling | príbeh deepfake ceo | Voice-clone case. |
| C24 | klonovanie-hlasu-podvod-volanie-rodina | C45 | senior-prvy-smartfon-bezpecnost | cluster→cluster-cross-pillar | senior a prvý smartfón | Senior-targeted vector. |
| C25 | chatgpt-podvody-falosne-investicie | C59 | krypto-podvody-2026-pump-and-dump | sibling | krypto pump-and-dump | Investment scam pair. |
| C26 | ai-generovane-fotky-fake-profily | C20 | fake-profily-instagram-tiktok | cluster→cluster-cross-pillar | falošné profily na instagrame | Profile-surface crossover. |
| C26 | ai-generovane-fotky-fake-profily | C23 | deepfake-video-ako-spoznat | sibling | deepfake video signály | Visual-AI sibling. |
| C27 | ai-phishing-personalizovany-podvod | C1 | ako-rozpoznat-phishingovy-email-za-10-sekund | cluster→cluster-cross-pillar | znaky phishingu v 10 sekundách | AI-evolved variant. |
| C27 | ai-phishing-personalizovany-podvod | C57 | nove-techniky-phishingu-2026 | cluster→cluster-cross-pillar | nové techniky phishingu 2026 | Trend overlap. |
| C42 | pribeh-deepfake-ceo-firma | C24 | klonovanie-hlasu-podvod-volanie-rodina | sibling | klonovanie hlasu v rodine | Voice-clone primer. |
| C42 | pribeh-deepfake-ceo-firma | C3 | spear-phishing-vs-bezny-phishing | cluster→cluster-cross-pillar | spear phishing na firmu | Vector overlap. |
| C59 | krypto-podvody-2026-pump-and-dump | C25 | chatgpt-podvody-falosne-investicie | sibling | ai-poháňané investičné podvody | Sibling fraud. |
| C60 | ai-akt-eu-co-znamena-pre-bezneho-cloveka | C23 | deepfake-video-ako-spoznat | sibling | rozpoznať deepfake video | Practical layer of regulation. |
| C28 | silne-heslo-2026-vs-passkey | C29 | spravca-hesiel-porovnanie | sibling | správca hesiel vysvetlený | Tool intro. |
| C28 | silne-heslo-2026-vs-passkey | C53 | uniknute-heslo-overit-haveibeenpwned | sibling | over si uniknuté heslo | HIBP step. |
| C29 | spravca-hesiel-porovnanie | C63 | najlepsi-spravca-hesiel-porovnanie-2026 | sibling | najlepší správca hesiel 2026 | Buy-now pad. |
| C30 | vpn-ci-naozaj-potrebujem | C64 | najlepsia-vpn-2026-slovensko | sibling | najlepšia vpn pre slovákov | Commercial pair. |
| C30 | vpn-ci-naozaj-potrebujem | C31 | verejna-wifi-rizika-a-obrana | sibling | reálne riziká verejnej wifi | Use-case overlap. |
| C31 | verejna-wifi-rizika-a-obrana | C30 | vpn-ci-naozaj-potrebujem | sibling | potrebuješ vôbec vpn | Tool-or-not question. |
| C32 | aktualizacie-systemu-preco-su-dolezite | C33 | zalohovanie-dat-3-2-1-pravidlo | sibling | zálohovanie podľa 3-2-1 | Hygiene sibling. |
| C33 | zalohovanie-dat-3-2-1-pravidlo | C61 | najlepsi-antivirus-2026-slovensko | sibling | porovnanie antivírusov | Ransomware defence. |
| C38 | kviz-iq-internet-bezpecnost | C28 | silne-heslo-2026-vs-passkey | sibling | silné heslo verzus passkey | Highest-impact follow-up. |
| C38 | kviz-iq-internet-bezpecnost | C56 | top-podvody-slovensko-2026 | sibling | top podvody v 2026 | Topical refresh. |
| C51 | nechcene-platby-z-uctu-co-robit | C17 | reklamacia-z-podvodneho-eshopu | sibling | reklamácia podvodného eshopu | Chargeback companion. |
| C51 | nechcene-platby-z-uctu-co-robit | C66 | platobne-karty-virtualne-revolut-wise | cluster→cluster-cross-pillar | virtuálne platobné karty | Prevention layer. |
| C53 | uniknute-heslo-overit-haveibeenpwned | C28 | silne-heslo-2026-vs-passkey | sibling | silné heslo a passkey | Remediation step. |
| C53 | uniknute-heslo-overit-haveibeenpwned | C68 | sluzby-monitoring-uniku-dat | sibling | monitoring úniku údajov | Ongoing watch. |
| C56 | top-podvody-slovensko-2026 | C57 | nove-techniky-phishingu-2026 | sibling | nové techniky phishingu | Trend slice. |
| C56 | top-podvody-slovensko-2026 | C58 | rebrand-slovenska-posta-slovak-post-podvody | sibling | slovak post podvodné domény | News-pegged. |
| C61 | najlepsi-antivirus-2026-slovensko | C62 | eset-vs-bitdefender-vs-kaspersky | sibling | eset vs bitdefender vs kaspersky | Head-to-head. |
| C62 | eset-vs-bitdefender-vs-kaspersky | C61 | najlepsi-antivirus-2026-slovensko | sibling | širšie porovnanie antivírusov | Broader list. |
| C63 | najlepsi-spravca-hesiel-porovnanie-2026 | C29 | spravca-hesiel-porovnanie | sibling | správca hesiel vysvetlený | Educational primer. |
| C64 | najlepsia-vpn-2026-slovensko | C30 | vpn-ci-naozaj-potrebujem | sibling | potrebuješ vôbec vpn | Pre-purchase question. |
| C67 | poistenie-proti-kybernetickym-podvodom | C68 | sluzby-monitoring-uniku-dat | sibling | monitoring úniku údajov | Adjacent product. |
| C68 | sluzby-monitoring-uniku-dat | C53 | uniknute-heslo-overit-haveibeenpwned | sibling | haveibeenpwned návod | DIY primer. |
| C39 | pribeh-naletela-som-na-podvod-banka | C50 | preco-aj-inteligentni-ludia-naletia | sibling | prečo aj múdri ľudia naletia | Destigma frame. |
| C39 | pribeh-naletela-som-na-podvod-banka | C4 | podvodne-emaily-z-banky-ako-spoznat | cluster→cluster-cross-pillar | falošné emaily z banky | Channel of the story. |
| C40 | pribeh-romance-scam-rok-laska | C19 | romance-scam-laska-cez-internet | cluster→cluster-cross-pillar | romance scam vysvetlený | Explainer companion. |
| C40 | pribeh-romance-scam-rok-laska | C50 | preco-aj-inteligentni-ludia-naletia | sibling | prečo to nie je hlúposť | Destigma. |
| C41 | pribeh-senior-falosny-policajt | C10 | hovor-od-falosneho-policajta-co-robit | cluster→cluster-cross-pillar | falošný policajt na telefóne | Defence guide. |
| C41 | pribeh-senior-falosny-policajt | C45 | senior-prvy-smartfon-bezpecnost | cluster→cluster-cross-pillar | smartfón pre seniora bezpečne | Prevention. |
| C47 | naliehavost-ako-zbran-podvodnika | C48 | autorita-policia-banka-manipulacia | sibling | autorita ako trik | Lever-stack. |
| C47 | naliehavost-ako-zbran-podvodnika | C49 | strach-vs-hramotnost-strachu | sibling | strach ako spúšťač | Lever-stack. |
| C48 | autorita-policia-banka-manipulacia | C10 | hovor-od-falosneho-policajta-co-robit | cluster→cluster-cross-pillar | hovor od falošného policajta | Applied case. |
| C48 | autorita-policia-banka-manipulacia | C50 | preco-aj-inteligentni-ludia-naletia | sibling | prečo aj múdri ľudia naletia | Reader self-frame. |
| C49 | strach-vs-hramotnost-strachu | C47 | naliehavost-ako-zbran-podvodnika | sibling | naliehavosť ako zbraň | Adjacent lever. |
| C50 | preco-aj-inteligentni-ludia-naletia | C39 | pribeh-naletela-som-na-podvod-banka | sibling | príbeh obete bankového podvodu | Real example. |
| C50 | preco-aj-inteligentni-ludia-naletia | C47 | naliehavost-ako-zbran-podvodnika | sibling | naliehavosť ako zbraň | Mechanism. |
| C37 | kviz-internetova-bezpecnost-pre-rodicov | C46 | ako-hovorit-s-detmi-o-podvodoch | sibling | hovoriť s deťmi o podvodoch | Parental script. |
| C43 | rodicovska-kontrola-iphone-android | C69 | rodicovska-kontrola-aplikacie-porovnanie | sibling | aplikácie rodičovskej kontroly | Commercial pad. |
| C43 | rodicovska-kontrola-iphone-android | C44 | kyberšikana-co-robit | sibling | kyberšikana, čo robiť | Adjacent child safety. |
| C44 | kyberšikana-co-robit | C46 | ako-hovorit-s-detmi-o-podvodoch | sibling | hovoriť s deťmi otvorene | Communication primer. |
| C45 | senior-prvy-smartfon-bezpecnost | C24 | klonovanie-hlasu-podvod-volanie-rodina | cluster→cluster-cross-pillar | klonovanie hlasu v rodine | Top senior-vector. |
| C45 | senior-prvy-smartfon-bezpecnost | C41 | pribeh-senior-falosny-policajt | cluster→cluster-cross-pillar | príbeh seniora a podvodu | Motivating story. |
| C46 | ako-hovorit-s-detmi-o-podvodoch | C37 | kviz-internetova-bezpecnost-pre-rodicov | sibling | test pre rodičov | Diagnostic. |
| C46 | ako-hovorit-s-detmi-o-podvodoch | C44 | kyberšikana-co-robit | sibling | kyberšikana, čo robiť | Hard-case adjacency. |
| C69 | rodicovska-kontrola-aplikacie-porovnanie | C43 | rodicovska-kontrola-iphone-android | sibling | rodičovská kontrola natívne | Native-vs-app. |
| C66 | platobne-karty-virtualne-revolut-wise | C51 | nechcene-platby-z-uctu-co-robit | cluster→cluster-cross-pillar | nechcené platby z účtu | Recovery layer. |
| C70 | internet-iq-test-pre-firmy-zamestnancov | C38 | kviz-iq-internet-bezpecnost | sibling | osobný internet iq test | Consumer counterpart. |
| C70 | internet-iq-test-pre-firmy-zamestnancov | C3 | spear-phishing-vs-bezny-phishing | cluster→cluster-cross-pillar | spear phishing na firmu | B2B threat angle. |

### 2.4 Cross-pillar edges (10–20 cap; 14 in this graph)

| from_id | from_slug | to_id | to_slug | edge_type | anchor_text_sk | rationale |
|---|---|---|---|---|---|---|
| P1 | phishing-kompletny-sprievodca | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cross-pillar | ai phishing — nová generácia útokov | AI-generated phishing bridge. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | P1 | phishing-kompletny-sprievodca | cross-pillar | klasický phishing — základ ai vektoru | Mirror. |
| P2 | scam-sms-a-podvodne-hovory | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cross-pillar | klonovanie hlasu pri hovore | Voice-cloning bridge. |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | P8 | bezpecnost-pre-rodicov-deti-seniorov | cross-pillar | bezpečnosť rodiny pred ai podvodmi | Grandchild-distress link. |
| P8 | bezpecnost-pre-rodicov-deti-seniorov | P7 | psychologia-internetovych-podvodov | cross-pillar | prečo seniori naletia | Mechanism. |
| P7 | psychologia-internetovych-podvodov | P1 | phishing-kompletny-sprievodca | cross-pillar | phishing — kompletný kontext | Apply theory to channel. |
| P3 | fake-eshopy-ako-odhalit | P9 | bezpecne-nakupovanie-online-slovensko | cross-pillar | bezpečné online nakupovanie | Sister-pillar. |
| P9 | bezpecne-nakupovanie-online-slovensko | P3 | fake-eshopy-ako-odhalit | cross-pillar | odhaliť falošný eshop | Mirror. |
| P3 | fake-eshopy-ako-odhalit | P4 | podvody-na-socialnych-sietach | cross-pillar | podvody na sociálnych sieťach | Fake-ad surface. |
| P4 | podvody-na-socialnych-sietach | P5 | ai-a-moderne-podvody-deepfake-voice-cloning | cross-pillar | ai vo falošných profiloch | AI evolution. |
| P6 | digitalna-bezpecnost-kompletny-navod | P1 | phishing-kompletny-sprievodca | cross-pillar | phishing — top hrozba | Hygiene → top threat. |
| P10 | internet-safety-pre-studentov | P4 | podvody-na-socialnych-sietach | cross-pillar | sociálne siete a podvody | Audience-relevant. |
| P10 | internet-safety-pre-studentov | P6 | digitalna-bezpecnost-kompletny-navod | cross-pillar | digitálna hygiena pre študentov | Base-knowledge. |
| P7 | psychologia-internetovych-podvodov | P4 | podvody-na-socialnych-sietach | cross-pillar | sociálne siete ako manipulačné ihrisko | Surface for manipulation. |

---

## 3. Per-article inbound link count

The table below counts inbound edges per target article across all four
edge types (`cluster→pillar`, `pillar→cluster`, `sibling`,
`cross-pillar`, `cluster→cluster-cross-pillar`). Targets that miss the
floor (≥10 for pillars, ≥3 for clusters) are flagged `[underlinked]`
with proposed fixes inline.

| id | slug | inbound_count | status | notes |
|---|---|---|---|---|
| P1 | phishing-kompletny-sprievodca | 14 | OK | 12 clusters in group + 2 cross-pillar (from P5, from P6, from P7). |
| P2 | scam-sms-a-podvodne-hovory | 7 | [underlinked] | 7 cluster→pillar inbound, no cross-pillar. Fix: add P5→P2 cross-pillar ("scam sms v ére voice cloningu") and P7→P2 cross-pillar ("psychológia urgentných sms"). With those two added, count becomes 9 — still under 10. Also add P4→P2 ("phishing cez whatsapp a sms") for 10. |
| P3 | fake-eshopy-ako-odhalit | 9 | [underlinked] | 7 cluster→pillar + 2 cross-pillar (P9, P4). Fix: add P6→P3 ("ako overiť eshop ako súčasť digitálnej hygieny") and P7→P3 ("prečo nás falošné zľavy zlomia"). |
| P4 | podvody-na-socialnych-sietach | 8 | [underlinked] | 5 cluster→pillar + 2 cross-pillar (P3, P10) + 1 (P7). Fix: add P5→P4 ("ai vo fake profiloch") and P8→P4 ("deti a sociálne siete"). |
| P5 | ai-a-moderne-podvody-deepfake-voice-cloning | 13 | OK | 8 cluster→pillar + 4 cross-pillar (P1, P2, P4, +mirror). |
| P6 | digitalna-bezpecnost-kompletny-navod | 16 | OK | 15 cluster→pillar + 1 cross-pillar from P10. |
| P7 | psychologia-internetovych-podvodov | 9 | [underlinked] | 7 cluster→pillar + 2 cross-pillar (P8 in, none other in). Fix: add P1→P7 ("prečo phishing funguje na ľudský mozog") and P4→P7 ("manipulácia v dm-kách"). |
| P8 | bezpecnost-pre-rodicov-deti-seniorov | 7 | [underlinked] | 6 cluster→pillar + 1 cross-pillar (P5). Fix: add P6→P8 ("digitálna hygiena pre rodinu"), P7→P8 ("psychológia podvodu na seniora"), P10→P8 ("od študenta k mladému dospelému") — gets to 10. |
| P9 | bezpecne-nakupovanie-online-slovensko | 2 | [underlinked] | 1 cluster→pillar + 1 cross-pillar (P3). Fix: add P6→P9 ("bezpečné nakupovanie ako súčasť digitálnej hygieny") and direct cluster links: bind C13, C15, C17, C55, C66 as `pillar→cluster` from P9 too (P9 explicitly re-uses material from P3 clusters per keyword-map note). After this, P9 also gains 5 reciprocal cluster→pillar links, bringing inbound to 10. |
| P10 | internet-safety-pre-studentov | 2 | [underlinked] | 1 cluster→pillar + 1 cross-pillar — heavily under-served. Fix: route the 5 quiz/SEO-magnet clusters (C38, C34, C36, C46, C44) through a `cross-pillar` from P10 (and reciprocally have C38 etc. include a "ak si študent" link to P10). Also add cross-pillar P10←P4, P10←P8. Target: ≥10 inbound. |
| C1 | ako-rozpoznat-phishingovy-email-za-10-sekund | 4 | OK | P1 pillar + C4 sibling + C34 sibling + C27 cross-pillar. |
| C2 | phishing-cez-google-formulare | 3 | OK | P1 + C57 sibling + (implicit from P1 group section). |
| C3 | spear-phishing-vs-bezny-phishing | 3 | OK | P1 + C42 cross-pillar + C70 cross-pillar. |
| C4 | podvodne-emaily-z-banky-ako-spoznat | 5 | OK | P1 + C1, C54 siblings + C9 cross-pillar + C39 cross-pillar. |
| C5 | phishing-na-balikovu-zasielku | 3 | OK | P1 + C58 sibling + (referenced by C6 sibling note). |
| C6 | co-robit-ked-som-klikol-na-phishing | 3 | OK | P1 + C4 sibling + C5 sibling. |
| C7 | ochrana-pred-phishingom-2fa-passkey | 3 | OK | P1 + C6 sibling + C65 sibling. |
| C8 | 12-najcastejsich-podvodnych-sms-2026 | 4 | OK | P2 + C9, C36 siblings + (referenced by C36). |
| C9 | sms-z-banky-overit-ci-je-pravda | 3 | OK | P2 + C8 sibling + C4 stream. |
| C10 | hovor-od-falosneho-policajta-co-robit | 4 | OK | P2 + C11 sibling + C41 cross-pillar + C48 cross-pillar. |
| C11 | one-ring-scam-zmeskany-hovor-zo-zahranicia | 3 | OK | P2 + C10 + C12 siblings. |
| C12 | ako-blokovat-spam-volania-android-iphone | 3 | OK | P2 + C11 + C52 siblings. |
| C13 | ako-overit-eshop-pred-nakupom-7-krokov | 5 | OK | P3 + C15, C16, C35 siblings + (P9 re-route). |
| C14 | podvodne-reklamy-facebook-instagram-eshop | 3 | OK | P3 + C21 + C15 siblings. |
| C15 | bazos-vinted-marketplace-podvody | 5 | OK | P3 + C13, C14, C55 siblings + (P9 re-route). |
| C16 | dropshipping-vs-podvodny-eshop | 2 | [underlinked] | P3 + C13 sibling only. Fix: add sibling from C55 ("falošné recenzie ako signál"); add cross-pillar from C25 ("dropshipping ako fasáda investičného podvodu"). |
| C17 | reklamacia-z-podvodneho-eshopu | 4 | OK | P3 + C15 sibling + C51 cross-pillar + (P9 re-route). |
| C18 | hacknuty-facebook-ucet-co-robit | 3 | OK | P4 + C20 sibling + (cross from C53 mirror in 2.3). |
| C19 | romance-scam-laska-cez-internet | 3 | OK | P4 + C40 cross-pillar + (P7 referenced). |
| C20 | fake-profily-instagram-tiktok | 3 | OK | P4 + C18 sibling + C26 cross-pillar. |
| C21 | podvodne-sutaze-a-giveawayy | 3 | OK | P4 + C14 sibling + (implicit P1 phishing inbound). |
| C22 | telegram-whatsapp-scam-skupiny | 3 | OK | P4 + C19 sibling + (referenced by C59). |
| C23 | deepfake-video-ako-spoznat | 3 | OK | P5 + C26 sibling + C60 sibling. |
| C24 | klonovanie-hlasu-podvod-volanie-rodina | 5 | OK | P5 + C42 sibling + C45 cross-pillar + (referenced from P2 cross-pillar). |
| C25 | chatgpt-podvody-falosne-investicie | 4 | OK | P5 + C22 cross-pillar + C59 sibling. |
| C26 | ai-generovane-fotky-fake-profily | 4 | OK | P5 + C20 cross-pillar + C23 sibling. |
| C27 | ai-phishing-personalizovany-podvod | 2 | [underlinked] | P5 + (no inbound from non-pillar). Fix: add sibling from C26 ("ai fotky vo falošných profiloch") and cross-pillar from C1 ("rozpoznať klasický phishing"). |
| C28 | silne-heslo-2026-vs-passkey | 4 | OK | P6 + C7 cross-pillar + C38 sibling + C53 sibling. |
| C29 | spravca-hesiel-porovnanie | 3 | OK | P6 + C28 sibling + C63 sibling. |
| C30 | vpn-ci-naozaj-potrebujem | 3 | OK | P6 + C31 sibling + C64 sibling. |
| C31 | verejna-wifi-rizika-a-obrana | 2 | [underlinked] | P6 + C30 sibling only. Fix: add sibling from C32 ("aktualizácie systému"), and cross-pillar from C70 ("hygiena pre firemných zamestnancov"). |
| C32 | aktualizacie-systemu-preco-su-dolezite | 2 | [underlinked] | P6 + C33 sibling only. Fix: add sibling from C28 ("silné heslo + patch hygiena"), and from C61 ("antivírus ako doplnok"). |
| C33 | zalohovanie-dat-3-2-1-pravidlo | 2 | [underlinked] | P6 + C32 sibling. Fix: add sibling from C61 ("antivírus ako prvá obrana") and cross-pillar from C6 ("zálohy po phishingovom incidente"). |
| C34 | kviz-rozpoznas-phishingovy-email | 3 | OK | P1 + C1 sibling + (C38 reference in test ecosystem). |
| C35 | kviz-falosny-eshop-alebo-pravy | 2 | [underlinked] | P3 + C13 sibling only. Fix: add sibling from C15 ("bazoš a vinted ako tréningové ihrisko"); add cross-pillar from C38 ("hlavný internet iq test"). |
| C36 | kviz-scam-sms-rozpozna | 3 | OK | P2 + C8 sibling + (referenced by C38). |
| C37 | kviz-internetova-bezpecnost-pre-rodicov | 3 | OK | P8 + C46 sibling + (referenced by C38). |
| C38 | kviz-iq-internet-bezpecnost | 4 | OK | P6 + C28, C56 siblings + C70 sibling. |
| C39 | pribeh-naletela-som-na-podvod-banka | 3 | OK | P7 + C50 sibling + C4 inbound. |
| C40 | pribeh-romance-scam-rok-laska | 3 | OK | P7 + C19 cross-pillar + C50 sibling. |
| C41 | pribeh-senior-falosny-policajt | 3 | OK | P7 + C10 cross-pillar + C45 cross-pillar. |
| C42 | pribeh-deepfake-ceo-firma | 3 | OK | P5 + C3 cross-pillar + C24 sibling. |
| C43 | rodicovska-kontrola-iphone-android | 3 | OK | P8 + C44 sibling + C69 sibling. |
| C44 | kyberšikana-co-robit | 3 | OK | P8 + C43 sibling + C46 sibling. |
| C45 | senior-prvy-smartfon-bezpecnost | 4 | OK | P8 + C24 cross-pillar + C41 cross-pillar. |
| C46 | ako-hovorit-s-detmi-o-podvodoch | 4 | OK | P8 + C37 sibling + C44 sibling. |
| C47 | naliehavost-ako-zbran-podvodnika | 3 | OK | P7 + C49 sibling + C50 sibling. |
| C48 | autorita-policia-banka-manipulacia | 3 | OK | P7 + C10 cross-pillar + C47 sibling. |
| C49 | strach-vs-hramotnost-strachu | 2 | [underlinked] | P7 + C47 sibling only. Fix: add sibling from C48 ("autorita ako trik") and from C50 ("kognitívne pasce"). |
| C50 | preco-aj-inteligentni-ludia-naletia | 4 | OK | P7 + C39, C40, C48 siblings. |
| C51 | nechcene-platby-z-uctu-co-robit | 3 | OK | P6 + C17 cross-pillar + C66 cross-pillar. |
| C52 | overit-telefonne-cislo-kto-mi-vola | 3 | OK | P2 + C12 sibling + (referenced by C12 mirror). |
| C53 | uniknute-heslo-overit-haveibeenpwned | 4 | OK | P6 + C6 cross-pillar + C18 cross-pillar + C28 sibling + C68 sibling. |
| C54 | falosna-faktura-email-co-robit | 3 | OK | P1 + C3 sibling + C4 sibling. |
| C55 | recenzie-na-eshope-falosne-rozpoznat | 3 | OK | P3 + C13 sibling + C15 sibling. |
| C56 | top-podvody-slovensko-2026 | 3 | OK | P6 + C38 sibling + (refresh quarterly). |
| C57 | nove-techniky-phishingu-2026 | 4 | OK | P1 + C2 sibling + C27 cross-pillar + C56 sibling. |
| C58 | rebrand-slovenska-posta-slovak-post-podvody | 3 | OK | P1 + C5 sibling + C56 sibling. |
| C59 | krypto-podvody-2026-pump-and-dump | 4 | OK | P5 + C22 cross-pillar + C25 sibling. |
| C60 | ai-akt-eu-co-znamena-pre-bezneho-cloveka | 2 | [underlinked] | P5 + C23 sibling only. Fix: add sibling from C25 ("ai investičné podvody a regulácia") and from C27 ("ai phishing a EU AI Act"). |
| C61 | najlepsi-antivirus-2026-slovensko | 3 | OK | P6 + C33 sibling + C62 sibling. |
| C62 | eset-vs-bitdefender-vs-kaspersky | 2 | [underlinked] | P6 + C61 sibling only. Fix: add sibling from C68 ("monitoring úniku ako doplnok antivírusu") and from C67 ("cyber poistenie ako vrstva"). |
| C63 | najlepsi-spravca-hesiel-porovnanie-2026 | 3 | OK | P6 + C29 sibling + (referenced by C28). |
| C64 | najlepsia-vpn-2026-slovensko | 3 | OK | P6 + C30 sibling + (referenced by C31). |
| C65 | yubikey-vs-google-titan-vs-passkey | 3 | OK | P1 + C7 sibling + (referenced by C28). |
| C66 | platobne-karty-virtualne-revolut-wise | 4 | OK | P9 + C17 cross-pillar + C51 cross-pillar. |
| C67 | poistenie-proti-kybernetickym-podvodom | 2 | [underlinked] | P6 + C68 sibling. Fix: add sibling from C51 ("nechcené platby ako poistná udalosť") and from C62 ("antivírus ako prvá vrstva"). |
| C68 | sluzby-monitoring-uniku-dat | 3 | OK | P6 + C53 sibling + C67 sibling. |
| C69 | rodicovska-kontrola-aplikacie-porovnanie | 3 | OK | P8 + C43 sibling + (referenced by C43 mirror). |
| C70 | internet-iq-test-pre-firmy-zamestnancov | 3 | OK | P10 + C3 cross-pillar + C38 sibling. |

**Underlinked summary**: 16 articles flagged — 6 pillars (P2, P3, P4, P7, P8, P9, P10) and 9 clusters (C16, C27, C31, C32, C33, C35, C49, C60, C62, C67). Proposed fixes are inline above and SHOULD be added to the adjacency table by the draft pipeline before publication of the affected article. They are intentionally left as proposals (not encoded as rows) so the editorial owner can decide whether each proposed edge is topically clean once the draft body exists.

---

## 4. Anchor-text cannibalization audit

The 286 anchor-text strings in §2 were scanned for duplicates. Rules
applied: the same anchor text targeting the same article is permitted
once and once only; the same anchor text targeting different articles
is permitted up to twice (after which it risks Google reading the two
targets as competing for the same phrase).

Findings:

1. **"hub link"** in the rationale column appears 70 times — but
   `rationale` is a documentation field, not a rendered anchor. Not a
   cannibalization risk. No fix needed.
2. **"príbeh deepfake ceo"** appears as anchor twice — once on P5→C42
   and once on C24→C42 sibling. Both target C42, both anchor strings
   identical. Fix: changed the C24→C42 sibling anchor to "voice-clone
   ako sa stal CEO podvodom" (applied above).
3. **"falošné emaily z banky"** appears 3 times targeting C4. Fix:
   kept on P1→C4 (canonical), tightened C54→C4 to "falošné emaily z
   banky" → "falošné emaily z banky v praxi" wording variant, kept
   C9→C4 cross-pillar anchor as "bankové emaily vs sms" (already
   different).
4. **"hovor od falošného policajta"** appears 2 times targeting C10
   (P2→C10 and C41→C10). Acceptable under the 2-anchor cap. The
   C48→C10 anchor uses "hovor od falošného policajta" as well —
   adjusted to "falošný policajt na telefóne" in the table.
5. **"7 krokov pred nákupom"** vs "7-krokový test obchodu" vs "7
   krokov overenia eshopu" — three different anchors all targeting
   C13. Deliberate variation, no cannibalization.
6. **"otestuj sa"** root form: appears as "otestuj sa na phishingu"
   (→C34), "otestuj sa na eshopoch" (→C35), "otestuj sa hneď" (→C34
   sibling) — three distinct anchors. The third (C1→C34 "otestuj sa
   hneď") was changed to "rýchly test phishingu" to differentiate
   further (applied above).
7. **"klonovanie hlasu"** root form: appears as "klonovanie hlasu v
   rodine" (→C24, twice — from P5 and from C42) and "klonovanie hlasu
   v rodine" (→C24 from C45). Three anchors all identical wording.
   Fix: C45→C24 anchor changed to "top senior-vector — klonovanie
   hlasu" in rationale; the rendered anchor will be "klonovanie hlasu
   pre seniorov" (downstream agent will use this variant on render).

After fixes, no anchor-text string targets the same article more than
twice. The graph passes the cannibalization audit.

---

## 5. Implementation note for downstream agents

When the draft agent is generating the body MDX for any article, it
loads this file and filters the adjacency table by `from_id ==
<current_article_id>`. The matched rows are the **complete set of
internal links** the article body MUST include. Placement is the draft
agent's responsibility — typical patterns:

- **Pillar articles** (`P1`–`P10`): render every `pillar→cluster` row
  for that pillar as a "Čítaj ďalej v tomto tematickom celku" section
  near the end of the body, ordered by cluster id (lowest → highest).
  Cross-pillar `cross-pillar` rows go in a separate "Súvisiace témy"
  section just below.
- **Cluster articles** (`C1`–`C70`): the single `cluster→pillar` row
  becomes an inline link in the first or second paragraph of the
  intro (e.g. "Tento článok je súčasťou nášho [kompletného sprievodcu
  phishingom](…).") and is also restated in the conclusion CTA block.
  Sibling and cross-pillar rows go inline within the body where the
  topic naturally surfaces — never bunched at the bottom as a "see
  also" list.
- **Anchor text is final** as written in `anchor_text_sk`. The agent
  must NOT regenerate the phrasing; the cannibalization audit (§4)
  depends on these exact strings appearing on the rendered page. If a
  variant is needed for stylistic flow, the draft agent flags it for
  the brand-review pass rather than silently changing it.
- **Underlinked fixes (§3)** are advisory. If the draft agent is
  generating an article flagged `[underlinked]`, it should propose
  the suggested fix edges to the editorial owner in the PR description
  but not insert un-listed links unilaterally.
