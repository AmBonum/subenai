# Changelog

Verejný zoznam zmien projektu subenai. Píšeme ho pre používateľov a sponzorov,
takže nájdeš tu len to, čo má vplyv na to, čo vidíš a používaš — bez interných
detailov, ciest k súborom alebo technického žargónu.

Formát vychádza zo [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/).
Verzie idú od najnovšej. Drobné úpravy textov a interné práce neuvádzame.

## [Unreleased]

### Zmenené
- **Kurzy a blog sme spojili do jednej Akadémie.** Na novej stránke `/academy`
  nájdete kurzy aj články na jednom mieste, s filtrom a vyhľadávaním. Kurzy sú
  teraz interaktívne — pri príkladoch si rovno vyskúšate, či podvod spoznáte, s
  okamžitou spätnou väzbou a vysvetlením. Pôvodné odkazy na `/kurzy` a `/blog`
  automaticky presmerujeme na novú Akadémiu.
- **Anglické pojmy majú slovenské vysvetlenie.** Pri prvom použití slov ako
  phishing, smishing či scam nájdete v zátvorke ich význam po slovensky.

## [1.15.0] — 2026-06-13

### Pridané
- **Podvodový poradca — AI pomocník na podvody.** Na úvodnej stránke odpovie na otázky, preverí podozrivú správu aj fotku (max 5) a pripraví PDF zhrnutie na políciu; rozhovor neukladáme a po zatvorení karty zmizne.
- **Svetlý a tmavý režim.** Vzhľad prepnete tlačidlom v hlavičke; voľbu si zapamätáme.
- **Nastavenia prístupnosti.** Zväčšenie písma, obmedzenie animácií, výrazné zvýraznenie pri ovládaní klávesnicou a odkaz „Preskočiť na obsah".
- **Prehľad respondentov pri vašich testoch.** Vo Výsledkoch zoznam ľudí s vyhľadávaním, filtrami a zoradením; klik otvorí celý prehľad odpovedí.
- **Stiahnutie respondentov do CSV** priamo z výsledkov testu — otvorí sa správne aj s diakritikou v Exceli.

### Zmenené
- **Potvrdzovací e-mail o žiadosti o podporu** teraz obsahuje kópiu vašej správy.

### Opravené
- **Časté otázky** mali pri každej položke dve šípky — teraz je tam jedna.
- **Stránka so zoznamom zmien** (táto) orezávala dlhšie body uprostred vety — už nie.
- **Kotvy „#" pri nadpisoch v článkoch** sú viditeľné rovno, nie až pri prejdení myšou.
- **Karty „Vyber si, kde pokračovať"** na stránke pre školy mali dvojitú šípku; nechali sme jednu.
- **Odpoveď podpory v e-maile** teraz vždy vedie na správne vlákno.

## [1.14.4] — 2026-05-21

### Pridané
- **Schvaľovanie komunitných šablón.** Odoslané šablóny pred zverejnením posúdi administrátor (s AI predkontrolou); zamietnutie príde aj s dôvodom.
- **Verejná knižnica šablón na `/sablony`.** Pripravené kvízy v slovenčine, zadarmo a pod licenciou CC BY 4.0 — prístupné aj bez prihlásenia, na použitie či úpravu.
- **Súkromie rozšírené o verejnú publikáciu šablón.** Pribudol nový účel spracovania, sprostredkovateľ pre AI predkontrolu a zmienka o licencii CC BY 4.0; cookie banner sa zobrazí znova.

## [1.14.3] — 2026-05-21

### Pridané
- **Odkazy „Zobraziť dokumentáciu" už nekončia 404.** Vedú na prechodnú stránku *Pripravujeme* s vysvetlením a kontaktom.
- **Oprava mena používateľa jedným klikom v admin paneli.** Operátor opraví meno priamo v dossier-i; zmena sa zapíše do audit logu. Pre používateľa bez viditeľnej zmeny.
- **Žiadosti o vymazanie sa po novom dokončia automaticky.** Po 5-minútovom okne na zrušenie sa účet vymaže sám, do 6 minút od potvrdenia.

### Zmenené
- **Stránka *Súkromie* presne popisuje, ako vybavujeme GDPR žiadosti** — od overenia identity po zápis do audit logu.

