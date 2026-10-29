# Právny a compliance audit — subenai.sk (október 2026)

**Stav:** analýza kódu a textov v repozitári k 2026-10-29 (commit `fecfb535`
na `main`). Žiadne právne texty sa touto analýzou nemenia. Nie je to právne
stanovisko — položky označené **⚖️ na kontrolu právnikom** potrebujú
posúdenie advokáta (slovenské spotrebiteľské právo, GDPR, AI Act, EAA).

Závažnosť: **P0** (okamžite), **P1** (pred ďalším zverejnením / do 30 dní),
**P2** (najbližší release), **P3** (údržba).

## Zhrnutie

| # | Oblasť | Stav | Závažnosť |
|---|---|---|---|
| 1 | Zásady ochrany osobných údajov | existujú, kvalitné; 4 vecné nepresnosti | P2 |
| 2 | Obchodné podmienky (VOP) | **neexistujú** | **P1** |
| 3 | Cookies + súhlas | existujú, správne opt-in; chýbajú položky v tabuľke | P3 |
| 4 | Vrátenie darov (Stripe) | informácia je, ale len vnútri /privacy | P2 |
| 5 | Minimalizácia údajov | dobrá; 2 nedisclosnuté položky | P2 |
| 6 | Inventár 3rd-party | GA4, Stripe, Turnstile, Supabase, YouTube-nocookie, Workers AI, Anthropic, Resend | P2 (Turnstile) |
| 7 | Prístupnosť (EAA od 28. 6. 2025) | slušný základ, **chýba vyhlásenie o prístupnosti** | P2 |
| 8 | Dark patterns / falošné recenzie | žiadne recenzie; **počítadlo +127** | P2 |
| 9 | Identifikácia prevádzkovateľa | na /privacy, /contact, thank-you; **nie v pätičke ani na /support** | P2 |
| 10 | Licencie / autorské práva | LICENSE nesedí s prevádzkovateľom, chýba OFL súbor | P3 |
| 11 | AI transparentnosť (AI Act čl. 50) | čiastočná | P2 |

## 1. Zásady ochrany osobných údajov

Súbory: `src/i18n/locales/sk/legal.json` (`privacy.*`),
`src/routes/privacy.lazy.tsx`, `src/routes/privacy.tsx` (JSON-LD).

**Existuje (v poriadku):**
- Identifikácia prevádzkovateľa (am.bonum s. r. o., Škultétyho 1560/3,
  052 01 SNV, IČO 55 055 290, DIČ 2121850005, OR OS Košice I, Sro 55453/V,
  konateľ), kontakt `subenai.podpora@gmail.com` (`src/config/site.ts:2`).
- DPO: výslovne uvedené, že nie je povinný (čl. 37). Dozorný orgán ÚOOÚ SR
  s adresou (`privacy.s5.right_complaint_suffix`).
- Právne základy + doby uchovávania v tabuľke `privacy.s3` (výsledky 36 m,
  anti-cheat 12 m, edu 12 m + anonymizácia, GA4 14 m, sponzorstvo 10 r.
  podľa z. 431/2002, DPA žiadosť 12 m, scam-chat 0).
- Sprostredkovatelia (`privacy.s4`): Supabase (Frankfurt), Cloudflare,
  Stripe, Resend, Anthropic, Google Analytics, Cloudflare Workers AI; prenosy
  cez SCC.
- Práva dotknutej osoby čl. 15–22 + lehota 30 dní; samoobslužný DSR formulár
  `src/routes/app.legal.dsr.tsx` + export `functions/api/account/export-data.ts`.
- Verzia a dátum: `privacy.last_updated` = 18. 5. 2026, v1.4.0.

**Nálezy:**
- **P2 — nepravdivý údaj o Anthropic „cez EU endpoint“.**
  `legal.json:130` (`privacy.s4.anthropic_text`) tvrdí EU endpoint; kód volá
  `https://api.anthropic.com/v1/messages` (`functions/_lib/anthropic.ts:25`),
  čo je globálny (US) endpoint. Buď prepnúť na EU endpoint, alebo opraviť
  text (prenos do USA + SCC/DPF). ⚖️
