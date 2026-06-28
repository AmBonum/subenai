import type { Course } from "./_schema";

export const vishingCourse: Course = {
  slug: "vishing-telefonicke-podvody",
  title: `Vishing — telefonické podvody „banky", „polície" a „Microsoftu"`,
  tagline:
    '„Banka", „polícia" alebo „Microsoft" v telefóne? 4 scenáre + presné vety, ktorými hovor ukončíš za 5 sekúnd.',
  category: "voice",
  difficulty: "začiatočník",
  estimatedMinutes: 7,
  heroEmoji: "📞",
  relatedQuestionsCategory: "scenario",
  publishedAt: "2026-04-26",
  updatedAt: "2026-04-26",
  sections: [
    {
      kind: "intro",
      heading: "Telefón je psychologická bomba",
      body: `Vishing (phishing cez telefonát) zneužíva najsilnejšiu zbraň útočníka — živý hlas. Pri SMS si môžeš dať pauzu, e-mail si môžeš dvakrát prečítať. Ale keď ti zavolá „bankár" a tlačí ťa, mozog sa zasekne. Práve preto je vishing finančne najškodlivejší typ podvodu — priemerná škoda na jednu obeť je rádovo tisíce eur.`,
    },
    {
      kind: "example",
      heading: `Scenár #1 — „bankár" o úniku peňazí`,
      visual: {
        kind: "call",
        caller: "Slovenská sporiteľňa",
        number: "+421 2 5826 1111",
        hint: `„Dobrý deň, volám z bezpečnostného oddelenia. Z vášho účtu sa práve snaží odísť 4 800 EUR do zahraničia. Aby sme to zastavili, potrebujem od vás kód, ktorý vám teraz príde SMSkou."`,
      },
      commentary: `Skutočný bankár od teba NIKDY nepýta kód z SMS. Ten kód je práve to, čím útočník schvaľuje prevod (3D Secure / strong customer authentication). Diktovaním kódu mu sám podpíšeš odchod peňazí.`,
    },
    {
      kind: "example",
      heading: `Scenár #2 — „policajt" o vyšetrovaní`,
      visual: {
        kind: "call",
        caller: "PZ SR — vyšetrovanie",
        number: "0800 nezobrazí",
        hint: `„Volám z polície. Vaša identita bola zneužitá pri nelegálnom prevode. Pre ochranu vašich úspor ich musíte previesť na bezpečný účet, ktorý vám teraz nadiktujem."`,
      },
      commentary: `„Bezpečný účet polície" neexistuje. Polícia nikdy nepýta peniaze prevodom. Ak by skutočne vyšetrovala podvod, vyzve ťa na výsluch listinne, nie cez okamžitý prevod.`,
    },
    {
      kind: "example",
      heading: `Scenár #3 — „Microsoft support" o vírusoch`,
      visual: {
        kind: "call",
        caller: "Microsoft Technical",
        number: "+1 800 ... (neznáme)",
        hint: `„Hello, this is Microsoft Technical Support. Your computer is sending us critical error reports. Please install our remote access tool so we can help you."`,
      },
      commentary: `Microsoft NIKDY nezavolá. Bodka. Tento typ podvodu cielí najmä na anglicky hovoriacich seniorov, ale prichádza aj na slovenské čísla. „Vzdialený prístup" je vstupenka pre útočníka — vidí ti všetko vrátane bankingu.`,
    },
    {
      kind: "example",
      heading: `Scenár #4 — „dcéra v núdzi" (deepfake hlas — umelo vygenerovaný falošný hlas)`,
      visual: {
        kind: "call",
        caller: "neznáme číslo",
        number: "+421 9xx xxx xxx",
        hint: `„Mami, to som ja, mám problém, ukradli mi peňaženku, môžeš mi rýchlo poslať 800 EUR na tento účet? Prosím, nikomu nehovor, vysvetlím to potom."`,
      },
      commentary: `AI dnes vie naklonovať hlas z 30 sekúnd nahrávky (napr. zo sociálnych sietí). „Niekomu nehovor" je psychologický prevod — útočník izoluje obeť od overenia. Vždy zavolaj späť na známe číslo, ktoré máš v kontaktoch.`,
    },
    {
      kind: "redflags",
      heading: "Indície, že hovor je podvod",
      flags: [
        `Volajúci od „banky" pýta kód z SMS, OTP (jednorazový overovací kód), PIN alebo heslo do internet bankingu.`,
        `„Polícia" / „daňový úrad" / „súd" tlačí na okamžitý prevod alebo platbu.`,
        `„Microsoft", „Google", „Apple support" volá z vlastnej iniciatívy.`,
        `Volajúci požaduje, aby si nezavesil a šiel s telefónom k bankomatu.`,
        `„Príbuzný v núdzi" žiada peniaze a hovorí „nikomu nehovor".`,
        `Zvuk hovoru je čudný — buď príliš čistý (deepfake), alebo veľa pozadia (call centrum).`,
        `Číslo zo zahraničia, ktoré sa tvári ako slovenská inštitúcia.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá, ktoré ťa zachránia",
      do: [
        `Zavesiť. Hneď. Žiadne vysvetľovanie, žiadne „len chvíľku".`,
        `Zavolať banke / polícii späť na ich oficiálne číslo z webu (NIE číslo, ktoré ti volalo).`,
        `Ak ti volá „príbuzný v núdzi", zavolaj mu späť na známe číslo z kontaktov.`,
        `Nahlásiť podvod na 158 (PZ SR) alebo NCKB pre štatistiku.`,
      ],
      dont: [
        `Nediktovať OTP, PIN, heslo, kód z SMS — ani „bankárovi", ani „polícii".`,
        `Neísť k bankomatu na pokyn neznámeho hlasu.`,
        `Nedávať vzdialený prístup do PC nikomu, kto zavolal sám.`,
        `Nesúhlasiť s prevodom „na bezpečný účet". Taký účet neexistuje.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — utorok poobede",
      story: `Zazvoní ti telefón. Číslo +421 2 5826 1111. „Dobrý deň, volám zo Slovenskej sporiteľne, oddelenie podvodov. Z vášho účtu sa pokúša odísť 3 200 EUR. Aby sme to zastavili, potrebujem rýchlo kód, ktorý vám teraz pošle banka SMSkou."`,
      right_action: `Zavesíš. Otvoríš si SLSP appku alebo internet banking. Tam vidíš, či sa skutočne niečo deje. Ak chceš, zavoláš banke na číslo z webu slsp.sk (nie z toho, ktoré ti volalo). 99 % prípadov — žiadny prevod sa nedeje, len útočník skúša šancu.`,
    },
  ],
  sources: [
    { label: "NCKB — telefonické podvody", url: "https://www.sk-cert.sk/" },
    { label: "PZ SR — varovania pre seniorov", url: "https://www.minv.sk/" },
    { label: "Slovenská banková asociácia — bezpečnosť", url: "https://www.sbaonline.sk/" },
  ],
};
