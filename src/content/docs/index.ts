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
    body: `Po teste dostaneš **skóre** a rozpis po jednotlivých otázkach. Pri každej
otázke vidíš svoju odpoveď, správnu odpoveď a vysvetlenie.

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

Všetky kurzy aj články nájdeš na jednom mieste v **[Akadémii](/academy)**:

![Stránka Akadémia: hore prepínač „Všetko / Kurzy / Články" a pole na vyhľadávanie, pod ním mriežka kariet — každá karta ukazuje, či ide o kurz alebo článok, jeho obtiažnosť a odhadovaný čas čítania.](/img/docs/academy.png#themed)

Hore prepneš medzi **Všetko / Kurzy / Články** alebo **vyhľadáš** tému; každá
karta ukazuje **typ** (Kurz alebo Článok), **obtiažnosť** (začiatočník /
pokročilý) a **odhadovaný čas**. Kliknutím otvoríš celý kurz aj s
interaktívnymi príkladmi.`,
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
    body: `**Je test zadarmo?** Áno. Rýchly test aj kurzy sú dostupné bezplatne a bez
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
balíky nájdeš v sekcii **Testy**; po výbere balíka dostaneš test rovnako ako
pri rýchlom teste, len s cielenými otázkami.

**Tip:** výsledky pomáhajú identifikovať, kde tím potrebuje doškolenie — na to
nadväzujú kurzy.`,
  },
  {
    slug: "vlastne-testy",
    title: "Vlastné testy a šablóny",
    description: "Ako si poskladať vlastný test z otázok alebo zo šablóny.",
    order: 8,
    category: "Pre firmy",
    body: `Prihlásení používatelia (lektori, firmy) si môžu **poskladať vlastný
test** v editore: vyber otázky, nastav poradie a zdieľaj test s respondentmi.

Nemusíš začínať od nuly — **šablóny** poskytujú hotové sady, ktoré upravíš
podľa seba. Vytvorený test má vlastný odkaz, ktorý pošleš respondentom; ich
výsledky vidíš vo svojom účte.

Na tvorbu vlastných testov je potrebné **prihlásenie**.`,
  },
  {
    slug: "pre-skoly",
    title: "Pre školy",
    description: "Vzdelávacie testy a materiály pre žiakov a učiteľov.",
    order: 9,
    category: "Vzdelávanie",
    body: `subenai ponúka **vzdelávacie testy a materiály pre školy** — pomáhajú
žiakom naučiť sa rozpoznávať podvody bezpečným, interaktívnym spôsobom.

Učitelia môžu využiť testy v rámci hodín a nadviazať na ne kurzmi. Detaily
a podmienky spracovania údajov (vrátane DPA pre školy) nájdeš v sekcii
**Školy**.`,
  },
  {
    slug: "akademia",
    title: "Akadémia (články)",
    description: "Vzdelávacie články o aktuálnych podvodoch a obrane.",
    order: 10,
    category: "Vzdelávanie",
    body: `Akadémia je naša **knižnica článkov** o aktuálnych podvodoch — nové
techniky, rozbory reálnych prípadov a praktické rady, ako sa brániť.

Články sú zadarmo a bez prihlásenia, pravidelne pribúdajú a dopĺňajú kurzy
o aktuálne dianie. Nájdeš ich v sekcii **Blog / Akadémia**.`,
  },
  {
    slug: "zdielanie-vysledkov",
    title: "Zdieľanie výsledkov",
    description: "Ako zdieľať výsledok testu odkazom alebo obrázkom.",
    order: 11,
    category: "Funkcie",
    body: `Po teste môžeš svoj výsledok **zdieľať** — odkazom alebo obrázkom pre
sociálne siete (Instagram, TikTok, Facebook).

Zdieľanie je **dobrovoľné**: bez prihlásenia výsledok nikam neukladáme, kým ho
ty sám nezdieľaš odkazom. Zdieľaný odkaz ukazuje skóre a krátke zhrnutie —
ostatní si môžu rovnaký test spraviť tiež.`,
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

Rozhovor **neukladáme** — zatvorením karty sa zmaže. Nepíš doň rodné číslo ani
heslá. Pri vyššom riziku ti poradca odporučí kontaktovať políciu. Nájdeš ho
ako **Pomocník**.`,
  },
  {
    slug: "podpora-projektu",
    title: "Podpora projektu",
    description: "Ako môžeš projekt finančne podporiť.",
    order: 13,
    category: "Projekt a súkromie",
    body: `subenai je nezávislý projekt. Ak ti dáva zmysel, môžeš ho **finančne
podporiť** — pomáha to udržať testy a kurzy zadarmo a pridávať nový obsah.

Možnosti podpory a zoznam podporovateľov nájdeš v sekcii **Podporiť projekt**.
Podporu vieš kedykoľvek spravovať alebo zrušiť.`,
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
    body: `Ak potrebuješ pomoc alebo máš otázku, napíš nám cez **kontaktný
formulár** dostupný v pätičke webu. Môžeš priložiť aj snímky obrazovky.

Prihlásení používatelia majú podporu priamo v aplikácii a vidia stav svojich
požiadaviek.`,
  },
  {
    slug: "zmeny",
    title: "Novinky a zmeny",
    description: "Prehľad nového obsahu a vylepšení.",
    order: 17,
    category: "Projekt a súkromie",
    body: `Priebežne pridávame nové testy, kurzy, články a vylepšenia. Prehľad
zmien a noviniek nájdeš na stránke **Zmeny**.

Sleduj ju, ak chceš vedieť, čo pribudlo — od nových odvetvových balíkov po
aktualizácie kurzov.`,
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
