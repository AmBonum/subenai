# Changelog

Verejný zoznam zmien projektu subenai. Píšeme ho pre používateľov a sponzorov,
takže nájdeš tu len to, čo má vplyv na to, čo vidíš a používaš — bez interných
detailov, ciest k súborom alebo technického žargónu.

Formát vychádza zo [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/).
Verzie idú od najnovšej. Drobné úpravy textov a interné práce neuvádzame.

## [Unreleased]

### Bezpečnosť
- **Forenzný záznam zmien v otázkach testu sa už ukladá automaticky.**
  Po nedávnom security audite sme zistili, že keď autor v detaile testu
  pridá, odoberie alebo zmení poradie otázok, do nášho interného
  auditového logu (`/admin/audit`) sa síce ukladalo „autor publikoval
  test" alebo „autor zmenil heslo" — ale **nie** jednotlivé zmeny
  v zozname otázok. To si všíma iba operátor pri formálnej GDPR / DPO
  inquiry, no audit log má povinnosť byť úplný. Pridali sme Postgres
  trigger, ktorý každé pridanie / odobranie / zmenu otázky v teste
  zapíše ako samostatný auditový riadok (kto, kedy, ktorá otázka, aká
  operácia) — bez akejkoľvek zmeny kódu na strane klienta. Trigger beží
  pod identitou autora, takže ak by sa niekedy frontend nedal nahradil,
  záznam tak či tak prejde.
- **Interný observability fix:** nesprávne podpísané respondentské
  cookie sa už nezamieňa s prvonávštevou (T1 v threat-model audite).
  Funkčne pre používateľa nič nemení — keď cookie je sfalšovaný,
  systém ho odmietne ako predtým a ukáže výzvu zadať heslo. Iba sa
  v audit-log toku odlišujú dve podozrenia: „nikdy nezadal heslo"
  vs „cookie bol sfalšovaný" — druhá kategória teraz vyvolá ops
  pozornosť pri pravidelnom audite.

### Pridané
- **Jednotný dizajn potvrdzovacích dialógov v admin paneli.** Doteraz
  niektoré nezvratné akcie (napr. *Anonymizovať DPA žiadosť*) používali
  default browserový `confirm()` — sivý systémový popup bez ikony,
  bez farby podľa závažnosti a s neutralným tlačidlom. Od dnes každý
  potvrdzovací dialóg v `/admin` prechádza cez vlastný `ConfirmDialog`
  so štyrmi úrovňami závažnosti: *info* (modrá), *warning* (oranžová),
  *destructive* (červená — pre nezvratné akcie ako anonymizovať /
  vymazať / zmazať) a *success* (zelená — pre potvrdenie / vyriešenie).
  Každá úroveň má vlastnú ikonu a farbu potvrdzovacieho tlačidla, aby
  admin na prvý pohľad videl, či ide o sanity-check alebo o nezvratnú
  operáciu. Pre kritické PII akcie (napr. hard-delete používateľa)
  navyše musí admin pred potvrdením doslovne napísať e-mail cieľového
  používateľa — jeden preklep nestačí na nezvratnú akciu na inom
  účte. Pridali sme aj CI kontrolu, ktorá zabráni regresii: žiadny
  nový kód v `/admin` nesmie použiť `window.confirm` / `alert` /
  `prompt`.
- **Nový admin dossier `/admin/users/<id>` — splní Art. 15 / 17 GDPR jedným klikom (E46.3 MVP).**
  V admin paneli na `/admin/users` pribudla na každom riadku ikona
  *Otvoriť GDPR dossier* (ikona zvitku). Klikom otvoríš stránku
  s kompletným prehľadom všetkých GDPR-relevantných údajov o danom
  používateľovi: identita + role (z `profiles` + `profile_preferences`
  + `user_roles`) a história GDPR (DSR + DPA žiadosti). Action toolbar
  ponúka tri akcie: *Stiahnuť Art. 15 JSON* (okamžitý JSON snapshot
  pre právo na prístup), *Anonymizovať PII* (NULL-ne meno + e-mail
  + kontaktné údaje, štatistické riadky ostávajú — pre splnenie
  Art. 17 ods. 3 písm. b GDPR), *Vymazať natvrdo* (úplne odstráni
  používateľa cez `auth.users` CASCADE). Tlačidlo *Vymazať natvrdo*
  vyžaduje typed-confirm — admin musí napísať e-mail používateľa
  presne, inak je tlačidlo neaktívne. Po potvrdení sa vymazanie
  zaradí do 5-minútovej fronty — počas tohto okna sa zobrazí
  červený banner *Čaká sa na vymazanie* s tlačidlom *Zrušiť*,
  ktoré rollne operáciu späť. Hard delete navyše overí, či
  používateľ nemá aktívnu sponzorskú Stripe subscription
  (vtedy zlyhá s jasnou hláškou — operátor musí najprv zrušiť
  v Stripe). Toto je MVP — ďalšie sekcie dossier-a (quiz activity,
  engagement, financial, audit timeline) prídu vo follow-up fázach
  E46.4–E46.7.
