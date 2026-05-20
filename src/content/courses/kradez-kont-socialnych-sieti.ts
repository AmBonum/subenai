import type { Course } from "./_schema";

export const kradezKontCourse: Course = {
  slug: "kradez-kont-socialnych-sieti",
  title: `Krádež účtu na sociálnych sieťach — ako ju predísť a čo robiť po nej`,
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
      heading: "Prečo chcú váš Instagram viac ako váš email",
      body: `Účet na sociálnych sieťach má pre útočníka väčšiu hodnotu, než si myslíte. Prístup k vášmu Instagramu, Facebooku alebo TikToku poskytuje: databázu vašich kontaktov (potenciálne obete), históriu komunikácie (materiál pre vydieranie), dôveryhodný kanál pre ďalšie podvody (scamovanie priateľov z vášho mena), prístup k prepojeným aplikáciám a niekedy aj priame platobné funkcie. Krádež účtu prebehne za menej ako minútu — obrana tiež netrvá dlho.`,
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
      commentary: `Správna doména Instagrama je @mail.instagram.com alebo @facebookmail.com. Akákoľvek variácia — „instagram-security-alert.com", „instagram-verify.net" — je phishing. Nikdy neklikajte na odkaz z emailu. Idete priamo na instagram.com → nastavenia → bezpečnosť.`,
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
      commentary: `Kamoška to nenapísala — jej účet je kompromitovaný. Útočník posiela správu všetkým jej kontaktom. Link po naskenovaní buď inštaluje malware alebo vedie na falošnú Instagram login stránku. Pravidlo: ak je link bez kontextu od kohokoľvek — overíte priamym telefonátom/SMS pred kliknutím.`,
    },
    {
      kind: "example",
      heading: `Scenár #3 — Výkupné za účet`,
      visual: {
        kind: "text",
        label: "Direct message z vášho vlastného locknutého účtu",
        body: `„Máme prístup k vášmu účtu a súkromným správam. Zaplaťte 200 EUR v Bitcoine na adresu [xxx] do 48 hodín alebo zverejníme obsah. Ak kontaktujete políciu, okamžite publikujeme."`,
      },
      commentary: `Toto je sextortion / vydieranie. 90 % týchto správ sú bluf — útočníci posielajú tisíce správ v nádeji, že niekto zaplatí. Neplaťte! Nikdy. Nahláste Instagramu (help.instagram.com), zmeňte heslo, nahláste polícia 158. Dokumentujte screenshotmi.`,
    },
    {
      kind: "checklist",
      heading: "5-minútová obrana pre váš každý účet",
      items: [
        {
          good: true,
          text: "Zapnite dvojfaktorovú autentifikáciu (2FA) — najlepšie cez autentifikátorovú app (Google Authenticator, Authy), nie SMS.",
        },
        {
          good: true,
          text: "Skontrolujte prepojené aplikácie — Nastavenia → Bezpečnosť → Prepojené aplikácie. Odopnite tie, ktoré nepoužívate.",
        },
        {
          good: true,
          text: "Pre každú sieť iné heslo — aspoň 12 znakov, ideálne cez password manager (Bitwarden je zadarmo).",
        },
        {
          good: true,
          text: "Skontrolujte zoznam prihlásených zariadení — každé neznáme zariadenie ihneď odpojte.",
        },
        {
          good: true,
          text: "Nastavte záložný email + telefónne číslo pre obnovu — aktuálne, nie staré.",
        },
        {
          good: false,
          text: "Neprihlasujte sa cez Facebook/Google do cudzích apiek, ktoré nepotrebujú váš profil — každé prepojenie je ďalší útočný vektor.",
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
      right_action: `Okamžite idete na instagram.com/accounts/password/reset zadáte emailovú adresu a obnovíte heslo. Ak útočník zmenil aj email, použijete „Získať pomoc cez prihlásenie" → identifikácia tvárou/číslom. Po obnovení: vypnete všetky cudzie sessions (Nastavenia → Zariadenia), nastavíte nové silné heslo a zapnete 2FA. Upozorníte priateľov, čo dostali správy z vášho účtu.`,
    },
  ],
  sources: [
    { label: "Instagram — nahlásenie napadnutého účtu", url: "https://help.instagram.com/" },
    { label: "NCSC — protecting social media accounts", url: "https://www.ncsc.gov.uk/" },
    { label: "SK-CERT — bezpečnosť účtov", url: "https://www.sk-cert.sk/" },
  ],
};