### Opravené
- **Vysvetľujúce panely v `/app` sú prístupnejšie pre čítačky obrazovky aj na mobile** — opravené nadpisy, scrollovanie, ikony odkazov a drobné texty.

## [1.14.2] — 2026-05-21

### Bezpečnosť
- **Forenzný záznam zmien v otázkach testu sa už ukladá automaticky** — každé pridanie, odobranie či zmena poradia otázky ide do audit logu.
- **Interný observability fix:** sfalšované respondentské cookie sa už nezamieňa s prvonávštevou. Pre používateľa bez zmeny — systém ho odmietne ako predtým.

### Pridané
- **Nový stĺpec *Posledná GDPR udalosť* na zozname používateľov** s odznakom, dátumom a filtrom *Iba s otvorenou DSR*.
- **Z fronty GDPR žiadostí jedným klikom do dossier-u používateľa** — ak je žiadateľ registrovaný; inak je ikona neaktívna.
- **Jednotný dizajn potvrdzovacích dialógov v admin paneli** so štyrmi úrovňami závažnosti; pri kritických akciách treba doslovne napísať e-mail používateľa.
- **Nový admin dossier používateľa — splní GDPR Art. 15 / 17 jedným klikom.** Stiahnutie údajov, anonymizácia alebo vymazanie (s typed-confirm a 5-min oknom na zrušenie).
- **Interná infraštruktúra pre admin GDPR fulfilment** — databázové funkcie pre export, anonymizáciu a vymazanie. Bez viditeľného UI.
- **Pozvánky cez e-mail z platformy — pripravujeme.** Na detaile testu pribudla zatiaľ neaktívna akcia s odznakom *Pripravujeme*.
- **Vysvetľujúce panely na 20 podstránkach admin konzoly** — čo sa nastavuje, aký časový dopad a na čo si dať pozor. V SK / EN / CZ.
- **Vysvetľujúce panely aj v sekcii `/app`** na všetkých 11 podstránkach — stav si pamätá samostatne. V SK / EN / CZ.

### Opravené
- **Responzívnosť admin vysvetľujúcich panelov** — zalomenie dlhých názvov na mobile, čitateľná šírka na veľkých monitoroch, podčiarknuté odkazy a opravený scroll pri kotvách.

## [1.14.1] — 2026-05-21

### Opravené
- **Formulár na `/schools/dpa` už nepovie „zlyhalo", keď žiadosť reálne prešla.** V tejto situácii uvidíš oranžovú kartu s vysvetlením a tlačidlom na obnovenie; skutočné chyby ostávajú červené.

## [1.14.0] — 2026-05-21

### Pridané
- **Heslo pre tvoj test.** V Nastaveniach testu nastavíš heslo pre respondentov (min. 8 znakov); chráni pred slovníkovými útokmi a ukladáme len hash.
- **`/admin/settings` ukazuje skutočný stav GDPR konfigurácie** — stav DPA toku, vodoznak, verzia šablóny, retencia a zoznam sub-procesorov. Hodnoty sú read-only.
- **Export CSV pre GDPR (DSR) aj DPA žiadosti + vyhľadávanie v DSR fronte** — Excel zobrazí slovenské znaky správne.
- **DPA žiadosti v admin paneli a v prehľade** — nová položka v menu, dlaždica *Otvorené DPA* a tlačidlo *Stiahnuť PDF* pri každej žiadosti.
- **Úprava otázok a náhodné poradie v detaile testu.** Pridáš, odoberieš či pretiahneš otázky bez tvorby nanovo; pri *Náhodnom* dostane každý respondent vlastné poradie bez vplyvu na skóre.
- **Automatizovaný DPA tok pre školy.** Krátky formulár vyrobí PDF okamžite a pošle kópiu e-mailom; kontaktné údaje sa po 12 mesiacoch anonymizujú. Tok je zatiaľ s vodoznakom „DRAFT".
- **Pripoj si edu testy k svojmu účtu — nová sekcia *Moje edu testy*.** Anonymne vytvorený edu test pripojíš heslom; nepripojený ostáva dostupný cez share link.
- **PDF export výsledkov tvojho edu testu** — tlačiteľný A4 s názvom, štatistikami a tabuľkou respondentov; rešpektuje aktívne filtre a generuje sa v tvojom prehliadači.
- **Grafy na stránke výsledkov tvojho edu testu** — distribúcia skóre, donut Vyhovel/Nevyhovel a doba vyplnenia, s textovým popisom pre čítačky obrazovky.
- **Filtre na stránke výsledkov tvojho edu testu** — podľa výsledku, rozsahu skóre a dátumu; stav je súčasťou URL, žiadne nové cookies.
- **Šablóny: pribudla tvoja vlastná knižnica.** Vytvoríš si kópiu, upravíš a vymažeš bez vplyvu na ostatných.
- **Odoslať vlastnú šablónu na zverejnenie (CC BY 4.0).** AI moderátor ju skontroluje do pár sekúnd; schválené šablóny zverejní administrátor.
- **Stiahnutie tvojich údajov (GDPR čl. 15 / 20).** V *Mojom profile* dostaneš strojovo čitateľný JSON snapshot všetkého, čo o tebe evidujeme.
- **Transparentnostný register.** Verejný JSON transferov na charitu (`/transparency.json`) — kontrolovateľný kýmkoľvek.