- **Interná infraštruktúra pre admin GDPR fulfilment (E46.1).** Pribudli
  tri databázové funkcie, ktoré pripravia pôdu pre nový dossier
  `/admin/users/<id>` (príde v ďalších fázach E46.2–E46.7):
  `export_user_data_admin` (admin variant Art. 15 exportu, vráti JSON
  o cieľovom userovi), `erase_user_data` (Art. 17 fulfilment so
  stratégiou *anonymizovať* alebo *zmazať natvrdo* — druhé čaká 5
  minút v queue cez novú tabuľku `pending_erasures` aby sa stihol
  cancel pri preklepe), `cancel_pending_erasure` (rollback počas
  toho 5-minútového okna). Hard delete najprv overí, či používateľ
  nemá aktívnu sponzorskú Stripe subscription (vtedy zlyhá s jasnou
  hláškou — operátor najprv musí zrušiť v Stripe dashboard). Žiadne
  UI v tejto verzii — tieto sú interné stavebné kamene.
- **Pozvánky cez e-mail z platformy — pripravujeme.** Na detaile testu
  (`/app/tests/<id>` → tlačidlo *Pozvánky e-mailom*) sa od dnes zobrazuje
  nová akcia s odznakom *Pripravujeme*. Tlačidlo je zatiaľ neaktívne; po
  nabehnutí myšky alebo focusom uvidíš tooltip *„Túto funkciu práve
  pripravujeme — bude dostupná čoskoro. Zatiaľ pošli respondentom share
  link manuálne — funguje to úplne rovnako."* Funkcionalita je hotová
  na strane infraštruktúry (templát e-mailu z `pozvanky@subenai.sk`,
  server endpoint s 3-vrstvovou rate-limit ochranou — 50 pozvánok/deň/autor,
  50/deň/test, 50/h/IP — a auditný záznam s PII-stripped recipient hashom).
  Zatiaľ sa nezaväzujeme či pôjde o platenú funkciu alebo bude voľne
  dostupná — to oznámime, keď tlačidlo zaktivnime.
- **Vysvetľujúce panely v admin konzole.** Na každej z 20 podstránok
  v `/admin` (Prehľad, Testy, Otázky, Používatelia, GDPR žiadosti,
  Nastavenia, Bezpečnosť…) je teraz zložiteľný info panel pod hlavičkou
  stránky. Otvoríš ho jedným klikom a vnútri uvidíš: čo sa na tej
  podstránke nastavuje, aký časový dopad majú zmeny (okamžité vs. cache
  5–60 min vs. vyžaduje redeploy), na čo si dávať pozor (RLS, jednosmerné
  operácie, build-time flagy), a odkazy na pripravovanú dokumentáciu.
  Stav (rozbalené/zbalené) si panel pamätá per stránka v prehliadači.
  Obsah je k dispozícii v slovenčine, angličtine aj češtine.

## [1.14.1] — 2026-05-21

Drobný patch release zameraný na produkčný incident s `/schools/dpa`
formulárom počas deploy-ov.

### Opravené
- **Formulár na `/schools/dpa` už nepovie „zlyhalo", keď žiadosť reálne
  prešla.** Ak si na stránku prišiel/a ešte pred posledným deployom a
  formulár si odoslal/a až po ňom, prehliadač mohol mať v cache starú
  verziu nášho PDF rendereru — server tvoju žiadosť úspešne uložil
  (admin ju vidí v queue, operátor ti ju vie poslať jedným kliknutím),
  ale tvoj prehliadač nevedel chunk dotiahnuť a ukazoval ti červenú
  hlášku *„Vyhotovenie DPA zlyhalo"*. Po novom v presne tejto situácii
  uvidíš oranžovú kartu *„Žiadosť je v rade — PDF ti pošleme"*, ktorá
  vysvetlí čo sa stalo + tlačidlo *Obnoviť stránku a skúsiť znova*.
  Iné typy chýb (skutočný server fail, sieť padla) ostávajú červené.

## [1.14.0] — 2026-05-21

Veľký GDPR/governance release. Doteraz boli dve veci, ktoré sme robili
ručne cez e-mail alebo SQL — žiadosť o spracovateľskú zmluvu (DPA) zo
školy a interný audit GDPR žiadostí — teraz fungujú samé od seba.
Plus séria menších vylepšení pre tých, čo si robia vlastné edu testy
(grafy, filtre, PDF export, stiahnutie tvojich údajov).

### Pridané
- **Heslo pre tvoj test — chráň ho pred zvedavými očami.** Na detaile
  testu (`/app/tests/<id>` → Nastavenia) je nová karta *Heslo pre
  respondentov*. Klikneš *Nastaviť heslo*, zadáš ho dvakrát (min. 8
  znakov) a každý, kto otvorí share link, musí ho najprv zadať, aby
  mohol test vyplniť. Existujúce relácie sa po zmene hesla zneplatnia
  (autor zmenil heslo → respondent dostane výzvu zadať nové). Heslo
  kedykoľvek zmeníš alebo zrušíš (vtedy je test opäť otvorený cez link
  ako predtým). Po prekročení 5 nesprávnych pokusov z jednej IP počas
  15 minút sa pokusy zablokujú; v deň po 200 nesprávnych pokusoch
  spolu sa test uzamkne pre celý zvyšok dňa — chráni pred slovníkovými
  útokmi aj pri slabšom hesle. Heslo nikdy neopustí databázu —
  ukladáme len bcrypt hash, hash nedostáva ani autor späť na klient.
  Každý úspešný aj neúspešný pokus zaznamenávame do auditového logu
  bez ukladania samotného hesla (len hash IP) — DPO nájde údaje aj
  pri prípadnej inquiry.
