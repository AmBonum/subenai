import type { PublicDoc } from "./types";

// Slugs that belong to the gated subtrees (/docs/app, /docs/admin) — a
// public doc must never shadow them. Enforced at module load so a bad
// addition fails the build, not production routing.
const RESERVED_SLUGS = new Set(["app", "admin"]);

// First public batch (E54). Add sections incrementally — each entry is a
// self-contained, indexable page. Bodies are Markdown.
const DOCS: PublicDoc[] = [
  {
    slug: "co-je-subenai",
    title: "Čo je subenai",
    description: "Stručný úvod do toho, čo subenai robí a komu pomáha.",
    order: 1,
    category: "Začíname",
    body: `subenai je slovenská platforma na **ochranu pred podvodmi**. Nájdeš tu
interaktívne testy, ktoré preveria, ako rozpoznáš phishing, podvodné SMS,
falošné e-shopy či investičné scamy — a vzdelávacie kurzy, ktoré ťa naučia
brániť sa.

![Úvodná stránka subenai s výzvou „Otestuj sa skôr, než ťa otestuje podvodník", tlačidlom „Spustiť test" a kartami so štatistikami (počet otázok, časový limit, zadarmo).](/img/docs/home.png#themed)

Hneď z úvodnej stránky [spustíš rýchly test](/docs/ako-spravit-test) jedným
tlačidlom — bez registrácie.

**Pre koho je to:**

- **Verejnosť** — sprav si rýchly test a zisti svoje slabé miesta.
- **Firmy** — otestuj zamestnancov odvetvovými balíkmi otázok.
- **Školy** — vzdelávacie testy a materiály pre žiakov.

Test spustíš bez registrácie. Účet pridáva históriu výsledkov, vlastné testy
a ďalšie nástroje.`,
  },
  {
    slug: "ako-spravit-test",
    title: "Ako spraviť test",
    description: "Krok za krokom: ako prebieha test a čo od neho čakať.",
    order: 2,
    category: "Začíname",
    body: `Test spustíš tlačidlom **„Spustiť rýchly test"** v hlavičke alebo na
domovskej stránke. Registráciu nepotrebuješ.

1. Dostaneš sériu reálnych situácií (SMS, e-mail, web) a rozhodneš, či ide o
   podvod.
2. Po každej odpovedi uvidíš **vysvetlenie** — prečo bola správna alebo
   nesprávna.
3. Na konci dostaneš **skóre** a zhrnutie, kde sa zlepšiť.

![Obrazovka otázky počas testu: vľavo hore ukazovateľ priebehu „Otázka 1 / 10", vpravo hore odpočítavajúca časomiera, v strede simulovaná situácia (tu adresný riadok prehliadača s URL) a pod ňou tlačidlá s možnosťami odpovede.](/img/docs/test-flow.png#themed)

Na obrazovke otázky vidíš: **vľavo hore priebeh** („Otázka 1 / 10"), **vpravo
hore časomieru**, v strede **simulovanú situáciu** (SMS, e-mail alebo — ako
tu — adresný riadok s URL) a pod ňou **možnosti odpovede**. Po kliknutí na
možnosť dostaneš hneď spätnú väzbu s vysvetlením a pokračuješ ďalej.

**Tip:** výsledok sa dá zdieľať odkazom. Ak sa prihlásiš, test sa uloží do
tvojej histórie.`,
  },
  {
    slug: "vysledky",
    title: "Ako rozumieť výsledkom",
    description: "Čo znamená tvoje skóre a ako ho využiť na zlepšenie.",
    order: 3,
    category: "Začíname",
    body: `Po teste dostaneš **skóre** a rozpis po jednotlivých otázkach. Najviac
sa naučíš z **okamžitej spätnej väzby** hneď po každej odpovedi:

![Otázka po odpovedi: správna možnosť je zvýraznená zelenou s fajkou a pod ňou je vysvetlenie „Správne. Scammer si hľadá ďalšieho." — vidíš, prečo bola odpoveď správna alebo nesprávna.](/img/docs/feedback.png#themed)

Pri každej otázke vidíš **svoju odpoveď, správnu odpoveď a vysvetlenie**, prečo
to tak je. Na konci dostaneš celkové skóre.

- **Vysoké skóre** — dobrý základ; pozri si otázky, ktoré ti nesadli.
- **Nižšie skóre** — odporúčame prejsť súvisiace **kurzy**, ktoré ťa
  systematicky naučia rozpoznávať daný typ podvodu.

Výsledok môžeš **zdieľať** odkazom alebo obrázkom. Prihlásení používatelia
majú výsledky v histórii a môžu sa k nim vracať.`,
  },
  {
    slug: "kurzy",
    title: "Kurzy",
    description: "Vzdelávacie kurzy o jednotlivých typoch podvodov.",
    order: 4,
    category: "Vzdelávanie",
    body: `Kurzy pokrývajú konkrétne typy podvodov — phishingové e-maily, podvodné
SMS (smishing), telefonické podvody (vishing), falošné e-shopy, investičné a
romantické scamy a ďalšie.

Každý kurz má **príklady z praxe**, **červené vlajky** (na čo si dať pozor) a
**checklist**, čo robiť a čomu sa vyhnúť. Sú zadarmo a dostupné bez
prihlásenia.

Príklady sú **realistické ukážky** — napríklad presná napodobenina podvodného
e-mailu aj s nenápadnou falošnou doménou, ktorú sa učíš odhaliť:

![Ukážka z kurzu Email phishing: realistický podvodný e-mail „Bezpečnostné upozornenie — overte sa do 24 hodín" od „Slovenská sporiteľňa" z falošnej domény slsp-bezpecnost.online, s nátlakovým textom a tlačidlom „Overiť účet".](/img/docs/lesson-example.png#themed)

Anglické pojmy (phishing, scam…) majú v texte slovenské vysvetlenie v
zátvorke. Všetky kurzy aj články nájdeš na jednom mieste v
**[Akadémii](/academy)**:

![Stránka Akadémia: hore prepínač „Všetko / Kurzy / Články" a pole na vyhľadávanie, pod ním mriežka kariet — každá karta ukazuje, či ide o kurz alebo článok, jeho obtiažnosť a odhadovaný čas čítania.](/img/docs/academy.png#themed)

Hore prepneš medzi **Všetko / Kurzy / Články** alebo **vyhľadáš** tému; každá
karta ukazuje **typ** (Kurz alebo Článok), **obtiažnosť** (začiatočník /
pokročilý) a **odhadovaný čas**. Kliknutím otvoríš celý kurz aj s
interaktívnymi príkladmi. Pri článkoch zo sekcie *Bezpečná práca s AI* je
namiesto obtiažnosti uvedené publikum (*pre každého* / *pre odborníkov*).`,
  },
  {
    slug: "ucet",
    title: "Účet a prihlásenie",
    description: "Čo ti dá registrácia a ako sa prihlásiš.",
    order: 5,
    category: "Účet",
    body: `Účet **nie je potrebný** na spustenie testu ani čítanie kurzov. Pridáva ti:

- **históriu** absolvovaných testov a výsledkov,
- možnosť **vytvárať vlastné testy** a zostavy otázok,
- nástroje pre firmy a lektorov.

## Prihlásenie

Prihlásiš sa cez **„Prihlásiť sa"** v hlavičke. Môžeš použiť **e-mail a
heslo** alebo **Pokračovať cez Google**:

![Prihlasovacia obrazovka: tlačidlo „Pokračovať cez Google", oddeľovač „alebo" a pod ním polia E-mail a Heslo s tlačidlom „Prihlásiť sa"; naspodku odkazy „Zabudol/a si heslo?" a „Vytvoriť účet".](/img/docs/login.png#themed)

Nemáš účet? Cez **„Vytvoriť účet"** sa zaregistruješ. Pre vyššiu bezpečnosť
podporujeme **dvojfaktorové overenie (2FA)** — zapneš si ho v nastaveniach
účtu.

## Nastavenia účtu

Po prihlásení nájdeš nastavenia v sekcii **Účet**. V záložke **Profil**
upravíš zobrazované meno, e-mail a iniciály avatara:

![Sekcia Účet → Profil: záložky Profil / Bezpečnosť / GDPR; karta „Osobné údaje" s náhľadom avatara, poľami Zobrazované meno, E-mail, Iniciály avatara a ID účtu; nižšie karta „Heslo a 2FA" a karta „Stiahnutie tvojich údajov (JSON)".](/img/docs/account-profile.png#themed)

- **Profil** — meno, e-mail, avatar.
- **Bezpečnosť** — zmena hesla a **2FA**.
- **GDPR** — žiadosti o údaje a [výmaz](/docs/vymazanie-udajov); priamo v
  Profile si vieš **stiahnuť všetky svoje údaje (JSON)** (GDPR čl. 15 a 20).`,
  },
  {
    slug: "faq",
    title: "Časté otázky",
    description: "Najčastejšie otázky o subenai.",
    order: 6,
    category: "Účet",
    body: `Najčastejšie otázky máš pohromade aj priamo pri teste — stačí kliknúť na
otázku a rozbalí sa odpoveď:

![Sekcia „Časté otázky" s rozbaľovacím zoznamom: Je test zadarmo? (označené ako najčastejšia), Koľko času zaberie?, Pre koho je test vhodný?, Aké údaje zbierate?, Môžem test poslať kolegom?](/img/docs/faq.png#themed)

**Je test zadarmo?** Áno. Rýchly test aj kurzy sú dostupné bezplatne a bez
registrácie.

**Ukladáte moje odpovede?** Bez prihlásenia ostáva výsledok len u teba
(zdieľaš ho dobrovoľne odkazom). Po prihlásení sa ukladá do tvojej histórie.

**Pre koho sú firemné balíky?** Pre firmy, ktoré chcú otestovať zamestnancov
odvetvovými sadami otázok — viac v sekcii pre firmy.

**Ako vás kontaktujem?** Cez kontaktný formulár v pätičke; prihlásení
používatelia majú podporu priamo v aplikácii.`,
  },
  {
    slug: "firemne-testy",
    title: "Testovanie pre firmy",
    description: "Odvetvové balíky otázok na otestovanie zamestnancov.",
    order: 7,
    category: "Pre firmy",
    body: `Firmy môžu otestovať zamestnancov **odvetvovými balíkmi** otázok
zameranými na hrozby ich oboru — napríklad e-shop, gastro, IT, zdravotníctvo
či financie.

Každý balík obsahuje reálne situácie relevantné pre dané odvetvie. Verejné
balíky nájdeš v sekcii **[Testy](/tests)**; po výbere balíka dostaneš test
rovnako ako pri rýchlom teste, len s cielenými otázkami.

![Sekcia Testy: nadpis „Otestuj svoju brànžu", odznaky „Anonymne / 5 minút / Zadarmo" a filter „Pre koho je test" s odvetviami (Školy, Zdravotníctvo, Heslá a 2FA, Seniori, Študenti, E-shop, Gastro, IT…), pod ním mriežka kariet s balíkmi testov.](/img/docs/test-packs.png#themed)

Hore filtruješ balíky **podľa odvetvia a publika**; každá karta je jeden
pripravený test. **Tip:** výsledky pomáhajú identifikovať, kde tím potrebuje
doškolenie — na to nadväzujú [kurzy](/docs/kurzy).`,
  },
  {
    slug: "vlastne-testy",
    title: "Vlastné testy a šablóny",
    description: "Ako si poskladať vlastný test z otázok alebo zo šablóny.",
    order: 8,
    category: "Pre firmy",
    body: `V **[editore testov](/test/builder)** si poskladáš vlastný test: vyber
otázky z banky, nastav poradie a zdieľaj test s respondentmi.

![Editor „Zostav vlastný test pre tím": výber zo stoviek otázok, predefinované sady podľa odvetvia (školy, AI, sociálne siete, rodičia, zdravotníctvo, heslá a 2FA…) a dole tlačidlá „Spustiť pre seba" a „Zdieľať s tímom".](/img/docs/composer.png#themed)

Nemusíš začínať od nuly — hore vyberieš **predefinovanú sadu** podľa odvetvia
alebo otázky pridáš ručne z **banky otázok**. Dole vidíš počet vybraných
otázok a test buď **spustíš pre seba**, alebo **zdieľaš s tímom** vlastným
odkazom; výsledky respondentov potom vidíš vo svojom účte.

Na uloženie a zdieľanie vlastných testov je potrebné **prihlásenie**.`,
  },
  {
    slug: "skolenie-za-5-minut",
    title: "Ako spustiť školenie pre firmu alebo školu za 5 minút",
    description:
      "Od reálneho prípadu v šablónach cez odkaz pre respondentov až po výsledky — krok za krokom.",
    order: 8.1,
    category: "Pre firmy",
    body: `Celé školenie má tri kroky: **šablóna** s reálnym prípadom podvodu,
**odkaz** pre respondentov a **výsledky** (s plateným plánom aj doklad o
preškolení). Na vytvorenie testu potrebuješ účet; respondenti účet
nepotrebujú.

[[scene3d:campaign-flow|Tri kroky kampane: šablóna, odkaz respondentom a doklad.]]

## 1. Vyber reálny prípad

1. Otvor katalóg **[Šablóny](/sablony)** a prejdi si šablóny podľa témy
   alebo publika.
2. Pri šablóne, ktorá ťa zaujala, klikni na **„Detail →"** — uvidíš otázky,
   témy a sekciu **„Autor a licencia"**.

## 2. Prispôsob test

3. Prihlás sa a v aplikácii otvor v menu **„Šablóny"**, záložku
   **„Verejné"**. Pri vybranej šablóne klikni na **„Použiť"**.
4. Otvorí sa sprievodca **„Nový test"** (štyri kroky). V kroku **„Základy"**
   vyplň **„Názov testu"** (napríklad „Phishing — október") a krátky
   **„Popis"** pre respondentov, potom **„Ďalej"**.
5. V kroku **„Cieľová skupina"** môžeš vybrať **„Skupinu respondentov"**
   (nepovinné) a pokračovať **„Ďalej"**.
6. V kroku **„Otázky"** sú predvyplnené otázky zo šablóny (označené
   **„Z šablóny"**). Môžeš ich preusporiadať, odstrániť alebo cez
   **„Pridať otázky"** doplniť ďalšie z knižnice.

## 3. Zverejni a pošli odkaz

7. Klikni na **„Publikovať"**. V kroku **„Zdieľanie"** dostaneš odkaz —
   skopíruj ho tlačidlom **„Skopírovať odkaz"**.
8. Ak budeš chcieť výsledky s menami (napríklad pre doklad o preškolení),
   ešte pred rozoslaním otvor test v **„Moje testy"**, záložku
   **„Nastavenia"** a v časti **„Údaje respondenta"** zapni **„Meno"** a
   **„E-mail"**.
9. Pošli odkaz respondentom vlastným e-mailom, cez Teams, Slack alebo
   intranet. Podrobnosti o hesle a pozvánkach nájdeš v návode
   [Zdieľanie testu a pozvánky](/docs/zdielanie-testu).

## 4. Sleduj výsledky

10. Výsledky respondentov nájdeš v teste v záložke **„Výsledky"** — pozri
    [Výsledky a export](/docs/vysledky-a-export).
11. S plateným plánom z nich vytvoríš
    [doklad o preškolení](/docs/doklad-o-preskoleni).

**Tip:** školy môžu použiť aj edu mód bez účtov pre žiakov — pozri návod
[Pre školy](/docs/pre-skoly).`,
  },
  {
    slug: "zdielanie-testu",
    title: "Zdieľanie testu a pozvánky",
    description: "Ako poslať test respondentom, chrániť ho heslom a zbierať mená.",
    order: 8.2,
    category: "Pre firmy",
    body: `Každý publikovaný test má **verejný odkaz**. Kto ho má, môže test
vyplniť na mobile aj počítači — bez registrácie. Koncept (draft) respondenti
vyplniť nemôžu, kým ho nepublikuješ.

[[scene3d:scam-phone|Telefón s upozorneniami, jedno z nich je označené ako podvod.]]

## Skopíruj odkaz

1. V aplikácii otvor **„Moje testy"**.
2. Pri teste klikni na **„Zdieľať"** (alebo otvor test a klikni na
   **„Zdieľať"** v jeho hlavičke).
3. V okne **„Zdieľať test"** skopíruj **„Verejný odkaz"** tlačidlom
   **„Skopírovať"**.

## Chráň test heslom

4. V teste otvor záložku **„Nastavenia"** a časť **„Heslo pre
   respondentov"**.
5. Zadaj heslo (aspoň 8 znakov), zopakuj ho a klikni na **„Nastaviť
   heslo"**. Respondenti ho potom musia zadať pred vyplnením testu.
6. Heslo kedykoľvek zmeníš (**„Zmeniť heslo"**) alebo zrušíš (**„Zrušiť
   heslo"**). Pri zmene sa rozpracované relácie respondentov zneplatnia.

**Pozor:** heslo pošli **iným kanálom** ako odkaz — napríklad odkaz
e-mailom a heslo ústne alebo v chate.

## Zbieraj mená a e-maily

7. V **„Nastaveniach"** v časti **„Údaje respondenta"** vyber **„Meno"** a
   **„E-mail"** a označ, či sú **„Povinné"**. Bez nich sú výsledky
   anonymné. Mená potrebuješ, ak chceš
   [doklad o preškolení](/docs/doklad-o-preskoleni) s menným zoznamom.

## Pozvánky e-mailom

Tlačidlo **„Pozvánky e-mailom"** v teste zatiaľ pripravujeme. Dovtedy pošli
odkaz zo svojej schránky — funguje to úplne rovnako. Napríklad:

> Ahoj, prosím, vyplň do piatku krátky test o online podvodoch (asi 5 minút):
> [odkaz]. Výsledok uvidíš hneď po dokončení.`,
  },
  {
    slug: "vysledky-a-export",
    title: "Výsledky a export",
    description: "Kde nájdeš výsledky respondentov a ako ich stiahneš do CSV.",
    order: 8.3,
    category: "Pre firmy",
    body: `Výsledky testu vidíš v aplikácii, len čo ho respondenti začnú
vypĺňať. Surové výsledky aj CSV export sú **zadarmo** v každom pláne.

[[scene3d:shield-stack|Vrstvený štít so zelenou fajkou.]]

## Prehľad a respondenti

1. Otvor **„Moje testy"** a klikni na test.
2. Záložka **„Výsledky"** ukazuje súhrn **„Spolu respondentov"**,
   **„Dokončené"** a **„Priemerné skóre"**.
3. Pod ním je zoznam **„Respondenti"**. Filtruješ ho podľa stavu
   (**„Prebiehajúce"**, **„Dokončené"**, **„Opustené"**), hľadáš podľa mena
   alebo e-mailu a triediš podľa dátumu alebo skóre.
4. Pri respondentovi klikni na **„Otvoriť detail"** — uvidíš jeho odpovede
   a pri každej otázke, či odpovedal správne. Podľa chybných odpovedí vieš,
   čomu sa venovať na ďalšom školení.

## Export do CSV

5. V záložke **„Výsledky"** klikni na **„Exportovať CSV"**.
6. Súbor otvoríš v Exceli, Google Sheets alebo LibreOffice. Jeden export
   obsahuje najviac 5 000 respondentov.

Stĺpce v CSV:

| Stĺpec | Význam |
|---|---|
| session_id | ID relácie respondenta |
| respondent_name, respondent_email | meno a e-mail (ak ich zbieraš) |
| status | stav relácie |
| score | skóre |
| started_at, finished_at | začiatok a koniec |
| duration_seconds | trvanie v sekundách |
| segment | segment respondenta |
| ip_hash_last6 | posledných 6 znakov hashu IP adresy (nie samotná IP) |

**Pozor:** CSV s menami a e-mailami obsahuje osobné údaje. Ukladaj ho len
tam, kam majú prístup oprávnené osoby.

Edu testy pre triedy majú vlastnú stránku výsledkov s exportom do CSV,
JSON a PDF — pozri [Pre školy](/docs/pre-skoly).`,
  },
  {
    slug: "doklad-o-preskoleni",
    title: "Doklad o preškolení a certifikáty",
    description:
      "Tlačový doklad o absolvovaní testu s certifikátmi a verejným overením (platené plány).",
    order: 8.4,
    category: "Pre firmy",
    body: `S plateným plánom vytvoríš z výsledkov testu **doklad o preškolení**:
prehľad, kto test absolvoval, kedy a s akým výsledkom, plus **certifikát**
pre každého úspešného respondenta. Doklad slúži ako **podklad (evidencia) k
preukázaniu vzdelávania zamestnancov**, ktoré vyžaduje vyhláška NBÚ
č. 227/2025 Z. z.

[[scene3d:evidence-report|Doklad o preškolení a certifikát s pečaťou.]]

**Dôležité:** doklad pomáha preukázať, že vzdelávanie prebehlo. Nie je to
certifikácia systému riadenia informačnej bezpečnosti a sám osebe
nezaručuje súlad s predpismi.

## Čo potrebuješ

- aktívny platený plán — pozri [Predplatné a faktúry](/docs/predplatne-a-faktury),
- test, v ktorom zbieraš **„Meno"** (a ideálne aj **„E-mail"**) v časti
  **„Údaje respondenta"**,
- respondentov, ktorí test dokončili.

## Ako doklad vytvoríš

1. Otvor test v **„Moje testy"**.
2. Prejdi na stránku dokladu tohto testu (adresa
   **/app/tests/<id testu>/doklad**).
3. Skontroluj obsah dokladu:
   - organizácia, názov a verzia testu, pokryté témy,
   - pri každom respondentovi dátum dokončenia a skóre,
   - hranica úspešnosti,
   - jedinečné ID dokladu a odkaz na jeho overenie,
   - na ďalších stranách certifikát pre každého úspešného respondenta.
4. Otvor tlač prehliadača (**Ctrl+P**, na Macu **Cmd+P**), ako tlačiareň
   vyber **„Uložiť ako PDF"** a súbor ulož. Stránka je pripravená na
   formát A4.
5. PDF založ k internej dokumentácii o vzdelávaní.

## Overenie dokladu

6. Každý doklad má jedinečné ID a odtlačok obsahu (SHA-256). Na adrese
   **/overenie/<id dokladu>** si ktokoľvek — napríklad audítor — overí, že
   doklad existuje.
7. Overovacia stránka ukazuje len názov testu, dátum, počet respondentov a
   odtlačok. **Žiadne osobné údaje** na nej nie sú.

**Poznámka:** do dokladov za jeden fakturačný rok môžeš zahrnúť toľko
respondentov, koľko dovoľuje tvoj plán (25, 100 alebo 250).`,
  },
  {
    slug: "predplatne-a-faktury",
    title: "Predplatné a faktúry",
    description: "Ročné plány Štart, Firma a Firma+, platba, faktúry a zrušenie predplatného.",
    order: 8.5,
    category: "Pre firmy",
    body: `Testy, výsledky a CSV export sú zadarmo. Platíš len za **doklady o
preškolení** — a to ročne, podľa počtu respondentov, ktorých do dokladov
zahrnieš.

[[scene3d:evidence-report|Doklad o preškolení a certifikát s pečaťou.]]

| Plán | Respondenti v dokladoch za rok | Cena za rok |
|---|---|---|
| Zadarmo | 0 (testy, výsledky a CSV ostávajú) | 0 € |
| Štart | 25 | 149 € |
| Firma | 100 | 390 € |
| Firma+ | 250 | 790 € |
| Viac ako 250 | individuálne | na dopyt |

## Ako si plán kúpiš

1. Otvor stránku **[Cenník](/cennik)** a vyber plán.
2. Prihlás sa (alebo si vytvor účet).
3. Pred platbou potvrdíš dva samostatné súhlasy:
   **[obchodné podmienky](/obchodne-podmienky)** a **žiadosť o začatie
   poskytovania služby hneď po zaplatení**. Ak kupuješ ako spotrebiteľ a do
   14 dní odstúpiš, uhradíš len pomernú časť ceny.
4. Zaplatíš cez platobnú bránu **Stripe**. Po úspešnej platbe sa plán
   aktivuje automaticky.

Pre viac ako 250 respondentov nám napíš cez
**[kontaktný formulár](/contact-form)**.

## Správa predplatného

5. Svoj plán spravuješ v aplikácii na stránke **/app/billing**.
6. Odtiaľ otvoríš **zákaznícky portál Stripe**, kde si stiahneš **faktúry**
   a predplatné **zrušíš**.

**Poznámka:** cena a limit sa pri kúpe zafixujú. Ak neskôr zmeníme cenník,
tvoje zaplatené obdobie sa nemení.`,
  },
  {
    slug: "pre-skoly",
    title: "Pre školy",
    description: "Edu testy pre triedy zadarmo — bez účtov pre žiakov, s výsledkami a exportom.",
    order: 9,
    category: "Vzdelávanie",
    body: `Školy používajú subenai **zadarmo**. Edu mód nevyžaduje účty pre
žiakov, výsledky sa uchovávajú 12 mesiacov a potom sa anonymizujú.
Šablóny s reálnymi prípadmi pre školy sú tiež zadarmo.

![Stránka „Pre školy": nadpis „Otestuj triedu na rozpoznávanie scamov — bez registrácií, bez ceny", role riaditeľ/DPO, IT koordinátor, učiteľ/lektor a štatistiky 0 €, 3 min, GDPR, retencia 12 mesiacov.](/img/docs/schools.png#themed)

[[scene3d:scam-phone|Telefón s upozorneniami, jedno z nich je označené ako podvod.]]

## Vytvor test pre triedu

1. Na stránke **[Školy](/schools)** klikni na **„Vytvoriť test pre
   triedu"**.
2. V editore vyber **predefinovanú sadu** alebo otázky cez **„Vybrať z
   banky"** (aspoň 5 otázok).
3. V časti **„Nastavenia"** zapni **„Zbierať odpovede s menom a e-mailom"**
   a zadaj **„Heslo na pozeranie výsledkov"** (aspoň 8 znakov). Voliteľne
   nastav **„Prah úspešnosti"**.
4. Klikni na **„Vytvoriť edu test →"**. V okne **„Edu test vytvorený"**
   nájdeš **„Link pre respondentov"**, **„Link na výsledky (pre teba)"** a
   heslo. Ulož si ich, potvrď zaškrtávacie políčko a zavri okno.

**Pozor:** heslo k výsledkom sa nedá obnoviť e-mailom. Ulož si ho hneď.

## Žiaci vyplnia test

5. Pošli žiakom link pre respondentov (napríklad cez EduPage alebo Teams).
6. Žiak vyplní meno, e-mail a súhlas a pokračuje na test — bez registrácie.

## Výsledky

7. Otvor link na výsledky a zadaj heslo.
8. Výsledky stiahneš tlačidlami **„Stiahnuť CSV"**, **„Stiahnuť JSON"** a
   **„Stiahnuť PDF"**.
9. Ak si pri otvorení výsledkov prihlásený, test sa pripojí k tvojmu účtu
   a nájdeš ho v menu **„Moje edu testy"**.

Na výsledky nadviaž [kurzmi](/docs/kurzy). Spracovanie údajov a DPA pre
školy nájdeš v sekcii **[Školy](/schools)**.`,
  },
  {
    slug: "akademia",
    title: "Akadémia (články)",
    description: "Vzdelávacie články o aktuálnych podvodoch a obrane.",
    order: 10,
    category: "Vzdelávanie",
    body: `Akadémia je naša **knižnica článkov** o aktuálnych podvodoch — nové
techniky, rozbory reálnych prípadov a praktické rady, ako sa brániť.

![Článok v Akadémii „phishing — kompletný sprievodca": nadpis, údaj o čase čítania a úvodný text s členením na sekcie (napríklad „čo je phishing v 60 sekúnd").](/img/docs/article.png#themed)

Každý článok má **odhadovaný čas čítania** a prehľadné sekcie. Články sú
zadarmo a bez prihlásenia, pravidelne pribúdajú a dopĺňajú [kurzy](/docs/kurzy)
o aktuálne dianie. Nájdeš ich v **[Akadémii](/academy)** pod záložkou *Články*.

Články sú zoradené do kategórií. Sekcia **[Bezpečná práca s AI](/academy/category/bezpecna-praca-s-ai)**
má dve úrovne — *pre každého* (čo nepísať do chatbota, ako overiť odpoveď,
nastavenia súkromia, falošné AI appky, deti a chatboti) a *pre odborníkov*
(prompt injection, shadow AI, AI agenti a MCP, OWASP Top 10 pre LLM, AI
generovaný kód). Na stránke kategórie prepneš úroveň prepínačom
**Všetko / Pre každého / Pre odborníkov**.`,
  },
  {
    slug: "zdielanie-vysledkov",
    title: "Zdieľanie výsledkov",
    description: "Ako zdieľať výsledok testu odkazom alebo obrázkom.",
    order: 11,
    category: "Funkcie",
    body: `Po teste môžeš svoj výsledok **zdieľať** — odkazom alebo obrázkom pre
sociálne siete.

![Zdieľaný výsledok: skóre „78 / 100", typ osobnosti a rozdelenie podľa kategórií; sekcia „Zdieľaj ďalej" s tlačidlami Facebook, Messenger, WhatsApp, X, LinkedIn, Telegram a samostatná sekcia pre Instagram & TikTok s tlačidlami „Stiahni IG Story (PNG)" a „Skopíruj caption".](/img/docs/shared-result.png#themed)

Takto vyzerá stránka, ktorú uvidí každý, komu odkaz pošleš — **skóre, typ
osobnosti a rozdelenie** podľa kategórií. V sekcii **„Zdieľaj ďalej"** klikneš
na sieť (Facebook, Messenger, WhatsApp, X, LinkedIn, Telegram), alebo si pre
**Instagram a TikTok** stiahneš hotový obrázok (IG Story PNG) aj s popiskom.

Zdieľanie je **dobrovoľné**: bez prihlásenia výsledok nikam neukladáme, kým ho
ty sám nezdieľaš odkazom — a [vieš si ho aj zmazať](/docs/vymazanie-udajov).`,
  },
  {
    slug: "pomocnik",
    title: "Podvodový poradca (AI)",
    description: "AI asistent, ktorý poradí pri podozrení na podvod.",
    order: 12,
    category: "Funkcie",
    body: `**Podvodový poradca** je AI asistent zameraný výlučne na podvody. Opíš
mu situáciu („snaží sa ma niekto podviesť?") a dostaneš zrozumiteľné
posúdenie rizika a odporúčané ďalšie kroky.

![Podvodový poradca: hore upozornenie, že rozhovor spracúva AI a neukladá sa, pod ním pole „Opíšte situáciu alebo sa spýtajte…" a tlačidlá „Odoslať", „Preveriť podozrenie" a „Pridať fotku".](/img/docs/pomocnik.png#themed)

Na obrazovke máš **pole na opis situácie**, tlačidlo **„Odoslať"**, režim
**„Preveriť podozrenie"** a **„Pridať fotku"** (môžeš priložiť snímku
podozrivej správy). Hore je vždy pripomienka, že **rozhovor neukladáme** —
zatvorením karty sa zmaže. Nepíš doň rodné číslo ani heslá. Pri vyššom riziku
ti poradca odporučí kontaktovať políciu.`,
  },
  {
    slug: "podpora-projektu",
    title: "Podpora projektu",
    description: "Ako môžeš projekt finančne podporiť.",
    order: 13,
    category: "Projekt a súkromie",
    body: `subenai je nezávislý projekt. Ak ti dáva zmysel, môžeš ho **finančne
podporiť** — pomáha to udržať testy a kurzy zadarmo a pridávať nový obsah.

Podporovateľov nájdeš na stránke **[Naši sponzori](/sponsors)**:

![Stránka „Naši sponzori" so zoznamom podporovateľov a ich odkazmi, vyhľadávaním a filtrom podľa dátumu; dole poznámka, že zoznam je dobrovoľný a mnohí sponzori sú anonymní.](/img/docs/sponsors.png#themed)

Zápis do zoznamu je **dobrovoľný** — mnohí sponzori sú anonymní a sumy ani
počty platieb nezverejňujeme. Podporu vieš kedykoľvek **spravovať alebo
zrušiť**.`,
  },
  {
    slug: "sukromie-a-data",
    title: "Súkromie a dáta",
    description:
      "Aké údaje spracúvame, ako dlho ich uchovávame a aké máš práva podľa GDPR a slovenských zákonov.",
    order: 14,
    category: "Projekt a súkromie",
    body: `Súkromie berieme vážne a držíme sa zásady **minimalizácie údajov** —
spracúvame len to, čo je nevyhnutné na fungovanie služby. Táto stránka
zhŕňa, čo o tebe vieme, prečo, ako dlho to uchovávame a čo s tým môžeš
urobiť. Úplné a záväzné znenie nájdeš v [Ochrane súkromia](/privacy);
nastavenie meraní rieši [Cookies](/cookies).

![Stránka „Ochrana súkromia" s prehľadne číslovanými sekciami o tom, aké údaje spracúvame, na akom právnom základe, ako dlho ich uchovávame a aké máš práva.](/img/docs/privacy.png#themed)

## Čo spracúvame

**Rýchly test bez prihlásenia.** Test [spustíš](/docs/ako-spravit-test) bez
registrácie. Tvoje odpovede sa ukladajú ako jeden anonymný „pokus" s
náhodným identifikátorom (\`share_id\`) — slúži len na to, aby si vedel
[zdieľať svoj výsledok](/docs/zdielanie-vysledkov) odkazom. K tomuto pokusu
nie je pripojené tvoje meno ani e-mail.

**Prihlásený účet.** Ak sa [prihlásiš](/docs/ucet), ukladáme:

- **e-mail** (prihlásenie, dôležité oznámenia),
- **zobrazované meno** (nepovinné),
- **históriu výsledkov** testov pripojenú k tvojmu účtu.

**Podpora projektu.** Ak [projekt podporíš](/docs/podpora-projektu),
platbu spracúva poskytovateľ platobnej brány — **čísla kariet u nás nikdy
neuvidíme ani neukladáme**. Uchovávame len doklad o platbe potrebný podľa
zákona o účtovníctve.

## Ako dlho údaje uchovávame

Uchovávanie nie je nekonečné — beží **automaticky** každý deň:

| Údaj | Lehota | Čo sa stane |
| --- | --- | --- |
| Výsledky testov (pokusy) | 36 mesiacov | natrvalo sa zmažú |
| Anti-cheat metadáta | 12 mesiacov | anonymizujú sa |
| Meno/e-mail respondenta (edu) | 12 mesiacov | anonymizujú sa |
| Účtovné doklady o platbe | podľa zákona (~10 r.) | uchovávajú sa |

Tieto lehoty vynucuje denná automatická úloha — nie je to len sľub na
papieri.

## Tvoje práva (GDPR)

Máš právo na **prístup, opravu, výmaz, obmedzenie, prenosnosť a námietku**.
Ako si ich uplatniť — vrátane **úplného vymazania účtu a dát** — má vlastný,
podrobný návod:

**➡️ [Vymazanie údajov a účtu](/docs/vymazanie-udajov)**

Otázky o súkromí vieš poslať aj cez [kontakt](/docs/kontakt).`,
  },
  {
    slug: "vymazanie-udajov",
    title: "Vymazanie údajov a účtu",
    description:
      "Krok za krokom, ako požiadať o výmaz svojich údajov — transparentne, podľa GDPR a slovenských zákonov.",
    order: 15,
    category: "Projekt a súkromie",
    body: `Máš **právo na výmaz** („právo byť zabudnutý", GDPR čl. 17). Tu nájdeš
presne to, ako oň požiadať, čo sa zmaže, čo musíme zo zákona ponechať a
dokedy je to hotové. Žiadne skryté kroky.

## 1. Anonymný test — zmažeš si ho sám hneď

Ak si robil test **bez prihlásenia**, tvoj výsledok nie je viazaný na žiadnu
identitu. Na stránke s výsledkom (alebo cez [zdieľací odkaz](/docs/zdielanie-vysledkov))
nájdeš tlačidlo **„Zmazať môj výsledok"** — klikneš a pokus sa **okamžite a
natrvalo** odstráni z našej databázy. Nepotrebuješ účet ani e-mail.

## 2. Prihlásený účet — žiadosť o výmaz

Ak máš účet, výmaz prebieha cez vstavaný formulár (žiadny e-mail tam-a-späť):

1. Prihlás sa a otvor **[Žiadosti o údaje](/app/legal/dsr)** (v sekcii
   *Účet*).
2. V poli **Typ žiadosti** zvoľ **„Výmaz"**.
3. Voliteľne pripíš poznámku a **Odošli**. Tvoj e-mail je predvyplnený a
   uzamknutý — žiadosť tak nemôže podať nikto za teba.
4. Žiadosť sa objaví v **histórii** s termínom vybavenia a stavom, ktorý
   môžeš sledovať.

![Formulár „GDPR žiadosť (DSR)" v sekcii Účet: výber typu žiadosti (vrátane „Výmaz — čl. 17"), pole pre spresnenie a história podaných žiadostí so stavom a termínom vybavenia.](/img/docs/dsr-form.png#themed)

**Termín:** žiadosť vybavíme **najneskôr do 30 dní** (zákonná lehota GDPR),
spravidla skôr. Stav uvidíš priamo vo formulári.

> **Pripravujeme:** plne automatické **„Vymazať účet"** priamo v nastaveniach
> účtu s **30-dňovou lehotou na rozmyslenie** (do tej doby sa dá výmaz
> zrušiť). Po jej uplynutí systém tvoje údaje odstráni automaticky, bez
> zásahu človeka.

## 3. Čo sa vymaže a čo musíme ponechať

**Vymaže sa:**

- tvoj účet, e-mail a zobrazované meno,
- história výsledkov a všetky pokusy pripojené k účtu,
- profilové nastavenia.

**Zo zákona musíme dočasne ponechať:**

- **účtovné doklady o platbách** (ak si projekt podporil) — slovenský zákon
  o účtovníctve vyžaduje ich archiváciu (~10 rokov). Tieto doklady ďalej
  nepoužívame na nič iné a po uplynutí lehoty sa tiež zmažú.

Aj bez žiadosti sa väčšina údajov odstráni **automaticky** podľa lehôt v
sekcii [Súkromie a dáta](/docs/sukromie-a-data).

## 4. Niečo nesedí?

Ak si myslíš, že s tvojimi údajmi nakladáme nesprávne, [napíš nám](/docs/kontakt).
Máš tiež právo obrátiť sa na **Úrad na ochranu osobných údajov SR**.`,
  },
  {
    slug: "kontakt",
    title: "Kontakt a podpora",
    description: "Ako nás kontaktovať a získať pomoc.",
    order: 16,
    category: "Projekt a súkromie",
    body: `Ak potrebuješ pomoc alebo máš otázku, napíš nám cez **[kontaktný
formulár](/contact-form)** dostupný aj v pätičke webu:

![Kontaktný formulár „Kontaktuj nás" s poľami Téma, Kategória, Správa, E-mail a nepovinné Meno, možnosťou priložiť prílohy (PNG/JPEG/PDF) a tlačidlom „Odoslať žiadosť".](/img/docs/contact.png#themed)

Vyplníš **tému, kategóriu a správu**, uvedieš **e-mail** (na odpoveď) a
voliteľne **priložíš snímky obrazovky** podozrivej správy. Odpovedáme spravidla
do dvoch pracovných dní.

Prihlásení používatelia majú podporu priamo v aplikácii a vidia **stav svojich
požiadaviek**.`,
  },
  {
    slug: "zmeny",
    title: "Novinky a zmeny",
    description: "Prehľad nového obsahu a vylepšení.",
    order: 17,
    category: "Projekt a súkromie",
    body: `Priebežne pridávame nové testy, kurzy, články a vylepšenia. Prehľad
zmien a noviniek nájdeš na stránke **[Zmeny](/changelog)**.

![Stránka „Zmeny a verzie" so zoznamom vydaní zoradených od najnovšieho — pri každom verzii sú položky Pridané / Zmenené / Opravené.](/img/docs/changelog.png#themed)

Záznamy sú zoradené **od najnovšieho** a delené na **Pridané / Zmenené /
Opravené**. Sleduj ju, ak chceš vedieť, čo pribudlo — od nových odvetvových
balíkov po aktualizácie kurzov.`,
  },
];

for (const doc of DOCS) {
  if (RESERVED_SLUGS.has(doc.slug)) {
    throw new Error(`[docs] public slug "${doc.slug}" is reserved for a gated subtree`);
  }
}
if (new Set(DOCS.map((d) => d.slug)).size !== DOCS.length) {
  throw new Error("[docs] duplicate public doc slug");
}

export const PUBLIC_DOCS: readonly PublicDoc[] = [...DOCS].sort((a, b) => a.order - b.order);

export function getPublicDoc(slug: string): PublicDoc | null {
  return PUBLIC_DOCS.find((d) => d.slug === slug) ?? null;
}

export function listPublicDocs(): readonly PublicDoc[] {
  return PUBLIC_DOCS;
}

export const RESERVED_PUBLIC_DOC_SLUGS = RESERVED_SLUGS;
