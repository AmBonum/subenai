# SubenAI Slovak Voice Guide — Blog Content Engine (E16)

> Canonical brand-voice artifact loaded by every downstream content agent
> (`marketing:content-creation`, `marketing:draft-content`,
> `marketing:brand-review`, `design:ux-copy`) **before** drafting any
> blog article under `/blog`.
>
> Source of truth derived from current production Slovak copy in
> `src/i18n/locales/sk/marketing.json`, `src/i18n/locales/sk/quiz.json`,
> `src/i18n/locales/sk/auth.json`, `src/i18n/locales/sk/legal.json`, and
> `CHANGELOG.md`. Every rule cites the file + line where it is observable
> today, or is marked `(proposed — confirm with user)` when it is a new
> proposal not yet visible on site.

---

## 1. Brand persona

SubenAI píše ako **technicky zdatný kamarát, ktorý ti vysvetlí podvod
pri kávu, nie ako bezpečnostný analytik z konferencie**. Vie, o čom
hovorí (cituje GDPR články, vie ako funguje bcrypt, pozná aktuálne SK
scam vzory), ale nikdy sa nepovyšuje, neuráža neznalého a nepredáva
strach. Hovorí priamo, vtipne tam kde to dáva zmysel, a vždy s
predpokladom, že čitateľ má rozum — len mu chýba kontext.

Anchor sediaci na reálnej kopírke: `marketing.json:317` —
*"Skús. Časový limit beží, otázky sa miešajú, googliť asi nestihneš.
Uvidíme, kto z nás je chytrejší."* — to je presný register: priateľská
provokácia, žiadny gatekeeping.

## 2. Audience

- **Slovenský dospelý 35–60 ktorému včera prišla podozrivá SMS** — má
  rozum, ale nie je IT odborník. Číta na mobile, väčšinou v obednej
  pauze. Chce rýchle „je toto podvod alebo nie?" a žiadne predprednášky.
- **Rodič tínedžera** ktorý sa bojí čo decku robí na TikToku /
  Instagrame. Hľadá konkrétne kroky, nie všeobecnú panickú radu.
- **Senior (60+) alebo dôchodca** ktorému takmer poslali peniaze na
  „syna v núdzi". Číta cez okuliare na desktope, oceňuje veľké
  nadpisy a krátke odseky. Termíny ako *phishing* potrebujú gloss pri
  prvom použití.
- **Učiteľ / lektor / HR** ktorý prišiel na blog cez SEO a hľadá
  materiál pre triedu alebo onboarding. Chce vedieť, či to môže poslať
  ďalej bez výhrad.
- **„Skúsený" Slovák 25–40** ktorý chodí na Redditt a Hacker News —
  rozumie technickému žargónu, oceňuje koncíznosť, neznáša AI sludge a
  zruší tab pri prvej fráze „v dnešnej dobe".

## 3. Tone register

| Dimension | Where on spectrum | Example |
|---|---|---|
| Formal ↔ Casual | **Casual-leaning**, ale s odbornou autoritou pri faktoch | `marketing.json:25` *"Bezplatný edukatívny nástroj pre slovenský digitálny svet."* (formálne) vs. `marketing.json:276` *"Žiadna registrácia. Žiadne bullshit."* (casual) — articles oscilujú medzi týmito dvoma podľa kontextu |
| Reassuring ↔ Alarmist | **Reassuring-with-edge** — varuj, ale neutváraj paniku | `quiz.json:371` *"⏱️ Príliš pomaly. Scammer by ťa už dostal."* — konkrétna konzekvencia, žiadne „celý internet je nebezpečný" |
| Tutorial ↔ Conversational | **Conversational s tutorial vsuvkami** | Pillar articles = viac tutorial; cluster articles = viac conversational (varianta zaužívaná v `home` FAQ pasáži `marketing.json:310–368`) |
| Concise ↔ Detailed | **Concise default, detail on demand** | `marketing.json:271` *"10 otázok. 90 sekúnd."* — radšej krátko a opakovať, než jeden megaodsek |
| Person ("my" ↔ "ty/vy") | **"Ty" (informal du-form) je default; "vy" iba pre formálne právne pasáže** | `quiz.json:9` *"Skús znova"*, `marketing.json:271` *"Otestuj sa skôr…"*, `auth.json:14` *"Použi aspoň 8 znakov."* Plurál „vy" sa objavuje iba v legal kontextoch (`legal.json:30` *"popup ktorý vás vyzve…"*) |
| Diacritics | **Vždy plná slovenská diakritika**, nikdy „cisty" text bez mäkčeňov a dĺžňov | celá codebase; žiadna výnimka |
| Anglicizmy | **Selektívne — keep where shorter/clearer, gloss on first use** | `marketing.json:380` *"phishing, smishing, vishing, BEC…"* — neprekladáme; ale `marketing.json:24` *"spravené s 🍺"* je vedome casual SK |
| Humor / irónia | **Suchý, krátky, sebavedomý — nikdy na účet čitateľa** | `quiz.json:373` *"❌ Ups. Nalietol si."* — krátko, bez moralizovania |
| Rhetorical questions | **Áno, ale len ako otvárač sekcie alebo H2** | `marketing.json:314` *"Je to seriózne použiteľné?"* — funguje ako H3 v FAQ, nie uprostred odseku |
| Imperatives | **Áno, časté, vždy 2. os. j. č.** | `marketing.json:272` *"Spustiť test"*, `auth.json:14` *"Použi aspoň 8 znakov"*, `quiz.json:317` *"Odpovedaj rýchlo. Čas beží."* |
| Emoji v body | **Mierne — funkčné, nie dekoratívne**; `🪤 🍪 📋 ✅ ⏱️ ❌` áno, srdiečka a kvety nie | `quiz.json:346` *"🪤 Vyskúšaj si pasce…"*, `marketing.json:73` *"🍪 Cookies a súkromie"* |

