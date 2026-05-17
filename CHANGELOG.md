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