- **`/admin/settings` ukazuje skutočný stav GDPR konfigurácie.** Doteraz
  to bol placeholder formulár so žltým upozornením „backend dorobíme
  v ďalšej iterácii". Teraz tam admin vidí: či je DPA tok zapnutý alebo
  vypnutý, či sa PDF generuje s draft vodoznakom (a *prečo* je dôležité
  ho nechať zapnutý kým právnik neodklepne v1.0), aktuálnu verziu
  šablóny, retenciu kontaktných údajov (12 mesiacov) a celý zoznam
  sub-procesorov podľa čl. 28(3)(g) GDPR. Pri každom riadku je presná
  cesta k env premennej alebo SQL migrácii, ktorá ho riadi — žiadne
  hádanie kde sa to dá zmeniť. Tlačidlo *Otvoriť E40 runbook* otvára
  presný postup zmeny na GitHube. Hodnoty sú vedome read-only:
  flipnutie vodoznaku alebo verzie šablóny musí prejsť cez deploy
  log (audit trail), nie cez kliknutie v admin paneli.
- **Export CSV pre žiadosti GDPR (DSR) aj DPA žiadosti + vyhľadávanie
  v DSR fronte.** V admin paneli na `/admin/dsr` aj `/admin/dpa-requests`
  pribudlo tlačidlo *Export CSV* — vyexportuje aktuálne odfiltrovanú
  vzorku (BOM + RFC 4180 escape, takže Excel správne zobrazí slovenské
  znaky aj polia s čiarkami či úvodzovkami). Auditovateľne pre GDPR
  čl. 30 (záznamy o spracovateľských činnostiach) a čl. 28 ods. 9
  (písomné dohody so sprostredkovateľmi). V DSR fronte pribudlo aj
  vyhľadávanie podľa e-mailu alebo poznámky — predtým bolo len v
  DPA fronte.
- **DPA žiadosti v admin paneli a v prehľade.** Žiadosti o spracovateľskú
  zmluvu (DPA) zo `/schools/dpa` teraz vidíš priamo z bočného menu admin
  konzoly — pribudla položka *DPA žiadosti* (a popri nej *Žiadosti
  GDPR*, ktorá doteraz tiež nemala odkaz v menu). Na hlavnej dashboard
  stránke `/admin` pribudla dlaždica *Otvorené DPA*, ktorá ukazuje
  počet žiadostí so statusom *Čaká na vybavenie* alebo *Doručené* —
  rovnaký princíp ako *Čakajúce DSR* vedľa nej. V riadku každej DPA
  žiadosti je nové tlačidlo *Stiahnuť PDF*, ktoré v prehliadači
  okamžite vyrobí znova presne to isté PDF, čo dostala škola pri
  podaní (vrátane pôvodného dátumu — kvôli auditovateľnosti podľa
  čl. 28 ods. 9 GDPR), bez akéhokoľvek e-mailu navyše.
- **Úprava otázok a náhodné poradie v detaile testu — `/app/tests/<id>`.**
  V detaile už hotového testu pribudla záložka *Otázky*, kde môžeš
  pridať, odobrať alebo pretiahnuť poradie otázok bez toho, aby si test
  musel/a vytvárať nanovo. V *Nastaveniach* je nová sekcia *Poradie
  otázok* s prepínačom *Pevné* / *Náhodné*. Pri voľbe *Náhodné* každý
  respondent dostane vlastné poradie (rovnaký človek pri obnovení
  stránky uvidí to isté poradie — anti-cheat proti zdieľaniu
  screenshotov), no skóre nie je nijako ovplyvnené. Ak sa pokúsiš
  odstrániť otázku, na ktorú už niekto odpovedal, dostaneš jasnú
  hlášku — historické odpovede sa nikdy nestratia. Editor pamätá aj
  pôvodnú šablónu, z ktorej si test forkol/a (prejaví sa v ďalšej fáze
  ako breadcrumb *Z šablóny*).
- **Automatizovaný DPA tok pre školy — `/schools/dpa`.** Doteraz „Napíš
  nám — dostaneš DPA do 1 pracovného dňa" otváral e-mailového klienta
  a operator ručne posielal PDF. Teraz na `/schools` klikneš na zelený
  pill *Napíš nám — dostaneš DPA do 1 pracovného dňa*, dostaneš sa na
  krátky formulár (meno, e-mail, názov školy + GDPR súhlas + Cloudflare
  Turnstile), klikneš *Vyhotoviť DPA* a PDF sa stiahne okamžite.
  Kópiu posielame aj na zadaný e-mail. Šablóna pokrýva všetkých 11
  povinných klauzúl čl. 28(3) GDPR (slovenský preklad podľa Zákona č.
  18/2018 Z.z.), príloha A so zoznamom kategórií údajov, príloha B s
  technicko-organizačnými opatreniami a kompletným zoznamom
  sub-procesorov. Kontaktné údaje (meno, e-mail) sa po 12 mesiacoch
  automaticky anonymizujú; názov školy a verzia DPA ostávajú pre
  štatistiku. Operator vidí všetky žiadosti v `/admin/dpa-requests`
  vrátane stavu doručenia e-mailu, znovu-poslania a manuálnej
  anonymizácie. **Tok je za feature flagom** — kým neprejde právnym
  auditom, vygenerované PDF nesie diagonálny vodoznak „DRAFT —
  NEZAVÄZUJÚCA UKÁŽKA · NEPODPISOVAŤ". Verzie šablóny sledujeme
  cez stĺpec `dpa_version` pre účely čl. 28 ods. 9 GDPR.