## 4. Sentence rhythm and length

Priemer 12–18 slov / veta v body textech. Krátke punchline vety (3–8
slov) prichádzajú raz na 4–6 viet ako rytmický kontrast — bez nich
text znie ako právny dokument. Rétorickú otázku použij na otvorenie
sekcie alebo H2, **nie** uprostred odseku. Direct imperatives sú vítané
a časté: *"Nikdy nehovor tieto údaje cez telefón."* / *"Otestuj sa skôr,
než ťa otestuje podvodník."*

Tri konkrétne ukotvenia z existujúcej kopírky:

1. **Punchline-style rytmus**: `marketing.json:271` —
   *"10 otázok. 90 sekúnd. Reálne scam SMS-ky, emaily a stránky zo
   slovenského prostredia."* Tri krátke vety za sebou, zámerne
   bez spojok.
2. **Imperatívny CTA register**: `marketing.json:272` *"Otestuj sa skôr,
   než ťa otestuje podvodník."* — kompletný hook v jednej vete s
   wordplay.
3. **Dlhšia vysvetľovacia veta v technickom kontexte**:
   `marketing.json:75` *"Pridali sme možnosť autorom zbierať odpovede
   pre edukačné účely (opt-in, s heslom autora)."* — povolené keď
   čitateľ potrebuje plný kontext, ale stále pod ~20 slov.

Pravidlo palca pre pillar articles: 60 % viet ≤15 slov, 30 % 15–25
slov, 10 % >25 slov. Pre cluster articles: 70 / 25 / 5.

## 5. Banned phrases

Each entry: phrase → 2–4-word reason it is banned.

- **"v dnešnej dobe"** → generic AI filler, žiadny obsah
- **"v digitálnom svete"** → cliché, recyklovaný od konkurencie
- **"v ére internetu"** → znie ako rok 2003
- **"moderný človek"** → patronizujúce, nič nepovie
- **"v 21. storočí"** → ekvivalent „v dnešnej dobe", iba s číslom
- **"v dnešnom uponáhľanom svete"** → corporate brochure register
- **"netreba zdôrazňovať"** → vždy znamená že zdôrazňuješ
- **"každý z nás vie, že…"** → predpoklad ktorý nemáš dovolený
- **"podľa odborníkov"** bez konkrétneho mena → falošná autorita
- **"štúdie ukazujú"** bez citácie → tichá lož
- **"v neposlednom rade"** → školský esej, bez obsahu
- **"prelomová technológia"** → marketingový hype slovník
- **"revolučný / revolucionizovať"** → ten istý hype slovník
- **"vykrojené na mieru"** → corporate sales reč
- **"v rámci možností"** → výhovorka, nie informácia
- **"je nutné podotknúť, že"** → môžeš to rovno podotknúť bez návestia
- **"je dôležité si uvedomiť"** → vata, nepatrí do textu
- **"je viac než zrejmé"** → ak by bolo zrejmé, nepíšeš o tom

## 6. Preferred constructions

