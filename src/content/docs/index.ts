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
prihlásenia.`,
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

Prihlásiš sa cez **„Prihlásiť sa"** v hlavičke. Podporujeme prihlásenie
e-mailom a **dvojfaktorové overenie (2FA)** pre vyššiu bezpečnosť.`,
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
    description: "Aké údaje spracúvame a aké máš práva.",
    order: 14,
    category: "Projekt a súkromie",
    body: `Súkromie berieme vážne. Rýchly test sa dá spraviť **bez registrácie** a
bez ukladania odpovedí na server. Prihlásením získaš históriu — vtedy sa
výsledky ukladajú k tvojmu účtu.

Podrobnosti o spracúvaní údajov, cookies a tvojich právach (vrátane žiadostí
o prístup či výmaz) nájdeš na stránkach **Ochrana súkromia** a **Cookies**.`,
  },
  {
    slug: "kontakt",
    title: "Kontakt a podpora",
    description: "Ako nás kontaktovať a získať pomoc.",
    order: 15,
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
    order: 16,
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
