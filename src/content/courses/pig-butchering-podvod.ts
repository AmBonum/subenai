import type { Course } from "./_schema";

export const pigButcheringCourse: Course = {
  slug: "pig-butchering-podvod",
  title: "Pig butchering — najdrahší podvod súčasnosti",
  tagline:
    "Najdrahší podvod súčasnosti: cudzinec na WhatsApp, falošný krypto účet, fingované zisky — a koniec, keď si vyberieš.",
  category: "investicie",
  difficulty: "pokročilý",
  estimatedMinutes: 10,
  heroEmoji: "🐷",
  relatedQuestionsCategory: "scenario",
  publishedAt: "2026-04-29",
  updatedAt: "2026-04-29",
  sections: [
    {
      kind: "embed",
      heading: "Pozri si na úvod: príliš lákavé investičné ponuky",
      audio: {
        provider: "youtube",
        url: "https://www.youtube.com/watch?v=2i3vmNX6rTI",
        title: "Buďte opatrní pri investičných ponukách s príliš lákavým výnosom",
        sourceName: "Tatra banka",
        sourceUrl: "https://www.youtube.com/watch?v=2i3vmNX6rTI",
        description:
          "Oficiálne osvetové video Tatra banky — názorná (hraná) ukážka, nie autentická nahrávka.",
      },
    },
    {
      kind: "intro",
      heading: 'Čo je „pig butchering"?',
      body: `Pig butchering (doslova „vykŕmiť a zabiť") je kombinovaný podvod, pri ktorom útočník najprv buduje vzťah s obeťou — romantický alebo priateľský — a potom ju lákavými investičnými „príležitosťami" pozvoľna oberá o celé úspory. Nie je to rýchly útok: trvá týždne až mesiace. Podľa Europolu je dnes táto schéma zodpovedná za väčšinu z miliárd eur ročne strácaných na investičných podvodoch v EÚ. Cieľ: ľudia v každom veku — od vysokoškolských študentov po dôchodcov.`,
    },
    {
      kind: "scenario",
      heading: 'Fáza 1 — Prvý kontakt: „Bol som to omylom"',
      story: `Na WhatsApp sa ti ozve správa: „Ahoj Katarína, toto číslo mi dal Tomáš, volám sa Li Wei, ale asi som sa pomýlil v čísle — ospravedlňujem sa!" Odhováraš ho a on sa zdvorilo ospravedlní. O deň neskôr napíše znova: „Keďže sme sa už porozprávali, chcem sa aspoň predstaviť — pracujem v oblasti financií v Ženeve, momentálne v Bratislave na konferencii." Fotka: atraktívny Ázijčan v elegantnom obleku pred hotelom.`,
      right_action: `Nezodpovedáš vôbec (alebo zdvorilo ukončíš konverzáciu). „Omylom" správy od cudzincov, ktorí hneď začnú hovoriť o práci a cestovaní, sú štartovací scenár pig butchering podvodu. Neexistuje „náhodný omyl" — čísla sa volia cielene.`,
    },
    {
      kind: "scenario",
      heading: "Fáza 2 — Budovanie dôvery: týždne chatu",
      story: `Li Wei ti píše každý deň. Zaujíma sa o teba, pýta sa na prácu, rodinu, záujmy. Posiela fotky z „pracovných ciest" — Dubaj, Singapur, Zürich. Pôsobí sofistikovane, empaticky, vtipne. Po troch týždňoch sa cítiš, akoby si ho dobre poznala. Nikdy sa nespomenulo nič o peniazoch alebo investíciách.`,
      right_action: `Búriš sa: ako sa môže človek, ktorého si nikdy nevidela na videohovore (vždy má technický problém), stať tvojím dôverným priateľom? Videá, fotky ani profil na LinkedIn nedokážu nahradiť overený živý kontakt. Každý, kto sa po týždňoch intenzívneho písania stále vyhýba videochatu, má dôvod niečo skrývať.`,
    },
    {
      kind: "example",
      heading: "Fáza 3 — Prvý nástup na investičnú platformu",
      visual: {
        kind: "text",
        label: "Screenshot WhatsApp konverzácie",
        body: `Li Wei: „Viem, že si opatrná, ale chcem sa s tebou podeliť o niečo, čo zmenilo môj život. Pracujem s rodinným brokerom, ktorý má prístup k privátnej obchodnej platforme. Za posledné 3 mesiace som zhodnotil 220 %. Investujem len sumu, ktorú si môžem dovoliť stratiť — 2 000 € stačí na začiatok. Nemusíš nič robiť, ja ti ukážem každý krok."`,
      },
      commentary: `„Rodinný broker", „privátna platforma", konkrétne percentá zisku a ubezpečenie „stačí málo" — to sú tri signály z učebnice. Žiadna legitímna investičná platforma nie je dostupná iba cez osobný kontakt. Zisky nad 200 % za mesiac sú bez extrémneho rizika fyzicky nemožné.`,
    },
    {
      kind: "example",
      heading: "Fáza 4 — Falošný zisk a eskalácia",
      visual: {
        kind: "text",
        label: "Platforma investsk-global-trade.com",
        body: `Tvoj dashboard ukazuje: Vložené: 2 000 € | Aktuálna hodnota: 4 870 € (+143 %). Výber: Minimálny výber 5 000 €. „Li Wei, vidím zisk! Ale nedostanem ho?" — „Nevadí, doložím rozdiel ja, stačí ak pridáš ďalších 1 500 € a môžeš hneď vyberať."`,
      },
      commentary: `Zisky na platforme sú fiktívne — číslice sa menia ako v počítačovej hre a kontroluje ich útočník. Podmienka „minimálny výber" je zámer: donútiť ťa vložiť viac. Žiadna regulovaná platforma nedrží tvoje peniaze takýmto spôsobom.`,
    },
    {
      kind: "example",
      heading: "Fáza 5 — Daňová pasca a zmiznutie",
      visual: {
        kind: "text",
        label: 'E-mail „platformy"',
        body: `Od: support@investsk-global-trade.com | Predmet: Váš výber bol pozastavený\n\nVážená pani, pred uvoľnením výberu 18 400 € musíte uhradiť daňovú zálohu 15 % (2 760 €) podľa medzinárodného nariadenia OECD. Platbu realizujte do 48 hodín kryptomenou na adresu bc1q...`,
      },
      commentary: `„Daňová záloha" pred výberom je posledná pasca. Ak zaplatíš, príde ďalší poplatok — AML povinnosť (opatrenia proti praniu špinavých peňazí), poistné a podobne. Keď odmietneš, platforma sa „zasekne" a Li Wei prestane odpovedať. Regulovaní brokeri nikdy nevyžadujú daňové zálohy v kryptomenách pred výberom — dane platíš VY svojmu daňovému úradu PO prijatí peňazí.`,
    },
    {
      kind: "redflags",
      heading: "7 signálov pig butchering útoku",
      flags: [
        `Prvý kontakt je „omylom" — správa adresovaná inému menu alebo číslu.`,
        `Cudzinec s luxusným životným štýlom (fotky z hotelov, luxusné autá, exotické krajiny) buduje intenzívny vzťah čisto online.`,
        `Videohovor sa nikdy neuskutoční — technický problém, rušná práca, iný dôvod.`,
        `Po týždňoch/mesiacoch osobného chatu nasleduje návrh „súkromnej" investičnej príležitosti so zaručeným ziskom.`,
        `Platforma je prístupná len cez odkaz od kontaktu, nie cez bežný obchod s aplikáciami či regulátora.`,
        `Podmienka výberu peňazí je vždy nová — minimálna suma, daň, poplatok, „overenie".`,
        `Kontakt namiesto teba „vysvetlí" ako platiť daň — v kryptomenách, pred výberom.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Ako sa chrániť",
      do: [
        `Overte každého cudzinca, s ktorým komunikujete online: reverzné vyhľadávanie fotky (Google Obrázky / TinEye), LinkedIn, overenie telefónneho čísla.`,
        `Trvajte na živom videohovore cez WhatsApp alebo FaceTime pred akýmkoľvek finančným rozhovorom.`,
        `Skontrolujte investičnú platformu v registri NBS (nbs.sk) alebo ESMA (esma.europa.eu) — ak tam nie je, je nelegálna.`,
        `Poraďte sa s niekým dôveryhodným (rodina, priateľ) pred akýmkoľvek presunom peňazí.`,
        `Ak ste sa stali obeťou: kontaktujte políciu SR (158) a NBS, zablokujte prístupy, zdokumentujte všetku komunikáciu.`,
      ],
      dont: [
        `Neposielajte peniaze nikomu, koho poznáte iba z online kontaktu, bez fyzického stretnutia.`,
        `Neinvestujte cez platformu, ku ktorej vás naviedol romantický záujem alebo „priateľ" z internetu.`,
        `Neplaťte žiadne „dane" ani „poplatky" pred výberom investičného zisku — to je vždy podvod.`,
        `Nepokúšajte sa o pomstu ani o „získanie peňazí späť" cez iné „recovery" firmy (firmy sľubujúce vrátenie ukradnutých peňazí) — to je ďalší podvod.`,
      ],
    },
  ],
  sources: [
    {
      label: "Europol IOCTA 2025 — Investment fraud trends",
      url: "https://www.europol.europa.eu/publication-events/main-reports/steal-deal-and-repeat-how-cybercriminals-trade-and-exploit-your-data",
    },
    {
      label: "Europol IOCTA 2026 — AI a podvody",
      url: "https://www.europol.europa.eu/publication-events/main-reports/iocta-2026-evolving-threat-landscape",
    },
    {
      label: "NBS — varovania pred nelegálnymi investičnými platformami",
      url: "https://www.nbs.sk/sk/spotrebitelia/ochrana-spotrebitela/varovania-pred-podvodmi",
    },
  ],
};