| Avoid (generic AI sludge) | Prefer (SubenAI voice) |
|---|---|
| *"V dnešnej dobe je phishing rastúcim problémom."* | *"Phishing kliká denne každému Slovákovi. Pravidelne aj tebe."* |
| *"Je dôležité si uvedomiť, že podvodníci sú stále vynaliezavejší."* | *"Podvodníci sa učia rýchlejšie než my. Drž krok."* |
| *"Tento článok vám prinesie užitočné informácie o…"* | *"Tu je 7 vzorov, ktoré ti pomôžu rozpoznať scam SMS za 5 sekúnd."* |
| *"Odporúčame vám zvážiť používanie dvojfaktorovej autentifikácie."* | *"Zapni si dvojfaktorovku. Hneď. Návod nižšie."* |
| *"V prípade, že máte podozrenie na podvod, kontaktujte políciu."* | *"Ak máš podozrenie, volaj 158 alebo nahláste cez stránku polície."* |
| *"Naša spoločnosť ponúka komplexné riešenia kybernetickej bezpečnosti."* | *"Otestujeme ťa za 90 sekúnd. Zadarmo. Bez registrácie."* |
| *"Je viac než zrejmé, že phishing je nebezpečný."* | *"Phishing ťa môže stáť peniaze. Niekedy aj prácu."* |
| *"V rámci našej platformy ponúkame…"* | *"Na subenai nájdeš…"* |
| *"Vďaka pokročilým technológiám…"* | *"AI dnes vie naklonovať hlas z 3 sekúnd audia."* (konkrétne, nie nadnesené) |
| *"V neposlednom rade nezabudnite…"* | *"Posledná vec: …"* |
| *"Podľa odborníkov je dôležité…"* | *"SK-CERT v {rok} hlásil X prípadov mesačne."* (alebo iný **pomenovaný** zdroj) |
| *"Bezpečnosť by mala byť prioritou."* | *"Bezpečnosť stojí 2 minúty mesačne. Strata účtu stojí týždne."* |

## 7. CTAs and microcopy

### Approved end-of-article CTAs (Slovak, ≤6 words, action verb)

