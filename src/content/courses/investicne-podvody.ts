import type { Course } from "./_schema";

export const investmentScamsCourse: Course = {
  slug: "investicne-podvody-krypto-ai",
  title: `Krypto a „AI brokeri": prečo Elon Musk nezarába na Instagrame`,
  tagline:
    'Reklamy s deepfake Elonom, pump & dump tokeny a „AI brokeri" — 5 schém, ktorými ťa pripravia o 10 000 € a viac.',
  category: "investicie",
  difficulty: "pokročilý",
  estimatedMinutes: 12,
  heroEmoji: "📉",
  publishedAt: "2026-04-26",
  updatedAt: "2026-04-26",
  sections: [
    {
      kind: "intro",
      heading: `Investičný podvod nie je „blbosť pre dôchodcov"`,
      body: `Krypto a AI-trading scamy (podvody) sa cielia na inú demografiu, než by si čakal — 25 až 55 rokov, technicky zruční, ale finančne neistí. Ponuka je vždy rovnaká: zaručený výnos, exkluzívny prístup a presvedčivá známa tvár (Elon Musk, Andrej Kiska, Boris Kollár). V skutočnosti ide o profesionálny podvod riadený z call-centra, ktorý ťa povedie tri týždne za ruku — kým ti účet nevybielia.`,
    },
    {
      kind: "example",
      heading: `Schéma #1 — deepfake reklama na Instagrame`,
      visual: {
        kind: "instagram",
        account: "elon_musk_invest",
        verified: true,
        body: `Elon Musk: „Ďakujem všetkým, kto sa pridal k mojej AI-trading platforme TeslaQuantum. Prvý mesiac vám zarobí 12 % istým zhodnotením. Stačí 250 EUR vklad."`,
        cta: "Skús to s 250 EUR",
        imageEmoji: "🤖",
        price: "250 €",
      },
      commentary: `Reklama je deepfake (umelo vygenerované falošné video či hlas) — Muskov hlas a obraz sú vygenerované AI z verejných videí. Ani Musk, ani žiadna iná známa osobnosť ti nikdy nesľúbi „istý" výnos cez reklamu na Instagrame. Verifikovaný účet je často kúpený alebo získaný phishingom (podvodným vylákaním prihlasovacích či platobných údajov).`,
    },
    {
      kind: "example",
      heading: `Schéma #2 — „AI auto-trader bot"`,
      visual: {
        kind: "url",
        url: "https://teslaquantum-ai.io/dashboard",
        secure: true,
      },
      commentary: `Profesionálny dashboard ti ukazuje, ako tvojich „250 EUR" za týždeň narástlo na 480 EUR. Čísla sú falošné — nikdy sa neobchodovalo, len ti zobrazujú JavaScript animáciu. Keď chceš peniaze von, požiadajú „daň zo zisku" 800 EUR vopred. Kým zaplatíš, zmiznú.`,
    },
    {
      kind: "example",
      heading: `Schéma #3 — pump & dump cez Telegram skupinu`,
      visual: {
        kind: "text",
        label: `Telegram „VIP signals"`,
        body: `Admin: „Dnes o 19:00 nakupujte $MOON token. Cena 0,003 USD, target 0,05 USD do dvoch dní. Toto je naša 17. úspešná operácia."

19:00 — token sa skutočne pohne (organizátori už nakúpili včera za 0,001).
19:15 — komunita masívne kupuje, cena vyletí na 0,008.
19:30 — organizátori predávajú všetko (DUMP), cena padá na 0,0005.

Tvojich 500 EUR sa zmenilo na 30 EUR.`,
      },
      commentary: `Klasický pump & dump (umelé vyhnanie a následný prepad ceny) na neznámych meme tokenoch. Skupina je skutočná, signály sú skutočné, ale ty si vždy ten posledný. Profesionálni „insideri" zarobia, drobní investori (ty) prerobia. Funguje desaťročia, len sa presunul z lacných akcií do kryptomien.`,
    },
    {
      kind: "example",
      heading: `Schéma #4 — „osobný broker" cez WhatsApp`,
      visual: {
        kind: "text",
        label: `Konverzácia s „Marekom"`,
        body: `Marek z TQ Capital: „Vidím, že máš účet na našej platforme. Som tvoj osobný account manager. Aby si urýchlil zhodnotenie, navrhujem zvýšiť vklad na 5 000 EUR a využiť leverage 1:50."

Po 2 dňoch: „Ojoj, trh sa otočil, tvoja pozícia hrozí likvidáciou. Pošli ďalších 3 000 EUR margin call do hodiny."

Po týždni: „Nepodarilo sa zachrániť pozíciu, ale máš nárok na refundáciu — pošli 1 200 EUR daň."`,
      },
      commentary: `Neexistuje legitímny broker, ktorý ti zavolá cez WhatsApp a tlačí ťa na vyšší vklad. Marek sedí v call-centre v Albánsku alebo Izraeli a číta scenár. „Margin call" (výzva na doplnenie zálohy) a „daň z refundácie" sú len rôzne obmeny toho istého: pošli ešte viac peňazí.`,
    },
    {
      kind: "example",
      heading: `Schéma #5 — fake broker s licenciou „CySEC"`,
      visual: {
        kind: "url",
        url: "https://eu-trader-pro.com/regulated",
        secure: true,
      },
      commentary: `Stránka prezentuje „regulácia CySEC #248/12, FCA #FRN-887234". Čísla sú vymyslené alebo patria úplne inej firme. Skutočný regulovaný broker (Interactive Brokers, eToro) má licenciu overiteľnú v registri CySEC / NBS. Vždy si ju over priamo na regulátorovi, nie cez link na ich stránke.`,
    },
    {
      kind: "redflags",
      heading: "Indície investičného podvodu",
      flags: [
        `„Garantovaný" alebo „istý" výnos. Žiadny legitímny produkt to neponúka.`,
        `Známa osobnosť (Musk, Kiska) odporúča „exkluzívne" v IG reklame.`,
        `Osobný account manager ti volá / píše cez WhatsApp / Telegram.`,
        `Tlak zvýšiť vklad, použiť „páku", „nezmeškať okamih".`,
        `Daň / poplatok / refundácia, ktorú musíš zaplatiť skôr ako uvidíš peniaze.`,
        `Doména .io / .co / .xyz, ktorá nie je v zozname Národnej banky Slovenska.`,
        `Komunita na Telegrame, kde admin sám nikdy nestratil.`,
        `Dashboard ukazuje úžasné zisky, ale výber sa odkladá.`,
        `Stránka má regulačné čísla, ktoré nesedia s registrom regulátora.`,
        `Sociálny dôkaz — snímky obrazovky „zákazníkov, ktorí už zarobili 50-tisíc EUR".`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá, ktoré ťa zachránia pred krypto/AI podvodom",
      do: [
        `Pred vkladom over brokera v registri NBS (https://www.nbs.sk/sk/dohlad-nad-financnym-trhom/zoznamy).`,
        `Používaj len známe regulované platformy (Interactive Brokers, Trading 212, eToro, XTB).`,
        `Kryptomeny drž len na známych burzách (Coinbase, Kraken, Binance) a v hardvérovej peňaženke (Ledger, Trezor).`,
        `Investuj len sumu, o ktorú si môžeš dovoliť prísť.`,
        `Ak ťa kontaktuje „osobný broker" — okamžite ukonči hovor.`,
      ],
      dont: [
        `Neklikať na investičnú reklamu v zozname príspevkov na IG / FB / TikTok.`,
        `Nezadávať údaje karty na stránku, ktorú odporučila deepfake celebrita.`,
        `Neposielať „daň zo zisku" alebo „margin call" vopred.`,
        `Nedávať vzdialený prístup do počítača ani do bankovej aplikácie „account managerovi".`,
        `Nenakupovať bezcenné kryptomeny na základe signálov z Telegramu.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — utorok večer, scrolluješ Instagram",
      story: `Reklama: krátke video, Boris Kollár hovorí „Pripojil som sa k novej AI-trading platforme, prvý mesiac mi zarobila 18 %. Skúste to aj vy, stačí 250 EUR." Po kliknutí pekná stránka, registrácia, „account manager Tomáš" volá za 30 minút.`,
      right_action: `Reklamu nahlásiš (Meta umožňuje nahlásiť ju ako podvod), platformu zatvoríš. Boris Kollár nikdy neodporučí investičnú platformu cez sociálnu sieť — ide o deepfake. Žiadny legitímny broker nezavolá za 30 minút. Vklad nikdy neurobíš.`,
    },
  ],
  sources: [
    {
      label: `Národná banka Slovenska — varovania pred neoprávnenými investičnými službami`,
      url: "https://www.nbs.sk/",
    },
    { label: `ESMA — investor warnings`, url: "https://www.esma.europa.eu/" },
    { label: `NCKB — krypto podvody`, url: "https://www.sk-cert.sk/" },
  ],
};