- **Pripoj si edu testy k svojmu účtu — nová sekcia *Moje edu testy*
  v `/app/edu-tests`.** Edu test, ktorý si vytvoril/a anonymne (cez
  composer + autorské heslo), teraz vieš trvalo pripojiť k svojmu
  prihlásenému účtu. Ako: prihlás sa, otvor stránku výsledkov svojho
  testu, zadaj heslo — pri úspešnom overení sa test automaticky
  pripojí. V `/app/edu-tests` máš zoznam všetkých takto pripojených
  edu testov s počtom respondentov a priamym odkazom na ich výsledky.
  Ak si pôvodne test vytvoril/a anonymne a nikdy si si ho nenárokoval/a,
  ostane verejne dostupný cez share link aj naďalej — pripojenie
  nemení žiadne práva, len ti uľahčí prístup z hlavného menu. Test
  bez majiteľa môže nárokovať len ten, kto pozná autorské heslo,
  takže nárokovanie nie je zneužiteľné.
- **PDF export výsledkov tvojho edu testu.** Vedľa tlačidla *Stiahnuť
  CSV* a *Stiahnuť JSON* je teraz aj *Stiahnuť PDF*. Vygeneruje sa
  tlačiteľný A4 dokument s názvom tvojho testu, súhrnnými štatistikami,
  distribúciou skóre a tabuľkou respondentov — vrátane viditeľnej
  GDPR poznámky a čísla strany v päte (vhodné na odovzdanie tlačenej
  kópie HR alebo vedeniu školy). Ak máš na tabuľke nastavené filtre
  (napr. *Iba vyhoveli* alebo skóre 70–90), PDF zachytí presne tú
  zúženú vzorku — v hlavičke uvidíš riadok *Aktívne filtre: …* a nad
  tabuľkou *Zobrazené N z M (zúžené filtrom)*. PDF generujeme priamo
  v tvojom prehliadači (~500 KB knižnica sa stiahne len pri prvom
  kliknutí na PDF), takže meno a email respondentov neopúšťajú tvoje
  zariadenie navyše voči normálnemu spracovaniu.
- **Grafy na stránke výsledkov tvojho edu testu.** Tabuľka respondentov
  na `/test/builder/<id>/results` má teraz vedľa zoznamu aj rýchle
  vizualizácie: stĺpcový graf distribúcie skóre (rovnaké štyri pásma
  ako v Súhrnných štatistikách), donut „Vyhovel / Nevyhovel" s počtami
  a legendou, a stĺpcový graf doby vyplnenia (do 2 minút / 2–4 / 4–6 /
  6+ minút). Pre čítače obrazovky každá karta obsahuje krátky textový
  popis — slepý/-á respondent/ka si neprečíta SVG, ale dostane všetky
  čísla v jednej vete.
- **Filtre na stránke výsledkov tvojho edu testu.** Tabuľka respondentov
  na `/test/builder/<id>/results` má teraz panel filtrov — môžeš si
  zobraziť iba tých, ktorí vyhoveli (alebo iba tých, ktorí nevyhoveli),
  zúžiť rozsah skóre, alebo vybrať dátumový interval kedy test
  vyplnili. Filtre fungujú spolu (logické AND), počet aktívnych filtrov
  vidíš v chip-e nad tabuľkou, tlačidlo *Vymazať filtre* obnoví
  pôvodný pohľad. Nastavený stav je súčasťou URL, takže ak pošleš
  niekomu link s `?pass=yes&scoreMin=80`, otvorí presne ten istý
  zúžený výber. Žiadne nové cookies ani ukladanie — všetko žije iba
  v adrese stránky.
- **Šablóny v `/app/templates`: pribudla tvoja vlastná knižnica.** Predvolené
  šablóny vidíš stále, ale teraz si môžeš vytvoriť svoju kópiu, upraviť ju
  a vymazať — a to bez ovplyvnenia ostatných používateľov. Verejné odosielanie
  vlastných šablón a admin schvaľovanie príde v ďalšej aktualizácii.
- **Odoslať vlastnú šablónu na zverejnenie (Creative Commons CC BY 4.0).** Na
  každej *tvojej* šablóne pribudla položka *Odoslať na zverejnenie* v menu
  akcií. V dialógu si potvrdíš autorstvo, vyberieš vekové ohraničenie a dáš
  výslovný súhlas s licenciou CC BY 4.0. AI moderátor (Anthropic Claude
  Haiku) tvoju šablónu okamžite skontroluje na bezpečnosť, vulgarizmy
  a copyright vlajky; verdikt vidíš v dialógu do 1–3 sekúnd. Schválené
  šablóny sa objavia vo verejnej knižnici po ručnom potvrdení administrátorom
  — ručná moderátorská fronta a verejná galéria `/sablony` prídu v ďalších
  aktualizáciách.
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

### Opravené
- **Zdieľanie výsledku po custom teste už neukazuje „Výsledok neexistuje".**
  Keď respondent v edukačnom režime dokončí test, tlačidlo *Pošli kamošovi*
  teraz zdieľa pozvánku na ten istý test (nie odkaz na konkrétny výsledok
  s osobnými údajmi) — kamoš si tak môže test sám prejsť a porovnať skóre.
  Verejný scam quiz funguje bez zmeny.

## [1.13.0] — 2026-05-20

Drobnejší vizuálny release zameraný na Akadémiu (blog) a mobilné
rozlíšenia. Hlavná oprava: rozbaľovací zoznam sprievodcov na Akadémii
sa po kliknutí netváril, že niečo robí — vnútri to stav prepínalo, ale
karty ostávali viditeľné v oboch stavoch. Plus séria menších mobilných
opráv: dlhý titulok sekcie už nepretekal off-screen, filter kategórií
na mobile nemá útrpný horizontálny scroll a stránky *Cookies* aj
*Ochrana osobných údajov* sa konečne zmestia do 320 px obrazovky bez
horizontálneho posúvania.

