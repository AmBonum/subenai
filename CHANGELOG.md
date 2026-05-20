# Changelog

Verejný zoznam zmien projektu subenai. Píšeme ho pre používateľov a sponzorov,
takže nájdeš tu len to, čo má vplyv na to, čo vidíš a používaš — bez interných
detailov, ciest k súborom alebo technického žargónu.

Formát vychádza zo [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/).
Verzie idú od najnovšej. Drobné úpravy textov a interné práce neuvádzame.

## [Unreleased]

> Pripravujeme. Tieto zmeny sú nasadené, ale verziu označíme až keď bude
> celý balík funkcionality (sponsorship, zber custom-test odpovedí, atď.)
> kompletne otestovaný v reálnej prevádzke.

### Pridané
- **Stiahnutie tvojich údajov (GDPR čl. 15 / čl. 20).** Na stránke
  *Môj profil* (`/app/account/profile`) je nová karta *Stiahnutie
  tvojich údajov*. Kliknutím dostaneš JSON snapshot všetkého, čo o
  tebe evidujeme — profil, prípadné GDPR žiadosti a poznámky k
  anonymným testom (tie sú prístupné cez tvoj share link). JSON je
  strojovo čitateľný, takže ho vieš preniesť do iného systému (právo
  na prenosnosť podľa čl. 20 GDPR). Žiadne čakanie na operátora,
  hotovo do pár sekúnd.
- **Transparentnostný register.** Verejný JSON registrík transferov
  na charitu (`/transparency.json`). Každý budúci transfer dostane v
  ňom riadok s dátumom, sumou a príjemcom — kontrolovateľné kýmkoľvek
  bez nás. Aktuálne je v ňom politika (10 % z čistých sponzorských
  príjmov, recipient *Nadácia Slniečka*, ročný cyklus) a prázdny zoznam
  transferov, ktorý začneme dopĺňať od EOY 2026.

### Zmenené
- **Cookie banner sa znova zobrazí.** Drobná oprava textu na
  *Ochrane osobných údajov* (presnejšie vyjadrenie ako sa ukladá
  záznam tvojho súhlasu) — žiadna zmena spracúvania, žiadny dôvod
  na nový banner. Pôvodný 1.5.0 bump z mája 2026 stačí.
- **Detekcia *Do Not Track* a *Global Privacy Control*.** Doteraz
  sme to deklarovali na *Cookies* stránke, ale kód to nečítal — od
  E42 ak má tvoj prehliadač zapnutý ktorýkoľvek z DNT/GPC signálov,
  Google Analytics 4 sa nezapne ani vtedy, keby si v cookie dialógu
  označil/a *Analytika*. Tvoja voľba v prehliadači má prednosť.
- **Stránka *Cookies* — explicitne deklarované UI predvoľby a jazyk.**
  Predtým sme niektoré drobné UI pomocníky (stav postranného panelu,
  rozbalené piliere na blogu, zatvorený uvítací banner na dashboarde,
  zatvorená výzva na doplnenie profilu, voľba jazyka) ukladali bez toho,
  aby boli explicitne uvedené v zozname cookies. Teraz každý z nich má
  vlastný riadok v tabuľke `Cookies` (jazyk pod kategóriou *Nevyhnutné*
  ako „strictly necessary" výnimka ePrivacy, ostatné pod kategóriou
  *Predvoľby*). Cookie banner sa znova zobrazí (verzia 1.5.0 → 1.6.0)
  aby si mohol/mohla potvrdiť nový rozsah. Bez súhlasu s *Predvoľbami*
  ti UI naďalej funguje, len si pri ďalšej návšteve treba znova vybrať.

## Sady testov, školenia a častejšie otázky — senior refresh

Veľký refresh troch *discovery* plôch, kde noví návštevníci pristávajú
alebo si vyberajú: katalóg testov (`/tests`), katalóg školení
(`/courses`) a *featured* karta v mega-menu hlavičky. Plus zdieľateľná
stránka výsledku (`/r/`) dostala lepšie sociálne náhľady a konverzný
CTA hore, a FAQ sekcie sú teraz *senior-level* — s ikonami, deep-link
kotvami a záchrannou stopou, keď nenájdeš odpoveď.

Cieľ: prvý pohľad na stránku má viac vizuálnej štruktúry, viac dôvodov
zostať, a každá otázka, ktorú by si si položil/a, má buď okamžitú
odpoveď alebo presmerovanie tam, kde ju nájdeš.

### Pridané
- **`/tests` kompletný redizajn** — nový H1 *„Otestuj svoju branžu.
  Bez registrácie."* a 60-slovný úvod s konkrétnymi príkladmi
  *(phishing v e-shope vyzerá inak ako vishing v call-centre, fake
  faktúra v účtarni inak ako podozrivé SMS od kuriéra)*. Pod hlavičkou
  *value strip*: **Anonymne · 5 minút · Zadarmo**. Triedenie podľa
  *Najnovšie / Najviac otázok*. Najnovší pack dostane *featured
  spotlight* na vrchu mriežky s *„⭐ Najnovší"* odznakom. Karty
  packov majú teraz vizuálne *hero zone* s odvetvovou farbou a emoji,
  nie len plochý chip + text.
- **`/courses` kompletný redizajn** — paralelný refresh: nový H1
  *„Bezplatné školenia v 5 témach — phishing, vishing, smishing,
  fake e-shopy, investičné podvody."*, value strip
  **10 minút · Reálne príklady · Bezplatné**, a každá karta školenia
  má teraz pod metadátami slot *„Čítaj k tomu:"* s odkazom na článok
  z akadémie, keď taký existuje. (Predtým bol *Súvisiace v akadémii*
  prepoj len na detaile školenia.)
- **„Učenie pred testom" prúžok na `/tests`** — pod FAQ sa zobrazia
  4 najnovšie články z akadémie tagované ako študijný materiál pre
  testy. Sekcia sa zobrazí len ak také články existujú; inak sa
  nezobrazí vôbec (žiadne prázdne placeholdery).
- **„Súvisiace v akadémii" karta na detaile sady testov** — na
  `/tests/<slug>` (napr. `/tests/eshop`) sa pod testovacím tokom
  zobrazí karta s odkazom na článok, ak je nejaký pre danú sadu
  tagovaný. Symetrický náprotivok karty, ktorá už mesiace existovala
  na detaile školení.
