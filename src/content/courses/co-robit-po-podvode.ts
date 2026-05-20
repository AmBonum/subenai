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
      body: `Čo robiť po podvode — toto je otázka, ktorú si googliš v panike, keď si práve klikol na zlý link alebo zistil, že ti zmizla suma z účtu. Prvých 60 minút rozhoduje, či peniaze zachrániš alebo nie. Banky majú právomoc stiahnuť transakciu v reálnom čase, kým ide cez SEPA — neskôr to už nie je možné. Hacknutý Facebook treba nahlásiť do hodín, kým útočník nezistí tvojich kontaktov a nezačne ich oklamávať. Tento kurz je presný runbook pre 4 najčastejšie situácie: napadnutá karta, hacknutý e-mail / FB, fake e-shop ti nedoručil tovar, romance / pig-butchering kde si poslal peniaze. Žiadne dlhé teoretizovanie — kroky, čísla, formuláre.`,
    },
    {
      kind: "example",
      heading: `Situácia #1 — Cudzia transakcia na karte`,
      visual: {
        kind: "text",
        label: "Notifikácia z VÚB banky",
        body: `Transakcia: 489,00 EUR\nObchodník: ELEC-STORE-CN\nDátum: 2026-05-20 03:47\nLokácia: Šanghaj, Čína`,
      },
      commentary: `Prvé tri minúty: blokácia karty cez appku banky (Mobile Banking → karta → zablokovať). Druhé tri minúty: zavolanie banky (číslo na zadnej strane karty) a žiadosť o storno transakcie + chargeback. Tretie tri minúty: nová karta + zmena hesiel všade, kde si používal číslo karty.`,
    },
    {
      kind: "example",
      heading: `Situácia #2 — Hacknutý Facebook / Instagram`,
      visual: {
        kind: "text",
        label: "E-mail od Facebooku o novom prihlásení",
        body: `Nové prihlásenie na váš účet:\nZariadenie: Samsung Galaxy S24\nLokácia: Lagos, Nigéria\nIP: 197.210.x.x\nĎakujeme, že nás chránite. Ak to nebola vaša aktivita, postupujte podľa krokov...`,
      },
      commentary: `Skús sa hneď prihlásiť. Ak vieš, zmeň heslo + odhlás všetky zariadenia (Nastavenia → Bezpečnosť → Aktívne relácie → Odhlásiť všade) + zapni 2FA. Ak nevieš sa prihlásiť: facebook.com/hacked / instagram.com/hacked — oba majú formálny proces obnovy.`,
    },
    {
      kind: "example",
      heading: `Situácia #3 — Fake e-shop ti nedoručil tovar`,
      visual: {
        kind: "text",
        label: `Email od „elektronika-vypredaj.sk" 14 dní po platbe`,
        body: `Vaša objednávka je momentálne v stave „spracováva sa". Z dôvodu vysokého dopytu sa doručenie môže zdržať o ďalších 30 dní. Ďakujeme za trpezlivosť.`,
      },
      commentary: `Klasická taktika fake e-shopu — naťahovanie do uplynutia 30-dňovej chargeback lehoty (skutočná je 120 dní pri Visa/Mastercard). Reklamáciu cez banku podaj IHNEĎ — netreba čakať. Doklady: e-mail objednávky, platobný výpis, komunikácia s predajcom.`,
    },
    {
      kind: "example",
      heading: `Situácia #4 — Poslal si peniaze romance / pig-butchering`,
      visual: {
        kind: "text",
        label: `Tvoj posledný prevod „Eleny" — krypto burza Binance`,
        body: `Odoslané: 8 400 EUR\nNa: BTC peňaženka bc1qxy2...kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\nDátum: 2026-05-19 22:14\nÚčel: „Investícia do akcií Tesla cez TradingBot Pro"`,
      },
      commentary: `Šanca na vrátenie je nízka, ale nie nulová. Polícii nahlás hneď (najlepšie s printscreenmi celej konverzácie). Burzy ako Binance majú compliance tím — ak útočník použil zákaznícku peňaženku, dá sa zmraziť. Nečakaj na „posledný pokus o výber" — odhal podvod doma a polícii teraz.`,
    },
    {
      kind: "checklist",
      heading: "Runbook prvých 60 minút",
      items: [
        {
          good: true,
          text: "Krok 1 (do 5 minút): Zablokuj kartu cez mobile banking — nečakaj na call centrum.",
        },
        {
          good: true,
          text: "Krok 2 (do 15 minút): Zavolaj banku na číslo z karty, požiadaj o storno + chargeback. Zaznamenaj číslo tiketu.",
        },
        {
          good: true,
          text: "Krok 3 (do 30 minút): Zmeň heslá — primárne na: e-mail, banka, Facebook, Apple ID / Google. Zapni 2FA všade, kde nie je.",
        },
        {
          good: true,
          text: "Krok 4 (do 60 minút): Screenshot všetkého — komunikácia, transakcie, doklady. Polícia ich bude vyžadovať.",
        },
        {
          good: true,
          text: "Krok 5 (do 24 hodín): Hláška na SK-CERT (incident@sk-cert.sk) + lokálna polícia (osobne alebo online cez minv.sk).",
        },
        {
          good: false,
          text: `Čakanie „možno sa to vyrieši samo" — každá hodina znižuje šancu na vrátenie peňazí.`,
        },
        {
          good: false,
          text: "Hanbenie sa pred rodinou — buď otvorený, často potrebuješ druhú hlavu na rýchle rozhodnutia.",
        },
      ],
    },
    {
      kind: "redflags",
      heading: "Časté chyby obetí po podvode",
      flags: [
        `Nahlasujú podvod „až keď budú mať čas" — kritická lehota na chargeback je 120 dní, na storno SEPA platby HODINY.`,
        `Nezachovajú dôkazy — vymažú správy, zatvoria účet, čo komplikuje vyšetrovanie.`,
        `Platia „posledný poplatok" za vyslobodenie zvyšných peňazí — nikdy neexistuje, vždy ďalší krok scamu.`,
        `Veria „advokátovi", ktorý ich kontaktuje s ponukou vrátiť stratené peniaze — sekundárny scam.`,
        `Nezmenia heslá k iným službám, kde používali rovnaké údaje — útočník postupne ide cez všetky.`,
        `Predpokladajú, že polícia podvod „nerieši" — riešia ho aktívne, ich štatistiky chcú vašu výpoveď.`,
        `Hanbia sa pred rodinou a riešia to sami — väčšina obetí potrebuje druhú perspektívu na ďalšie rozhodnutia.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá pre prvé hodiny po podvode",
      do: [
        `Konaj okamžite — peniaze sa zmrazia, kým ešte sú na SEPA mediu, nie po prevode do dark pool burzy.`,
        `Zachovaj všetky dôkazy: screenshoty, e-maily, čísla transakcií, prihlasovacie aktivity.`,
        `Nahláš podvod aj keď nevieš, či pomôže — štatistika polície + SK-CERT z toho dokáže chytiť ďalšieho páchateľa.`,
        `Povedz to rodine / partnerovi — druhá hlava ti pomôže nerobiť ďalšie chyby v panike.`,
      ],
      dont: [
        `Nikdy nezaplatí „advokátovi" / „policajtovi" / „recovery firme", ktorá ti volá nevyžiadane s ponukou vrátiť peniaze.`,
        `Nemaž dôkazy ani v hneve — sú jediný spôsob, ako sa polícii podarí útočníka identifikovať.`,
        `Nehovor o podvode na Facebooku verejne — útočník ťa zacieli druhým útokom z falošného „pomôžem ti" profilu.`,
        `Neignoruj zmenu hesiel — ak útočník dostal jeden účet, skúsi ten istý mail+heslo na 50 ďalších.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — 23:48, vidíš transakciu 1 200 € z karty v Číne",
      story: `Sedíš pred TV, prichádza ti push notifikácia z banky: „Transakcia 1 234 €, JD-PAYMENT-CN, lokácia Peking." Karta je v tvojej peňaženke. Banky majú call centrum už zatvorené.`,
      right_action: `Otvor appku banky → karta → zablokovať okamžite (max 30 sekúnd). Otvor chat support v appke (väčšina SK bánk má 24/7 chat) — popíš transakciu, požiadaj o storno. Ak chat nemá, použi tlačidlo „nahlásiť podvodnú transakciu" priamo v appke. Skríne všetko. Zajtra hneď ráno (8:00) zavolaj banku na číslo z karty — overíš stav reklamácie + požiadaš o vystavenie novej karty. Zmena hesla pri každom obchodníkovi, ktorý mal číslo karty. Pri rýchlej akcii (do 60 minút) je šanca na vrátenie peňazí 70–90 %.`,
    },
  ],
  sources: [
    { label: "SK-CERT — nahlásenie incidentu", url: "https://www.sk-cert.sk/" },
    { label: "Polícia SR — nahlásiť kybernetický útok", url: "https://www.minv.sk/" },
    { label: "Národná banka Slovenska — reklamácie", url: "https://www.nbs.sk/" },
    { label: "SOI — ochrana spotrebiteľa", url: "https://www.soi.sk/" },
  ],
};