### Opravené
- **Zdieľanie výsledku po custom teste už neukazuje „Výsledok neexistuje"** — tlačidlo *Pošli kamošovi* zdieľa pozvánku na test, nie odkaz s osobnými údajmi.

## [1.13.0] — 2026-05-20

### Zmenené
- **Akadémia — sekcia sprievodcov má nové meno** *„sprievodcovia digitálnou bezpečnosťou"* — presnejšie a lepšie dohľadateľné.
- **Akadémia — pri vyhľadávaní sa sekcia článkov premenuje** na *„výsledky pre …"* s počtom nájdených.
- **Akadémia — filter kategórií na mobile sa už nescrolluje vodorovne** — vidíš *Všetko* + 3 kategórie a tlačidlo na rozbalenie zvyšku. Na desktope bez zmeny.

### Opravené
- **Akadémia — rozbaľovací zoznam sprievodcov sa po kliknutí konečne otvára a zatvára vizuálne.**
- **Akadémia — nadpis sekcie a počet sprievodcov sa na úzkych obrazovkách rozložia na dva riadky.**
- **Cookies a Ochrana osobných údajov sa zmestia do 320 px obrazovky** — tabuľka cookies má vlastný horizontálny scroll.

## [1.12.0] — 2026-05-20

### Pridané
- **Stiahnutie tvojich údajov (GDPR čl. 15 / 20).** V *Mojom profile* dostaneš JSON snapshot do pár sekúnd, bez čakania na operátora.
- **Transparentnostný register transferov.** Verejný JSON (`/transparency.json`) s politikou darovaní a zoznamom reálnych transferov.
- **Detail jedného respondenta v dashboarde edukačných testov** — otázka po otázke s jeho odpoveďou, správnou odpoveďou a časom; vidíš presne, kde zaváhal.
- **Politika retencie pre free-tier účty.** Po 12 mesiacoch neaktivity príde upozornenie, po ďalších 30 dňoch sa PII anonymizujú; agregáty ostávajú.
- **Rešpekt voči *Do Not Track* a *Global Privacy Control*.** Pri zapnutom signáli sa analytika nezapne, ani keby si ju v cookie dialógu označil.

### Zmenené
- **Tvorba testov dostala kratšiu adresu a redizajnovaný editor** (`/test/builder`, staré odkazy presmerujú) — namiesto 6 sekcií prehľadný rozbaľovací formulár.
- **`/app` je teraz plne responzívny od 320 px** — sidebar, karty aj tabuľky fungujú na mobile rovnako dobre ako na desktope.
- **CSV export edu výsledkov má teraz GDPR hlavičku** s metadátami; dialóg *Zdieľať* je dostupný kedykoľvek a triedenie respondentov je stabilné.
- **Akadémia — prehľadnejšie filtrovanie a navigácia** — filtre zlúčené do jedného pruhu, *Kopírovať odkaz* funguje aj tam, kde prehliadač API blokuje.
- **Konfirmačné dialógy v tvorbe testov a edukačnom móde sú dizajnované** — namiesto defaultného prehliadačového `confirm()`.
- **Hlavička a odhlásenie** dostali vizuálnu kalibráciu a *„Odhlásený, dovidenia"* toast.
- **Cookie banner sa znova zobrazí** — doplnili sme do tabuľky cookies riadky pre UI predvoľby, ktoré sme ukladali, ale neuviedli.