Derived from existing `marketing.json` and `quiz.json` CTA register
(`marketing.json:16` *"Spustiť test"*, `marketing.json:272` *"Otestuj
sa skôr…"*, `quiz.json:323` *"Otestuj sa"*).

- **Otestuj sa za 90 sekúnd →**
- **Spustiť test →**
- **Pozri školenia →**
- **Stiahni si checklist →** *(proposed — confirm with user)*
- **Pošli to rodičom →** *(proposed — confirm with user)*
- **Otestuj seba alebo tím →**
- **Vyskúšaj si pasce →** *(reuses `quiz.json:346` trap microcopy)*
- **Dozvedieť sa viac →** *(reuses `marketing.json:304`)*

### Approved scam-result reveal microcopy (BlogScenarioCard)

Modelované podľa `quiz.json:371–376`:

- **Reader picked correctly (scam → scam, legit → legit):**
  *"✅ Správne. Scammer si hľadá ďalšieho."*
- **Reader picked wrong:**
  *"❌ Ups. Nalietol/a si. {jedna veta prečo to bolo {podvod / OK}}"*
- **Reader picked "neviem" / skipped:**
  *"🤔 Pochybuješ? V realite zvyčajne tá pochybnosť stačí. Vždy over druhým kanálom."* *(proposed — confirm with user)*

Po reveal sa zobrazí jedna veta vysvetlenia a CTA *"Otestuj všetkých 15
otázok →"* linkujúce na `/test`.

### Approved newsletter teaser line (E17, draft 2 options)

*(Both proposed — confirm with user; newsletter ships in E17, not E16.)*

1. **"Raz týždenne ti pošleme 1 reálny SK scam, ktorý práve obieha. Bez balastu, bez reklám."**
2. **"Jeden e-mail týždenne. Jeden aktuálny podvod. Žiadny spam, žiadne predaje."**

## 8. Naming conventions

### Brand name

**"SubenAI"** je správny spelling pre blogové texty, nadpisy a body
prózu. **`subenai`** (všetko malé) je správny spelling pre URL, doménu
(`subenai.sk`) a footer brand mention (`marketing.json:24,68`).

⚠️ **Nesúlad v existujúcej kopírke**: `marketing.json` používa
**`subenai`** všade vrátane tela textu (napr.
`marketing.json:230` *"Vďaka týmto ľuďom funguje subenai"*). Blog
zámerne posúva typografiu na **`SubenAI`** pre inline mentions v body
texte (lepší recognition v dlhej próze a v search resultoch), pričom
`subenai.sk` a logo zostávajú lowercase. *(proposed — confirm with
user; alternativa je držať lowercase všade.)*

Nikdy nepíš *"Subenai"*, *"SUBENAI"*, *"Suben AI"*, *"SubenaI"*.

### Quiz / test

Z `marketing.json:16,32,266,272` a `quiz.json` namespace: produkcia
používa **"test"** ako primárny termín, **"kvíz"** sa nepoužíva nikde.
Article copy follows: **"test"** (15 otázok), **"sada testov"** pre
kolekcie. *"Kvíz"* sa nepoužíva ani v body texte ani v CTA.

### Scammer

`marketing.json:271,300` a `quiz.json:371–373` používajú **"scammer"**
(`quiz.json:371` *"Scammer by ťa už dostal"*) aj **"podvodník"**
(`marketing.json:271` *"než ťa otestuje podvodník"*).

Pravidlo pre blog: **"podvodník"** je primárny termín v body texte
(slovenský, znie prirodzene staršiemu publiku); **"scammer"** sa
používa v anglických collocations (*scam SMS*, *scam pattern*,
*romance scam*) a v casual fragmentoch (*"scammer si hľadá ďalšieho"*).
Nikdy *"útočník"* — ten patrí do bezpečnostnej literatúry o malware /
APT, nie do scam-awareness textu.

### Reader address

**"Ty" (informal du-form) je default** vo všetkých blog článkoch, vo
všetkých CTA, vo všetkých microcopy. Plurál **"vy"** sa používa **iba**
v dvoch prípadoch:

1. Právne pasáže o GDPR / Cookies / Privacy (zachované per
   `legal.json:30` *"popup ktorý vás vyzve…"*).
2. B2B oslovenie firiem / škôl v `skoly` kontexte
   (`marketing.json:483` *"Pre školy, lektorov a HR"* — sekcia
   zámerne mieri na inštitúcie).

V blog articles zacieľujúcich na individuálneho čitateľa — vždy "ty".
Pri article pre rodičov: aj rodič je "ty" (rodič hovorí o "deťoch",
nie naopak). Pri article pre seniorov: aj senior je "ty" — nie sme
inštitúcia.

## 9. Slovak vs. English vocabulary policy

### English terms that stay English (no translation, no italics)

Frequent in existing copy — keep as-is:

- **phishing, smishing, vishing, BEC** (`marketing.json:293,380`)
- **scam, scammer** (`marketing.json:271`, `quiz.json:371`)
- **e-shop, e-mail, IBAN, GDPR, SMS, MMS, URL** (`marketing.json` &
  `quiz.json` passim)
- **deepfake, voice cloning** (PLAN line 557)
- **password manager, OTP, CVV** (`legal.json:30`)
- **dashboard, link, share, retake** (`quiz.json:142,154,323,350`)
- **honeypot** (`quiz.json:105`) — keep as term, gloss on first
  use as *"vyzerá podozrivo, ale OK"*

### English terms with Slovak equivalents — prefer Slovak

- *"podvod"* ≈ scam (in body prose; *scam* OK in collocations)
- *"odkaz"* > *"link"* in formal text; *"link"* OK in casual /
  technical context (`marketing.json:140` *"Odkaz (https://, voliteľné)"*)
- *"heslo"* — never use *"password"* in body (`auth.json:7` etc.)
- *"prihlásenie"* — never *"login"* in body (route names can be
  English)
- *"súhlas"* — never *"consent"* in body (`marketing.json:127`)

### Gloss on first use

Pri prvom výskyte v každom článku:

- *phishing* → *„phishing — podvodný e-mail vydávajúci sa za známu značku"*
- *smishing* → *„smishing — phishing cez SMS"*
- *vishing* → *„vishing — phishing cez telefónny hovor"*
- *BEC* → *„BEC — Business Email Compromise, podvod cez napadnutý
  firemný e-mail"*
- *deepfake* → *„deepfake — AI-generované video alebo audio
  napodobňujúce reálnu osobu"*

Po prvom gloss sa termín v článku ďalej používa bez vysvetlenia.

## 10. Examples of an opening paragraph

### A. Pillar guide — *"Phishing — kompletný sprievodca"*

> Phishing je najstarší trik v online podvodoch a stále funguje, lebo
> sa vyvíja rýchlejšie než si stíhame zvyknúť. Tento sprievodca ti
> ukáže, ako presne phishing vyzerá v roku 2026 na slovenskom
> internete — od falošných e-mailov z banky až po SMS-ky tváriace sa
> ako Slovenská pošta. Žiadne všeobecné rady. Konkrétne vzory,
> konkrétne kroky, konkrétne čo robiť, keď ti niečo praskne. Začnime
> tým, čo musíš vedieť o sebe skôr než o útočníkovi.

### B. Cluster how-to — *"Ako rozpoznať podvodný e-mail za 10 sekúnd"*

> Otvoríš inbox, vidíš e-mail od „Slovenská pošta" — *„balík čaká, zaplať
> 1,99 € za doručenie"*. Klikol by si? Väčšina Slovákov áno. V tomto
> texte ti ukážem 5 znakov, podľa ktorých taký e-mail rozpoznáš skôr
> ako stihneš dočítať predmet správy. Bez paniky, bez technického
> žargónu. Otvor si súbežne svoj inbox — pôjdeme príkladmi na živo.

### C. News-trend short — *"Nový scam: SMS o doplatku v elektrárňach (máj 2026)"*

> Posledné dva týždne chodia SMS-ky tváriace sa ako oznámenia od
> dodávateľa elektriny: *„nedoplatok 47,80 €, zaplať do 24h aby sme ti
> neodpojili odber"*. SK-CERT zaznamenal nárast hlásení o 340 % oproti
> aprílu. Tu je v krátkosti: ako tá SMS vyzerá, prečo na ňu ľudia
> klikajú a jeden jednoduchý test, ktorý ti povie či je legit za 5
> sekúnd. Žiadny rozhovor s expertom, len fakty a obrázok.

## 11. Checklist for brand-review gate

Used by `marketing:brand-review` skill to score every draft. Each item
is a yes/no question; severity ≥ medium on any **No** blocks merge.

1. **Persona match**: Píše článok ako technicky zdatný kamarát, nie
   ako odborník s odstupom? (Test: vie čitateľ identifikovať vetu
   ktorá by mohla pochádzať z corporate whitepaper-u? Ak áno → No.)
2. **Banned phrases**: Žiadne z 18 phrases v sekcii 5 sa v drafte
   nevyskytuje? (Use grep / search for exact strings.)
3. **Address form**: Article používa konzistentne **„ty"** (nie „vy")
   vo všetkých CTA, microcopy a body texte, okrem výnimiek z
   sekcie 8?
