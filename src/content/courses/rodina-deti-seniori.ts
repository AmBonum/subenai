import type { Course } from "./_schema";

export const rodinaDetiSenioriCourse: Course = {
  slug: "rodina-deti-seniori",
  title: "Bezpečnosť rodiny — deti, rodičia, starí rodičia",
  tagline: "3 nastavenia pre 3 generácie, ktorými ochrániš rodinu na internete za víkend.",
  category: "vztahy",
  difficulty: "začiatočník",
  estimatedMinutes: 11,
  heroEmoji: "👨‍👩‍👧",
  relatedQuestionsCategory: "scenario",
  publishedAt: "2026-05-20",
  updatedAt: "2026-05-20",
  sections: [
    {
      kind: "intro",
      heading: "Bezpečnosť rodiny — tri rôzne generácie, tri rôzne riziká",
      body: `Bezpečnosť rodiny online v 2026 znamená tri úplne odlišné konverzácie. S deťmi (7–14) riešiš rodičovskú kontrolu, kyberšikanu a Discord/TikTok. S tínedžermi (15–18) hovoríš o sextingu, fake profiloch a tom, prečo Snapchat nie je súkromný. So seniormi rodičmi a starými rodičmi nastavuješ ich smartfón tak, aby im romance scammer a falošný „vnuk v núdzi" nezobrali úspory. Tento kurz dáva konkrétne kroky pre každú skupinu — nie strašenie, ale praktické zapnutie 2FA, blokovanie webov a krízová linka 116 111, ktorá pre dieťa zachraňuje životy.`,
    },
    {
      kind: "example",
      heading: `Deti — kyberšikana na Discord serveri`,
      visual: {
        kind: "text",
        label: "Správa na Discord serveri školskej triedy",
        body: `tomas: jana je ozaj kravata, pozrite ako vyzera lol (priložená upravená fotka)\nlukas: 😂😂😂\npetra: a este aj smrdi pry\ntomas: ked pride zajtra do skoly tak ju natocime`,
      },
      commentary: `Kyberšikana sa neskončí o 15:00 ako tá v škole — pokračuje 24/7 na telefóne dieťaťa. Linka detskej istoty 116 111 (zdarma, anonymne, 24/7) je prvý krok. Discord report a screenshot druhý.`,
    },
    {
      kind: "example",
      heading: `Tínedžeri — fake profil „od dievčaťa zo školy"`,
      visual: {
        kind: "instagram",
        account: "lucia_zo_skoly_2026",
        verified: false,
        body: `ahoj, vidim ze chodis do nasej skoly, mas pekne oci 😊 napis mi na snap: luciahot.snap`,
        cta: "Sledovať",
      },
      commentary: `Sextortion v 2026: scammer naviaže kontakt ako „spolužiačka", presunie konverzáciu na Snap, vypýta intímnu fotku, potom vydiera. Pre tínedžera katastrofa — preto musí vedieť, že hovor s rodičom NIE JE trest, je jediné riešenie.`,
    },
    {
      kind: "example",
      heading: `Seniori — „vnuk mal nehodu"`,
      visual: {
        kind: "call",
        caller: "neznáme číslo",
        number: "+421 940 555 111",
        hint: "často aj český kód +420 alebo zahraničný — caller ID sa dá sfalšovať",
      },
      commentary: `„Babka, mal som autonehodu, súrne 3 800 € na advokáta, neviem rozprávať, hlas mám rozbitý." Klasika. V 2026 navyše s AI klonom hlasu reálneho vnuka z TikTok/Instagram videa. Žiadne peniaze sa nikdy neposielajú cez prevodníka alebo „kuriérovi" k bytu.`,
    },
    {
      kind: "example",
      heading: `Seniori — falošný „technik z Microsoftu"`,
      visual: {
        kind: "call",
        caller: "Microsoft Support",
        number: "+421 2 0000 1234",
        hint: "Microsoft nikdy nevolá užívateľom — nikdy",
      },
      commentary: `Volajúci tvrdí, že počítač babky je „nakazený vírusom", potrebuje inštalovať TeamViewer/AnyDesk na „opravu". Cieľ: prístup do internet bankingu. Žiadna IT firma nikdy nevolá nevyžiadane.`,
    },
    {
      kind: "checklist",
      heading: "Checklist pre rodičovský smartfón (8–14 rokov)",
      items: [
        {
          good: true,
          text: "Apple: Screen Time → Content & Privacy Restrictions. Android: Google Family Link — obe zdarma, jeden víkend nastaviť.",
        },
        {
          good: true,
          text: "Limit obrazovkového času, blokácia 18+ obsahu, schvaľovanie každej novej appky cez rodičovský telefón.",
        },
        {
          good: true,
          text: "Vypnutie in-app nákupov (Apple ID / Google Play → vyžadovať heslo pri každom nákupe).",
        },
        {
          good: true,
          text: `Dohoda s dieťaťom napísaná: „v izbe telefón nie po 21:00, pri jedle nie, pri úlohách nie".`,
        },
        {
          good: false,
          text: "Stalkerware (mSpy, FlexiSpy) bez vedomia tínedžera — nelegálne, zničí dôveru, nefunguje dlhodobo.",
        },
        {
          good: false,
          text: `„Mne neverí, lebo si stiahol Snapchat" — Snapchat nie je zlý, dôležitý je rozhovor, nie zákaz.`,
        },
      ],
    },
    {
      kind: "redflags",
      heading: "Varovné signály, že dieťa zažíva problém",
      flags: [
        `Náhle vypína telefón / otáča obrazovku, keď vojdeš do izby.`,
        `Prestáva chodiť do školy alebo na krúžky, ktoré roky miloval.`,
        `Spí horšie, je vyhasnutý, podráždený — bez zjavnej príčiny.`,
        `Stratil priateľov, prestal písať s niekým, s kým bol roky.`,
        `Bojí sa pozrieť na nové správy / notifikácie.`,
        `Hovorí o sebe negatívne („som škaredý", „nikto ma nemá rád") — nové, intenzívne.`,
        `Zmizli mu peniaze z vrecka alebo karty — môže byť obeť sextortion.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá pre rodinu",
      do: [
        `Pre starých rodičov nastav 2FA na ich e-mail a banku (najlepšie cez SMS, autenticator je pre nich ťažký).`,
        `Pre dieťa povedz nahlas: „Ak ti niekto na nete urobí čokoľvek, čo ťa vystraší, povieš mi a NIE som naštvaný. Pomôžem."`,
        `Spoločne s tínedžerom prejdite nastavenia súkromia na Instagrame / TikToku — kto vidí stories, kto môže komentovať.`,
        `Číslo 116 111 (Linka detskej istoty) vytlač a daj na chladničku — anonymne, zdarma, 24/7.`,
      ],
      dont: [
        `Nikdy nedovoľ starým rodičom inštalovať „pomocné" appky (TeamViewer, AnyDesk) z telefonického návodu.`,
        `Netrestajte dieťa za to, že vám povedalo o sextortioe / podvode — strestáte budúce priznania.`,
        `Nečítajte tínedžerovi správy bez jeho vedomia — buď sa s vami baví, alebo s falošnou „Luciou".`,
        `Nedávajte deťom kartu rodiča s NFC bez limitu — nastavte vreckové na vlastnú detskú kartu (Mintos Kids, Revolut <18).`,
      ],
    },
    {
      kind: "scenario",
      heading: `Reálny scenár — babka a „vnuk Maťo"`,
      story: `Babke (74) volá človek: „Babka, to som ja, Maťo. Mal som autonehodu na D1, niekoho som zranil. Súrne potrebujem 4 200 € na advokáta, inak idem do väzby. Príde po peniaze môj kolega Pavol, nemôžem ti to povedať podrobnejšie, polícia ma sleduje." Hlas naozaj vyzerá ako Maťov — útočník zostrihal AI klon z jeho Instagram stories.`,
      right_action: `Babka zavesí. Zavolá Maťovi priamo na jeho známe číslo. Ak je nedostupný, zavolá jeho mame (svojej dcére) na overenie. Polícia v SR nikdy nevyžaduje úhradu „za advokáta v hotovosti k bytu". Toto je vždy podvod — a v 2026 už aj s AI klonom hlasu. Najlepšia prevencia: rodina má vopred dohodnuté „rodinné kontrolné slovo" — slovo, ktoré pozná len rodina a útočník ho nezistí.`,
    },
  ],
  sources: [
    { label: "Linka detskej istoty 116 111", url: "https://www.ldi.sk/" },
    { label: "ipcko.sk — internetová poradňa pre mladých", url: "https://ipcko.sk/" },
    { label: "SK-CERT — odporúčania pre rodičov", url: "https://www.sk-cert.sk/" },
    { label: "Polícia SR — podvody na senioroch", url: "https://www.minv.sk/" },
  ],
};