### Zmenené
- **Akadémia — sekcia sprievodcov má nové meno.** Doteraz sa volala
  *„základní sprievodcovia"*, čo znelo začiatočnícky a nepovedalo, čo
  v nej čaká. Nové meno *„sprievodcovia digitálnou bezpečnosťou"* je
  presnejšie a uľahčuje nájsť stránku cez vyhľadávač.
- **Akadémia — pri vyhľadávaní sa sekcia článkov premenuje.** Predtým
  si pri zadaní `phishing` videl/a *„najnovšie články"* — zavádzajúce,
  lebo zoznam ukazoval iba zhody. Po novom *„výsledky pre „phishing""*
  + počet nájdených článkov pod ním.
- **Akadémia — filter kategórií na mobile sa už nescrolluje vodorovne.**
  Predtým bolo 13 chipov v takmer neviditeľnom horizontálnom scrollbare
  (iOS ho úplne skrýva). Po novom vidíš *Všetko* + 3 najpopulárnejšie
  kategórie a tlačidlo *„ďalšie kategórie (10)"* rozbalí zvyšok. Na
  desktope sa nič nemení — všetky chipy ostávajú viditeľné.

### Opravené
- **Akadémia — rozbaľovací zoznam sprievodcov sa po kliknutí konečne
  otvára a zatvára vizuálne.** Stav sa síce technicky prepínal (šípka
  rotovala), ale karty ostávali viditeľné v oboch stavoch — kliknutie
  *„nič nerobilo"*. Po novom kliknutie naozaj skryje alebo ukáže karty.
- **Akadémia — nadpis sekcie a počet sprievodcov sa na úzkych
  obrazovkách rozložia na dva riadky.** Doteraz dlhý nadpis vedľa
  *„11 hĺbkových sprievodcov"* pretekal mimo viewport doprava.
- **Cookies a Ochrana osobných údajov sa zmestia do 320 px obrazovky.**
  Tabuľka kategórií cookies predtým rozšírila celú stránku doprava —
  text nadpisov a paragrafov sa rezal mimo obrazovky. Po novom má
  tabuľka vlastný horizontálny scroll, zvyšok stránky sedí.

## [1.12.0] — 2026-05-20

Veľký súborný release: tvorba testov dostala kratšiu adresu a oveľa
prehľadnejší editor, autori edukačných testov vidia konkrétneho
respondenta s celým priebehom v jednom modáli, `/app` je responzívny
od 320 px a máme nový samoobslužný export tvojich údajov podľa GDPR.
Plus prevádzková transparentnosť — verejný register transferov na
charitu, politika automatickej anonymizácie neaktívnych free-tier
účtov a rešpekt voči *Do Not Track* / *Global Privacy Control*
signálom z prehliadača.

### Pridané
- **Stiahnutie tvojich údajov (GDPR čl. 15 / čl. 20).** Na *Môj profil*
  (`/app/account/profile`) je nová karta *Stiahnutie tvojich údajov*.
  Kliknutím dostaneš JSON snapshot všetkého, čo o tebe evidujeme —
  profil, GDPR žiadosti a poznámky k anonymným testom. Strojovo
  čitateľné, hotovo do pár sekúnd, bez čakania na operátora. Pokrýva
  *právo na prístup* (čl. 15) aj *právo na prenosnosť* (čl. 20 GDPR).
- **Transparentnostný register transferov.** Nový verejný JSON
  (`/transparency.json`) obsahuje politiku darovaní (10 % z čistých
  sponzorských príjmov ide na *Nadáciu Slniečka*, ročný cyklus) a
  zoznam reálnych transferov — kontrolovateľný kýmkoľvek bez nás.
  Aktuálne obsahuje politiku a prázdny zoznam, ktorý začneme dopĺňať
  od konca roka 2026.
- **Detail jedného respondenta v dashboarde edukačných testov.**
  Klikom na respondenta v *Výsledkoch* edu testu sa otvorí modál s
  celým priebehom: otázka po otázke, jeho odpoveď, správna odpoveď,
  kategorizácia (silná / slabá oblasť) a čas strávený na otázke.
  Predtým si videl/a len agregát — teraz vidíš presne, kde konkrétny
  študent zaváhal a o čom sa s ním porozprávať.
- **Politika retencie pre free-tier účty.** Účty, ktoré sa neprihlásili
  12 mesiacov, dostanú e-mail s upozornením; po ďalších 30 dňoch sa
  ich profil a respondentské PII automaticky anonymizujú (skóre a
  agregáty zostávajú pre štatistiku, mená, e-maily a IP adresy
  zmiznú). Beží to denne, aby sme zbytočne nedržali staré osobné
  údaje. Detaily v *Ochrane osobných údajov*, sekcia *Doby uchovávania*.
- **Rešpekt voči *Do Not Track* a *Global Privacy Control*.** Keď má
  tvoj prehliadač zapnutý ktorýkoľvek z DNT/GPC signálov, Google
  Analytics sa nezapne ani vtedy, keby si v cookie dialógu označil/a
  *Analytika*. Tvoja voľba v prehliadači má prednosť — doteraz sme to
  síce deklarovali, ale kód signál nečítal.