- **P2 — Cloudflare Turnstile nie je nikde uvedený** (0 výskytov „turnstile“
  v `legal.json`), pričom sa načítava na `/pomocnik`, `/contact-form`,
  `/schools/dpa`, `/manage-support`
  (`src/components/common/TurnstileWidget.tsx:60-62`). Turnstile nastavuje
  vlastné cookies a robí fingerprinting prehliadača — treba doplniť do
  /privacy (sprostredkovateľ Cloudflare, účel ochrana pred botmi, právny
  základ oprávnený záujem) aj do /cookies (nevyhnutné cookies tretej strany).
- **P2 — `dpa_requests.ip_hash` sa ukladá**
  (`functions/api/dpa-request.ts:171,180`,
  `supabase/migrations/20260521200000_dpa_requests.sql:41`), ale riadok
  `privacy.s3.rows.dpa` uvádza len meno, e-mail, názov školy. Doplniť
  „hash IP adresy (anti-spam), 12 mesiacov“. Technická poznámka: soľ hashu je
  prvých 8 znakov service-role kľúča (`dpa-request.ts:171`) — vymeniť za
  samostatný secret (mimo tohto auditu, bezpečnostný dlh).
- **P2 — drift cs/en verzií** `legal.json` (chýba ~11 kľúčov oproti sk:
  riadok dpa, templates_public, Anthropic, `cookies.s4.no_record`,
  `s5.dnt_note`). UI je dnes zamknuté na `sk`
  (`src/i18n/locale-context.tsx:51-58`), takže nejde o živé riziko, ale pri
  zapnutí cs/en by boli právne texty neúplné.
- P3 — kontaktný e-mail pre GDPR na doméne gmail.com; pre dôveryhodnosť
  použiť `@subenai.sk` (už existuje `podpora@subenai.sk` v e-mailových
  šablónach E48).
- P3 — `privacy.s2.exclusions_text` („nespracúvame e-mail, meno…“) platí len
  pre anonymný test, ale neskoršie sekcie (sponzorstvo, edu, šablóny, DSR)
  meno/e-mail spracúvajú. Doplniť „pri anonymnom teste“.

## 2. Obchodné podmienky (VOP) — chýbajú — **P1** ⚖️

- Žiadna route ani kľúč pre VOP/podmienky: `grep -rliE "podmienky|terms|VOP"
  src/routes` → 0; `legal.json` má len `privacy` a `cookies`. Pätička
  (`src/components/layout/Footer.tsx:48-60`) má v stĺpci „Právne“ iba
  Súkromie, Cookies, Spravovať podporu.
- Stripe Checkout má vypnutý súhlas s VOP:
  `functions/api/create-checkout-session.ts:188`
  `consent_collection: { terms_of_service: "none" }`.
- Registrácia (`src/routes/signup.lazy.tsx`) neobsahuje žiadny odkaz na
  podmienky ani na ochranu údajov (grep `privacy|súhlas` → 0 v `auth.json`).
- Jediný „zmluvný“ text je licenčný súhlas CC BY 4.0 pri odoslaní šablóny
  (`tests.json templates.submission.consent_*`,
  `src/components/app/templates/TemplateSubmitDialog.tsx:179-189`), ktorý
  odkazuje na /privacy ako „plné podmienky“ — privacy policy nie je zmluva.
- DPA pre školy (`src/routes/schools_.dpa.tsx`, `src/lib/dpa/dpa-template.tsx`)
  je za feature flagom `VITE_DPA_FLOW_ENABLED` „until legal counsel“
  (`schools_.dpa.tsx:15`) — správne, ale znamená to, že školy dnes nemajú ani
  DPA, ani VOP; vzťah prevádzkovateľ/sprostredkovateľ je popísaný len v
  marketingu (`marketing.json skoly.gdpr_p_*`) a v /privacy s8.
