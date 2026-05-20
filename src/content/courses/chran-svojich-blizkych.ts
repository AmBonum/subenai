import type { Course } from "./_schema";

export const ochranaBlizkychCourse: Course = {
  slug: "chran-svojich-blizkych",
  title: `Chráň svojich blízkych — ako pomôcť rodičom a starým rodičom`,
  tagline:
    "Seniori sú primárny cieľ podvodníkov v SR. Tu je sprievodca, ako pomôcť rodičom a starým rodičom rozpoznať podvod skôr, než zavolajú.",
  category: "obecne",
  difficulty: "začiatočník",
  estimatedMinutes: 8,
  heroEmoji: "👨‍👩‍👧",
  publishedAt: "2026-04-30",
  updatedAt: "2026-04-30",
  sections: [
    {
      kind: "intro",
      heading: "Prečo sú seniori v hľadáčiku",
      body: `Podľa dát Europolu seniori tvoria viac ako 60 % obetí telefonických podvodov. Dôvodov je niekoľko: väčšie úspory na účte, menší technologický prehľad a väčšia ochota dôverovať autoritám (banka, polícia, lekár). Ty — ako ich blízky — si prvá obranná línia. Nie preto, lebo sú neschopní, ale pretože útočníci sú profesionáli, ktorí na tom trávia celú pracovnú dobu. Táto kapitola ti dáva konkrétne nástroje na rozhovor, nastavenie a reakciu po prípadnom útoku.`,
    },
    {
      kind: "example",
      heading: `Scenár #1 — „Vnuk" volá z cudziny`,
      visual: {
        kind: "call",
        caller: "neznáme číslo (+43 9xx)",
        number: "+43 912 345 678",
        hint: `„Babička, to som ja, Peter, mám tu problém, zrážka autom v Rakúsku. Potrebujem zálohu na právnika, 1 200 EUR. Mama nevie, prosím, nepovez jej nič, príde tam niekto prevziať obálku."`,
      },
      commentary: `Útočníci skenujú sociálne siete, vedia meno vnuka, mesto kde býva babička. Hlas „nakloní" AI alebo jednoducho dúfajú, že babička ho v rozrušení nespozná. Heslo rodiny: zavolaj späť na číslo, ktoré máš uložené v kontaktoch. Vždy.`,
    },
    {
      kind: "example",
      heading: `Scenár #2 — Falošný bankový „poradca"`,
      visual: {
        kind: "call",
        caller: "VÚB Banka — bezpečnosť",
        number: "+421 2 xxxx xxxx",
        hint: `„Pán Kováč, zaznamenaná podozrivú transakcia na vašom účte. Aby sme vás ochránili, prosím choďte ihneď k bankomatu a urobte „bezpečnostný prevod" podľa môjho návodu."`,
      },
      commentary: `Banka nikdy nepýta „bezpečnostný prevod k bankomatu". Akonáhle si pri bankomate s telefónom v ruke podľa cudzieho návodu — peniaze odchádzajú tebe. Správny krok: zavesiť a zavolať banke na číslo zo zadnej strany karty.`,
    },
    {
      kind: "checklist",
      heading: "Čo urobiť so svojimi blízkymi ešte dnes",
      items: [
        {
          good: true,
          text: 'Dohodnite si rodinné „bezpečnostné slovo" — ktokoľvek ho nevie, nie je člen rodiny.',
        },
        {
          good: true,
          text: "Uložte rodičom do telefónu zákaznícku linku ich banky — priamo. Nech číslo nemusia hľadať.",
        },
        {
          good: true,
          text: "Nastavte SMS notifikácie pre každú transakciu na účte — každý výber, každý prevod.",
        },
        { good: true, text: "Zapnite 2FA na ich emailovom účte — stačí SMS, nemusí byť app." },
        {
          good: true,
          text: "Povedzte im: banka, polícia ani Microsoft nikdy nežiadajú kód z SMS ani heslo.",
        },
        {
          good: true,
          text: "Ak máte obavu, nastavte denný limit prevodov — banka to umožní za 5 minút v pobočke.",
        },
        {
          good: false,
          text: "Nevysmievajte sa im, ak na niečo naleteli — hanba ich odradí od včasného nahlásenia.",
        },
        {
          good: false,
          text: 'Nespoliehajte sa, že „u nás doma to nenastane" — nastane. Štatistika hovorí jasne.',
        },
      ],
    },
    {
      kind: "do_dont",
      heading: "Ak sa podvod stane — čo urobiť ihneď",
      do: [
        `Zavolajte banke okamžite — každá minúta zvyšuje šancu na zastavenie prevodu. Číslo: zadná strana karty.`,
        `Nahláste prípad na políciu (158) — bez nahlásenia nie je možné stíhanie ani štatistiky.`,
        `Zmeňte heslá na emaile a internet bankingu z bezpečného zariadenia.`,
        `Informujte ostatných príbuzných — útočníci volajú aj druhýkrát, keď vedia, že obeť „funguje".`,
        `Podporte blízkeho emocionálne — hanba a šok sú normálne reakcie, nie slabosť.`,
      ],
      dont: [
        `Neposielajte ďalšie peniaze na „späťplatbu" ani „poistenie" — to je ďalší útok.`,
        `Nekritizujte blízkeho, že dal peniaze — podvod je prepracovaný, victim-blaming nepomáha.`,
        `Nečakajte, kým sa „samo vyrieši" — operatívna banka intervencia funguje iba prvých 24 hodín.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Mama zavolá v panike",
      story: `Mama ti zavolá: „Volali z banky, že mi zablokujú účet, pomôž mi, prosím si ťa. Povedali, že mám ísť k bankomatu a zadať kód, ktorý mi pošlú." Je rozrušená, verí tomu. Chce ísť hneď.`,
      right_action: `Vysvetlíš jej pokojne: „Mama, to je podvod. Banka nikdy takto nevolá. Nezavesuj, neber nič." Potom jej zavoláte spolu na číslo z jej bankovej karty — nie to, čo jej nechali. Overia, že žiadna blokácia nie je. Mama je v pohode, peniaze sú v bezpečí.`,
    },
  ],
  sources: [
    { label: "Europol — senior fraud statistics", url: "https://www.europol.europa.eu/" },
    { label: "PZ SR — ochrana seniorov", url: "https://www.minv.sk/" },
    {
      label: "Slovak Banking Association — fraud prevention",
      url: "https://www.sbaonline.sk/",
    },
  ],
};
