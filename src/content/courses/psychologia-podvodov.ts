import type { Course } from "./_schema";

export const psychologiaPodvodovCourse: Course = {
  slug: "psychologia-podvodov",
  title: "Psychológia podvodov — prečo naletíš, aj keď nie si hlúpy",
  tagline: "6 kognitívnych pascí, na ktoré stavajú podvodníci v SR — a ako ich vypnúť.",
  category: "obecne",
  difficulty: "pokročilý",
  estimatedMinutes: 10,
  heroEmoji: "🧠",
  relatedQuestionsCategory: "scenario",
  publishedAt: "2026-05-20",
  updatedAt: "2026-05-20",
  sections: [
    {
      kind: "intro",
      heading: "Podvod nie je o IQ — je o stave mysle",
      body: `Psychológia podvodov nie je o tom, či si „dosť bystrý". Naletia právnici, lekári aj programátori — všetci s vysokým IQ. Útočník nehrá proti tvojej inteligencii, ale proti tvojmu mozgu v momente stresu, naliehavosti alebo emócie. Funguje to na evolučne staré obvody: strach o peniaze, rešpekt k autorite, túžba pomôcť. Keď v Tatra banke vidíš varovnú SMS o „zablokovanom účte", racionálna časť mozgu dostane päťsekundové okno — a útočník presne v ňom potrebuje, aby si klikol. Tento kurz ti ukáže, ako tie spúšťače rozpoznať skôr, než ti vypnú zdravý úsudok.`,
    },
    {
      kind: "example",
      heading: `Pasca #1 — Naliehavosť („urobte to teraz")`,
      visual: {
        kind: "sms",
        sender: "TatraBanka",
        body: `Podozriva transakcia 1 248 EUR. Ak nebola Vasa, potvrdte zrusenie do 10 minut: tatra-bezpecnost.sk-overenie.com`,
        time: "dnes 22:48",
      },
      commentary: `Časový tlak vypína prefrontálny kortex. „Do 10 minút" + neskorá hodina = mozog v panike klikne. Skutočná Tatra banka ti dá čas, žiadne 10-minútové ultimátum.`,
    },
    {
      kind: "example",
      heading: `Pasca #2 — Autorita („volá vám polícia")`,
      visual: {
        kind: "call",
        caller: "kpt. Mgr. Novák, NAKA",
        number: "+421 2 4444 1234",
        hint: "číslo sa dá sfalšovať cez VoIP — caller ID nie je dôkaz",
      },
      commentary: `Titul, hodnosť, oficiálny tón. Mozog je naučený poslúchať autoritu. Skutočný vyšetrovateľ ťa nikdy nežiada o presun peňazí cez telefón — vyšetrovanie ide cez výsluch na stanici.`,
    },
    {
      kind: "example",
      heading: `Pasca #3 — Sociálny dôkaz („všetci to robia")`,
      visual: {
        kind: "instagram",
        account: "crypto_slovakia_2026",
        verified: false,
        body: `Už 4 800 slovákov zarobilo s našou AI platformou minimálne 1 200 € týždenne. Pridaj sa, kým je miesto.`,
        cta: "Zistiť viac",
        imageEmoji: "💰",
      },
      commentary: `„Tisíce iných to robia" obíde tvoj kritický filter — keď to funguje masám, asi to nie je podvod, že? Falošné komentáre a falošné účty sú jeden z najlacnejších nástrojov podvodníka.`,
    },
    {
      kind: "example",
      heading: `Pasca #4 — Strach a strata`,
      visual: {
        kind: "email",
        from: "Slovenská sporiteľňa — Bezpečnosť",
        fromEmail: "security@slsp-overenie.eu",
        subject: "URGENT: Váš účet bude zablokovaný do 24h",
        body: `Detegovali sme neoprávnený pokus o prihlásenie. Pre zachovanie prístupu sa musíte overiť do 24 hodín, inak bude účet zablokovaný a všetky transakcie pozastavené.`,
        cta: "Overiť účet",
      },
      commentary: `Strata bolí dvakrát viac než radosť zo zisku (averzia k strate, Kahneman). „Stratíš prístup" je silnejšia páka než „získaj bonus". Slovenská sporiteľňa neposiela hrozby cez e-mail.`,
    },
    {
      kind: "example",
      heading: `Pasca #5 — Reciprocita („už si toho do nás vložil veľa")`,
      visual: {
        kind: "text",
        label: `Správa od „investičného poradcu" po 3 mesiacoch chatovania`,
        body: `Anna, prosím, len ešte 800 €. Účet je takmer odblokovaný a tých 47 000 € konečne uvidíš. Zachránil som ťa z tej kryptopasce, pamätáš? Ver mi naposledy.`,
      },
      commentary: `Pig butchering (dlhodobý investičný podvod budovaný cez vzťah) hrá na pocit dlhu („pomohol mi"). Čím viac si investoval — čas, peniaze, emócie — tým ťažšie sa odchádza. Klasický sunk-cost fallacy (klam utopených nákladov).`,
    },
    {
      kind: "redflags",
      heading: "7 spúšťačov, ktoré robia tvoj mozog zraniteľným",
      flags: [
        `Naliehavosť — „do 10 minút", „posledná šanca", „inak ti zablokujú účet".`,
        `Autorita — uniforma, titul, hodnosť, „pán doktor", „kapitán polície".`,
        `Strach — hrozba straty peňazí, prístupu, reputácie, slobody.`,
        `Sociálny dôkaz — „4 800 ľudí už zarobilo", falošné recenzie a komentáre.`,
        `Reciprocita — „pomohol som ti, teraz ty mne", „spolu sme prešli toľko".`,
        `Vzácnosť — „posledných 5 kusov", „ponuka platí len dnes do polnoci".`,
        `Sympatia — útočník sa s tebou priatelí 3 mesiace, než vytiahne peniaze.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Ako si vypnúť automatickú reakciu",
      do: [
        `Pri každej naliehavej správe sa donúť počkať 10 minút pred akýmkoľvek krokom — emócia za ten čas opadne.`,
        `Pýtaj sa: „Prečo sa on/ona ponáhľa, keď ja nemusím?" Naliehavosť je varovný signál.`,
        `Overuj druhým kanálom — banka SMS, telefón na oficiálne číslo z webu, nie z e-mailu.`,
        `Hovor s niekým z rodiny alebo kolegom skôr, než pošleš väčšiu sumu komukoľvek.`,
      ],
      dont: [
        `Nikdy nerob finančné rozhodnutia v strese, panike alebo neskoro v noci.`,
        `Neignoruj pocit, že „niečo je čudné" — intuícia je často rýchlejšia než logika.`,
        `Nepreceňuj sa — „mne sa to nestane" je presne to myslenie, na ktorom podvodníci stavajú.`,
        `Nedôveruj zobrazenému číslu volajúceho (caller ID), e-mailovým adresám ani titulom — všetko sa dá sfalšovať.`,
      ],
    },
    {
      kind: "scenario",
      heading: `Reálny scenár — falošný „bankár"`,
      story: `Volá ti človek, predstavuje sa ako Peter Hudák zo Slovenskej sporiteľne, bezpečnostné oddelenie. Vie tvoje meno, vie posledné 4 čísla karty (zistené z úniku dát). Hovorí: „Pán Kováč, práve sa vám niekto pokúsil zobrať 2 400 €. Aby sme transakciu zablokovali, presuňte peniaze na bezpečnostný účet, ktorý vám teraz nadiktujem."`,
      right_action: `Zavesíš. Otvoríš mobilnú aplikáciu Slovenskej sporiteľne — tam vidíš všetky transakcie naživo. Ak je niečo podozrivé, voláš na číslo z aplikácie alebo z karty (nie na to, z ktorého ti práve volal „Peter"). Žiadna banka v SR nikdy nežiada presun peňazí na „bezpečnostný účet". To je vždy podvod.`,
    },
  ],
  sources: [
    { label: "NBÚ — odporúčania pre občanov", url: "https://www.nbu.gov.sk/" },
    { label: "SK-CERT — najčastejšie typy podvodov", url: "https://www.sk-cert.sk/" },
    { label: "Polícia SR — kybernetická kriminalita", url: "https://www.minv.sk/" },
  ],
};
