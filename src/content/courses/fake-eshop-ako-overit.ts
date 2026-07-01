import type { Course } from "./_schema";

export const fakeEshopOverenieCourse: Course = {
  slug: "fake-eshop-ako-overit",
  title: "Falošný e-shop — overenie za 2 minúty",
  tagline: "7-bodový checklist, ktorým rozoznáš podvodný e-shop skôr, než zaplatíš.",
  category: "marketplace",
  difficulty: "začiatočník",
  estimatedMinutes: 10,
  heroEmoji: "🛒",
  relatedQuestionsCategory: "fake_vs_real",
  publishedAt: "2026-05-20",
  updatedAt: "2026-05-20",
  sections: [
    {
      kind: "embed",
      heading: "Pozri si na úvod: nebezpečne nízke ceny e-shopov",
      audio: {
        provider: "youtube",
        url: "https://www.youtube.com/watch?v=OPUZ5gh3-vQ",
        title: "Nebezpečne nízke ceny e-shopov",
        sourceName: "Tatra banka #predigitalnubezpecnost",
        sourceUrl: "https://www.youtube.com/watch?v=OPUZ5gh3-vQ",
        description:
          "Osvetové video Tatra banky o falošných e-shopoch. Názorná ukážka, nie autentická nahrávka.",
      },
    },
    {
      kind: "intro",
      heading: "Falošný e-shop poznáš za 2 minúty — ak vieš, kde pozerať",
      body: `Falošný e-shop v roku 2026 nevyzerá ako tých päť chýb spred desiatich rokov. Má slušnú grafiku, fotky produktov, reálne názvy značiek a recenzie napísané ChatGPT-om. Často je to klon legitímneho českého alebo poľského obchodu, len s iným číslom IBAN na konci. Slováci ročne stratia milióny eur cez „výhodné" iPhony za 299 € z falošných reklám na Facebooku alebo z e-shopov, ktoré sa volajú elektromax-sk-vypredaj.com. Dobrá správa: dvojminútová kontrola pred zaplatením ťa zachráni v 95 % prípadov.`,
    },
    {
      kind: "example",
      heading: `Vzor #1 — FB reklama na iPhone za 299 €`,
      visual: {
        kind: "url",
        url: "https://apple-vyprodej-sk.shop/iphone-15-pro-299eur",
        secure: true,
      },
      commentary: `Visiačik HTTPS neznamená nič — kúpiš ho hocikde za 5 €. Doména apple-vyprodej-sk.shop nie je Apple. Apple v SR predáva cez apple.com/sk alebo cez autorizovaných predajcov ako iStores či Datart.`,
    },
    {
      kind: "example",
      heading: `Vzor #2 — Klon Alza.sk`,
      visual: {
        kind: "url",
        url: "https://alza-sk-vypredaj.online/notebooky",
      },
      commentary: `Skutočná Alza je len na alza.sk. Hocijaká poddoména s pomlčkou alebo TLD .online / .shop / .store je podvod. Pri pochybnostiach zadaj alza.sk priamo do prehliadača.`,
    },
    {
      kind: "example",
      heading: `Vzor #3 — Falošná recenzia s ChatGPT podpisom`,
      visual: {
        kind: "text",
        label: "Recenzia na podvodnom e-shope",
        body: `Som veľmi spokojná s mojím nákupom! Produkt prišiel rýchlo a kvalita predčila moje očakávania. Určite odporúčam tento obchod každému, kto hľadá kvalitné výrobky za výhodnú cenu. ⭐⭐⭐⭐⭐ — Mária K.`,
      },
      commentary: `Vágna, bez konkrétneho produktu, bez detailu o doručení, bez fotky. Reálna recenzia spomína model, čas dodania a často aj problém s podporou. Recenzie generované umelou inteligenciou tvoria dnes 80 % obsahu na falošných e-shopoch.`,
    },
    {
      kind: "example",
      heading: `Vzor #4 — Platba len prevodom`,
      visual: {
        kind: "text",
        label: "Pokladňa fake e-shopu",
        body: `Akceptujeme: Bankový prevod na IBAN AT89 3704 4040 0532 0130. Po pripísaní platby tovar odošleme do 2 pracovných dní.`,
      },
      commentary: `Rakúsky IBAN (AT) pre slovenský e-shop? Žiadna karta, žiadny PayPal, žiadna dobierka? Legitímny obchod má aspoň 2 – 3 platobné metódy s ochranou kupujúceho. Prevod je nevratný.`,
    },
    {
      kind: "checklist",
      heading: "7-bodový checklist pred zaplatením",
      items: [
        {
          good: true,
          text: "Doména presne sedí — alza.sk, nie alza-sk-vypredaj.online (ručne overiť v prehliadači).",
        },
        {
          good: true,
          text: "Kontakt obsahuje slovenskú adresu sídla, IČO a DPH — overiť na finstat.sk alebo orsr.sk.",
        },
        {
          good: true,
          text: `V pätičke sú VOP, reklamačný poriadok a GDPR (s reálnymi menami, nie „Lorem ipsum").`,
        },
        {
          good: true,
          text: "Recenzie sú na nezávislých portáloch (Heureka.sk, Google Reviews) — nie len na ich vlastnom webe.",
        },
        {
          good: true,
          text: "Web ponúka aspoň platbu kartou (Visa/Mastercard) alebo dobierku — máš ochranu cez chargeback (spätné vrátenie platby cez banku).",
        },
        {
          good: false,
          text: `Cena je 50 – 80 % pod trhom („iPhone 15 Pro za 299 €") — neexistuje, vždy ide o podvod.`,
        },
        {
          good: false,
          text: "Doména je mladá (menej ako 6 mesiacov) — overiť cez whois.sk alebo who.is.",
        },
      ],
    },
    {
      kind: "redflags",
      heading: "6 znakov, podľa ktorých e-shop pôjde do koša",
      flags: [
        `Doména obsahuje pomlčky, slová „shop / outlet / vypredaj / sk" a TLD .online, .store, .shop.`,
        `Žiadne IČO, žiadna adresa, žiadny telefón — len kontaktný formulár.`,
        `Recenzie sú len 5-hviezdičkové, vágne, bez konkrétnych mien a produktov.`,
        `Platba výhradne bankovým prevodom alebo cez krypto — žiadna karta.`,
        `Ceny 50 – 80 % pod trhom pri značkovom tovare (Apple, Samsung, Dyson).`,
        `Stránka v slovenčine, ale s pravopisnými chybami („objedávka", „bezplátne", „garácia").`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Ako nakupovať online bezpečne",
      do: [
        `Pri novom e-shope kontroluj IČO na finstat.sk — overíš obrat, vek firmy aj exekúcie.`,
        `Plať kartou alebo cez PayPal — pri nedoručenom tovare máš 120 dní na chargeback.`,
        `Hľadaj recenzie tvarom „názov-eshopu skusenosti" na Google a Heureka.sk.`,
        `Pri zľavách nad 50 % na značkový tovar predpokladaj podvod, kým sa nepresvedčíš o opaku.`,
      ],
      dont: [
        `Nepoužívaj bankový prevod ako jedinú možnosť — peniaze sú prakticky nevratné.`,
        `Neklikaj na e-shopy z reklám na Facebooku či Instagrame bez kontroly domény mimo platformy.`,
        `Nedôveruj recenziám len na webe predajcu — sú často generované umelou inteligenciou.`,
        `Nedávaj číslo karty na stránku bez HTTPS (visiačik vľavo od URL).`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — Dyson za 189 € z Instagramu",
      story: `Vidíš sponzorovanú reklamu na Instagrame: Dyson V15 za 189 € (bežne 749 €), oficiálny výpredaj značky 2026, posledných 7 kusov. Klikneš, otvorí sa dyson-vypredaj-sk.shop — vyzerá moderne, fotky sú originálne. V pokladni je IBAN v Maďarsku a kontakt len cez formulár.`,
      right_action: `Zatvoríš stránku. Otvoríš si dyson.sk v novom okne — žiadna takáto akcia neexistuje. Reklamu nahlásiš na Instagrame (3 bodky → Report Ad → Scam or Fraud). Ak ti to nedá pokoj, pozrieš model V15 na alza.sk alebo datart.sk za reálnu cenu. Ušetril si 189 €.`,
    },
  ],
  sources: [
    { label: "SOI — ochrana spotrebiteľa", url: "https://www.soi.sk/" },
    { label: "SK-CERT — falošné e-shopy", url: "https://www.sk-cert.sk/" },
    { label: "Finstat — overenie firiem", url: "https://finstat.sk/" },
    { label: "Heureka — recenzie e-shopov", url: "https://www.heureka.sk/" },
  ],
};