### Zmenené
- **Tvorba testov dostala kratšiu adresu a redizajnovaný editor.**
  Stránka pre tvorbu vlastných testov sa presunula z `/test/zostav`
  na `/test/builder` (staré odkazy automaticky presmerujú). Editor
  sa zbalil — namiesto rolovania cez 6 sekcií máš teraz prehľadný
  formulár, ktorý sa rozbaľuje podľa potreby. Nové vstupné texty
  vysvetľujú jasnejšie, *prečo* edu mód existuje a *kedy* ho zapnúť.
- **`/app` je teraz plne responzívny od 320 px.** Predtým sa pri
  úzkych šírkach (telefóny v portrét móde) sidebar, dashboard karty
  a niektoré tabuľky lámali. Po novom všetky `/app` plochy fungujú
  rovnako dobre na mobile ako na desktope. Plus drobné vylepšenia
  hlavičky a sidebaru — kompaktnejšie odznaky, lepšia hierarchia.
- **CSV export edu výsledkov má teraz GDPR hlavičku.** Súbor začína
  metadátami (názov testu, autor, dátum exportu, doba uchovávania,
  kontakt na DPO) — ak dáta posielaš tretej strane, hlavička robí
  jasno, čo s nimi smie. Plus dialóg *Zdieľať* publikovaného edu
  testu je prístupný kedykoľvek z detailu testu (predtým len pri
  vytvorení) a triedenie respondentov má stabilný sekundárny kľúč,
  takže pri rovnakom skóre neskáču poradia medzi kliknutiami.
- **Akadémia — prehľadnejšie filtrovanie a navigácia.** Filter podľa
  pilieru a kategórie sme zlúčili do jedného pruhu hore, zoznam
  pilierov sa dá zbaliť, aby nesťahoval pozornosť od článkov. Tlačidlo
  *Kopírovať odkaz* funguje aj v prehliadačoch, ktoré natívne API
  blokujú (predtým vyskočilo prompt-okno; teraz dostaneš pekné
  vyskakovacie upozornenie s kopírovateľným textom).
- **Konfirmačné dialógy v tvorbe testov a edukačnom móde sú dizajnované.**
  Predtým sme pri zmazaní otázky alebo respondenta zobrazovali
  defaultný prehliadačový `confirm()`, ktorý vyzeral cudzo. Teraz je
  to dizajnovaný dialóg s jasnou hierarchiou (čo sa zmaže, či sa to
  dá vrátiť, kontrastný *Zmazať* button).
- **Hlavička a odhlásenie.** Hlavička dostala vizuálnu kalibráciu
  (lepšie odsadenia, kompaktnejšie odznaky pre jazyk a profil). Po
  odhlásení sa zobrazí krátka *„Odhlásený, dovidenia"* toast
  notifikácia — predtým si len skončil/a na home bez spätnej väzby.
- **Cookie banner sa znova zobrazí (verzia súhlasu 1.5.0 → 1.6.0).**
  Doplnili sme do *Cookies* tabuľky explicitné riadky pre UI predvoľby,
  ktoré sme doteraz síce ukladali, ale neuviedli (stav postranného
  panelu, rozbalené piliere na blogu, voľba jazyka, atď. — jazyk pod
  kategóriou *Nevyhnutné* ako ePrivacy výnimka, ostatné pod
  *Predvoľby*). Bez súhlasu s *Predvoľbami* ti UI naďalej funguje,
  len si pri ďalšej návšteve treba znova vybrať.

### Opravené
- **`/test/builder/<id>` ukazoval editor namiesto výsledkov.** Kto si
  uložil link na výsledky publikovaného edu testu, po prerouting-u
  videl prázdny editor namiesto dashboardu. Opravené — link teraz
  smeruje správne na *Výsledky*.
- **404 stránka ukazovala technické kľúče.** V niektorých prípadoch
  sa namiesto preloženého textu zobrazili interné identifikátory ako
  `notFound.title`. Opravené, vždy sa zobrazí slovenský text.
- **Klikateľnosť pilierov v Akadémii.** Klik na pilier v zbalenom
  zozname niekedy nereagoval. Opravené.

## [1.11.1] — 2026-05-20

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
## [1.11.0] — 2026-05-19

Refresh dvoch oblastí pre senior vyzretosť: stránka *Pre školy* sa
zmenila z dlhého prozaického návodu na konverzný landing s
persona-segmentáciou, a všetky právne stránky (`/privacy`, `/cookies`)
dostali navigáciu *Obsah* po pravej strane a viditeľnejšiu cestu k
uplatneniu GDPR práv. Plus chytrejšia 404 stránka, ktorá neponúkne
len tlačidlo *„Späť na domov"*, ale priamo navrhne kam si pravdepodobne
išiel/išla.

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

## [1.10.0] — 2026-05-19

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

## [1.9.0] — 2026-05-19

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
  audience oproti slovenskému priemeru. Agregáty sa zobrazia len pri
  dostatočnom počte respondentov v kohorte (aby sa nikto nedal spätne
  identifikovať). Žiadne osobné údaje nikdy nepoužité.
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
- Dvojitá hlavička na `/app` (renderovala sa dvakrát).
- Krátky prázdny render na `/auth/reset-password` po načítaní odkazu
  z e-mailu.
- Nefunkčný *Preview* button pri šablónach (dočasne zakázaný).

### Zmenené
- Logo v hlavičke sa pri stredných šírkach zmenšuje na `S` ikonu —
  mega-menu zaberá viac priestoru než pôvodná navigácia.