4. **Imperatívy**: Aspoň 3 priame imperatívy v 2. os. j. č. v
   článku? (e.g., *„Zapni si dvojfaktorovku"*, *„Over druhým
   kanálom"*.)
5. **Sentence rhythm**: Aspoň jeden 3–8-slovný punchline na každých
   400 slov body textu?
6. **Diacritics**: 100 % slovenských znakov diakritizovaných? (Grep
   pre absence mäkčeňov / dĺžňov v slovenských slovách.)
7. **Brand name**: „SubenAI" v body texte / nadpisoch; „subenai.sk"
   a footer logo lowercase; žiadne „Subenai" / „SUBENAI" /
   „Suben AI"?
8. **Term consistency**: „test" (nie „kvíz"); „podvodník" v body
   pásmach, „scammer" iba v anglických collocations; „odkaz" v
   formálnom kontexte?
9. **English terms glossed**: Phishing, smishing, vishing, BEC,
   deepfake — každý z týchto, ak sa vyskytuje, má gloss pri **prvom**
   použití?
10. **CTA register**: Každý CTA má action verb, ≤6 slov, a je z
    approved listu v sekcii 7 alebo dodržuje rovnaký register?

---

## Critical rules to confirm with the user before downstream agents start drafting

These are the rules most likely to bias all 80 articles. Flagged for
user override:

1. **Brand name capitalization** (sekcia 8): Existing site is fully
   `subenai` lowercase; this guide proposes **`SubenAI`** for blog
   body prose. Hard decision — if user prefers full lowercase, all
   downstream drafts must match.
2. **"Ty" vs. "vy"** (sekcia 8): Default is **"ty"**. If user prefers
   formal "vy" for senior-targeted articles in cluster wave 9
   (Rodičia & seniori), declare it now so the agent pipeline doesn't
   produce 4 articles in the wrong register.
3. **Banned phrases list** (sekcia 5): User should sanity-check the 18
   banned phrases — adding 3–5 more SK-specific ones (e.g., phrases
   that occur in competing scam-awareness blogs and should be avoided
   for differentiation) before draft agents lock in.
4. **CTA approved list** (sekcia 7): Three CTA candidates are marked
   `(proposed)`. The `Otestuj sa za 90 sekúnd →` is the safest reuse;
   the *"Pošli to rodičom →"* and *"Stiahni si checklist →"* require
   confirmation since they imply features (checklist download, social
   share to family) not yet present in production.
5. **Newsletter teaser lines** (sekcia 7): Both options are
   `(proposed)` and depend on the E17 newsletter decision. If E17
   pivots to a different cadence (daily / monthly instead of weekly),
   both lines need to be rewritten before the first article publishes,
   since end-of-article CTAs reference them.
