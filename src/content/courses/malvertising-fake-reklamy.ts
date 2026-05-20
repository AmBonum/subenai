import type { Course } from "./_schema";

export const malvertisingCourse: Course = {
  slug: "malvertising-fake-reklamy",
  title: "Falošné Google reklamy — banka na prvom mieste, no nie vaša",
  tagline:
    'Hľadáš „VÚB prihlásenie" a klikneš na prvý Google výsledok. Prvý výsledok nemusí byť VÚB — ako rozoznáš falošnú reklamu od pravého výsledku.',
  category: "obecne",
  difficulty: "pokročilý",
  estimatedMinutes: 8,
  heroEmoji: "🎯",
  relatedQuestionsCategory: "phishing",
  publishedAt: "2026-04-29",
  updatedAt: "2026-04-29",
  sections: [
    {
      kind: "intro",
      heading: "Reklamy na prvom mieste nie sú automaticky dôveryhodné",
      body: `Kedy naposledy si hľadal prihlásenie do internet bankingu cez Google? Väčšina ľudí to robí bežne. Útočníci to vedia — a platia Google Ads za to, aby ich falošná stránka bola na prvom mieste vo výsledkoch vyhľadávania. Tento útok sa volá malvertising (malicious advertising). Výsledok vyzerá legitímne: správny názov banky, zelené písmo domény... kým sa nepozrieš pozorne. Podľa ENISA a Europolu sa malvertising v rokoch 2024–2025 stal jedným z najrýchlejšie rastúcich vektorov bankového phishingu v EÚ.`,
    },
    {
      kind: "example",
      heading: "Vzor #1 — Falošná Tatra banka vo výsledkoch Google",
      visual: {
        kind: "url",
        url: "https://tatrabanka-prihlasenie.sk/login",
        secure: true,
      },
      commentary: `Útočník zaplatil za Google reklamu s názvom „Tatra Banka — Internetové bankovníctvo". Doména je tatrabanka-prihlasenie.sk — nie tatrabanka.sk. Pravá Tatra banka je na elektronickebankovnictvo.tatrabanka.sk alebo tb.tatrabanka.sk. Pomlčka v doméne je pri bankách takmer vždy falošná.`,
    },
    {
      kind: "example",
      heading: "Vzor #2 — VÚB sponsored link",
      visual: {
        kind: "url",
        url: "https://vub-banking.online/prihlasenie",
        secure: true,
      },
      commentary: `VÚB má doménu vub.sk — nie vub-banking.online. Táto reklama sa objavila na vrchole Google výsledkov pri hľadaní „vúb internet banking prihlásenie". HTTPS (zelený zámok) neznamená, že stránka je bezpečná — iba že spojenie je šifrované. Certifikát si môže vziať ktokoľvek vrátane podvodníkov.`,
    },
    {
      kind: "example",
      heading: "Vzor #3 — Falošný crypto broker cez Facebook/Instagram reklamu",
      visual: {
        kind: "instagram",
        account: "cryptoinvest.sk",
        verified: false,
        body: `🔥 EXKLUZÍVNE: Slovenská sporiteľňa otvorila krypto investičný portál pre klientov SR. Garantovaný výnos 12 % mesačne. Registrujte sa cez overený link — len 500 miest! ⏰`,
        cta: "Registrovať sa",
        imageEmoji: "💰",
      },
      commentary: `SLSP (ani žiadna slovenská banka) neotvorila krypto portál s garantovanými výnosmi — to je zákonom zakázané. Inzerát na Instagrame, neoverený účet, jazykový vzor „exkluzívne + obmedzený počet" = scam. Garantovaný výnos v investíciách neexistuje — za akékoľvek garantovanie sa udeľujú pokuty od NBS.`,
    },
    {
      kind: "example",
      heading: "Vzor #4 — Falošný Microsoft 365 login cez Bing reklamu",
      visual: {
        kind: "url",
        url: "https://microsoft365-sk.login-secure.com/auth",
        secure: true,
      },
      commentary: `Microsoft 365 login je na login.microsoftonline.com alebo login.microsoft.com — nič iné. Doména login-secure.com (s početnými pomlčkami a generickým názvom) je typický phishing. Útočníci nakúpili reklamu na Bing s vizuálom identickým s Microsoft stránkou.`,
    },
    {
      kind: "checklist",
      heading: "Ako spoznať falošnú reklamu vo výsledkoch",
      items: [
        {
          good: false,
          text: `Klikám na prvý výsledok Google bez kontroly domény — „určite je to správne, inak by tam nebol".`,
        },
        {
          good: false,
          text: `Vidím „Sponzorované / Ad" štítok a neriešim ho — reklamy sú predsa overené.`,
        },
        {
          good: false,
          text: `HTTPS zámok vidím a predpokladám, že stránka je teda bezpečná.`,
        },
        {
          good: true,
          text: `Doménu si prečítam celú — tatrabanka.sk vs tatrabanka-prihlasenie.sk sú dve rôzne veci.`,
        },
        {
          good: true,
          text: `Bankové prihlásenie si zálohujem ako záložku v prehliadači a používam ju — nie Google pri každom prihlásení.`,
        },
        {
          good: true,
          text: `Ak reklama sľubuje „garantovaný výnos", okamžite ju zavriem — to je zákonom neprípustné.`,
        },
      ],
    },
    {
      kind: "redflags",
      heading: "Signály malvertising útoku",
      flags: [
        `Výsledok má štítok „Sponzorované" alebo „Ad" a doména sa líši od tej, ktorú poznáš zo záložky.`,
        `Doména obsahuje pomlčky, nadbytočné slová (prihlasenie, secure, banking, login) za názvom banky.`,
        `HTTPS zámok je prítomný, ale doména nepatrí inštitúcii — certifikát si môže vziať ktokoľvek.`,
        `Investičná reklama od „banky" na sociálnej sieti sľubuje garantovaný výnos alebo exkluzívnu ponuku.`,
        `Prihlasovací formulár ťa žiada o celé heslo + OTP naraz (banka ich nikdy nepýta súčasne).`,
        `Stránka pôsobí identicky s originálom, ale URL nič nesedí (falošné, pixel-perfect kópie sú bežné).`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Zlaté pravidlá pre bankové prihlásenie online",
      do: [
        `Uložte si prihlásenie banky ako záložku (bookmark) v prehliadači a používajte ju — nie Google.`,
        `Pred zadaním hesla vždy skontrolujte doménu v adresnom riadku (nie len zobrazené logo stránky).`,
        `Investičné ponuky od bánk overujte priamo na overenom webe banky, nie cez reklamy.`,
        `Legitímne reklamné kampane bánk na sociálnych sieťach referujú na ich vlastnú doménu v URL.`,
        `Podozrivú reklamu nahláste priamo Googlu/Meta cez tlačidlo „Nahlásiť reklamu".`,
      ],
      dont: [
        `Nepoužívajte Google na každodenné prihlasovanie do internet bankingu — bookmark je bezpečnejší.`,
        `Neverte, že HTTPS zámok = bezpečná stránka. Phishingové stránky bežne majú platný SSL certifikát.`,
        `Neprihlasujte sa do banky ani do Mail/Microsoft 365 cez link z SMS alebo e-mailu bez overenia.`,
        `Neinvestujte cez reklamné linky na sociálnych sieťach sľubujúce garantovaný výnos.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Pondelkové ráno — potrebuješ urgentne zaplatiť faktúru",
      story: `Je 8:15, sedíš v aute a potrebuješ zaplatiť faktúru do 9:00. Otvoríš Chrome, napíšeš „tatra banka prihlasenie" — prvý výsledok hovorí „Tatra Banka — Internetové bankovníctvo" so zelenou doménou. Klikneš, prihlasovací formulár vyzerá identicky ako vždy. Zadáš meno a heslo...`,
      right_action: `Zastaneš pri URL: tatrabanka-online.sk namiesto tatrabanka.sk. Zavrieš tab. Otvoríš záložku, ktorú máš uloženú ako „Tatra banka". Zaplatíš faktúru. Neskôr nahlásiš podvodnú reklamu Googlu. Útočník mal falošnú stránku nahorenú len 6 hodín, kým ju Google vymazal — no stihol zachytiť stovky prihlásení.`,
    },
  ],
  sources: [
    {
      label: "ENISA Threat Landscape 2024 — Phishing a social engineering",
      url: "https://www.enisa.europa.eu/publications/enisa-threat-landscape-2024",
    },
    {
      label: "Europol IOCTA 2026 — Online fraud schemes",
      url: "https://www.europol.europa.eu/publication-events/main-reports/iocta-2026-evolving-threat-landscape",
    },
    {
      label: "SK-CERT — Malvertising upozornenie",
      url: "https://www.sk-cert.sk/",
    },
  ],
};