- **FAQ sekcie sú teraz *senior-level*** — na `/tests` aj `/courses`:
  ikona pri každej otázke pre rýchlu orientáciu (peniaze, čas,
  publikum, súkromie, zdieľanie), *„Najčastejšia"* odznak pri prvej
  otázke, *rozbaliť/zbaliť všetko* tlačítko, a hlavne **deep-link
  kotvy** — URL ako `https://subenai.sk/tests#faq-tests-q-q1` otvorí
  presne tú otázku. Pod sekciou: záchranná stopa *„Nenašiel si
  odpoveď? Otvor akadémiu · Napíš nám"*. Cesty spomínané v
  odpovediach (`/support`, `/test`, `/courses/email-phishing`, atď.)
  sú **klikateľné** — kliknutie ťa rovno preneme na danú stránku
  namiesto kopírovania URL ručne.
- **Featured karta v mega-menu** (rozbalená *Sady testov* alebo
  *Školenia* v hlavičke) má teraz vizuálny vrch — ikona nad farebným
  gradientom. Predtým to bola plochá tmavá karta s textom, ktorá
  vyzerala ako placeholder.
- **Zdieľaný výsledok testu (`/r/<id>`)** ukáže na Messenger / Slack /
  WhatsApp náhľade plnohodnotnú kartu s názvom, popisom a obrázkom —
  predtým len textový odkaz. A konverzný CTA *„Porovnaj sa — otestuj
  sa za 5 minút"* sa presunul **hore**, hneď za skóre, takže nemusíš
  scrollovať cez celý výsledok ak práve vidíš výsledok kamaráta a
  chceš si vyskúšať vlastný.

### Zmenené
- **Filter na `/tests`** sa volá teraz *„Pre koho je test:"*
  namiesto generického *„Filter podľa branže"* — sprievodca, nie
  databázové UI.
- **Úvodný text `/courses`** vysvetľuje formát: *„Každé školenie
  je 10-minútová stránka s reálnymi príkladmi zo slovenského
  internetu — žiadne PDF na 60 strán."* — vyhraňuje sa proti
  korporátnym LMS-kurzom.
- **SEO meta na `/s/<slug>`** (admin-publikované stránky ako
  `/s/o-projekte-rozsirene`) sú teraz kompletné — predtým chýbal
  titulok, popis, OG karta aj kanonická URL, a Google ich
  reálne nedokázal indexovať aj keď boli v sitemape.

### Technicky (pre vývojárov projektu)
- Nový stĺpec `blog_posts.related_test_slug` pre symetrický
  blog ↔ test prepoj. Editorial-driven (žiadny FK na TS moduly).
  Migrácia ide manuálne — viď `supabase/migrations/20260521000000_*.sql`.
- Nový zdieľaný komponent `FaqAccordion` (`src/components/ui/faq/`)
  konzumujú `TestsFaqSection` aj `CoursesFaqSection`. Senior upgrady
  (deep-link kotvy, expand-all, ikony, rescue footer) tak žijú na
  jednom mieste — ďalšie FAQ plochy ich dostanú zdarma.
- JSON-LD: `/tests` a `/courses` emitujú `FAQPage` blob navyše k
  existujúcemu `ItemList`. `/s/<slug>` má teraz `WebPage` schemu s
  `datePublished` + `dateModified`.

## Pre školy, dokumentácia a stratená cesta

Refresh dvoch oblastí pre senior vyzretosť: stránka *Pre školy* sa
zmenila z dlhého prozaického návodu na konverzný landing s
persona-segmentáciou, a všetky právne stránky (`/privacy`, `/cookies`)
dostali navigáciu *Obsah* po pravej strane, štruktúrované dáta pre
Google a viditeľnejšiu cestu k uplatneniu GDPR práv. Plus chytrejšia
404 stránka, ktorá neponúkne len tlačidlo *„Späť na domov"*, ale
priamo navrhne kam si pravdepodobne išiel/išla.

### Pridané
- **`/schools` kompletne prerobená** — kicker, outcome-first H1
  „Otestuj triedu na rozpoznávanie scamov — bez registrácií, bez
  ceny.", tri persona chips (*riaditeľ/DPO · IT koordinátor · učiteľ*),
  porovnávacia tabuľka „čo dostane kto", štyri kroky postupu so
  symbolickými ilustráciami, samostatná karta pre GDPR + viditeľný
  CTA na DPA zmluvu, dvoj-úrovňová FAQ s kategóriami *Heslo a
  prístup* / *Dáta a GDPR*. Na mobile aj sticky CTA na spodku.
- **Sprievodca pre učiteľov v Akadémii** — nový pillar článok
  *„Kybernetika vo výučbe — ako za 45 minút otestovať triedu na
  rozpoznávanie podvodov"*. 45-minútový plán hodiny krok-za-krokom,
  čo nehovoriť pred žiakmi, GDPR v skratke pre triedneho učiteľa,
  checklist pre IT koordinátora školy.
- **„Obsah" navigácia** na ľavej strane všetkých dlhých právnych
  textov — `/privacy` (11 sekcií) a `/cookies` (7 sekcií). Na
  mobile sa zbalí do otváracieho zoznamu na vrchu stránky. Klik
  na položku posúva priamo k sekcii.
- **GDPR samoobsluha** zvýraznená — žiadosť o prístup, opravu,
  vymazanie už nie je schovaná v odstavci uprostred dlhého textu,
  ale samostatná, výrazne ohraničená karta v sekcii *Tvoje práva*.
- **Cookies — vidieť aktuálny stav súhlasu** — limetková karta s
  dátumom a verziou, ak si súhlas dal/a; oranžová výzva ak ho ešte
  nemáš.
- **Pridaná zmienka o DNT a Global Privacy Control** v sekcii
  o vypnutí cez prehliadač — keď máš tieto signály zapnuté,
  analytiku a marketingové kategórie preskočíme aj keby si súhlas
  explicitne dal/a.
- **„Časté otázky o projekte" na `/o-projekte`** — kto za subenai
  stojí, ako sa to financuje, či trénujeme AI na tvojich odpovediach
  (nie), aké dáta sa ukladajú a ako dlho.
- **`/app/pomoc` — rýchle linky** do dokumentácie (*Ochrana
  osobných údajov · Cookies a súhlas · Posledné zmeny · Pre školy*)
  priamo na vrchu, plus ilustrovaná stránka „nič sa nenašlo" keď
  vyhľadávanie nemá výsledok.
- **404 stránka prerobená** — namiesto holého čísla 404 dostaneš
  ilustráciu strateného kompasu, krátky kontext, tlačidlo Domov a
  štyri navrhnuté smerovania (*Rýchly test · Akadémia · Školenia ·
  Pre školy*).

### Zmenené
- **`/o-projekte`** — referencie na *„/changelog"* a *„/sponsors"*,
  ktoré boli formátované ako code (a teda neklikateľné), sú teraz
  reálne linky na príslušné stránky.