- Prepínač jazyka dočasne skrytý. Slovenčina je predvolený jazyk;
  ostatné jazyky vrátime neskôr.

## [1.8.0] — 2026-05-19

Celá stránka — texty, otázky aj scam scenáre — je dostupná v troch
jazykoch. Predvolený je slovenský; jazyk si vyberieš v hlavičke stránky
(ikona zemegule). Voľba sa pamätá a aplikuje sa okamžite — bez nutnosti
obnoviť stránku.

### Pridané
- **Prepínač jazyka** — `🇸🇰 Slovenčina / 🇬🇧 English / 🇨🇿 Čeština`
  v hlavičke. Pri prvej návšteve sa jazyk predvolí podľa nastavenia
  tvojho prehliadača; zmena sa pamätá a okamžite sa prejaví v celej
  aplikácii.
- **Anglická a česká verzia všetkých stránok** — domov, sada testov,
  školenia, sponzori, kontakt, súkromie, cookies, podpora,
  poďakovania a `/app`. Britská angličtina (`organisation`,
  `behaviour`), formálne „vykání" v češtine.
- **Kultúrne lokalizované scam scenáre** — všetkých 238 otázok má
  verziu vhodnú pre lokálne publikum. Pre angličtinu (UK) bola
  *Slovenská pošta* nahradená Royal Mail, *Tatra banka* Barclays,
  *Bazoš* Gumtree, eurá librami (£), čísla `+421` na `+44`, IBAN
  prefix `SK` na `GB`, domény `.sk` na `.co.uk`. Pre češtinu
  Česká pošta, Česká spořitelna, Bazos.cz, koruny (Kč), `+420`,
  IBAN `CZ`, `.cz`.

### Bezpečnosť
- Žiadne. Lokalizácia je čisto prezentačná vrstva — obsah otázok
  a oprávnenia k nim sa nemenia, pridávame iba preložené texty.

## [1.7.0] — 2026-05-18

Rozšírili sme prihlasovaciu plochu o samoobslužnú registráciu a obnovu
hesla. Od tejto verzie si nový používateľ vie vytvoriť účet sám —
e-mailom alebo cez Google.

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
- Heslá nikdy neopúšťajú tvoj prehliadač v čitateľnej forme.
  Overovacie aj obnovovacie e-mailové odkazy sú jednorazové a po
  krátkom čase vypršia.

## [1.5.0] — 2026-05-18

V tejto verzii pribudol prihlásený workspace `/app` pre tvorcov testov,
verejné zdieľanie testu cez odkaz, GDPR samoobsluha priamo v účte
a desiatky nových scam scenárov.

### Pridané
- **Skutočná perzistencia respondentských odpovedí.** Odpovede z
  verejného odkazu `/t/<id>` sa ukladajú permanentne. Anonymný
  respondent sa stále neprihlasuje.
- **Verejné vypĺňanie testu cez odkaz** (`/t/<id>`) — anonymný
  respondent dostane odkaz, vyplní vstupné údaje (s GDPR súhlasom
  verzia 1.4.0) a odpovedá na otázky. Žiadne prihlásenie sa
  nepoužíva. Verejný odkaz neodhalí žiadne interné údaje o teste
  ani jeho autoroch.
- **Verejné CMS stránky** (`/s/<slug>`) — redakčne vytvorené stránky
  sa zobrazia na verejnej URL `/s/<slug>` po publikovaní. Koncepty a
  neexistujúce slugy vrátia 404. Renderujú sa rovnaké typy blokov
  ako v editore (nadpis, odsek, obrázok, CTA).
- **Odkaz „Moje testy" v hlavičke a stĺpec „Platforma" v päte** —
  pre prihlásených používateľov sa v hlavičke zobrazí odkaz *Moje
  testy* na pracovný panel (`/app`) a v päte pribudol stĺpec
  *Platforma* s odkazom *Tvorba testov*. Neprihlásení návštevníci
  nevidia ani jedno.
- **Nový autentifikovaný workspace** na `/app` — prihlásení
  používatelia majú vlastný panel s prehľadom, navigáciou na testy,
  tímy, notifikácie a účet.
- **Dashboard na `/app`** — štyri prehľadové karty (aktívne testy,
  sedenia, respondenti, miera dokončenia).
- **Moja história** (`/app/history`) — chronologická časová os
  tvojich testov, sedení a publikovaných verzií. Filtre podľa testu,
  časového rozsahu a typu udalosti (sedenie / verzia / zmena stavu).
- **Moje testy** (`/app/tests`) — prehľad všetkých tvojich testov s
  vyhľadávaním, filtrom podľa stavu (draft / publikované / archív) a
  vetiev. Každý riadok ponúka rýchle otvorenie editora alebo
  zdieľanie. Nový test sa vytvára cez tlačidlo *Nový test*.
- **Sprievodca novým testom** (`/app/tests/new`) — štvorkrokový
  wizard: základné údaje, cieľová skupina, otázky, zdieľanie. Každý
  krok má vlastnú URL (`?step=1..4`) takže návrat tlačidlom
  prehliadača funguje. Po publikovaní dostaneš verejný odkaz
  `/t/<id>` na rozposlanie respondentom.
- **Detail testu** (`/app/tests/<id>`) — editor jedného testu s
  tabmi *Výsledky*, *Analytika* a *Nastavenia*, akciami *Uložiť*,
  *Publikovať* a *Archivovať*. Dialóg *Zdieľať* zobrazí verejný
  odkaz `/t/<id>` s tlačidlom na skopírovanie do schránky.
