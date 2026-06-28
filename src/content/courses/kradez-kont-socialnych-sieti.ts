import type { Course } from "./_schema";

export const kradezKontCourse: Course = {
  slug: "kradez-kont-socialnych-sieti",
  title: `Krádež účtu na sociálnych sieťach — ako jej predísť a čo robiť po nej`,
  tagline:
    "Napadnutý Instagram za 30 sekúnd, obnova trvá dni. Tu je 5-minútová prevencia a krok-za-krokom postup, keď ti účet ukradnú.",
  category: "obecne",
  difficulty: "začiatočník",
  estimatedMinutes: 7,
  heroEmoji: "🔐",
  publishedAt: "2026-04-30",
  updatedAt: "2026-04-30",
  sections: [
    {
      kind: "intro",
      heading: "Prečo chcú váš Instagram viac ako váš e-mail",
      body: `Účet na sociálnych sieťach má pre útočníka väčšiu hodnotu, než si myslíte. Prístup k vášmu Instagramu, Facebooku alebo TikToku poskytuje: databázu vašich kontaktov (potenciálne obete), históriu komunikácie (materiál na vydieranie), dôveryhodný kanál na ďalšie podvody (podvádzanie priateľov vo vašom mene), prístup k prepojeným aplikáciám a niekedy aj priame platobné funkcie. Krádež účtu prebehne za menej ako minútu — obrana tiež netrvá dlho.`,
    },
    {
      kind: "example",
      heading: `Scenár #1 — Falošná bezpečnostná výzva`,
      visual: {
        kind: "email",
        from: "Instagram Security",
        fromEmail: "noreply@instagram-security-alert.com",
        subject: "⚠️ Unusual activity on your account — action required",
        body: `We noticed suspicious login from Romania. To protect your account, verify your identity within 24 hours. Click below to confirm.`,
        cta: "Verify my account",
      },
      commentary: `Správna doména Instagramu je @mail.instagram.com alebo @facebookmail.com. Akákoľvek obmena — „instagram-security-alert.com", „instagram-verify.net" — je phishing (podvodné vylákanie prihlasovacích či platobných údajov). Nikdy neklikajte na odkaz z e-mailu. Choďte priamo na instagram.com → nastavenia → bezpečnosť.`,
    },
    {
      kind: "example",
      heading: `Scenár #2 — Kompromitovaný kamarát posiela link`,
      visual: {
        kind: "sms",
        sender: "Zuzka 🌸 (kamoška)",
        body: "Haha toto to musis vidiet, si tam aj ty 😂 → cutt.ly/xy7k2",
        link: "https://cutt.ly/xy7k2",
      },
      commentary: `Kamoška to nenapísala — jej účet je kompromitovaný. Útočník posiela správu všetkým jej kontaktom. Odkaz po kliknutí buď inštaluje malware (škodlivý softvér), alebo vedie na falošnú prihlasovaciu stránku Instagramu. Pravidlo: ak vám ktokoľvek pošle odkaz bez kontextu — pred kliknutím si ho overte priamym telefonátom alebo SMS.`,
    },
    {
      kind: "example",
      heading: `Scenár #3 — Výkupné za účet`,
      visual: {
        kind: "text",
        label: "Direct message z vášho vlastného locknutého účtu",
        body: `„Máme prístup k vášmu účtu a súkromným správam. Zaplaťte 200 EUR v Bitcoine na adresu [xxx] do 48 hodín alebo zverejníme obsah. Ak kontaktujete políciu, okamžite publikujeme."`,
      },
      commentary: `Toto je sextortion (vydieranie zverejnením intímneho obsahu). 90 % týchto správ je blaf — útočníci posielajú tisíce správ v nádeji, že niekto zaplatí. Neplaťte! Nikdy. Nahláste to Instagramu (help.instagram.com), zmeňte heslo, nahláste to polícii na čísle 158. Všetko zdokumentujte snímkami obrazovky.`,
    },
    {
      kind: "checklist",
      heading: "5-minútová obrana pre každý váš účet",
      items: [
        {
          good: true,
          text: "Zapnite dvojfaktorové overenie (2FA) — najlepšie cez autentifikačnú aplikáciu (Google Authenticator, Authy), nie cez SMS.",
        },
        {
          good: true,
          text: "Skontrolujte prepojené aplikácie — Nastavenia → Bezpečnosť → Prepojené aplikácie. Odopnite tie, ktoré nepoužívate.",
        },
        {
          good: true,
          text: "Pre každú sieť iné heslo — aspoň 12 znakov, ideálne cez správcu hesiel (Bitwarden je zadarmo).",
        },
        {
          good: true,
          text: "Skontrolujte zoznam prihlásených zariadení — každé neznáme zariadenie ihneď odpojte.",
        },
        {
          good: true,
          text: "Nastavte si záložný e-mail a telefónne číslo na obnovu — aktuálne, nie staré.",
        },
        {
          good: false,
          text: "Neprihlasujte sa cez Facebook/Google do cudzích aplikácií, ktoré nepotrebujú váš profil — každé prepojenie je ďalší útočný vektor.",
        },
        {
          good: false,
          text: 'Nezdieľajte prihlasovacie údaje ani „zálohy" s nikým — ani s „podporou" siete.',
        },
      ],
    },
    {
      kind: "scenario",
      heading: `Zrána — telefón hlási „neznáme prihlásenie"`,
      story: `Dostanete notifikáciu: „Nové prihlásenie z Charkova, Ukrajina." Päť minút nato váš Instagram zobrazí chybovú hlášku — heslo bolo zmenené. Priatelia vám píšu, že dostali od vás podozrivé správy.`,
      right_action: `Okamžite idete na instagram.com/accounts/password/reset, zadáte e-mailovú adresu a obnovíte heslo. Ak útočník zmenil aj e-mail, použijete „Získať pomoc cez prihlásenie" → overenie tvárou alebo telefónnym číslom. Po obnovení odhlásite všetky cudzie relácie (Nastavenia → Zariadenia), nastavíte nové silné heslo a zapnete 2FA. Upozorníte priateľov, ktorí dostali správy z vášho účtu.`,
    },
  ],
  sources: [
    { label: "Instagram — nahlásenie napadnutého účtu", url: "https://help.instagram.com/" },
    { label: "NCSC — protecting social media accounts", url: "https://www.ncsc.gov.uk/" },
    { label: "SK-CERT — bezpečnosť účtov", url: "https://www.sk-cert.sk/" },
  ],
};