### Technicky (pre vývojárov projektu)
- E2E testy pre PR-ové úrovne sú teraz **opt-in** cez label
  `e2e:browser` (predtým bežali na každý PR aj keď nepotrebné).
  Default PR bežia iba lint + vitest + integration testy — ~3
  minúty namiesto ~10. Browser suite vždy beží po merge na main
  ako safety net.

## Akadémia, prepojenia a domovská stránka pre konverziu

Nová sekcia *Akadémia* (predtým „Blog") a tri prepojovacie karty, ktoré
zatvorili trojuholník test ↔ školenie ↔ sprievodca. Z ktoréhokoľvek
povrchu sa dostaneš k zvyšným dvom jedným klikom — nemusíš poznať našu
informačnú architektúru dopredu.

### Pridané
- **Akadémia** v hlavičke — nová sekcia *„Sprievodcovia a návody —
  ako rozpoznať scam skôr, než ťa dostane."* (predtým „Blog"). Tag
  „sprievodca" označuje pillar články, ktoré pokrývajú tému do hĺbky.
- **Domovská FAQ je dvojúrovňová** — kategórie sa najprv ukážu
  zbalené (s počtom otázok), klikom expandujú zoznam otázok. Tlačidlo
  *„Rozbaliť všetky / Zbaliť všetky"* prepne celú sekciu. Stabilné
  kotvy `#faq-q-<kategória>-<id>` pre hlboké linky.
- **„Pre koho je subenai"** na home — štyri persony (bežní ľudia,
  rodičia + seniori, firmy, učitelia), každá vedie na jej najsilnejšiu
  podstránku. Identita → akcia.
- **„Tvoja cesta učenia"** na home — tri kroky (otestuj sa →
  prejdi školenie → prečítaj sprievodcu) s vizuálnou postupnosťou.
- **Karta „Pre školy"** zvýraznená na home (limetková farba pre B2B
  odlíšenie). Predtým schované v päte.
