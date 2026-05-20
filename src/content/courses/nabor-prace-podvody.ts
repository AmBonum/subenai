import type { Course } from "./_schema";

export const naborPraceScamCourse: Course = {
  slug: "brigady-a-pracovne-podvody",
  title: `Falošné brigády a pracovné ponuky — ako poznáš scam pred prvým dňom`,
  tagline:
    'Platia vopred, žiadajú občiansky, sľubujú €500 týždenne za „prácu z domu": ako spoznáš scam pred prvým pracovným dňom.',
  category: "marketplace",
  difficulty: "začiatočník",
  estimatedMinutes: 7,
  heroEmoji: "💼",
  publishedAt: "2026-04-30",
  updatedAt: "2026-04-30",
  sections: [
    {
      kind: "intro",
      heading: "Prečo pracovné ponuky lákajú podvodníkov",
      body: `Práca z domu, flexibilné hodiny, výnimočný plat — znaky sú jasné, no emocionálna atraktivita pracovnej ponuky vypína kritické myslenie. Útočníci to vedia. Falošné pracovné ponuky (job scam) cielia predovšetkým na mladých ľudí, študentov a tých, ktorí hľadajú rýchly príjem. Výsledok môže byť strata peňazí (poplatok za školenie/vybavenie), krádež identity (pasová kópia pre „zmluvu") alebo najhoršie — nevedomé zapojenie do prania špinavých peňazí ako „money mule".`,
    },
    {
      kind: "example",
      heading: `Scenár #1 — „Práca z domu, 500 € týždenne"`,
      visual: {
        kind: "instagram",
        account: "quickjobs.official",
        verified: false,
        body: `🔥 URGENTNE 🔥 Hľadáme 3 ľudí pre ONLINE prácu z domu. Bez skúseností. Plat 400-600 €/týždeň. DM pre info. Obmedzené miesta!`,
        cta: "Napíšte pre viac info",
        imageEmoji: "💰",
      },
      commentary: `Mediánová mzda na Slovensku je ~1 400 €/mesiac (350 €/týždeň). Ponuky nad toto číslo bez požadovaných skúseností a zručností sú alarm. Po nadviazaní kontaktu „zamestnávateľ" požiada o poplatok za „kurz", „certifikát" alebo „vybavenie". Žiadna legitímna práca nevyžaduje platbu pred nástupom.`,
    },
    {
      kind: "example",
      heading: `Scenár #2 — Falošný EU stáž program`,
      visual: {
        kind: "email",
        from: "EU Youth Office — Internship Division",
        fromEmail: "internship@eu-youth-opportunities.org",
        subject: "Congratulations — you have been selected for an EU-funded internship in Brussels",
        body: `Dear applicant, You have been selected for a 3-month paid internship in Brussels (€1,800/month stipend). To confirm your placement, please transfer a €150 registration and visa processing fee within 5 business days. Attach a copy of your passport for identity verification.`,
        cta: "Confirm my placement",
      },
      commentary: `EU stáže nikde neprijímajú cez generické emaily s poplatkami. Oficiálné EU programy (Erasmus+, EPSO, Blue Book) fungujú cez europass.eu a oficálne portály. Žiadať pas a poplatok pred podpisom zmluvy je čistý podvod. Overiť: europass.eu a ec.europa.eu/jobs.`,
    },
    {
      kind: "example",
      heading: `Scenár #3 — Preposielanie balíkov (money mule)`,
      visual: {
        kind: "text",
        label: `WhatsApp správa od „manažéra"`,
        body: `„Ahoj, tvoja práca je jednoduchá — prijmeš balíky na svoju adresu a prepošleš ich na adresu, ktorú ti dáme. Zaplatíme 200€/mesiac cez bankový prevod. Začíname budúci týždeň."`,
      },
      commentary: `Toto je „reshipping scam" — nevedomé preposlanie tovaru zakúpeného podvodnými kartami. Ty si objednávateľ a prepravca ukradnutého tovaru. Právne si spolupáchateľ podvodu, aj keď si nevedel o kriminalite. Výsledok: trestné oznámenie, možný záznam v registri. Akúkoľvek prácu zahŕňajúcu preposielanie balíkov alebo peňazí odmietni.`,
    },
    {
      kind: "redflags",
      heading: "Príznaky falošnej pracovnej ponuky",
      flags: [
        `Plat výrazne nad trhom bez požadovanej kvalifikácie alebo skúseností.`,
        `Žiadosť o platbu pred nástupom — poplatok, kurz, certifikát, vybavenie.`,
        `Žiadosť o sken pasu, občianskeho alebo bankových údajov pred podpisom zmluvy.`,
        `Nejasný popis práce: „spracovanie dát", „kontrola balíkov", „pomoc zákazníkom" — bez detailov.`,
        `Kontakt len cez WhatsApp alebo osobné správy, žiadny firemný email ani web.`,
        `Práca zahŕňa prijímanie platieb na váš účet a ďalší prevod — toto je klasický money mule.`,
        `Uviedli vás bez prihlasovania — „vy ste boli vybraní" bez žiadosti.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Ako bezpečne hľadať prácu online",
      do: [
        `Overte firmu v Obchodnom registri SR (orsr.sk) pred akýmkoľvek kontaktom.`,
        `Pohovor cez legitímny videokonferenčný nástroj (Teams, Zoom) s overiteľným ID zamestnávateľa.`,
        `Podpíšte zmluvu pred začatím práce — a zmluvu si nechajte prečítať.`,
        `Pracovný inzerát nájdite na overených portáloch: profesia.sk, linkedin.com, kariera.sk.`,
        `Ak dostanete platbu vopred a majú vás žiadať previesť ďalej — zastavte sa a nahláste polícia.`,
      ],
      dont: [
        `Nikdy neplaťte za to, aby ste mohli pracovať.`,
        `Nedávajte kópiu pasu pred podpisom zmluvy s overenými HR kontaktmi.`,
        `Nezdieľajte bankové údaje pred dátumom prvej výplaty od overiteľného zamestnávateľa.`,
        `Nepreposielajte balíky ani peniaze v rámci „práce" — vždy je to scam.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Pondelok ráno — správa na Instagrame",
      story: `Dostanete DM od účtu „eu.staz.official": „Ahoj, náš recruiter videl tvoj profil a myslíme, že si ideálny/a pre náš program v Bruseli. Platba 1 500 €/mesiac, štart o 2 týždne. Stačí uhradiť registračný poplatok 120 € a zaslať scan pasu."`,
      right_action: `Nereagujete. Overíte si: EU stáže sa neprijímajú cez Instagram DM, EU nikdy nevyberá registračné poplatky, účet „eu.staz.official" na Instagrame nepatrí žiadnej EU inštitúcii. Nahlásite účet ako podvod priamo na Instagrame a ignorujete správu. Ak ste poplatok nejakým spôsobom zaplatili — kontaktujete banku okamžite a nahlásite políciu.`,
    },
  ],
  sources: [
    { label: "Profesia.sk — upozornenia na falošné inzeráty", url: "https://www.profesia.sk/" },
    {
      label: "Europol — job scam & money mule awareness",
      url: "https://www.europol.europa.eu/",
    },
    { label: "PZ SR — trestné oznámenie podvod", url: "https://www.minv.sk/" },
  ],
};
