import type { Course } from "./_schema";

export const bezpecneOnlineNakupyCourse: Course = {
  slug: "bezpecne-online-nakupy",
  title: "Bezpečné online nákupy — karta, PayPal a chargeback",
  tagline: "3 platobné triky a 1 vec na karte, vďaka ktorým ťa fake e-shop neoberie.",
  category: "marketplace",
  difficulty: "začiatočník",
  estimatedMinutes: 8,
  heroEmoji: "💳",
  relatedQuestionsCategory: "fake_vs_real",
  publishedAt: "2026-05-20",
  updatedAt: "2026-05-20",
  sections: [
    {
      kind: "intro",
      heading: "Bezpečné online nákupy začínajú pri výbere platby",
      body: `Bezpečné online nákupy nie sú o tom, že prestaneš nakupovať. Sú o tom, že si vyberáš platobnú metódu, ktorá ti dáva páku, keď sa niečo pokazí. Kartová platba má chargeback (vrátenie peňazí cez banku do 120 dní). PayPal má Buyer Protection (ochranu kupujúceho). Apple Pay a Google Pay maskujú reálne číslo karty. Revolut a Wise ti dovolia vytvoriť jednorazovú virtuálnu kartu len na ten konkrétny nákup. Bankový prevod nemá nič z toho — keď peniaze odídu, sú preč. Tento kurz ti ukáže, ako tieto nástroje použiť v praxi pri nákupe na Slovensku.`,
    },
    {
      kind: "example",
      heading: `Vzor #1 — Virtuálna karta z Revolutu`,
      visual: {
        kind: "text",
        label: "Revolut → Karty → Virtuálne karty",
        body: `Vytvor jednorazovú virtuálnu kartu. Po prvom použití sa automaticky deaktivuje. Limit nastav presne na sumu nákupu + 5 % rezerva na DPH/poštovné. Číslo karty platí len 24 hodín.`,
      },
      commentary: `Ideálne pre nedôveryhodné e-shopy. Aj keď údaje uniknú, karta je mŕtva po jednom použití. Revolut, Wise aj Curve túto funkciu majú v základnej (bezplatnej) verzii.`,
    },
    {
      kind: "example",
      heading: `Vzor #2 — Reklama „posledná šanca" z Facebooku`,
      visual: {
        kind: "url",
        url: "https://luxus-hodinky-sk.shop/rolex-submariner-499eur",
        secure: true,
      },
      commentary: `Rolex Submariner stojí 9 000 € a viac. Pri 95 % zľave to nie je akcia, je to podvod. Aj keby si zaplatil, v lepšom prípade dostaneš falzifikát z Číny, v horšom nič. Kartu na takéto stránky nikdy nezadávaj.`,
    },
    {
      kind: "example",
      heading: `Vzor #3 — Reklamácia cez chargeback`,
      visual: {
        kind: "text",
        label: "Žiadosť o chargeback (VÚB internet banking)",
        body: `Karty → Detail karty → Reklamácia transakcie. Vyber dôvod „Tovar nebol doručený" alebo „Tovar nezodpovedá popisu". Priložiť screenshot objednávky, komunikáciu s predajcom, dôkaz nedoručenia. Banka prešetrí do 30–45 dní.`,
      },
      commentary: `Chargeback funguje pre Visa aj Mastercard, lehota je 120 dní od transakcie. Funguje aj pri falošných e-shopoch, ktoré sa medzitým „rozplynuli" — banka peniaze stiahne z acquiringovej banky obchodníka (banky, ktorá obchodníkovi spracúva kartové platby).`,
    },
    {
      kind: "example",
      heading: `Vzor #4 — Apple Pay namiesto fyzickej karty`,
      visual: {
        kind: "text",
        label: "Pokladňa e-shopu s Apple Pay",
        body: `Vyberieš Apple Pay → Touch ID / Face ID → platba prebehne. Obchodník nikdy nedostane tvoje skutočné číslo karty, len jednorazový token. Pri úniku databázy obchodníka tvoje údaje nikde nie sú.`,
      },
      commentary: `Apple Pay aj Google Pay používajú tokenizáciu (nahradenie čísla karty náhradným kódom) — tvoje číslo karty je nahradené unikátnym tokenom viazaným na tvoje zariadenie. Token bez biometrie nikto nepoužije.`,
    },
    {
      kind: "checklist",
      heading: "Checklist bezpečnej platby online",
      items: [
        { good: true, text: "Platíš kartou Visa / Mastercard — máš chargeback do 120 dní." },
        {
          good: true,
          text: "Pri novom e-shope použiješ virtuálnu jednorazovú kartu (Revolut, Wise, Curve).",
        },
        {
          good: true,
          text: "Apple Pay / Google Pay tam, kde sa dá — obchodník nikdy nevidí reálne číslo karty.",
        },
        {
          good: true,
          text: "PayPal pri zahraničných nákupoch — Buyer Protection pokrýva nedoručenie a reklamácie.",
        },
        {
          good: false,
          text: "Bankový prevod na IBAN ako jediná možnosť — nevratné, žiadna ochrana.",
        },
        {
          good: false,
          text: "Krypto platba (BTC, USDT) — anonymné, nevratné, žiadna autorita ti nepomôže.",
        },
        {
          good: false,
          text: "Posielanie údajov karty cez chat alebo e-mail — nikdy, žiadny obchodník toto nepýta.",
        },
      ],
    },
    {
      kind: "redflags",
      heading: "6 platobných red flagov v pokladni",
      flags: [
        `Pokladnica nemá HTTPS (visiačik vľavo od adresy URL) — neplať za žiadnych okolností.`,
        `Jedinou možnosťou platby je bankový prevod (najmä na zahraničný IBAN AT/HU/RO).`,
        `Pýtajú PIN ku karte alebo CVV cez e-mail či chat — žiadny obchodník toto legitímne nepýta.`,
        `Suma sa po kliknutí na „zaplatiť" zmení (napr. z € na inú menu) — vždy zruš a začni odznova.`,
        `Najprv pýtajú „overovací" prevod malej sumy — klasický scam (podvod), peniaze sú preč.`,
        `Cena za poštovné je vyššia ako samotný produkt — typický falošný e-shop na dropshipping (predaj tovaru, ktorý predajca nemá na sklade a posiela ho priamo od dodávateľa).`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá platby v 2026",
      do: [
        `Pre nedôveryhodné e-shopy vždy použi virtuálnu kartu (Revolut, Wise) s limitom presne na sumu.`,
        `Pri zahraničných nákupoch z USA či Číny preferuj PayPal kvôli Buyer Protection.`,
        `Aktivuj si SMS alebo push notifikácie pre každú transakciu — podvod uvidíš do 5 sekúnd.`,
        `Pri reklamácii vždy nechaj papierovú stopu — screenshot objednávky, e-maily, čísla transakcií.`,
      ],
      dont: [
        `Nepoužívaj kreditnú kartu so zostatkom 5 000 € na hocijakom e-shope — výhradne virtuálku.`,
        `Nikdy nikomu nedávaj CVV cez telefón, vrátane „bankára".`,
        `Neukladaj kartu do prehliadača Chrome — keď ti niekto napadne účet, má aj kartu.`,
        `Nepoužívaj rovnaké heslo na e-shop a banku — výrazne tak znížiš dosah úniku dát.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — Black Friday cez sponzorovaný príspevok",
      story: `Vidíš FB reklamu: Sony PS5 za 249 € (bežne 549 €), Black Friday early access (skorý prístup k akcii). Stránka vyzerá ako Alza, ale doména je alza-blackfriday.com. Si v pokušení — keby to bola pravda, ušetril by si 300 €.`,
      right_action: `Otvoríš si alza.sk priamo v prehliadači (zadáš ju ručne). Žiadna takáto akcia tam nie je. Zatvoríš podvodnú stránku. Ak by si bol veľmi zvedavý, vytvoríš si v Revolute jednorazovú virtuálnu kartu na 249 € a zaplatíš ňou — no s 99 % pravdepodobnosťou o tých 249 € prídeš, takže radšej nič. Reálna 30 % zľava na PS5 je asi 380 €, nie 249 €.`,
    },
  ],
  sources: [
    { label: "SOI — ochrana spotrebiteľa", url: "https://www.soi.sk/" },
    { label: "Visa Slovakia — zodpovednosť kupujúceho", url: "https://www.visa.sk/" },
    { label: "Európska centrálna banka — práva spotrebiteľov", url: "https://www.ecb.europa.eu/" },
  ],
};