### Opravené
- **`/test/builder/<id>` ukazoval editor namiesto výsledkov** — link teraz smeruje správne na *Výsledky*.
- **404 stránka ukazovala technické kľúče** namiesto preloženého textu — opravené.
- **Klikateľnosť pilierov v Akadémii** — klik v zbalenom zozname niekedy nereagoval; opravené.

## [1.11.1] — 2026-05-20

### Pridané
- **`/tests` kompletný redizajn** — nový nadpis a úvod, value strip *Anonymne · 5 minút · Zadarmo*, triedenie a vizuálne karty packov.
- **`/courses` kompletný redizajn** — nový nadpis, value strip *10 minút · Reálne príklady · Bezplatné* a slot *„Čítaj k tomu:"* s odkazom na článok.
- **„Učenie pred testom" prúžok na `/tests`** — pod FAQ 4 najnovšie študijné články; zobrazí sa len ak existujú.
- **„Súvisiace v akadémii" karta na detaile sady testov** — odkaz na článok, ak je pre danú sadu tagovaný.
- **FAQ sekcie sú teraz senior-level** — ikony, *„Najčastejšia"* odznak, rozbaliť/zbaliť všetko, deep-link kotvy a klikateľné cesty v odpovediach.
- **Featured karta v mega-menu** má teraz vizuálny vrch — ikona nad farebným gradientom.
- **Zdieľaný výsledok testu (`/r/<id>`)** ukáže plnohodnotnú kartu v náhľade sietí a konverzný CTA presunutý hore za skóre.

### Zmenené
- **Filter na `/tests`** sa volá teraz *„Pre koho je test:"* namiesto *„Filter podľa branže"*.
- **Úvodný text `/courses`** vysvetľuje formát: 10-minútová stránka s reálnymi príkladmi, žiadne 60-stranové PDF.

## [1.11.0] — 2026-05-19

### Pridané
- **`/schools` kompletne prerobená** — outcome-first nadpis, persona chips, porovnávacia tabuľka, postup v štyroch krokoch, karta pre GDPR + DPA a dvoj-úrovňová FAQ. Na mobile sticky CTA.
- **Sprievodca pre učiteľov v Akadémii** — pillar článok s 45-minútovým plánom hodiny, GDPR v skratke a checklistom pre IT koordinátora.
- **„Obsah" navigácia** na dlhých právnych textoch (`/privacy`, `/cookies`); na mobile sa zbalí do otváracieho zoznamu.
- **GDPR samoobsluha zvýraznená** — žiadosť o prístup, opravu a vymazanie je teraz samostatná ohraničená karta v sekcii *Tvoje práva*.
- **Cookies — vidieť aktuálny stav súhlasu** — karta s dátumom a verziou, alebo výzva ak súhlas chýba.
- **Pridaná zmienka o DNT a Global Privacy Control** — pri zapnutých signáloch analytiku a marketing preskočíme aj pri explicitnom súhlase.
- **„Časté otázky o projekte" na `/o-projekte`** — kto za subenai stojí, ako sa financuje a aké dáta sa ukladajú.
- **`/app/pomoc` — rýchle linky** do dokumentácie a ilustrovaná stránka „nič sa nenašlo".
- **404 stránka prerobená** — ilustrácia, krátky kontext, tlačidlo Domov a štyri navrhnuté smerovania.

### Zmenené
- **`/o-projekte`** — referencie na *changelog* a *sponzorov* sú teraz reálne klikateľné linky.

## [1.10.0] — 2026-05-19