- **Teaser zmien** nad pätou — odkaz na `/zmeny` s ikonou „nové".
- **Po článku ti odporučíme školenie** — pod každým pillar článkom
  („Chceš si to precvičiť? → otvor školenie"). Limetkový akcent.
- **V školení ti odporučíme sprievodcu** — pod každým školením, ku
  ktorému existuje pillar článok („Chceš tomu rozumieť do hĺbky? →
  otvor sprievodcu"). Modrý akcent.
- **Vo výsledkoch testu ti odporučíme aj školenie aj článok** — pre
  každú kategóriu, kde si bol pod 50 %. Slabá kategória sa nesurfaceuje
  cez odporúčania, len cez odporúčania, ktoré naozaj pomôžu.

### Zmenené
- **Vyhľadávanie v Akadémii** — pri písaní v search baru sa skryjú
  pillar články z featured sekcie, aby sa výsledky vyhľadávania
  nezamiešavali s „najčítanejšie".
- **Päta stránky** je teraz na všetkých relevantných podstránkach
  (vrátane `/blog/*` a `/courses/*`) — predtým chýbala v niektorých
  oblastiach.

### Pre adminov
- **Picker súvisiaceho školenia** v editore článku (`/admin/blog/<id>`,
  sekcia „Cross-linky"). Vyberáš zo zoznamu všetkých školení — vďaka
  tomu sa pod článkom zobrazí karta „Chceš si to precvičiť?". Predtým
  sa nastavovalo iba cez SQL.
- **`tasks/topic-content-map.md`** — interný editorial dokument
  mapujúci 10 pillar článkov × 18 školení × 4 kvíz kategórie.

## /app + hlavička — kompletný redesign pre lektorov

Hlavná stránka subenai.sk i samotný workspace `/app` prešli redesignom
postaveným na jednej otázke: prečo by sa lektor mal vrátiť budúci
týždeň? Odpoveď je rozdaná naprieč siedmymi vlnami zmien.

### Pridané
- **Mega-menu hlavička** — kategórie *Rýchly test · Sady testov ·
  Školenia · Pre školy a lektorov · Podpora projektu*. Hover na desktope
  rozbalí podpanel; na mobile sa rozbaľuje akordeón v bočnom paneli.
- **Pre školy a lektorov** povýšené z päty na top-nav — najsilnejší
  conversion-bod pre školský segment.
- **/app onboarding** — pri prvom prihlásení 3 voliteľné otázky
  („koho budeš testovať / ktoré scamy ti vadia / chceš novinky"),
  ktoré ladia odporúčania a frekvenciu súhrnov.
- **Týždenný súhrn** — každý pondelok ráno pošleme prehľad
  („{n} dokončení tento týždeň, najslabšia otázka: ...").
  Pošleme len ak sa niečo udialo — nikdy prázdny e-mail.
- **Odporúčané kurzy** — ak respondenti zaostávajú v téme, lektor
  vidí kartu s krátkym kurzom na zaslanie. Jeden klik = poslané.
- **Pripomienky retestov** — 90 dní po teste pripomenieme, aby si
  zopakoval rovnaký test a porovnal dôkazy o zlepšení.
- **Porovnanie s ostatnými** (peer card) — anonymné porovnanie tvojej
  audience oproti slovenskému priemeru. K-anonymita zaručená
  (≥10 respondentov v kohorte). Žiadne osobné údaje nikdy nepoužité.
- **Zdieľateľný obrázok** — z `/app/peer` si stiahneš PNG (1200×630)
  s tvojím percentilom a top oblasťami. Voliteľná prezývka, ak chceš
  byť „p. Horváth", inak anonymne. Pre zdieľanie v zborovni alebo
  v Viber skupine.
- **/app sidebar** prerobený — z plochého zoznamu 14 položiek na
  3 logické skupiny (Tvorba · Výsledky · Účet).
- **Účet zlúčený** — profil, bezpečnosť a GDPR žiadosti teraz tabmi
  na jednej stránke `/app/account/profile`.
- **2FA prihlasovacie pole** s 6 samostatnými slotmi (autosubmit pri
  6. cifre, shake animácia pri chybe, pulse pri úspechu).
- **Brand v sidebare** — *„SubenAI · Pre lektorov"*.

### Opravené
- Rozbitý odkaz `/docs` v sidebare (404).
- Dvojitá hlavička na `/app` a `/admin` (SiteHeader + AppShell
  header sa rendrovali oba).
- Race window v `/auth/reset-password` (krátky prázdny render po
  tokenizácii).
- Nefunkčný *Preview* button pri šablónach (zakázaný do AH-12).

### Zmenené
- `/admin` link odstránený z verejnej päty — používatelia ho čítali
  ako *"spravovať moje výsledky"*. Adminci sa dostanú cez `/app`.
- Logo v hlavičke sa pri stredných šírkach zmenšuje na `S` ikonu —
  mega-menu zaberá viac priestoru než pôvodná navigácia.
- Prepínač jazyka dočasne skrytý. Slovenčina je predvolený jazyk;
  preklady do angličtiny a češtiny zostávajú v databáze + i18n
  súboroch (pripravené na obnovenie jedným prepnutím).

## AH-15 — Trilingválna podpora (slovenčina / angličtina / čeština)

Celá stránka — texty, otázky aj scam scenáre — je dostupná v troch
jazykoch. Predvolený je slovenský; jazyk si vyberieš v hlavičke stránky
(ikona zemegule). Voľba sa pamätá a aplikuje sa okamžite — bez nutnosti
obnoviť stránku.

### Pridané
- **Prepínač jazyka** — `🇸🇰 Slovenčina / 🇬🇧 English / 🇨🇿 Čeština`
  v hlavičke aj v admin paneli. Pri prvej návšteve sa jazyk
  predvolí podľa nastavenia prehliadača (`navigator.language`);
  zmena sa uloží do lokálneho úložiska a okamžite sa prejaví
  v celej aplikácii.
- **Anglická a česká verzia všetkých stránok** — domov, sada testov,
  školenia, sponzori, kontakt, súkromie, cookies, podpora,
  poďakovania, /app a /admin. Britská angličtina (`organisation`,
  `behaviour`), formálne „vykání" v češtine.
- **Kultúrne lokalizované scam scenáre** — všetkých 238 otázok má
  verziu vhodnú pre lokálne publikum. Pre angličtinu (UK) bola
  *Slovenská pošta* nahradená Royal Mail, *Tatra banka* Barclays,
  *Bazoš* Gumtree, eurá librami (£), čísla `+421` na `+44`, IBAN
  prefix `SK` na `GB`, domény `.sk` na `.co.uk`. Pre češtinu
  Česká pošta, Česká spořitelna, Bazos.cz, koruny (Kč), `+420`,
  IBAN `CZ`, `.cz`.
- **Trilingválne otázky v databáze** — administrátorský editor
  otázok získal záložky `sk | en | cs`. Pri každej otázke vidíš,
  ktoré jazyky sú už preložené (zelená/oranžová/sivá značka).

### Bezpečnosť
- Žiadne. Lokalizácia je čisto prezentačná vrstva; obsah otázok
  je v databáze, RLS policies nemení — len pridáva preložené
  stĺpce (`prompt_en/cs`, `options_en/cs`, `visual_en/cs`).

## AH-13 — Registrácia, Google prihlásenie a obnova hesla

Rozšírili sme prihlasovaciu plochu o samoobslužnú registráciu a obnovu
hesla. Doteraz museli účty zakladať administrátori; po AH-13 si nový
používateľ vie vytvoriť účet sám — e-mailom alebo cez Google.

### Pridané
- **/signup** — verejná stránka registrácie e-mailom a heslom.
  Po odoslaní pošleme overovací e-mail s odkazom; po kliknutí na odkaz
  je účet aktivovaný a používateľ je presmerovaný na `/app`.
- **Prihlásenie cez Google** — tlačidlo „Pokračovať cez Google"
  na `/login` aj `/signup`. Pri prvom prihlásení sa automaticky vytvorí
  profil so štandardnou rolou používateľa.
- **/forgot-password** — formulár pre vyžiadanie obnovy hesla.
  Po odoslaní e-mailu zobrazí potvrdenie bez ohľadu na to, či účet
  s daným e-mailom existuje (ochrana proti enumerácii).
- **/auth/reset-password** — stránka pre nastavenie nového hesla
  po kliknutí na obnovovací odkaz z e-mailu.
- **Doplnenie profilu** — nový používateľ, ktorému Google nedal plné
  meno, vidí na `/app` jednorazové upozornenie s odkazom na úpravu
  profilu. Upozornenie sa po zatvorení už neopakuje.

### Bezpečnosť
- Registrácia + obnova hesla bežia výhradne cez Supabase Auth
  (`signUp`, `resetPasswordForEmail`, `updateUser`). Žiadne heslá
  neopúšťajú prehliadač v plain texte.
- Nové účty dostávajú výhradne rolu `user`. Administrátorské oprávnenia
  pridáva ručne existujúci admin v `/admin/users`.
- E-mailové odkazy (overovací aj obnovovací) sú jednorazové a expirujú
  podľa nastavenia Supabase projektu.

### Pre operátora — pred nasadením
V Supabase Dashboard pre `subenai.sk` projekt skontroluj:
- **Auth → Providers → Email** je `Enabled` (typicky predvolené).
- **Auth → Providers → Google** je `Enabled` s OAuth Client ID a
  Secret z Google Cloud Console.
- **Auth → URL Configuration → Site URL** = `https://subenai.sk`.
- **Auth → URL Configuration → Redirect URLs** obsahuje
  `https://subenai.sk/auth/callback` a `https://subenai.sk/auth/reset-password`.

Detaily v `tasks/AH-11-production-runbook.md` (smoke test sekcia).

## AH-11.8 — Deploy bootstrap finalizácia

DEPLOY_SETUP.sql, README.md, .env.example doladené tak, aby nový
operátor mohol zo svežého clone-u nasadiť subenai.sk podľa
tasks/AH-11-production-runbook.md bez ďalšieho dohľadu.

## AH-11 epic — migrácia mockov na reálnu Supabase (dokončené)

V epicu AH-11 (15+ sub-commitov) sa celý admin-hub UI presunul z
in-memory mock-store na produkčnú Supabase:
- Admin core (questions, tests, answer-sets, categories, trainings,
  respondents, audit, DSR, reports, users) — AH-11.1
- Používateľské /app/* (tests, audiences, templates, notifications,
  history, profile, teams, DSR submit) — AH-11.2
- Privilegované operácie cez Cloudflare Pages function (user role
  zmeny, ban toggle) so service-role kľúčom — AH-11.3
- Anonymný respondent flow /t/$shareId so SECURITY DEFINER RPC — AH-11.4
- CMS admin + verejné /s/$slug — AH-11.5a
- /test (verejný kvíz) číta 238 scam scenárov z DB cez RPC — AH-11.5b
- Mock cleanup + bundle alarm guard — AH-11.6

Otvorené pre AH-14 follow-up: respondent reads RPC, answer-sets viewer
hooky, questions.type/category schema enrichment, delete zostávajúcich
mockov.

Bundle guard `npm run check:bundle-no-mocks` v alarm-only móde —
v produkcii žiadny mock string nie je v JS bundli.

PRE-DEPLOY checklist: tasks/AH-11-production-runbook.md

### Zmenené
- **Upratovanie mock dát + strážca produkčného balíčka (AH-11.6)** — interné typy pre CMS (stránky, hlavičku, pätu, navigáciu, share-card, rýchly test) sme presunuli do samostatného modulu `cms-types`, aby produkčné cesty nesiahali do mock súborov. Mock súbor s neaktívnymi používateľskými dátami (`mock-user-data`) sme odstránili, lebo už nikde nebol používaný. Pridali sme strážcu (`npm run check:bundle-no-mocks`), ktorý prehľadá zostavený balíček na zakázané mock identifikátory a v aktuálnom režime upozornenia ich len reportuje — kým prebieha presun zostávajúcich mock-ov (respondentské čítanie z `/t/<id>`, prehliadač odpovedí v `/app/sets/<id>`, knižnica otázok pre wizard a `/app/library`) na Supabase. ESLint pravidlá tieto výnimky pomenúvajú a smerujú na nasledujúci epic AH-14, ktorý ich uzavrie. Žiadna zmena správania pre používateľov.

### Pridané
- **/test číta scam scenáre z databázy (AH-11.5b.2)** — verejná stránka `/test` po novom fetchne 10 náhodných scam scenárov cez `get_quick_test_questions` RPC (anonymné, SECURITY DEFINER) namiesto hardcoded poľa v balíčku. Administrátor môže editovať otázky v `/admin/questions` a zmeny sa zobrazia okamžite (po obnovení `/test`). Zdrojový bank `src/lib/quiz/bank/questions.ts` zostáva nedotknutý — používa ho `/testy/<slug>`, composer a test-packs; ich prechod na DB príde v ďalšom epicu. Vyžaduje predtým nasadenú migráciu z AH-11.5b.1.
- **DB infraštruktúra pre kvíz otázky (AH-11.5b.1)** — pripravený DB základ pre `/test`. Migrácia pridáva stĺpec `visual` do tabuľky `questions`, vytvára prepojovaciu tabuľku `quick_test_questions` a SECURITY DEFINER funkciu `get_quick_test_questions()` pre anonymné čítanie s náhodným poradím na strane servera. Seedne aktuálny banchov otázok z `src/lib/quiz/bank/questions.ts` do databázy s deterministickými UUIDv5 identifikátormi (re-run je bezpečný cez `ON CONFLICT`). V tomto kroku ešte žiadna stránka nečíta z DB — bank file zostáva neporušený a `/test` ho používa ako doteraz. Prepojenie `/test` na nový RPC príde v AH-11.5b.2. **Pred nasadením je nutné v Supabase SQL Editori spustiť migráciu `supabase/migrations/20260518400000_quiz_questions_db_infra.sql`** (alternatívne stačí preliať celý `DEPLOY_SETUP.sql`).
- **Reálna perzistencia respondentských odpovedí** — verejný odkaz `/t/<id>` po novom ukladá odpovede a sedenia priamo do Supabase namiesto dočasnej pamäte v prehliadači. Po odoslaní vyplneného testu sa údaje okamžite objavia v administračných prehľadoch (`/admin/respondents` a analytika v `/admin/tests/<id>`). Anonymný respondent sa naďalej neprihlasuje — zápis zabezpečujú tri serverové funkcie s overením, že odkaz patrí publikovanému testu. **Pred nasadením je nutné v Supabase SQL Editori spustiť migráciu `supabase/migrations/20260518300000_public_respondent_rpc.sql`** (alternatívne stačí preliať celý `DEPLOY_SETUP.sql`). Bez nej padne pokus o začatie testu chybou.
- **Bezpečnejšia správa rolí a banov používateľov v administrácii** — zmena role (admin / moderátor / bežný používateľ) a zablokovanie alebo odblokovanie účtu už neprebieha priamo z prehliadača cez Supabase, ale cez chránený serverový endpoint. Endpoint overí, že vyvolávajúci je naozaj administrátor, a každý zásah zapíše do auditného denníka. **Pred nasadením je nutné v Cloudflare Pages → Settings → Environment Variables (Production) doplniť `SUPABASE_SERVICE_ROLE_KEY`** (hodnota: Supabase Dashboard → Settings → API → service_role secret). Bez tejto premennej padne každý pokus o zmenu role alebo banu chybou 500.
- **Dvojfaktorové overenie (2FA) pre administrátorov** — administrátorský panel `/admin` je odteraz prístupný len so silnejším prihlásením (AAL2). Po prihlásení sa zobrazí sprievodca, ktorý vás prevedie naskenovaním QR kódu autentifikátorom (Google Authenticator, Authy, 1Password, alebo iný TOTP-kompatibilný) a vygeneruje 8 záložných kódov pre prípad straty zariadenia. Bežní používatelia môžu 2FA zapnúť dobrovoľne v `/app/účet/bezpečnosť`. **Pred nasadením je nutné v administrácii Supabase (Project Settings → Authentication → Multi-Factor Authentication) povoliť TOTP**, inak sa nedá enrolovať a admin by zostal zamknutý mimo `/admin`.
- **Aktualizovaná sitemap a robots.txt** — verejné CMS stránky (`/s/<slug>`) sú v sitemape; autentifikované cesty `/app/`, `/admin/` a respondentské odkazy `/t/` sú v `robots.txt` zakázané pre indexovanie.
- **Odkaz "Moje testy" v hlavičke a stĺpec "Platforma" v päte** — pre prihlásených používateľov sa v hlavičke webu zobrazí odkaz *Moje testy* na pracovný panel (`/app`). V päte pribudol stĺpec *Platforma* s odkazom *Tvorba testov*; administrátori v ňom navyše vidia odkaz *Administrácia* (`/admin`). Neprihlásení návštevníci nevidia ani jedno.
- **Verejné CMS stránky** (`/s/<slug>`) — administrátorom vytvorené stránky sa zobrazia na verejnej URL `/s/<slug>` po publikovaní. Koncepty a neexistujúce slugy vrátia 404. Renderujú sa rovnaké typy blokov ako v editore (nadpis, odsek, obrázok, CTA).
- **Admin share karta** (`/admin/share-card`) — konfigurácia predvolených Open Graph hodnôt pre zdieľanie (URL šablóny obrázka, predvolený názov, predvolený popis) s živým náhľadom. Existujúce zdieľanie výsledkov testu cez `/zdielanie/*` a `/podakovanie/*` ostáva nedotknuté.
- **Admin konfigurácia rýchleho testu** (`/admin/quick-test`) — admin UI na nastavenie viditeľnosti, názvu, popisu, branže, časového limitu, hranice úspechu, obťažnosti a zoznamu otázok rýchleho testu. Mock-only; pripravujeme prepojenie na databázu.
- **Admin navigácia** (`/admin/navigation`) — CRUD pre položky hlavnej navigácie. Pridávanie, úprava, mazanie, preusporiadanie šípkami, prepínače *Viditeľné* a *Iba pre prihlásených*. Editor v modálnom okne s validáciou URL (relatívna alebo https).
- **Admin hlavička webu** (`/admin/header`) — formulár na konfiguráciu loga, CTA tlačidla a štítku mobilného menu verejnej hlavičky.
- **Admin päta webu** (`/admin/footer`) — editor stĺpcov a odkazov v päte, plus sekcia sociálnych sietí. Stĺpce a odkazy možno pridávať a odstraňovať jedným klikom.
- **Admin editor podstránky** (`/admin/pages/<id>`) — editor jednej CMS stránky s úpravou názvu, URL slug, SEO popisu a usporiadaného zoznamu blokov (nadpis, odsek, obrázok, CTA tlačidlo). Bloky možno pridávať, preusporiadať šípkami a odstrániť. Slug má validáciu (malé písmená, čísla, pomlčky). Publikovanie / vrátenie do konceptu jedným klikom. Mock-only zatiaľ; reálne ukladanie doplníme v ďalšej iterácii.
- **Admin detail testu** (`/admin/tests/<id>`) — editor jedného testu s úpravou názvu, popisu, stavu, obťažnosti a vetiev. Otázky možno preusporiadať šípkami hore/dole (klávesnicovo prístupné) a odstrániť. Pri opustení s neuloženými zmenami sa zobrazí potvrdzovací dialóg.
- **Admin testy** (`/admin/tests`) — platformový prehľad všetkých testov s filtrami podľa stavu, obťažnosti, branže a vlastníka, hromadným označením a hromadným mazaním cez potvrdzovací dialóg.
- **Moja história** (`/app/history`) — chronologická časová os tvojich testov, sedení a publikovaných verzií. Filtre podľa testu, časového rozsahu a typu udalosti (sedenie / verzia / zmena stavu).
- **Šablóny testov** (`/app/templates`) — prehľadávateľná knižnica predpripravených šablón s vyhľadávaním a filtrom podľa kategórie. Tlačidlo *Použiť šablónu* otvorí sprievodcu novým testom s prednastavenými otázkami.
- **Skupiny respondentov** (`/app/audiences`) — CRUD pre tagované cohorty s editorom (názov + tagy) a potvrdzovacím dialógom pri mazaní. Tlačidlo na hromadný import e-mailov je zatiaľ vypnuté s tooltipom „Pripravujeme" — funkciu doplníme v ďalšej iterácii.
- **Detail testu** (`/app/tests/<id>`) — editor jedného testu s tabmi *Výsledky*, *Analytika* a *Nastavenia*, akciami *Uložiť*, *Publikovať* a *Archivovať*. Dialóg *Zdieľať* zobrazí verejný odkaz `/t/<id>` s tlačidlom na skopírovanie do schránky.
- **Sprievodca novým testom** (`/app/tests/new`) — štvorkrokový wizard: základné údaje, cieľová skupina, otázky, zdieľanie. Každý krok má vlastnú URL (`?step=1..4`) takže návrat tlačidlom prehliadača funguje. Po publikovaní dostaneš verejný odkaz `/t/<id>` na rozposlanie respondentom.
- **Moje testy** (`/app/tests`) — prehľad všetkých tvojich testov s vyhľadávaním, filtrom podľa stavu (draft / publikované / archív) a vetiev. Každý riadok ponúka rýchle otvorenie editora alebo zdieľanie. Nový test sa vytvára cez tlačidlo *Nový test*.
- **Verejné vypĺňanie testu cez odkaz** (`/t/<id>`) — anonymný respondent dostane odkaz, vyplní vstupné údaje (s GDPR súhlasom verzia 1.4.0) a odpovedá na otázky. Žiadne prihlásenie sa nepoužíva, dáta z testu sú obmedzené na bezpečnú projekciu (žiadne `owner_id`, heslá ani interná segmentácia neopustia server). Skutočnú perzistenciu a rate-limit doplníme v ďalšej iterácii.
- **Admin DSR fronta** (`/admin/dsr`) — spracovanie GDPR žiadostí s 30-dňovým SLA timerom (zelená > 14 dní, oranžová 3–14, červená < 3 dní alebo po termíne). Akcie *Uzavrieť* a *Zamietnuť* sa zapisujú do audit logu.
- **Admin audit log** (`/admin/audit`) — read-only prehliadač systémových udalostí s filtrami podľa aktora, akcie, PII flagu a časového rozsahu. Stránkovanie po 25 záznamoch. Otvorenie tohto prehliadača sa zámerne neloguje, aby nevznikol cyklus.
- **Admin respondenti** (`/admin/respondents`) — zoznam respondentov s vyhľadávaním, filtrami podľa testu a statusu (aktívny / anonymizovaný). Každé otvorenie zoznamu sa zapíše do audit logu (PII prístup). Detail jedného respondenta sa loguje samostatne.
- **Admin reporty** (`/admin/reports`) — fronta nahlásení obsahu s filtrom podľa statusu a dôvodu, akcie posúdiť / vyriešiť / zamietnuť. Mock-only, plnú perzistenciu doplníme v ďalšej iterácii.
- **GDPR žiadosť priamo v aplikácii** (`/app/legal/dsr`) — prihlásený používateľ môže podať žiadosť podľa GDPR (prístup čl. 15, oprava čl. 16, výmaz čl. 17, obmedzenie čl. 18, portabilita čl. 20, námietka čl. 21) priamo z účtu. Odpovedáme do 30 dní. Banner súhlasu sa raz znova zobrazí (verzia 1.4.0) — pridali sme platformu pre tvorbu vlastných testov a zdieľanie cez odkaz, čo zahŕňa dve nové kategórie údajov: profily používateľov platformy a vstupné údaje respondentov.
- **Admin kategórie** (`/admin/categories`) — správa branží a tém s pridávaním cez dialóg, úpravou a mazaním cez potvrdzovací dialóg. Mazanie branže, ktorá má aktívne témy, je blokované s vysvetľujúcou hláškou.
- **Admin školenia** (`/admin/trainings`) — CRUD pre školenia s vyhľadávaním, editorom (názov, branža, témy, moduly, stav), duplikovaním (sufix „kópia") a mazaním cez potvrdzovací dialóg.
- **Admin nastavenia** (`/admin/settings`) — UI pre funkčné prepínače, predvolenú retenciu údajov a branding tokeny. *Pozor:* zatiaľ iba dočasné nastavenie v pamäti, server-side perzistencia (`app_settings`) je odložená do ďalšej iterácie.
- **Admin podpora** (`/admin/support`) — formulár na úpravu kontaktných kanálov (e-mail, telefón, pracovné hodiny) s validáciou v reálnom čase. Zmeny sa zatiaľ ukladajú do dočasnej pamäte, plnú perzistenciu doplníme v ďalšej iterácii.
- **Admin používatelia** (`/admin/users`) — tabuľka profilov s vyhľadávaním podľa mena/e-mailu, filtrom podľa roly a značkami rolí. Akcia úpravy roly je zatiaľ placeholder, plný backend pripravujeme.
- **Admin dashboard** (`/admin`) — úvodná stránka s prehľadom kľúčových metrík (používatelia, testy, sedenia, čakajúce DSR) a najnovšími udalosťami.
- **Admin shell + role-gate** — `/admin/*` má vlastný layout s bočným panelom a chránený je novou kontrolou roly (`requireRole("admin")` cez `has_role()`). Bežní používatelia sú presmerovaní späť do svojho workspace, neprihlásení na prihlásenie.
- **Detail sady odpovedí** (`/app/sets/$setId`) — read-only náhľad jednej sady odpovedí pre tvorcov testov. Oddelené stĺpce *Správne odpovede* a *Nesprávne odpovede*, voliteľné vysvetlenia. Neexistujúce ID zobrazí jasnú prázdnu stránku so spätným odkazom.
- **Knižnica otázok** (`/app/library`) — read-only prehliadač globálnej knižnice otázok pre tvorcov testov. Hľadanie podľa textu otázky, filtrovanie podľa branže a obtiažnosti, prehľadné karty s typom otázky.
- **Admin sady odpovedí** (`/admin/answer-sets`) — zoznam zdieľaných sád správnych a nesprávnych odpovedí, ktoré sa pripájajú k viacerým otázkam naraz. Hľadanie podľa názvu, duplikácia jedným klikom a mazanie s potvrdením.
- **Admin knižnica otázok** (`/admin/questions`) — CRUD pre otázky s vyhľadávaním, filtrovaním podľa branže, stavu, autora a počtu hlasov; hromadné akcie (publikovať, archivovať, vymazať) a export do CSV. Editor otázky vyžaduje priradenú sadu odpovedí a aspoň jednu správnu + dve nesprávne odpovede.
- Nový **autentifikovaný workspace** na `/app` — prihlásení používatelia majú vlastný panel s prehľadom, navigáciou na testy, tímy, notifikácie a účet. Prístup len pre prihlásených, zatiaľ s demo obsahom.
- **Dashboard na `/app`** — štyri prehľadové karty (aktívne testy, sedenia, respondenti, miera dokončenia) s demo dátami.
- **Účet** (`/app/account/profile`, `/app/account/security`) — úprava mena, e-mailu a iniciálov avatara; politika hesla a zoznam aktívnych sedení. Dvojfaktorové overenie je viditeľné, ale neaktívne — backend pripravujeme.
- **Tímy, notifikácie, help centrum** v `/app` — demo zoznamy, akcie a FAQ vyhľadávanie.
- **Prihlasovacia stránka** na `/login` — e-mail + heslo cez Supabase Auth. Slúži ako vstup do `/app` workspace.
- Možnosť **podporiť projekt** jednorazovo alebo mesačne. Faktúru dostaneš e-mailom; mesačný odber zrušíš kedykoľvek jediným klikom v Stripe Customer Portal.
- Stránka **O projekte** — cieľ, prečo sponsorship namiesto členstva, kam idú peniaze.
- Verejný **zoznam sponzorov**, ktorí pri podpore zaškrtli súhlas so zverejnením mena. Anonymita je default.
- Stránka **Spravovať podporu** — pošleme ti na e-mail magic-link na Stripe Customer Portal pre prípad, že si stratil/a potvrdzujúci e-mail.
- Verejný changelog (toto stránka).
- **6 ďalších školení** — AI a deepfake podvody, QR / quishing, krádež kont na sociálnych sieťach, podvody pri nábore do práce, fyzické podvody (skimming, fake POS), tipy ako chrániť seniorov a deti. Spolu je teraz dostupných **14 školení**.
- **Demografické testy** popri firemných balíkoch — *Žiaci do 16*, *Študenti*, *Seniori* a *Všeobecný test*. Každý má vlastný výber otázok primeraný cieľovej skupine.
- **Filter kategórií** na stránke *Školenia* — môžeš si zobraziť iba školenia o phishingu, scenároch alebo URL.
- **FAQ sekcia** na úvodnej stránke s odpoveďami na najčastejšie otázky o teste, anonymite a podpore.
- Po dokončení testu sa **úvodný titulok prispôsobuje skóre** — pre slabší výsledok motivačný tón, pre vysoký pochvalný.
- **15 nových otázok** zameraných na konkrétne odvetvia a vekové skupiny (študenti, seniori, žiaci).
- **20 nových otázok pre rozpoznávanie legitímnych SMS** od Slovenskej pošty, bánk a úradov (BalikoBOX kódy, 3D Secure, OTP, slovensko.sk, ePN) — učia rozlíšiť pravú správu od scamu, aby si neodignoroval/a dôležité doručenie.
- **13 nových otázok pre konkrétne odvetvia** — e-shopy (BEC, IBAN-switch, fake reklamácia, account takeover), gastro (kompromitovaný POS terminál, fake supplier, malware v prílohe rezervácie), autoservisy (fake VIN check, fake reklamácia po oprave), pneuservisy (WhatsApp predfaktúra) a IT/dev (npm supply-chain, OAuth phishing, fake recruiter assignment).
- **30 honeypot otázok „vyzerá podozrivo, ale je legit"** — emaily od bánk, hovory polície / fraud teamu / lekára, pozostalostné inzeráty, transakčné SMS od Boltu / Woltu / Apple. Učia rozoznať, kedy je urgentný tón naozaj legitímny.
- Stránka **Kontakt** s priamym linkom na `subenai.podpora@gmail.com` a 6 prednastavenými témami (technická pomoc, GDPR, sponzorstvo, spolupráca…). Odpovedáme typicky do 2 pracovných dní.
- **Education mode (príprava)** — autori vzdelávacích testov si v Composeri budú môcť opt-in zapnúť zber odpovedí s menom a e-mailom respondenta a chrániť výsledky vlastným heslom. Schéma + privacy update sú už nasadené; UI toggle a respondent intake doplníme v ďalších sprintoch. *Ako respondent edu testu: kontrolórom tvojich údajov je autor testu, my (am.bonum) sme len sprostredkovateľ podľa čl. 28 GDPR.*
- **Composer toggle pre edu mód** — v Composeri pribudol prepínač „Zbierať odpovede s menom a e-mailom" s povinným heslom autora (min. 8 znakov, bcrypt hashovanie na strane servera, originál neukladáme nikde). Po vytvorení testu sa zobrazí potvrdzovacie okno s linkom pre respondentov, linkom na výsledky a heslom — autor musí explicitne odkliknúť, že si ich uložil, predtým ako sa dialog zatvorí (žiadny reset cez e-mail).
- **Respondent intake pred edu testom** — keď autor zapne edu mód, respondent (študent / kolega) musí pred štartom zadať meno, e-mail a explicitne odsúhlasiť spracovanie osobných údajov (čl. 6 ods. 1 písm. a GDPR). Disclosure paragraf vidí kto je autor, kam idú údaje a 12-mesačnú dobu uchovávania. Anti-spam ochrana: skrytý honeypot field, rate-limit (3 pokusy / 5 min / IP + 50 / hodinu / test), validácia e-mailu, detekcia duplicit. Zápis výsledku ide cez signed JWT — bez intake-u sa nedá obísť.
- **Dashboard výsledkov pre autora edu testu** — na linku `/test/zostava/$id/vysledky` autor zadá svoje heslo (5 pokusov / 15 min ochrana proti hádaniu) a uvidí súhrn (priemer, medián, min/max, distribúciu skóre, pass rate) + tabuľku respondentov so zoradením, vyhľadávaním a možnosťou jedným klikom zmazať konkrétneho respondenta. **CSV export** so slovenskou diakritikou pre analýzu v Exceli. Session 60 minút (HttpOnly cookie, Path-scoped).
- **Stránka „Pre školy a vzdelávacie inštitúcie"** ([/skoly](skoly)) — návod ako pripraviť edu test, zdieľať link a pozrieť výsledky. Vysvetľuje GDPR rolu autora (kontrolór) a am.bonum (sprostredkovateľ podľa čl. 28 GDPR), retention politiku, a obsahuje vzor e-mailu pre respondentov + FAQ. Link v päte stránky.

### Zmenené
- **Používateľská doména napojená na živú databázu** — stránky `/app/*` (dashboard, testy, audiencie, šablóny, notifikácie, tímy, profil, DSR formulár, história) teraz čítajú a zapisujú dáta priamo z produkčnej Supabase cez TanStack Query. RLS politiky automaticky filtrujú výsledky podľa prihláseného používateľa.
- **Admin sekcia napojená na živú databázu** — stránky `/admin/questions`, `/admin/tests`, `/admin/answer-sets`, `/admin/categories`, `/admin/trainings`, `/admin/respondents`, `/admin/audit`, `/admin/dsr`, `/admin/reports`, `/admin/users` a úvodný panel `/admin` teraz čítajú a zapisujú do reálneho Supabase projektu cez TanStack Query (predtým mock dáta). Mock vrstva ostáva len pre CMS admin stránky — tie napojíme v ďalšej iterácii.
- **Identifikácia prevádzkovateľa** v zásadách ochrany súkromia — projekt teraz transparentne vystupuje ako am.bonum s. r. o. (predtým fyzická osoba). Cookie banner sa znova zobrazil, aby si mohol/a aktualizovať svoj súhlas pod správnu entitu.
- **Súkromie** — pridaná samostatná sekcia *„Education mode"* (zber edu odpovedí, role kontrolór/sprostredkovateľ, doba uchovávania 12 mesiacov). Cookie banner sa znova zobrazí, aby si súhlas potvrdil/a pod novú verziu zásad (1.3.0).
- Texty na stránkach **O projekte**, **Cookies** a **Súkromie** o trackingu: sformulované tak, aby boli zrozumiteľné a konzistentné s tým, čo cookie banner naozaj robí — analytika a marketing sa zapnú **iba so súhlasom**.
- V hlavičke stránky pribudol odkaz **Podporiť projekt**; v päte stránky **Sponzori**, **Zmeny** a **Kontakt**.
- Firemné testy presunuté z `/test/firma/...` na kratší a zrozumiteľnejší **`/testy/...`**. Staré linky redirectujú.
- Projekt presťahovaný na vlastnú doménu **subenai.sk**.

### Opravené
- Drobná chyba pri prepínaní medzi rôznymi testami: po dokončení jedného testu sa pri kliknutí na iný niekedy zobrazil starý výsledok. Teraz sa každý test začne čisto od prvej otázky.

## [1.4.0] — 2026-04-26
### Zmenené
- Premenovanie projektu z **internetiq** na **subenai**. Nové logo (gradient acid-lime → emerald), nový favicon, nová doména. Obsah testu, kurzov a celá funkcionalita zostala nezmenená.

## [1.3.0] — 2026-04-25
### Pridané
- **Testy pre konkrétne odvetvia** — e-shop, gastro, autoservis, IT vývoj, verejné služby. Každý balík má vlastný výber otázok a vlastnú hranicu „Vyhovuje pre…" pri vyhodnotení.
- **Stovka nových otázok** — phishing, smishing, vishing, marketplace podvody, BEC, investičné podvody, romance scams.
- **8 nových školení** pod sekciou *Školenia* (predtým *Kurzy*) s detailným rozpisom, ako jednotlivé typy podvodov vyzerajú a ako sa im brániť.

### Zmenené
- Úvodná stránka prepísaná pre prvý dojem: *„Zistíš, či by si prežil."*

## [1.2.0] — 2026-04-20
### Pridané
- **Detailný review tvojich odpovedí** po dokončení testu — pre každú otázku vidíš svoju odpoveď, správnu odpoveď a krátke vysvetlenie.
- **Voliteľný prieskum** po teste (vek, pohlavie, miesto, sebahodnotenie, najväčšia obava online, či si už raz nasadol/a). Nič nie je povinné, môžeš odoslať aj prázdny formulár.
- **Edukatívny popup** po výsledku, ktorý ťa vyzve „vyplniť" citlivé údaje — a okamžite vysvetlí, prečo to bola past. Nič z toho, čo do popupu napíšeš, neopustí tvoj prehliadač.
- **Zdieľanie výsledku** cez sociálne siete (Facebook, Messenger, WhatsApp, X, LinkedIn, Telegram). Bez tracking pixelov — len obyčajné odkazy.

## [1.1.0] — 2026-04-15
### Pridané
- **Skóre, percentil a archetyp osobnosti** po dokončení testu.
- **Zdieľateľný odkaz** na tvoj výsledok cez krátky kód — nikoho neidentifikuje.
- **Cookie consent** s 4 kategóriami (nutné, predvoľby, analytika, marketing). Default: nič mimo nutných.
- Stránky **Súkromie** a **Cookies** so zoznamom toho, čo presne spracúvame, ako dlho a na akom právnom základe.

## [1.0.0] — 2026-04-10
### Pridané
- Prvé verejné spustenie: 15-otázkový test rozpoznávania scam-ov a phishingu, anonymne, bez registrácie.
