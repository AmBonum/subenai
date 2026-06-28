import type { Course } from "./_schema";

export const coRobitPoPodvodeCourse: Course = {
  slug: "co-robit-po-podvode",
  title: "Prvá pomoc — čo robiť, keď ti niekto napadol účet alebo kartu",
  tagline: "60 minút na zachránenie peňazí a reputácie. Krok po kroku, bez paniky.",
  category: "obecne",
  difficulty: "začiatočník",
  estimatedMinutes: 10,
  heroEmoji: "🚑",
  relatedQuestionsCategory: "scenario",
  publishedAt: "2026-05-20",
  updatedAt: "2026-05-20",
  sections: [
    {
      kind: "intro",
      heading: "Čo robiť po podvode — prvých 60 minút rozhoduje",
      body: `Čo robiť po podvode — toto je otázka, ktorú si googliš v panike, keď si práve klikol na zlý odkaz alebo zistil, že ti z účtu zmizla suma. Prvých 60 minút rozhoduje, či peniaze zachrániš, alebo nie. Banky majú právomoc stiahnuť transakciu v reálnom čase, kým ide cez SEPA (jednotnú európsku platobnú schému) — neskôr to už nie je možné. Napadnutý Facebook treba nahlásiť do niekoľkých hodín, kým útočník nezistí tvoje kontakty a nezačne ich oklamávať. Tento kurz je presný návod (runbook) pre 4 najčastejšie situácie: napadnutá karta, napadnutý e-mail či Facebook, falošný e-shop ti nedoručil tovar, alebo si poslal peniaze pri romance scame (podvod cez predstieraný ľúbostný vzťah) či pig butcheringu (dlhodobý investičný podvod budovaný cez vzťah). Žiadne dlhé teoretizovanie — kroky, čísla, formuláre.`,
    },
    {
      kind: "example",
      heading: `Situácia #1 — Cudzia transakcia na karte`,
      visual: {
        kind: "text",
        label: "Notifikácia z VÚB banky",
        body: `Transakcia: 489,00 EUR\nObchodník: ELEC-STORE-CN\nDátum: 2026-05-20 03:47\nLokácia: Šanghaj, Čína`,
      },
      commentary: `Prvé tri minúty: zablokuj kartu cez aplikáciu banky (Mobile Banking → karta → zablokovať). Ďalšie tri minúty: zavolaj banke (číslo na zadnej strane karty) a požiadaj o storno transakcie a chargeback (vrátenie peňazí cez banku). Posledné tri minúty: nová karta a zmena hesiel všade, kde si používal číslo karty.`,
    },
    {
      kind: "example",
      heading: `Situácia #2 — Hacknutý Facebook / Instagram`,
      visual: {
        kind: "text",
        label: "E-mail od Facebooku o novom prihlásení",
        body: `Nové prihlásenie na váš účet:\nZariadenie: Samsung Galaxy S24\nLokácia: Lagos, Nigéria\nIP: 197.210.x.x\nĎakujeme, že nás chránite. Ak to nebola vaša aktivita, postupujte podľa krokov...`,
      },
      commentary: `Skús sa hneď prihlásiť. Ak sa ti to podarí, zmeň heslo, odhlás všetky zariadenia (Nastavenia → Bezpečnosť → Aktívne relácie → Odhlásiť všade) a zapni 2FA (dvojfaktorové overenie). Ak sa prihlásiť nevieš: facebook.com/hacked alebo instagram.com/hacked — oba majú formálny proces obnovy.`,
    },
    {
      kind: "example",
      heading: `Situácia #3 — Fake e-shop ti nedoručil tovar`,
      visual: {
        kind: "text",
        label: `Email od „elektronika-vypredaj.sk" 14 dní po platbe`,
        body: `Vaša objednávka je momentálne v stave „spracováva sa". Z dôvodu vysokého dopytu sa doručenie môže zdržať o ďalších 30 dní. Ďakujeme za trpezlivosť.`,
      },
      commentary: `Klasická taktika falošného e-shopu — naťahovanie času do uplynutia 30-dňovej chargeback lehoty (skutočná je 120 dní pri Visa/Mastercard). Reklamáciu cez banku podaj IHNEĎ — netreba čakať. Doklady: e-mail s objednávkou, platobný výpis, komunikácia s predajcom.`,
    },
    {
      kind: "example",
      heading: `Situácia #4 — Poslal si peniaze romance / pig-butchering`,
      visual: {
        kind: "text",
        label: `Tvoj posledný prevod „Eleny" — krypto burza Binance`,
        body: `Odoslané: 8 400 EUR\nNa: BTC peňaženka bc1qxy2...kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\nDátum: 2026-05-19 22:14\nÚčel: „Investícia do akcií Tesla cez TradingBot Pro"`,
      },
      commentary: `Šanca na vrátenie je nízka, ale nie nulová. Polícii to nahlás hneď (najlepšie so snímkami obrazovky celej konverzácie). Burzy ako Binance majú compliance tím (oddelenie na dodržiavanie predpisov) — ak útočník použil zákaznícku peňaženku, dá sa zmraziť. Nečakaj na „posledný pokus o výber" — odhaľ podvod doma a na polícii hneď teraz.`,
    },
    {
      kind: "checklist",
      heading: "Runbook prvých 60 minút",
      items: [
        {
          good: true,
          text: "Krok 1 (do 5 minút): Zablokuj kartu cez mobile banking — nečakaj na telefonické centrum (call centrum).",
        },
        {
          good: true,
          text: "Krok 2 (do 15 minút): Zavolaj banke na číslo z karty, požiadaj o storno a chargeback. Zaznamenaj si číslo tiketu.",
        },
        {
          good: true,
          text: "Krok 3 (do 30 minút): Zmeň heslá — v prvom rade k e-mailu, banke, Facebooku a Apple ID / Google. Zapni 2FA všade, kde nie je.",
        },
        {
          good: true,
          text: "Krok 4 (do 60 minút): Screenshot všetkého — komunikácia, transakcie, doklady. Polícia ich bude vyžadovať.",
        },
        {
          good: true,
          text: "Krok 5 (do 24 hodín): Nahlásenie na SK-CERT (incident@sk-cert.sk) a miestnej polícii (osobne alebo online cez minv.sk).",
        },
        {
          good: false,
          text: `Čakanie „možno sa to vyrieši samo" — každá hodina znižuje šancu na vrátenie peňazí.`,
        },
        {
          good: false,
          text: "Hanbiť sa pred rodinou — buď otvorený, často potrebuješ druhú hlavu na rýchle rozhodnutia.",
        },
      ],
    },
    {
      kind: "redflags",
      heading: "Časté chyby obetí po podvode",
      flags: [
        `Nahlasujú podvod „až keď budú mať čas" — kritická lehota na chargeback je 120 dní, na storno SEPA platby HODINY.`,
        `Nezachovajú dôkazy — vymažú správy a zatvoria účet, čo komplikuje vyšetrovanie.`,
        `Platia „posledný poplatok" za uvoľnenie zvyšných peňazí — žiadny taký neexistuje, vždy je to ďalší krok scamu (podvodu).`,
        `Veria „advokátovi", ktorý ich kontaktuje s ponukou vrátiť stratené peniaze — sekundárny podvod.`,
        `Nezmenia heslá k iným službám, kde používali rovnaké údaje — útočník postupne prejde všetky.`,
        `Predpokladajú, že polícia podvod „nerieši" — rieši ho aktívne a pre štatistiky potrebuje vašu výpoveď.`,
        `Hanbia sa pred rodinou a riešia to sami — väčšina obetí potrebuje druhý pohľad na ďalšie rozhodnutia.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá pre prvé hodiny po podvode",
      do: [
        `Konaj okamžite — peniaze sa dajú zmraziť, kým sú ešte v systéme SEPA, nie po prevode na krypto burzu.`,
        `Zachovaj všetky dôkazy: snímky obrazovky, e-maily, čísla transakcií, záznamy o prihláseniach.`,
        `Nahlás podvod, aj keď nevieš, či to pomôže — vďaka štatistikám polície a SK-CERT sa dá chytiť ďalší páchateľ.`,
        `Povedz to rodine alebo partnerovi — druhá hlava ti pomôže nerobiť ďalšie chyby v panike.`,
      ],
      dont: [
        `Nikdy nezaplať „advokátovi", „policajtovi" či „recovery firme" (firme sľubujúcej vrátenie peňazí), ktorá ti volá nevyžiadane s ponukou vrátiť peniaze.`,
        `Nemaž dôkazy ani v hneve — sú jediným spôsobom, ako polícia útočníka identifikuje.`,
        `Nehovor o podvode na Facebooku verejne — útočník ťa zacieli druhým útokom z falošného profilu typu „pomôžem ti".`,
        `Nepodceň zmenu hesiel — ak útočník získal jeden účet, skúsi ten istý e-mail a heslo na 50 ďalších.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — 23:48, vidíš transakciu 1 200 € z karty v Číne",
      story: `Sedíš pred TV, prichádza ti push notifikácia z banky: „Transakcia 1 234 €, JD-PAYMENT-CN, lokácia Peking." Karta je v tvojej peňaženke. Banky majú call centrum už zatvorené.`,
      right_action: `Otvor aplikáciu banky → karta → zablokovať okamžite (max. 30 sekúnd). Otvor chatovú podporu v aplikácii (väčšina slovenských bánk má nepretržitý chat) — popíš transakciu a požiadaj o storno. Ak chat nie je k dispozícii, použi tlačidlo „nahlásiť podvodnú transakciu" priamo v aplikácii. Odfoť si obrazovku všetkého. Zajtra hneď ráno (o 8:00) zavolaj banke na číslo z karty — overíš stav reklamácie a požiadaš o vystavenie novej karty. Zmeň heslo u každého obchodníka, ktorý mal číslo karty. Pri rýchlej reakcii (do 60 minút) je šanca na vrátenie peňazí 70–90 %.`,
    },
  ],
  sources: [
    { label: "SK-CERT — nahlásenie incidentu", url: "https://www.sk-cert.sk/" },
    { label: "Polícia SR — nahlásiť kybernetický útok", url: "https://www.minv.sk/" },
    { label: "Národná banka Slovenska — reklamácie", url: "https://www.nbs.sk/" },
    { label: "SOI — ochrana spotrebiteľa", url: "https://www.soi.sk/" },
  ],
};
