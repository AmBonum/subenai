import type { Course } from "./_schema";

export const qrQuishingCourse: Course = {
  slug: "qr-quishing",
  title: `QR quishing — falošné QR kódy na parkoviskách, reštauráciách a vo schránke`,
  tagline:
    "Naskenovať QR kód trvá sekundu. Stratiť prihlasovacie údaje tiež. Ako rozoznáš falošné QR na parkovisku, v reštaurácii a v schránke.",
  category: "sms",
  difficulty: "začiatočník",
  estimatedMinutes: 6,
  heroEmoji: "📲",
  publishedAt: "2026-04-30",
  updatedAt: "2026-04-30",
  sections: [
    {
      kind: "intro",
      heading: "QR kód — nová cesta k phishingu",
      body: `QR quishing (QR + phishing) je jednou z najrýchlejšie rastúcich techník od roku 2023. Dôvod je prostý: QR kód je pre ľudský mozog „bezpečný symbol" — bez skenera nevidíš URL, na ktorý ťa posiela. Útočníci tlačia falošné QR stikery a lepia ich cez originál na parkovacích automatoch, v reštauráciách, na balíkových boxoch. Výsledok: naskenuješ zdanlivo legitímny kód a skončíš na podvodnej stránke, ktorá chce tvoje platobné údaje alebo meno + heslo.`,
    },
    {
      kind: "example",
      heading: `Scenár #1 — Parkovací automat`,
      visual: {
        kind: "url",
        url: "https://parkovanie-sk-platba.net/qr",
        secure: false,
      },
      commentary: `QR kód na parkovacom automate ťa posiela na adresu „parkovanie-sk-platba.net" — nie na stránku mesta ani prevádzkovateľa. Stránka vyzerá identicky ako originál, ale tvoje platobné údaje idú útočníkom. Skutočné parkovacie automaty majú QR s doménou prevádzkovateľa (napr. paas.sk, bpkba.sk). Ak adresa nezodpovedá, radšej zaplaťte kartou priamo na automate.`,
    },
    {
      kind: "example",
      heading: `Scenár #2 — „Menu" v reštaurácii`,
      visual: {
        kind: "url",
        url: "https://menu-sk-login.page/wifi",
        secure: false,
      },
      commentary: `Stolový QR kód pre WiFi alebo menu smeruje na stránku s inštaláciou „menu apky" alebo žiadosťou o prihlásenie Google/Facebook účtom. Reštaurácia nepotrebuje váš Google účet. Prihlasovací formulár na tejto adrese kradne tokeny. Ak reštaurácia chce, aby ste sa prihlásili cez sociálnu sieť pre WiFi — opýtajte sa obsluhy na priame WiFi heslo.`,
    },
    {
      kind: "example",
      heading: `Scenár #3 — Falošný QR v zásielkovom SMS`,
      visual: {
        kind: "sms",
        sender: "PacketaInfo",
        body: "Vaša zásielka čaká na doručenie. Overte adresu naskenovaním QR kódu: [QR v prílohe] Platnosť 24h.",
        link: "https://packeta-sk-delivery.com/verify",
      },
      commentary: `Packeta, DHL, GLS — nikto z nich nepošle SMS so skrytým QR kódom. Ich SMS obsahujú len priamy link na zákaznícky portál. Akýkoľvek QR kód v SMS je automaticky podozrivý. Overte balík priamo na domovskej stránke dopravcu zadaním čísla zásielky.`,
    },
    {
      kind: "redflags",
      heading: "Znaky falošného QR kódu",
      flags: [
        `Pod QR kódom je viditeľný okraj nálepky — originál sa líši farbou papiera.`,
        `URL po naskenovaní obsahuje podozrivé slová: „-sk-", „-platba-", „-verify-", „-login-".`,
        `Stránka po naskenovaní hneď žiada platobné údaje alebo prihlásenie cez Google/Facebook.`,
        `QR zo SMS či emailu od dopravcu — legitimní dopravcovia posielajú len text-link, nie QR.`,
        `Adresa doménou nesúvisí s prevádzkovateľom (napr. parkovisko, ale doména nie je mestská).`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Bezpečné skenovanie QR kódov",
      do: [
        `Pred otvorením URL si prečítajte adresu v prehliadači — väčšina telefónov ju ukáže pred navigáciou.`,
        `Na parkoviskách plaťte priamo kartou na automate, bez QR.`,
        `Dopravcov (Packeta, DHL…) overujte na ich domovskej stránke zadaním čísla zásielky — nie cez QR.`,
        `Ak na stole v reštaurácii leží voľná nálepka so QR kódom, informujte obsluhu.`,
      ],
      dont: [
        `Nezadávajte platobné údaje na stránke otvorenej cez neoverený QR kód.`,
        `Neprihlasujte sa cez Google/Facebook na stránkach z QR kódov vo verejnom priestore.`,
        `Neinštalujte apky navrhnuté QR kódom v reštaurácii alebo na parkovisku.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Centrum mesta, sobota ráno",
      story: `Na parkovacom automate vedľa nákupného centra skenujete QR kód označený „Rýchla platba". Stránka vyzerá rovnako ako mestský portál. Pýta sa na číslo parkovacieho miesta, EČV a číslo karty vrátane CVV kódu.`,
      right_action: `CVV kód parkovacie automaty nikdy nepytajú — to je jednoznačný znak podvodu. Zatvoríte stránku. Zaplatíte priamo kartou na automate, prípadne cez oficiálnu mestskú appku.`,
    },
  ],
  sources: [
    { label: "NCSC UK — QR code scams", url: "https://www.ncsc.gov.uk/" },
    { label: "SK-CERT — phishingové trendy", url: "https://www.sk-cert.sk/" },
    {
      label: "FBI — quishing alert 2023",
      url: "https://www.ic3.gov/",
    },
  ],
};