- Platené plány zatiaľ nie sú v `main` (sú v PR #218 E66). **Pred merge E66
  musia existovať VOP** (predmet služby, cena, platba, odstúpenie podľa
  z. 102/2014 § 7 ods. 6 pre digitálny obsah, zodpovednosť, IP, ukončenie,
  rozhodné právo, ARS/ODR odkaz).

Odporúčanie: jedna stránka `/terms` (sk „Podmienky používania“) pokrývajúca
(a) bezplatné používanie testov a akadémie, (b) používateľský účet, (c)
sponzorské príspevky (odkaz na sekciu 4), (d) edu testy pre školy, (e)
verejnú knižnicu šablón (CC BY), (f) AI pomocníka (bez záruky). Pridať
checkbox/odkaz pri registrácii a `terms_of_service: "required"` v Stripe
Checkout. ⚖️

## 3. Cookies a súhlas

Súbory: `index.html:36-77`, `src/lib/consent.ts`,
`src/components/consent/ConsentBanner.tsx`,
`src/components/analytics/GoogleAnalyticsManager.tsx`, `legal.json cookies.*`,
`src/routes/cookies.lazy.tsx`.

**V poriadku:**
- Consent Mode v2 default „denied“ (`index.html:36-49`), `gtag.js` sa vkladá
  iba ak uložený súhlas `iiq_consent.categories.analytics === true` a DNT ≠ 1
  (`index.html:52-77`); `/admin` vylúčený. DNT/GPC rešpektované
  (`src/components/analytics/do-not-track.ts`). GA4 sa teda pred súhlasom
  nenačítava.
- `CONSENT_VERSION` 1.8.0, bump vynúti nový súhlas; odvolanie súhlasu cez
  pätičku (`Footer.tsx` `footer-cookies-button`) aj /cookies.
- /cookies má tabuľku kategórií s kľúčmi a dobami vrátane Stripe
  (`__stripe_mid/_sid`), `sb-*-auth-token`, `_ga*`.
- YouTube iba click-to-play cez `youtube-nocookie.com`
  (`src/components/academy/ScamAudioEmbed.tsx`).

**Nálezy:**
- P3 — „Prijať všetko“ je plné tlačidlo, „Odmietnuť“ a „Nastavenia“ sú
  `variant="outline"` (`ConsentBanner.tsx:73,82`). Komentár v súbore (r. 10)
  tvrdí rovnakú prominentnosť — fakticky nie je. Odporúčanie ÚOOÚ/EDPB:
  rovnaká vizuálna váha. Zjednotiť variant.
- P3 — v tabuľke /cookies chýbajú kľúče: `iiq:sounds-enabled`
  (`src/hooks/useSoundPreference.ts:5`), `app-explainer-*`,
  `admin-explainer-*` (`src/components/user/AppPageExplainer.tsx:30`,
  `AdminPageExplainer.tsx:36`), `iiq_trap_seen` (`src/lib/data-trap/copy.ts:114`),
  `subenai.flash.signedOut`, sessionStorage kľúče respondenta a TestFlow,
  cookie `sidebar_state` (`src/components/ui/sidebar.tsx:22,90`). Všetko sú
  nevyhnutné/preferenčné položky bez identifikácie — doplniť do tabuľky.
- P2 — Turnstile cookies (viď sekcia 1) a YouTube-nocookie nie sú uvedené
  medzi tretími stranami v /cookies.

## 4. Sponzorské príspevky, vrátenie a zrušenie (Stripe)

Súbory: `src/routes/support.lazy.tsx`, `marketing.json podpora.*`,
`functions/api/create-checkout-session.ts`, `functions/api/stripe-webhook.ts`,
`functions/api/customer-portal.ts`, `legal.json privacy.s7.*`.

**V poriadku:**
- Žiadna predvolená suma ani predvolené opakovanie (`support.lazy.tsx:33-46`),
  všetky checkboxy default `false`.
- Súhlas so začatím plnenia a stratou práva na odstúpenie (§ 7 ods. 6
  z. 102/2014) je checkbox vynútený aj serverovo
  (`create-checkout-session.ts:86-97`) a zopakovaný v Stripe `custom_text`.
- Mesačný príspevok jasne označený („{amount} €/mes“), zrušenie cez
  Customer Portal (`/manage-support` → `customer-portal.ts:90`).
- `charge.refunded` sa spracúva (záporný riadok v ledgeri + e-mail
  `stripe-webhook.ts:109,269-334`).
- Faktúra: thank-you stránka uvádza vystavovateľa am.bonum s. r. o., IČO,
  sídlo, „nie sme platcami DPH“ (`podakovanie.invoice_issuer_*`).

**Nálezy:**
- **P2 — podmienky vrátenia existujú len v /privacy s7** („príspevok je
  nevratný, zrušenie platí na ďalšie obdobia“). Privacy policy nie je správny
  nástroj; text patrí do VOP / samostatnej sekcie „Sponzorské príspevky“
  odkazovanej z /support pred platbou. ⚖️
- **P2 — na /support nie je identifikácia obchodníka** (len „Stripe Payments
  Europe“). § 3 ods. 1 z. 102/2014 vyžaduje identifikáciu predávajúceho
  pred uzavretím zmluvy na diaľku. Doplniť am.bonum s. r. o. + IČO + sídlo
  do `podpora.footer_legal` (`support.lazy.tsx:454-456`).
- P3 — chýba výslovné „príspevok nie je daňovo uznateľný dar / nejde o 2 %“
  (am.bonum je s. r. o., nie n.o.). ⚖️
- P3 — charakter plnenia: ak je to „dar“ bez protiplnenia, § 7 ods. 6
  (digitálny obsah) nie je úplne priliehavý; ak je to „podpora s benefitom“
  (zobrazenie v pätičke, odkaz), ide o službu. Právnik má určiť režim a tomu
  prispôsobiť text checkboxu. ⚖️

## 5. Minimalizácia údajov

- Kvíz: anonymný; voliteľný prieskum (vek. kategória, pohlavie, mesto,
  krajina, sebahodnotenie) — `src/components/quiz/survey/SurveyCard.tsx:36-78`,
  všetko voliteľné a disclosnuté (`privacy.s2.survey_*`). P3: krajina je
  predvyplnená (`SurveyCard.tsx:78`).
- Edu intake: meno + e-mail + súhlas
  (`src/components/composer/edu/intake/RespondentIntakeForm.tsx:89-91,139`),
  sessionStorage len s „preferences“ súhlasom; anonymizácia po 12 m.
- IP: nikde sa neukladá surová IP; `readClientIp` sa používa iba pre KV
  rate-limit (`functions/_lib/security.ts:148-150`). Výnimka
  `dpa_requests.ip_hash` (sekcia 1). Stĺpec `sessions.ip_hash`
  (`supabase/migrations/20260517000000_admin_hub_schema.sql:337-349`) nemá
  produkčný zápis — zvážiť drop.
- Scam-chat: Cloudflare Workers AI (Llama 3.x, Llama Guard, bge-m3, vision)
  — `functions/api/scam-chat/index.ts:99-103`; nulová retencia prepisu, foto
  zmenšené a zahodené. Zhoduje sa s `privacy.s_scam`.
- **P2 — precheck šablón posiela celý autorský obsah do Anthropic (USA)**
  (`functions/api/templates/precheck.ts`); dialóg hovorí len „AI moderátor“
  (`tests.json templates.submission.consent_details_body`) bez mena
  sprostredkovateľa a prenosu mimo EÚ. Doplniť jednu vetu do dialógu.

## 6. Inventár tretích strán a SDK

| Služba | Kde | Súhlas | Uvedené v /privacy | Uvedené v /cookies |
|---|---|---|---|---|
| Google Analytics 4 `G-95QZ12WGFD` | `index.html:49,73`, `GoogleAnalyticsManager.tsx` | áno, opt-in | áno | áno |
| Stripe Checkout (redirect) | `functions/api/create-checkout-session.ts` | — (platba) | áno | áno |
| Cloudflare Turnstile | `TurnstileWidget.tsx`, 4 formuláre | nie (nevyhnutné) | **nie** | **nie** |
| Supabase | `src/integrations/supabase/client.ts` | — | áno | áno (`sb-*`) |
| YouTube-nocookie | `ScamAudioEmbed.tsx` (click-to-play) | implicitný klik | nie | nie |
| Cloudflare Workers AI | `functions/api/scam-chat/*` | — | áno | áno |
| Anthropic API | `functions/api/templates/precheck.ts` | — | áno (nepresne) | — |
| Resend | `functions/_lib/email.ts` | — | áno | — |
| Impact.com verification meta | `index.html:81` | — | **nie** | — |

Nenájdené: Sentry, Plausible, Hotjar, Clarity, FB pixel, Google Fonts
(fonty self-hosted), reCAPTCHA. Zdieľacie odkazy (FB/WhatsApp/X/LinkedIn)
sú čisté URL bez SDK (`src/lib/share/intents.ts`).

- P3 — `meta name="impact-site-verification"` (`index.html:81`) naznačuje
  affiliate vzťah (E54). Ak sú v akadémii affiliate odkazy, musia byť
  označené ako reklama (§ 4 z. 147/2001 o reklame, UCPD). Overiť stav E54.
- P3 — CSP `script-src` obsahuje `'unsafe-inline'` (`public/_headers:1-8`)
  napriek existujúcemu extraktoru hashov — bezpečnostný, nie právny bod.

## 7. Prístupnosť — European Accessibility Act (účinnosť 28. 6. 2025)

Zákon č. 351/2022 Z. z. sa vzťahuje na služby elektronického obchodu —
minimálne na tok sponzorských príspevkov; pre edukačné služby je to
hraničné. ⚖️

**V poriadku:** `<html lang="sk">` (`index.html:2`), skip-link
(`src/components/layout/SkipToContentLink.tsx`), globálny `:focus-visible`
(`src/styles.css:267-269`), prepínače veľkosti písma / pohybu / témy
(AccessibilityProvider), `prefers-reduced-motion` bootstrap
(`index.html:11-28`), formuláre login/signup/contact majú labely, ikonové
tlačidlá v layout komponentoch majú `aria-label`.

**Nálezy:**
- **P2 — chýba Vyhlásenie o prístupnosti** (grep „prístupnos“ v routes a
  locales → iba `a11y.menu_aria`). EAA/WCAG 2.1 AA prax vyžaduje verejné
  vyhlásenie s kontaktom na nahlásenie bariér. Pridať `/accessibility`
  (sk „Vyhlásenie o prístupnosti“) do stĺpca „Právne“ v pätičke.
- P3 — axe testy pokrývajú 4 komponenty (`tests/a11y/components.a11y.test.tsx`);
  rozšíriť na stránky /support, /login, /pomocnik, kvíz.
- P3 — `alt="QR"` (`src/routes/login_.enroll-2fa.tsx:204`) nie je
  informatívny; MDX obrázky bez alt padajú na `""` (`BlogPostBody.tsx:166-190`)
  — pridať lint na obsah akadémie.
- P3 — kontrastné tokeny nie sú auditované automatizovane (Lighthouse config
  existuje, prah pre a11y neoverený).

## 8. Dark patterns, skryté poplatky, falošné recenzie

- Žiadne recenzie/testimoniály (grep → 0), žiadne odpočítavania, žiadny
  `defaultChecked`, žiadna predvolená suma ani opakovanie — v poriadku.
- **P2 — nafúknuté počítadlo „Už otestovaných {count} ľudí“**:
  `src/routes/index.tsx:410` `displayCount = count + 127` s komentárom „aby
  prví návštevníci nevideli 0“. Nepravdivý údaj o rozsahu používania je
  klamlivá obchodná praktika (§ 7–8 z. 250/2007, príloha I UCPD). Odstrániť
  offset alebo zmeniť na pravdivú formuláciu („pridaj sa k prvým“). ⚖️

## 9. Identifikácia prevádzkovateľa (z. 22/2004 § 4, z. 102/2014 § 3)

Plná identifikácia je na: /privacy s1, /contact
(`src/routes/contact.tsx:131-135`), thank-you (vystavovateľ faktúry), JSON-LD
(`src/lib/seo/academy-jsonld.ts:11`).

**Nálezy:**
- **P2 — pätička** (`Footer.tsx`, `marketing.json footer.copyright`) uvádza
  len „© {year} subenai“ a „powered by lvtesting.eu“ — bez právnickej osoby,
  IČO, sídla. Odporúčanie: jeden riadok „Prevádzkovateľ: am.bonum s. r. o.,
  IČO 55 055 290, Spišská Nová Ves“ + odkaz na /contact.
- **P2 — /support** (stránka, kde sa iniciuje platba) obchodníka neuvádza
  (sekcia 4).
- P3 — `index.html` JSON-LD Organization má `name: "subenai"` bez
  `legalName`/`vatID`.

## 10. Licencie a autorské práva

- `LICENSE`: proprietárna „All Rights Reserved“, © 2026 Lubomir Volcko
  (fyzická osoba) — P3 nesúlad s prevádzkovateľom am.bonum s. r. o. a odkaz
  na starý názov „Internet IQ Test“ (bod 5 licencie). Zjednotiť držiteľa
  práv (alebo doložiť licenciu FO → s. r. o.). ⚖️ README (opravené v tomto
  PR) už netvrdí MIT.
- P3 — fonty Noto Sans (`public/fonts/NotoSans-*.ttf`, SIL OFL) sú
  redistribuované bez priloženého OFL textu; OFL vyžaduje priložiť licenciu.
  Pridať `public/fonts/OFL.txt`.
- Obsah akadémie: videá sú odkazy na YouTube so `sourceUrl`
  (`src/content/courses/*.ts`), embedy nocookie; články citujú zdroje inline.
  Unsplash/Pexels nenájdené. Banka otázok (`src/lib/quiz/bank/questions.ts`)
  nemá hlavičku autorstva — P3.
- Šablóny používateľov: CC BY 4.0 s atribúciou
  (`tests.json templates.license_cc_by`) — v poriadku.

## 11. Transparentnosť AI (AI Act čl. 50, účinnosť pre chatboty 2. 8. 2026)

- UI `/pomocnik` zobrazuje „Tento rozhovor spracúva AI. Neukladáme ho…“
  (`scam-chat.json notice`, `ScamChatPanel.tsx:50`) — splnená povinnosť
  informovať, že ide o AI.
- **P2 — chýba:** (a) upozornenie, že odpovede môžu byť nepresné a nejde o
  právne/finančné poradenstvo, (b) odporúčanie overiť si podozrenie u banky
  / polície (158) s kontaktom priamo vo widgete, (c) uvedenie poskytovateľa
  modelu (Cloudflare Workers AI / Meta Llama) v UI — dnes len v /privacy,
  (d) vekové obmedzenie / poznámka pre maloletých (grep „rokov|18“ → 0).
- P3 — precheck šablón: „AI moderátor“ bez mena poskytovateľa (sekcia 5).

## Čo treba od Lubomíra / právnika ⚖️

1. Zadať vypracovanie **VOP** (sekcia 2) — blokuje merge E66 (platené plány).
2. Rozhodnúť právny režim sponzorského príspevku (dar vs. služba) a text
   odstúpenia (sekcia 4).
3. Schváliť opravu textu o Anthropic endpointu alebo prepnutie na EU
   endpoint (sekcia 1).
4. Rozhodnúť o odstránení offsetu +127 (sekcia 8) — technicky triviálne,
   odporúčam odstrániť bez čakania na právnika.
5. Vyhlásenie o prístupnosti (sekcia 7) — šablóna podľa vzoru MIRRI SR.
6. Zjednotiť držiteľa autorských práv v `LICENSE` (sekcia 10).

## Čo vie opraviť vývoj bez právnika (navrhované PR)

- Doplniť Turnstile + YouTube-nocookie + chýbajúce localStorage kľúče do
  /cookies a /privacy (sekcie 1, 3).
- Doplniť `ip_hash` do riadku DPA v /privacy (sekcia 1).
- Identifikácia prevádzkovateľa do pätičky a na /support (sekcia 9).
- Odstrániť `+ 127` v `src/routes/index.tsx:410` (sekcia 8).
- Zjednotiť variant tlačidiel v `ConsentBanner.tsx` (sekcia 3).
- Pridať `public/fonts/OFL.txt` (sekcia 10).
- Doplniť vetu o nepresnosti AI + kontakt 158 do `scam-chat.json notice`
  (sekcia 11).
- Synchronizovať cs/en `legal.json` so sk (sekcia 1).