### Pridané
- **Akadémia** v hlavičke — nová sekcia sprievodcov a návodov (predtým „Blog"); tag „sprievodca" označuje hĺbkové pillar články.
- **Domovská FAQ je dvojúrovňová** — kategórie sa zbalia s počtom otázok, klik expanduje; tlačidlo rozbaliť/zbaliť všetky a stabilné kotvy.
- **„Pre koho je subenai"** na home — štyri persony, každá vedie na svoju najsilnejšiu podstránku.
- **„Tvoja cesta učenia"** na home — tri kroky: otestuj sa → prejdi školenie → prečítaj sprievodcu.
- **Karta „Pre školy"** zvýraznená na home (limetková farba). Predtým schované v päte.
- **Teaser zmien** nad pätou — odkaz na `/zmeny` s ikonou „nové".
- **Po článku ti odporučíme školenie** — pod každým pillar článkom.
- **V školení ti odporučíme sprievodcu** — pod každým školením s pillar článkom.
- **Vo výsledkoch testu ti odporučíme školenie aj článok** pre každú kategóriu pod 50 %.

### Zmenené
- **Vyhľadávanie v Akadémii** — pri písaní sa skryjú featured pillar články, aby sa nemiešali s výsledkami.
- **Päta stránky** je teraz na všetkých relevantných podstránkach — predtým niekde chýbala.

## [1.9.0] — 2026-05-19

### Pridané
- **Mega-menu hlavička** — kategórie *Rýchly test · Sady testov · Školenia · Pre školy a lektorov · Podpora projektu*; na mobile akordeón.
- **Pre školy a lektorov** povýšené z päty na top-nav.
- **/app onboarding** — pri prvom prihlásení 3 voliteľné otázky, ktoré ladia odporúčania a frekvenciu súhrnov.
- **Týždenný súhrn** — každý pondelok prehľad; pošleme len ak sa niečo udialo.
- **Odporúčané kurzy** — ak respondenti zaostávajú v téme, lektor jedným klikom pošle krátky kurz.
- **Pripomienky retestov** — 90 dní po teste pripomenieme zopakovanie a porovnanie zlepšenia.
- **Porovnanie s ostatnými** (peer card) — anonymné porovnanie oproti slovenskému priemeru, len pri dostatočnej kohorte.
- **Zdieľateľný obrázok** — z `/app/peer` stiahneš PNG s percentilom a top oblasťami, voliteľne s prezývkou.
- **/app sidebar** prerobený — z 14 položiek na 3 logické skupiny (Tvorba · Výsledky · Účet).
- **Účet zlúčený** — profil, bezpečnosť a GDPR žiadosti sú teraz tabmi na jednej stránke.
- **2FA prihlasovacie pole** so 6 slotmi (autosubmit, shake pri chybe, pulse pri úspechu).
- **Brand v sidebare** — *„SubenAI · Pre lektorov"*.

### Opravené
- Rozbitý odkaz `/docs` v sidebare (404).
- Dvojitá hlavička na `/app`.
- Krátky prázdny render na `/auth/reset-password` po načítaní odkazu z e-mailu.
- Nefunkčný *Preview* button pri šablónach (dočasne zakázaný).

### Zmenené
- Logo v hlavičke sa pri stredných šírkach zmenšuje na `S` ikonu.
- Prepínač jazyka dočasne skrytý; slovenčina je predvolená, ostatné jazyky vrátime neskôr.

## [1.8.0] — 2026-05-19

### Pridané
- **Prepínač jazyka** — Slovenčina / English / Čeština v hlavičke; pri prvej návšteve podľa prehliadača, voľba sa pamätá a prejaví okamžite.
- **Anglická a česká verzia všetkých stránok** — britská angličtina, formálne vykanie v češtine.
- **Kultúrne lokalizované scam scenáre** — všetkých 238 otázok má verziu vhodnú pre lokálne publikum (lokálne banky, pošty, meny, predvoľby a domény).

### Bezpečnosť
- Žiadne. Lokalizácia je čisto prezentačná vrstva — obsah otázok a oprávnenia sa nemenia.

## [1.7.0] — 2026-05-18

### Pridané
- **/signup** — verejná registrácia e-mailom a heslom s overovacím e-mailom.
- **Prihlásenie cez Google** — tlačidlo na `/login` aj `/signup`; pri prvom prihlásení sa vytvorí profil.
- **/forgot-password** — vyžiadanie obnovy hesla s rovnakým potvrdením bez ohľadu na existenciu účtu (ochrana proti enumerácii).
- **/auth/reset-password** — nastavenie nového hesla po kliknutí na odkaz z e-mailu.
- **Doplnenie profilu** — používateľ bez plného mena z Googlu vidí jednorazové upozornenie na úpravu profilu.

### Bezpečnosť
- Heslá nikdy neopúšťajú tvoj prehliadač v čitateľnej forme; overovacie a obnovovacie odkazy sú jednorazové a vypršia.

## [1.5.0] — 2026-05-18

### Pridané
- **Skutočná perzistencia respondentských odpovedí** — odpovede z verejného odkazu `/t/<id>` sa ukladajú permanentne, respondent ostáva anonymný.
- **Verejné vypĺňanie testu cez odkaz** (`/t/<id>`) — anonymný respondent s GDPR súhlasom, bez prihlásenia; odkaz neodhalí interné údaje.
- **Verejné CMS stránky** (`/s/<slug>`) — publikované stránky sa zobrazia na verejnej URL; koncepty a neznáme slugy vrátia 404.
- **Odkaz „Moje testy" v hlavičke a stĺpec „Platforma" v päte** pre prihlásených používateľov.
- **Nový autentifikovaný workspace** na `/app` s prehľadom a navigáciou.
- **Dashboard na `/app`** — štyri prehľadové karty (aktívne testy, sedenia, respondenti, miera dokončenia).
- **Moja história** (`/app/history`) — časová os testov a sedení s filtrami.
- **Moje testy** (`/app/tests`) — prehľad s vyhľadávaním, filtrom podľa stavu a rýchlymi akciami.
- **Sprievodca novým testom** (`/app/tests/new`) — štvorkrokový wizard; po publikovaní dostaneš verejný odkaz `/t/<id>`.
- **Detail testu** (`/app/tests/<id>`) — editor s tabmi *Výsledky / Analytika / Nastavenia* a dialógom *Zdieľať*.
- **Šablóny testov** (`/app/templates`) — knižnica predpripravených šablón s vyhľadávaním a filtrom.
- **Skupiny respondentov** (`/app/audiences`) — tagované cohorty; hromadný import e-mailov zatiaľ vypnutý (*Pripravujeme*).
- **Knižnica otázok pre tvorcov testov** (`/app/library`) — read-only prehliadač s hľadaním a filtrami.
- **Detail sady odpovedí** (`/app/sets/$setId`) — read-only náhľad so správnymi a nesprávnymi odpoveďami.
- **Účet** (`/app/account/*`) — úprava profilu, politika hesla a zoznam aktívnych sedení.
- **Dvojfaktorové overenie (2FA) pre tvoj účet** cez ľubovoľný autentifikátor, so záložnými kódmi.
- **Tímy, notifikácie a centrum pomoci** v `/app`.
- **GDPR žiadosť priamo v aplikácii** (`/app/legal/dsr`) — prístup, oprava, výmaz, obmedzenie, portabilita aj námietka; odpovedáme do 30 dní. Cookie banner sa raz znova zobrazí.
- **Prihlasovacia stránka** na `/login` — e-mail + heslo, vstup do `/app`.
- Možnosť **podporiť projekt** jednorazovo alebo mesačne; faktúru dostaneš e-mailom, odber zrušíš kedykoľvek v Stripe portáli.
- Stránka **O projekte** — cieľ, prečo sponzorship a kam idú peniaze.
- Verejný **zoznam sponzorov**, ktorí zaškrtli súhlas so zverejnením mena; anonymita je default.
- Stránka **Spravovať podporu** — magic-link na Stripe portál pre prípad straty potvrdzujúceho e-mailu.
- Verejný changelog (táto stránka).
- **6 ďalších školení** (AI a deepfake, QR/quishing, krádež kont, nábor do práce, fyzické podvody, ochrana seniorov a detí) — spolu **14 školení**.
- **Demografické testy** — *Žiaci do 16*, *Študenti*, *Seniori* a *Všeobecný test*, každý s primeraným výberom otázok.
- **Filter kategórií** na stránke *Školenia* (phishing, scenáre, URL).
- **FAQ sekcia** na úvodnej stránke o teste, anonymite a podpore.
- **Úvodný titulok výsledku sa prispôsobuje skóre** — motivačný pri slabšom, pochvalný pri vysokom.
- **15 nových otázok** pre konkrétne odvetvia a vekové skupiny.
- **20 nových otázok pre rozpoznávanie legitímnych SMS** od pošty, bánk a úradov — aby si neodignoroval dôležité doručenie.
- **13 nových otázok pre konkrétne odvetvia** — e-shopy, gastro, autoservisy, pneuservisy a IT/dev.
- **30 nových otázok typu „vyzerá podozrivo, ale je legit"** — učia rozoznať, kedy je urgentný tón naozaj legitímny.
- Stránka **Kontakt** s priamym e-mailom a 6 prednastavenými témami; odpovedáme do 2 pracovných dní.
- **Education mode** — autori edu testov môžu zbierať odpovede s menom a e-mailom a chrániť výsledky heslom; kontrolórom údajov je autor, my len sprostredkovateľ.
- **Edu mód v editore testov** — prepínač zberu odpovedí s heslom autora; po vytvorení potvrdzovacie okno s linkmi a heslom, ktoré treba odkliknúť.
- **Respondent intake pred edu testom** — meno, e-mail a explicitný GDPR súhlas, s disclosure o autorovi a 12-mesačnej retencii.
- **Dashboard výsledkov pre autora edu testu** — súhrnné štatistiky a tabuľka respondentov so zoradením, vyhľadávaním a CSV exportom so slovenskou diakritikou.
- **Stránka „Pre školy a vzdelávacie inštitúcie"** ([/skoly](skoly)) — návod, GDPR roly, retencia, vzor e-mailu a FAQ.

### Zmenené
- **Používateľská doména napojená na živú databázu** — stránky `/app/*` čítajú a zapisujú produkčné dáta; každý vidí iba svoje.
- **Identifikácia prevádzkovateľa** — projekt teraz vystupuje ako am.bonum s. r. o.; cookie banner sa znova zobrazil.
- **Súkromie** — pridaná sekcia *Education mode* (roly, 12-mesačná retencia); cookie banner sa znova zobrazí.
- **Texty na O projekte, Cookies a Súkromie o trackingu** — analytika a marketing sa zapnú iba so súhlasom.
- V hlavičke pribudol odkaz **Podporiť projekt**; v päte **Sponzori**, **Zmeny** a **Kontakt**.
- Firemné testy presunuté na kratšie **`/testy/...`**; staré linky redirectujú.
- Projekt presťahovaný na vlastnú doménu **subenai.sk**.

### Opravené
- Po dokončení jedného testu sa pri kliknutí na iný niekedy zobrazil starý výsledok — teraz každý test začne čisto od prvej otázky.

## [1.4.0] — 2026-04-26
### Zmenené
- **Premenovanie projektu z internetiq na subenai** — nové logo, favicon a doména; obsah a funkcionalita bez zmeny.

## [1.3.0] — 2026-04-25
### Pridané
- **Testy pre konkrétne odvetvia** — e-shop, gastro, autoservis, IT vývoj, verejné služby; každý s vlastným výberom otázok a hranicou.
- **Stovka nových otázok** — phishing, smishing, vishing, marketplace podvody, BEC, investičné podvody, romance scams.
- **8 nových školení** pod sekciou *Školenia* (predtým *Kurzy*) s rozpisom, ako podvody vyzerajú a ako sa brániť.

### Zmenené
- Úvodná stránka prepísaná pre prvý dojem: *„Zistíš, či by si prežil."*

## [1.2.0] — 2026-04-20
### Pridané
- **Detailný review tvojich odpovedí** po teste — pri každej otázke tvoja odpoveď, správna odpoveď a vysvetlenie.
- **Voliteľný prieskum** po teste; nič nie je povinné, môžeš odoslať aj prázdny formulár.
- **Edukatívny popup** po výsledku, ktorý ťa vyzve „vyplniť" citlivé údaje a hneď vysvetlí, prečo to bola past; nič neopustí tvoj prehliadač.
- **Zdieľanie výsledku** cez sociálne siete bez tracking pixelov — len obyčajné odkazy.

## [1.1.0] — 2026-04-15
### Pridané
- **Skóre, percentil a archetyp osobnosti** po dokončení testu.
- **Zdieľateľný odkaz** na tvoj výsledok cez krátky kód — nikoho neidentifikuje.
- **Cookie consent** so 4 kategóriami (nutné, predvoľby, analytika, marketing); default: nič mimo nutných.
- Stránky **Súkromie** a **Cookies** so zoznamom, čo spracúvame, ako dlho a na akom právnom základe.

## [1.0.0] — 2026-04-10
### Pridané
- Prvé verejné spustenie: 15-otázkový test rozpoznávania scam-ov a phishingu, anonymne, bez registrácie.
