import type { Course } from "./_schema";

export const vpnAntivirusZalohyCourse: Course = {
  slug: "vpn-antivirus-zalohy",
  title: "VPN, antivírus a zálohy — čo dnes naozaj treba",
  tagline: "3 nástroje, 1 pravidlo (3-2-1) a kedy VPN reálne pomáha — bez marketingových bludov.",
  category: "data",
  difficulty: "pokročilý",
  estimatedMinutes: 12,
  heroEmoji: "🛡️",
  publishedAt: "2026-05-20",
  updatedAt: "2026-05-20",
  sections: [
    {
      kind: "intro",
      heading: "VPN, antivírus a zálohy — fakty namiesto marketingu",
      body: `VPN, antivírus a zálohy sú tri nástroje, na ktorých marketing minul stovky miliónov eur — a väčšina ľudí napriek tomu nevie, ktorý je kedy užitočný. VPN nie je všeliek („skryje ťa pred hackermi") — primárne mení tvoju geo-polohu a šifruje verejnú wifi. Antivírus v 2026 už nie je Norton 360 z roku 2005 — Windows Defender v základe stačí 80 % užívateľom, platený ESET / Bitdefender pridáva ochranu pred ransomware. Zálohy podľa pravidla 3-2-1 ti zachránia foto archív aj keď ti hardisk umrie, dom vyhorí alebo notebook ukradnú. Tento kurz ti dá jasné odporúčania bez „kúp si všetko" mantry.`,
    },
    {
      kind: "example",
      heading: `VPN — kedy má zmysel`,
      visual: {
        kind: "text",
        label: "Mullvad VPN — 5 €/mesiac, anonymne, bez emailu",
        body: `Prípady, kedy VPN reálne pomáha:\n1. Verejná wifi v hoteli / na letisku → šifrovanie pred man-in-the-middle.\n2. Geo-block (HBO Max, BBC iPlayer) → meníš krajinu.\n3. Cestuješ do Číny / Iránu → obchádzaš cenzúru (Mullvad, Proton stále fungujú).\n4. ISP ti spomaľuje torrenty → schováš ich.`,
      },
      commentary: `Mullvad účet je len 16-miestne číslo, žiadny e-mail, platba aj hotovosťou poštou. Pre paranoidných: Mullvad + ProtonVPN tandem. Pre bežný cestovateľský prípad: ProtonVPN free verzia stačí.`,
    },
    {
      kind: "example",
      heading: `VPN — kedy je marketingový bullshit`,
      visual: {
        kind: "text",
        label: `Reklama: NordVPN „bráni ti pred hackermi a vírusmi"`,
        body: `„VPN ťa ochráni pred hackermi, vírusmi a phishingom!" Realita: VPN šifruje sieťovú vrstvu, neochráni ťa pred kliknutím na phishing link, pred malware z e-mailovej prílohy, ani pred slabým heslom. Bezpečnosť je o vrstvách — VPN je jedna z nich, nie magická bariéra.`,
      },
      commentary: `NordVPN, ExpressVPN, Surfshark sú slušné služby, ale ich marketing tvrdí veci, ktoré VPN nedokáže. „Hacker pod kapucňou v kaviarni" je legenda — moderné weby (HTTPS) sú už šifrované od konca po koniec aj bez VPN.`,
    },
    {
      kind: "example",
      heading: `Antivírus 2026 — ESET, Bitdefender alebo zadarmo Defender?`,
      visual: {
        kind: "text",
        label: "Windows Defender vs platený antivírus",
        body: `Windows Defender (zadarmo, v systéme): Zachytí 95 % bežného malware. Pre väčšinu domácich užívateľov stačí.\nESET Smart Security (~40 €/rok): Ransomware protection, banking module, parental controls.\nBitdefender Total Security (~60 €/rok): Pridáva VPN (limit 200 MB/deň), správcu hesiel.\nMac: vstavaný XProtect + Gatekeeper pokryje 99 % prípadov.`,
      },
      commentary: `Ak máš deti, banking-uješ veľa cez PC, alebo pracuješ s firemnými datami z domu — ESET / Bitdefender stoja za tých 40 € ročne. Inak Windows Defender + zdravý rozum + ad-blocker (uBlock Origin) je vyhovujúci stack.`,
    },
    {
      kind: "example",
      heading: `Pravidlo 3-2-1 pre zálohy`,
      visual: {
        kind: "text",
        label: "3 kópie, 2 médiá, 1 mimo domu",
        body: `1. Pôvodné dáta na notebooku.\n2. Záloha na externom SSD doma (Synology NAS alebo prenosný disk).\n3. Cloudová záloha mimo domu (Proton Drive, iCloud, Backblaze B2, OneDrive).\n→ Notebook umrie? Disk doma. Dom vyhorí? Cloud. Cloud zlyhá? Lokálny disk + originál.`,
      },
      commentary: `Backblaze (7 $/mesiac) je nepárny tým, že má unlimited backup celého počítača. iCloud / OneDrive sú dobré pre fotky a dokumenty. Pre rodinný fotoarchív 200 GB stačí Proton Drive 2 €/mesiac s end-to-end šifrovaním.`,
    },
    {
      kind: "example",
      heading: `Verejná wifi — reálne riziko v 2026`,
      visual: {
        kind: "url",
        url: "https://airport-free-wifi.connect/login",
        secure: false,
      },
      commentary: `Falošná wifi „Airport_Free_Wifi" zriadená útočníkom v letiskovej hale. Prihlasuješ sa cez ich „captive portal" — heslo na e-mail máš ukradnuté. Riešenie: vždy zapni VPN pred pripojením na akúkoľvek nedôverivú wifi. Alebo používaj mobilný hotspot.`,
    },
    {
      kind: "checklist",
      heading: "Checklist digitálnej bezpečnosti — víkendový setup",
      items: [
        {
          good: true,
          text: "Aktívny antivírus: Windows Defender (zdarma) alebo ESET / Bitdefender (platený, ak máš banking + deti).",
        },
        {
          good: true,
          text: "Automatické aktualizácie OS, prehliadača a appiek zapnuté — 90 % útokov ide cez staré verzie.",
        },
        {
          good: true,
          text: "Externý disk + cloud podľa 3-2-1 pravidla, automaticky každý týždeň.",
        },
        {
          good: true,
          text: "VPN (Mullvad / ProtonVPN) na verejnej wifi a pri cestách do zahraničia.",
        },
        {
          good: true,
          text: "uBlock Origin v prehliadači — blokuje malvertising a tracking-y, najlepšia bezpečnostná appka zdarma.",
        },
        {
          good: false,
          text: `Antivírus s 5 nepoužívanými „bezpečnostnými balíkmi" (Norton 360, McAfee Total Protection) — zaťažuje systém, neprináša hodnotu.`,
        },
        {
          good: false,
          text: `VPN „pre anonymitu" pri normálnom surfovaní — neanonymizuje ťa, len mení IP.`,
        },
      ],
    },
    {
      kind: "redflags",
      heading: "Marketingové bludy o bezpečnostných produktoch",
      flags: [
        `„VPN ťa ochráni pred hackermi" — nie, šifruje len sieťovú vrstvu, neochráni pred phishingom ani malware.`,
        `„Náš antivírus má 99,9 % detekciu" — všetky komerčné antivírusy majú podobné výsledky (AV-Test).`,
        `„Bezplatný VPN, žiadne logy" — bezplatný VPN predáva tvoje dáta, alebo má závažné limity. Mullvad / Proton sú platené z dôvodu.`,
        `„Náš cloud má AI ochranu pred ransomware" — marketing. Skutočná ochrana je verzionovanie + offline záloha.`,
        `„Heslo je dnes mŕtve, kúp si naše riešenie" — heslá + 2FA + správca hesiel je stále zlatý štandard.`,
        `„Bez nášho antivírusu Mac dostane vírus" — Mac dostáva malware, ale väčšinou cez phishing, nie cez tradičný vírus.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Senior level pravidlá pre 2026",
      do: [
        `Začni so záloha 3-2-1 — bezpečnostne najdôležitejší krok, lebo chráni pred ransomware aj hardvérovým zlyhaním.`,
        `Pre cestovanie / verejnú wifi: ProtonVPN alebo Mullvad, ideálne kill-switch zapnutý.`,
        `Aktualizuj OS aj appky automaticky — staré verzie sú najčastejší vektor útoku.`,
        `Pre banking PC: ESET / Bitdefender + samostatný prehliadač len pre banku (Brave / Firefox bez rozšírení).`,
      ],
      dont: [
        `Nestavaj svoju bezpečnosť na jednom produkte — vrstvenie (antivírus + 2FA + zálohy + ad-blocker) funguje, samostatné VPN nie.`,
        `Nepoužívaj „free" VPN ako Hola, Betternet — predávajú tvoju šírku pásma alebo dáta.`,
        `Nezálohuj len na jednu externú destináciu — pri požiari / krádeži / ransomware prídeš o všetko naraz.`,
        `Nedávaj antivírusu „plné práva" na e-mail a prehliadanie — zbieranie dát „pre lepšiu ochranu" je často marketing.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — ransomware napadol rodinný počítač",
      story: `Spustíš PC v sobotu ráno. Obrazovka: „Vaše súbory sú zašifrované. Pošlite 0,03 BTC (~1 800 €) na túto adresu do 72 hodín, inak ich navždy stratíte." Všetky fotky z 10 rokov, daňové priznania, dokumenty — všetko nečitateľné. Antivírus zlyhal.`,
      right_action: `NEPLATÍŠ. Polovica obetí, ktoré zaplatia, dáta späť nedostanú. Odpojíš PC od siete (vytiahneš ethernet, vypneš wifi). Hlásiš na SK-CERT (incident@sk-cert.sk). Z externého disku alebo cloud zálohy obnovíš dáta na nový / preinštalovaný systém. Pre budúcnosť: pravidlo 3-2-1 by ti tento útok stalo 30 minút reinštalu namiesto 1 800 € a možnej straty. Toto je hlavný dôvod, prečo má každý mať zálohu mimo domu.`,
    },
  ],
  sources: [
    { label: "SK-CERT — odporúčania pre koncových používateľov", url: "https://www.sk-cert.sk/" },
    { label: "AV-Test — nezávislé testy antivírusov", url: "https://www.av-test.org/" },
    { label: "Mullvad VPN — politika súkromia", url: "https://mullvad.net/" },
    { label: "Backblaze — cloudové zálohy", url: "https://www.backblaze.com/" },
  ],
};