- **Šablóny testov** (`/app/templates`) — prehľadávateľná knižnica
  predpripravených šablón s vyhľadávaním a filtrom podľa kategórie.
  Tlačidlo *Použiť šablónu* otvorí sprievodcu novým testom s
  prednastavenými otázkami.
- **Skupiny respondentov** (`/app/audiences`) — tagované cohorty s
  jednoduchým editorom (názov + tagy) a potvrdzovacím dialógom pri
  mazaní. Tlačidlo na hromadný import e-mailov je zatiaľ vypnuté s
  tooltipom „Pripravujeme".
- **Knižnica otázok pre tvorcov testov** (`/app/library`) —
  read-only prehliadač globálnej knižnice otázok. Hľadanie podľa
  textu, filtrovanie podľa branže a obtiažnosti, prehľadné karty s
  typom otázky.
- **Detail sady odpovedí** (`/app/sets/$setId`) — read-only náhľad
  jednej sady odpovedí pre tvorcov testov. Oddelené stĺpce *Správne
  odpovede* a *Nesprávne odpovede*, voliteľné vysvetlenia.
  Neexistujúce ID zobrazí jasnú prázdnu stránku so spätným odkazom.
- **Účet** (`/app/account/profile`, `/app/account/security`) —
  úprava mena, e-mailu a iniciálov avatara; politika hesla a zoznam
  aktívnych sedení.
- **Dvojfaktorové overenie (2FA) pre tvoj účet.** V *Účet →
  Bezpečnosť* si môžeš zapnúť 2FA cez ľubovoľný autentifikátor
  (napr. Google Authenticator, Authy, 1Password) a vygenerovať si
  záložné kódy pre prípad straty zariadenia.
- **Tímy, notifikácie a centrum pomoci** v `/app` — prehľady, akcie
  a vyhľadávanie v FAQ.
- **GDPR žiadosť priamo v aplikácii** (`/app/legal/dsr`) — prihlásený
  používateľ môže podať žiadosť podľa GDPR (prístup čl. 15, oprava
  čl. 16, výmaz čl. 17, obmedzenie čl. 18, portabilita čl. 20,
  námietka čl. 21) priamo z účtu. Odpovedáme do 30 dní. Banner
  súhlasu sa raz znova zobrazí (verzia 1.4.0) — pridali sme platformu
  pre tvorbu vlastných testov a zdieľanie cez odkaz, čo zahŕňa dve
  nové kategórie údajov: profily používateľov platformy a vstupné
  údaje respondentov.
- **Prihlasovacia stránka** na `/login` — e-mail + heslo. Slúži ako
  vstup do `/app` workspace.
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
- **30 nových otázok typu „vyzerá podozrivo, ale je legit"** — emaily od bánk, hovory polície / fraud teamu / lekára, pozostalostné inzeráty, transakčné SMS od Boltu / Woltu / Apple. Učia rozoznať, kedy je urgentný tón naozaj legitímny.
- Stránka **Kontakt** s priamym linkom na `subenai.podpora@gmail.com` a 6 prednastavenými témami (technická pomoc, GDPR, sponzorstvo, spolupráca…). Odpovedáme typicky do 2 pracovných dní.
- **Education mode** — autori vzdelávacích testov si v editore testov môžu zapnúť zber odpovedí s menom a e-mailom respondenta a chrániť výsledky vlastným heslom. *Ako respondent edu testu: kontrolórom tvojich údajov je autor testu, my (am.bonum) sme len sprostredkovateľ podľa čl. 28 GDPR.*
- **Edu mód v editore testov** — v editore pribudol prepínač „Zbierať odpovede s menom a e-mailom" so silným heslom autora (originál hesla neukladáme nikde). Po vytvorení testu sa zobrazí potvrdzovacie okno s linkom pre respondentov, linkom na výsledky a heslom — autor musí explicitne odkliknúť, že si ich uložil, predtým ako sa dialóg zatvorí (žiadny reset cez e-mail).
- **Respondent intake pred edu testom** — keď autor zapne edu mód, respondent (študent / kolega) musí pred štartom zadať meno, e-mail a explicitne odsúhlasiť spracovanie osobných údajov (čl. 6 ods. 1 písm. a GDPR). Disclosure paragraf vidí kto je autor, kam idú údaje a 12-mesačnú dobu uchovávania. Prístup k zadávaniu je chránený proti automatizovanému zneužitiu.
- **Dashboard výsledkov pre autora edu testu** — autor zadá svoje heslo a uvidí súhrn (priemer, medián, min/max, distribúciu skóre, pass rate) plus tabuľku respondentov so zoradením, vyhľadávaním a možnosťou jedným klikom zmazať konkrétneho respondenta. **CSV export** so slovenskou diakritikou pre analýzu v Exceli.
- **Stránka „Pre školy a vzdelávacie inštitúcie"** ([/skoly](skoly)) — návod ako pripraviť edu test, zdieľať link a pozrieť výsledky. Vysvetľuje GDPR rolu autora (kontrolór) a am.bonum (sprostredkovateľ podľa čl. 28 GDPR), retention politiku, a obsahuje vzor e-mailu pre respondentov + FAQ. Link v päte stránky.

### Zmenené
- **Používateľská doména napojená na živú databázu** — stránky `/app/*` (dashboard, testy, audiencie, šablóny, notifikácie, tímy, profil, GDPR formulár, história) teraz čítajú a zapisujú dáta priamo z produkčnej databázy. Každý používateľ vidí iba vlastné dáta.
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
