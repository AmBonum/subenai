import type { Course } from "./_schema";

export const marketplaceCourse: Course = {
  slug: "marketplace-bazos-podvody",
  title: `Bazoš a Marketplace — ako rozoznať podvodný inzerát`,
  tagline:
    'Auto za polovicu, byt v centre za 200 € a „kupec" cez WhatsApp: pravidlá pre Bazoš, Vinted aj Marketplace.',
  category: "marketplace",
  difficulty: "začiatočník",
  estimatedMinutes: 9,
  heroEmoji: "🛒",
  relatedQuestionsCategory: "fake_vs_real",
  publishedAt: "2026-04-26",
  updatedAt: "2026-04-26",
  sections: [
    {
      kind: "intro",
      heading: "Bazoš a Facebook Marketplace ako lovisko",
      body: `Slovenský trh ovládajú dve platformy: Bazoš a FB Marketplace. Obe majú minimálnu moderáciu, takže útočník si vytvorí účet za 5 minút a má tisíce potenciálnych obetí. Schémy sú dvojaké — útočník buď vystupuje ako „predávajúci" (vyláka ti zálohu), alebo ako „kupec" (vyláka ti údaje karty cez falošnú platobnú stránku).`,
    },
    {
      kind: "example",
      heading: `Vzor #1 — auto za polovicu trhovej ceny`,
      visual: {
        kind: "listing",
        site: "Bazoš",
        title: "BMW 320d, 2018, 90 000 km — súrne",
        price: "9 800 €",
        location: "Bratislava",
        description: `Súrne predám, sťahujem sa do Nemecka. Auto je v perfektnom stave, prvý majiteľ. Posielam fotky aj papiere na WhatsApp. Záujemca pošle 1 000 € zálohu, dovoz a obhliadka v Bratislave do 3 dní.`,
        imageEmoji: "🚗",
      },
      commentary: `BMW z roku 2018 s 90 tis. km má reálnu cenu 18 – 22 tisíc EUR. „Polovica" + „súrne" + „sťahujem sa" je kombinácia, ktorá NIKDY nie je pravdivá. Po zálohe auto nepríde a telefón prestane fungovať.`,
    },
    {
      kind: "example",
      heading: `Vzor #2 — byt v centre za 250 €`,
      visual: {
        kind: "listing",
        site: "Bazoš",
        title: "2-izbový byt, Staré Mesto, Bratislava",
        price: "250 € / mesiac",
        location: "Bratislava — Staré Mesto",
        description: `Pekný 2-izbový byt v centre. Som teraz v zahraničí, kľúče pošlem kuriérom po prijatí depozitu 500 €. Komunikácia cez WhatsApp / e-mail.`,
        imageEmoji: "🏢",
      },
      commentary: `Trhová cena 2-izbového bytu v Starom Meste je 700 – 1 200 € + energie. „Som v zahraničí, kľúče cez kuriéra po depozite" nie je nikdy reálne. Vždy si byt obhliadni osobne pred akoukoľvek platbou.`,
    },
    {
      kind: "example",
      heading: `Vzor #3 — „kupec" pošle fake Stripe / PayPal link`,
      visual: {
        kind: "text",
        label: `Konverzácia s „kupcom"`,
        body: `Kupec: „Ahoj, mám záujem o tvoj telefón. Som z Trnavy, neviem prísť osobne, môžem ti zaplatiť cez Stripe. Pošlem ti link, vyplníš údaje karty a peniaze ti prídu na účet."

Ty: dostaneš link stripe-payment-iban.com — vyzerá ako Stripe.

Po vyplnení čísla karty + CVV a OTP — kupec zmizne, z karty sa stráca 850 €.`,
      },
      commentary: `Stripe ani PayPal ti nikdy nedajú zaplatiť „cez odkaz, kde vyplníš svoje údaje" — naopak, peniaze dostaneš ty na svoj účet. Útočník ťa cez falošnú platobnú bránu donúti zadať údaje, ktoré okamžite zneužije.`,
    },
    {
      kind: "example",
      heading: `Vzor #4 — „náhodný preklep" v sume prevodu`,
      visual: {
        kind: "text",
        label: `Schéma „omylom som ti poslal viac"`,
        body: `1. Kupec si „kúpi" tvoj tovar za 200 €.
2. Pošle ti screenshot prevodu na 2 000 € (fake screenshot, žiadny skutočný prevod neprišiel).
3. Hovorí: „Ach, omylom som pridal nulu, pošli mi 1 800 € späť, prosím."
4. Pošleš mu 1 800 € — z tvojich peňazí. Prevod na 2 000 € nikdy nedorazí.`,
      },
      commentary: `Klasická schéma „chargeback" (spätné stiahnutie platby) alebo „falošný prevod". Skutočný príchod peňazí sleduj VÝLUČNE v internetbankingu (nie zo snímky obrazovky od kupca). Nikdy nepošli „vrátenie" peňazí skôr, než suma reálne dorazí na účet.`,
    },
    {
      kind: "redflags",
      heading: "Indície, podľa ktorých rozoznáš podvod",
      flags: [
        `Cena je výrazne pod trhovou (auto za polovicu, byt za štvrtinu).`,
        `Predávajúci „je v zahraničí, dovoz cez kuriéra po zálohe".`,
        `Komunikácia mimo platformy (WhatsApp, Telegram, Signal).`,
        `Naliehanie na rýchlu platbu („mám iného záujemcu").`,
        `„Kupec" ti pošle odkaz na zaplatenie (Stripe, PayPal) — pritom norma je opačná.`,
        `Inzerát má fotku z internetu (odhalí to spätné vyhľadávanie obrázka).`,
        `Profil predávajúceho je nový, bez histórie a recenzií.`,
        `Žiadosť o zálohu vopred bez možnosti obhliadky.`,
      ],
    },
    {
      kind: "checklist",
      heading: "Pravidlá pre kupujúceho",
      items: [
        { good: true, text: `Vec si vždy obhliadni osobne pred akoukoľvek platbou.` },
        { good: true, text: `Auto pred kúpou skontroluj cez OEAVK / cez servisné číslo.` },
        {
          good: true,
          text: `Nájom bytu — fyzická prehliadka, nájomná zmluva pred prevodom depozitu.`,
        },
        { good: false, text: `Záloha na účet predávajúceho cez prevod, ktorého neuvidíš osobne.` },
        { good: false, text: `Komunikácia mimo platformy — Bazoš/FB má aspoň minimálnu kontrolu.` },
        {
          good: false,
          text: `„Polovica trhovej ceny" — nikdy ti nikto nedá auto za 50 % zadarmo.`,
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Pravidlá pre predávajúceho",
      items: [
        {
          good: true,
          text: `Platba pri preberaní (cash) alebo overený prevod priamo na tvoj účet.`,
        },
        {
          good: true,
          text: `Kontrola príchodu sumy v internetbankingu — nie zo snímky obrazovky.`,
        },
        { good: true, text: `Pri vyšších sumách — overenie totožnosti kupujúceho cez OP.` },
        { good: false, text: `„Odkaz na Stripe / PayPal" od kupca — takto inkaso neprebieha.` },
        {
          good: false,
          text: `„Pošli mi naspäť, omylom som dal viac" — pred reálnym príchodom sumy.`,
        },
        { good: false, text: `Posielanie tovaru na adresu, ktorá nezodpovedá platbe.` },
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá pre obe strany",
      do: [
        `Pri pochybnostiach radšej od obchodu odstúpiť, než stratiť peniaze.`,
        `Verejné miesto na stretnutie (parkovisko OC, polícia ako miesto výmeny).`,
        `Nahlásiť podvodný inzerát platforme (Bazoš → Nahlásiť).`,
        `Pri obchodoch nad 1 000 € — vždy zmluva, kúpno-predajná zmluva.`,
      ],
      dont: [
        `Neposielať zálohu cez kryptomeny (je to nezvratné).`,
        `Neposielať údaje karty, OTP (jednorazový overovací kód) ani CVV nikomu, ani „kupcovi".`,
        `Neveriť snímkam obrazovky o prevodoch — len reálnemu príchodu na účet.`,
        `Nedávať OP ani pas v plnom rozlíšení neznámym (kradnú identitu).`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — predávaš telefón na FB Marketplace",
      story: `Pýta sa „Maťo z Košíc": „Ahoj, mám záujem, ale neviem prísť. Môžem zaplatiť cez Stripe? Pošlem ti link, kde vyplníš údaje karty a peniaze ti prídu."`,
      right_action: `Odpovieš: „Stripe takto nefunguje, peniaze ti prídu cez bežný prevod alebo v hotovosti pri preberaní. Ak chceš, môžeme sa stretnúť, alebo ti tovar pošlem po príchode peňazí na účet." Ak protestuje — ukončíš konverzáciu.`,
    },
  ],
  sources: [
    { label: "NCKB — podvody na inzertných portáloch", url: "https://www.sk-cert.sk/" },
    { label: "PZ SR — varovania pre seniorov", url: "https://www.minv.sk/" },
    { label: "Bazoš — pravidlá a bezpečnosť", url: "https://www.bazos.sk/" },
  ],
};
