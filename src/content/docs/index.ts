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
