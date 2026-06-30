// Question bank — 100 quality Slovak scam scenarios.
// Visual context is described as a structured `visual` prop and rendered
// by QuestionCard via screenshot components (SMS, Email, URL, IG, listing, call).

export type Category = "phishing" | "url" | "fake_vs_real" | "scenario" | "honeypot";
export type Difficulty = "easy" | "medium" | "hard";
export type Severity = "critical" | "medium" | "minor" | null;

export interface Option {
  id: string;
  label: string;
  correct: boolean;
  severity: Severity;
}

export type Visual =
  | { kind: "sms"; sender: string; body: string; link?: string; time?: string }
  | {
      kind: "email";
      from: string;
      fromEmail: string;
      subject: string;
      body: string;
      cta?: string;
    }
  | { kind: "url"; url: string; secure?: boolean }
  | {
      kind: "instagram";
      account: string;
      verified?: boolean;
      body: string;
      cta?: string;
      imageEmoji?: string;
      price?: string;
    }
  | {
      kind: "listing";
      site: string;
      title: string;
      price: string;
      location?: string;
      description: string;
      imageEmoji?: string;
    }
  | { kind: "call"; caller: string; number: string; hint?: string }
  | { kind: "text"; label: string; body: string };

export interface Question {
  id: string;
  category: Category;
  difficulty: Difficulty;
  prompt: string;
  visual?: Visual;
  options: Option[];
  explanation: string;
}

// Helpers for option construction
const ok = (id: string, label: string): Option => ({
  id,
  label,
  correct: true,
  severity: null,
});
const bad = (id: string, label: string, sev: Exclude<Severity, null>): Option => ({
  id,
  label,
  correct: false,
  severity: sev,
});

export const QUESTIONS: Question[] = [
  // ============ PHISHING — SMS (Slovenská pošta, couriers, banks) ============
  {
    id: "p-sms-posta-1",
    category: "phishing",
    difficulty: "easy",
    prompt: "Prišla ti táto SMS. Klikneš?",
    visual: {
      kind: "sms",
      sender: "InfoSMS",
      body: "Slovenská pošta: Vaša zásielka čaká. Doplaťte 1,99€ za doručenie:",
      link: "http://posta-sk.delivery-pay.com/track",
    },
    options: [
      bad("a", "Kliknem a zaplatím — len 2 eurá", "critical"),
      ok("b", "Ignorujem — Pošta neposiela linky"),
      bad("c", "Odpíšem na číslo a opýtam sa", "minor"),
    ],
    explanation:
      "Slovenská pošta neposiela platobné linky cez SMS. `delivery-pay.com` nie je oficiálna doména.",
  },
  {
    id: "p-sms-dpd-1",
    category: "phishing",
    difficulty: "easy",
    prompt: "DPD ti píše. Akcia?",
    visual: {
      kind: "sms",
      sender: "+421 902 555 121",
      body: "DPD: Balík nebolo možné doručiť, kuriér čaká na váš výber adresy:",
      link: "https://dpd-sk.parcel-redirect.info",
    },
    options: [
      bad("a", "Kliknem — chcem balík", "critical"),
      ok("b", "Skontrolujem stav v oficiálnej DPD appke / na dpd.sk"),
      bad("c", "Zavolám na to číslo", "medium"),
    ],
    explanation:
      "DPD má `dpd.sk`. Subdomény typu `parcel-redirect.info` sú phishing. Skontroluj balík priamo v appke.",
  },
  {
    id: "p-sms-tatra-1",
    category: "phishing",
    difficulty: "medium",
    prompt: 'SMS „od banky". Reaguješ?',
    visual: {
      kind: "sms",
      sender: "TatraBanka",
      body: "Zaznamenali sme prihlásenie z neznámeho zariadenia (Praha). Ak ste to neboli vy, overte tu:",
      link: "https://tatrabanka-secure.sk/overit",
    },
    options: [
      bad("a", "Kliknem — môj účet je v ohrození", "critical"),
      ok("b", "Otvorím Tatra banka appku ručne a pozriem aktivitu"),
      bad("c", "Odpíšem STOP", "medium"),
    ],
    explanation:
      "Tatra banka = `tatrabanka.sk`. `tatrabanka-secure.sk` je phishing klon. Vždy otvor appku manuálne.",
  },
  {
    id: "p-sms-slsp-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Sporiteľňa ti píše. Klik?",
    visual: {
      kind: "sms",
      sender: "SLSP-Info",
      body: "Vaša karta bola dočasne zablokovaná z dôvodu bezpečnosti. Odblokujte tu:",
      link: "https://slsp.sk-bezpecnost.online",
    },
    options: [
      bad("a", "Kliknem — potrebujem kartu", "critical"),
      ok("b", "Zavolám na číslo na zadnej strane karty"),
      bad("c", "Odpíšem ANO", "medium"),
    ],
    explanation:
      "Pravá doména je `slsp.sk`. To, čo je v URL pred prvou lomkou (zľava posledné 2 časti), tu znie `sk-bezpecnost.online` = scam.",
  },
  {
    id: "p-sms-csob-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "ČSOB ti píše o aktualizácii.",
    visual: {
      kind: "sms",
      sender: "CSOB",
      body: "Z dôvodu novej PSD2 regulácie aktualizujte vaše údaje do 24h, inak bude účet pozastavený:",
      link: "https://csob-update.eu/auth",
    },
    options: [
      bad("a", "Aktualizujem — kvôli regulácii", "critical"),
      ok("b", "Ignorujem — banka takto nikdy nepýta údaje"),
      bad("c", "Zatelefonujem na číslo z SMS", "medium"),
    ],
    explanation:
      "Naliehavosť + odkaz na reguláciu = klasický phishing trik. Žiadna banka takto nezbiera údaje.",
  },
  {
    id: "p-sms-2fa-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "Práve si zadal heslo do net bankingu a prišla ti táto SMS. Klikneš na potvrdiť?",
    visual: {
      kind: "sms",
      sender: "TB SecureCode",
      body: "Potvrdte transakciu: 2 450€ → IBAN SK21 0900 0000 0050 1234 5678. Kód: 884213",
    },
    options: [
      bad("a", "Áno — práve som sa prihlasoval", "critical"),
      ok("b", "Nie — neposielal som žiadnu platbu"),
      bad("c", "Pre istotu zadám kód do appky", "critical"),
    ],
    explanation:
      "Toto je real-time phishing: scammer tvoje heslo už má a snaží sa cez teba potvrdiť svoju platbu. Vždy čítaj sumu a IBAN v SMS.",
  },
  {
    id: "p-sms-tax-1",
    category: "phishing",
    difficulty: "easy",
    prompt: "Daňový úrad ti vraj vracia preplatok.",
    visual: {
      kind: "sms",
      sender: "DanovyUrad",
      body: "Bol vám priznaný preplatok 287,50€. Pre vyplatenie zadajte údaje karty:",
      link: "https://financnasprava-vratky.sk",
    },
    options: [
      bad("a", "Zadám kartu — chcem peniaze", "critical"),
      ok("b", "Ignorujem — daniari neposielajú peniaze cez SMS link"),
    ],
    explanation:
      "Finančná správa nikdy nepýta údaje karty cez SMS. Preplatky idú na účet z daňového priznania.",
  },

  // ============ PHISHING — Email ============
  {
    id: "p-email-netflix-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Tento email — phishing alebo legit?",
    visual: {
      kind: "email",
      from: "Netflix Security",
      fromEmail: "security@netfl1x-account.com",
      subject: "Vaše predplatné bolo pozastavené",
      body: "Zistili sme problém s platbou. Aktualizujte fakturačné údaje do 24h, inak bude účet zrušený.",
      cta: "Aktualizovať teraz",
    },
    options: [
      bad("a", "Legit — kliknem aktualizovať", "critical"),
      ok("b", "Phishing — `netfl1x` má jednotku namiesto `i`"),
      bad("c", "Legit, ale prihlásim sa cez appku", "minor"),
    ],
    explanation:
      "`netfl1x-account.com` nie je doména Netflixu. Číslo namiesto písmena (`l` → `1`, `o` → `0`) je typický phishing trik.",
  },
  {
    id: "p-email-microsoft-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Microsoft hlási problém. Reakcia?",
    visual: {
      kind: "email",
      from: "Microsoft Account Team",
      fromEmail: "no-reply@microsoft-verify.com",
      subject: "Neobvyklá aktivita na vašom účte",
      body: "Zistili sme prihlásenie z Ruska. Ak to neboli vy, kliknite a zabezpečte účet.",
      cta: "Zabezpečiť účet",
    },
    options: [
      bad("a", "Kliknem — niekto sa hacká", "critical"),
      ok("b", "Otvorím account.microsoft.com ručne v prehliadači"),
      bad("c", "Pošlem to IT oddeleniu na kontrolu", "minor"),
    ],
    explanation:
      "Microsoft posiela z `@accountprotection.microsoft.com`, nie `@microsoft-verify.com`. Vždy otvor stránku ručne.",
  },
  {
    id: "p-email-apple-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Apple ti tvrdí, že si kúpil aplikáciu.",
    visual: {
      kind: "email",
      from: "Apple Support",
      fromEmail: "billing@apple-receipts.co",
      subject: "Faktúra: Final Cut Pro — 329,99€",
      body: "Ďakujeme za nákup. Ak ste neautorizovali túto transakciu, kliknite na zrušenie do 12 hodín.",
      cta: "Zrušiť transakciu",
    },
    options: [
      bad("a", "Kliknem — nič som nekupoval", "critical"),
      ok("b", "Skontrolujem nákupy v App Store / appleid.apple.com"),
    ],
    explanation:
      "Klasický fake receipt phishing. Šokuje ťa cena, panicky klikneš. Apple posiela z `@email.apple.com`.",
  },
  {
    id: "p-email-google-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "Google Drive zdieľanie. Otvoríš?",
    visual: {
      kind: "email",
      from: "Peter Novák (cez Google Drive)",
      fromEmail: "drive-shares-noreply@google.com",
      subject: "Peter zdieľal s vami: Faktura_2024.pdf",
      body: "Peter Novák zdieľal s vami dokument. Otvorte ho a prihláste sa pre prístup.",
      cta: "Otvoriť dokument",
    },
    options: [
      bad("a", "Otvorím — pozná moju adresu", "medium"),
      ok("b", "Otvorím Drive ručne a pozriem zdieľané"),
      bad("c", "Pošlem mu odpoveď, kto je", "minor"),
    ],
    explanation:
      "Aj keď email môže byť pravý od Google, dokument vnútri vedie na fake login. Skontroluj v Drive ručne.",
  },
  {
    id: "p-email-job-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Ponuka práce na LinkedIn cez email.",
    visual: {
      kind: "email",
      from: "HR Recruiter",
      fromEmail: "recruiter@global-talent-hub.work",
      subject: "Pracovná ponuka 4500€ remote — pre vás",
      body: "Videli sme váš profil. Sme schopní vám ponúknuť pozíciu Marketing Assistant, plat 4500€/mesiac, plne remote. Pre štart pošlite kópiu OP a IBAN.",
    },
    options: [
      bad("a", "Pošlem — znie to skvele", "critical"),
      ok("b", "Ignorujem — pýtať OP+IBAN pred pohovorom = scam"),
      bad("c", "Pýtam sa najprv viac detailov", "minor"),
    ],
    explanation:
      "Žiadny seriózny zamestnávateľ nepýta IBAN a OP pred pohovorom. Toto je identity theft scam.",
  },
  {
    id: "p-email-bec-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "Email od šéfky. Reaguješ?",
    visual: {
      kind: "email",
      from: "Jana Nováková",
      fromEmail: "jana.novakova@firma.sk",
      subject: "Rýchla pomoc",
      body: "Ahoj, som na meetingu, nemôžem volať. Potrebujem urgentne kúpiť 5 Apple gift kariet pre klienta. Pošli mi kódy SMS-kou. Nákup ti preplatíme zajtra.",
    },
    options: [
      bad("a", "Kúpim a pošlem kódy — je to šéfka", "critical"),
      ok("b", "Najprv jej zavolám/napíšem priamo"),
      bad("c", "Odpíšem na ten email", "medium"),
    ],
    explanation:
      "BEC scam (Business Email Compromise). Apple/Google gift karty = univerzálny scammer cash-out. Vždy overiť cez iný kanál.",
  },
  {
    id: "p-email-paypal-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "PayPal ti údajne posiela peniaze.",
    visual: {
      kind: "email",
      from: "PayPal",
      fromEmail: "service@paypa1-secure.com",
      subject: "Dostali ste 850 USD — potvrďte príjem",
      body: "Pre prijatie platby sa prihláste a potvrďte transakciu. Po 24h prepadne.",
      cta: "Prijať platbu",
    },
    options: [
      bad("a", "Prijmem — peniaze sú peniaze", "critical"),
      ok("b", "Ignorujem — `paypa1` je číslo, nie pravý PayPal"),
    ],
    explanation:
      'Pravá doména je `paypal.com`. Tu je `paypa1-secure.com` (jednotka). Email „dostali ste peniaze" je top phishing taktika.',
  },
  {
    id: "p-email-icloud-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "iCloud hlási, že máš plný úložný priestor.",
    visual: {
      kind: "email",
      from: "iCloud",
      fromEmail: "support@icloud-storage-help.com",
      subject: "Vaše úložisko je plné — fotky budú zmazané",
      body: "Aktualizujte plán pre zachovanie vašich fotografií. Akcia končí dnes.",
      cta: "Upgrade",
    },
    options: [
      bad("a", "Upgradnem — nechcem stratiť fotky", "critical"),
      ok("b", "Skontrolujem v Nastavenia > iCloud na telefóne"),
    ],
    explanation:
      "Apple posiela z `@email.apple.com`. Stav úložiska skontroluj priamo v nastaveniach zariadenia.",
  },

  // ============ URL — domains, lookalikes, IDN ============
  {
    id: "u-tatra-1",
    category: "url",
    difficulty: "easy",
    prompt: "Ktorá je pravá Tatra banka?",
    options: [
      ok("a", "tatrabanka.sk"),
      bad("b", "tatra-banka.sk", "critical"),
      bad("c", "tatrabanka.secure-login.sk", "critical"),
      bad("d", "tatrabanka.sk.login.com", "critical"),
    ],
    explanation:
      "Pravá doména je `tatrabanka.sk`. Pomlčky, slová ako `secure`/`login` a presunutá doména doprava sú typické phishing triky.",
  },
  {
    id: "u-slsp-bar-1",
    category: "url",
    difficulty: "medium",
    prompt: "Klikneš sa na túto URL. Prihlásiš?",
    visual: { kind: "url", url: "https://slsp-sk.online/auth/login" },
    options: [bad("a", "Áno", "critical"), ok("b", "Nie — pravý SLSP je `slsp.sk`")],
    explanation: "`slsp.sk` ≠ `slsp-sk.online`. Doména `.online` + pomlčka = phishing klon.",
  },
  {
    id: "u-google-bar-1",
    category: "url",
    difficulty: "hard",
    prompt: "Si na tejto adrese. Je to pravý Google?",
    visual: { kind: "url", url: "https://accounts.google.com.signin-verify.app" },
    options: [
      bad("a", "Áno — vidím `google.com`", "critical"),
      ok("b", "Nie — skutočná doména je `signin-verify.app`"),
    ],
    explanation:
      "Doménu čítaj sprava: posledné 2 časti pred prvou lomkou sú skutočná doména. Tu = `signin-verify.app`, nie Google.",
  },
  {
    id: "u-idn-1",
    category: "url",
    difficulty: "hard",
    prompt: "Pozri pozorne na URL.",
    visual: { kind: "url", url: "https://www.аpple.com/account" },
    options: [
      bad("a", "Pravý Apple", "critical"),
      ok("b", "Phishing — `а` je cyrilské, nie latinské `a`"),
    ],
    explanation:
      "IDN homograph útok: cyrilské `а` vyzerá ako latinské `a`, ale je to iná doména. Browsery niekedy varujú, niekedy nie.",
  },
  {
    id: "u-postaonline-1",
    category: "url",
    difficulty: "easy",
    prompt: "Pravá Slovenská pošta?",
    options: [
      ok("a", "posta.sk"),
      bad("b", "slovenskaposta-online.sk", "critical"),
      bad("c", "posta.sk-zasielky.com", "critical"),
    ],
    explanation: 'Slovenská pošta = `posta.sk`. Slová „online", „zasielky" v doméne = scam signál.',
  },
  {
    id: "u-csob-1",
    category: "url",
    difficulty: "easy",
    prompt: "Pravý ČSOB?",
    options: [
      ok("a", "csob.sk"),
      bad("b", "csob-banking.sk", "critical"),
      bad("c", "csob.secure.sk", "critical"),
    ],
    explanation: "ČSOB = `csob.sk`. Akékoľvek pridané slová pred `.sk` sú samostatné domény.",
  },
  {
    id: "u-shortlink-1",
    category: "url",
    difficulty: "medium",
    prompt: "V SMS prišiel skrátený link. Klikneš?",
    visual: { kind: "url", url: "https://bit.ly/3xQ7pK2" },
    options: [
      bad("a", "Áno — bit.ly je seriózny", "medium"),
      ok("b", "Nie — neviem, kam skutočne vedie"),
      bad("c", "Áno, ale len cez mobil", "medium"),
    ],
    explanation:
      "Skrátené odkazy v phishing SMS-kách sú červená vlajka. Ak musíš, použi `unshorten.it` na náhľad.",
  },
  {
    id: "u-typosquat-1",
    category: "url",
    difficulty: "medium",
    prompt: "Pravá Allegro?",
    options: [
      ok("a", "allegro.sk"),
      bad("b", "alegro.sk", "critical"),
      bad("c", "allegro-shop.sk", "critical"),
    ],
    explanation:
      "Typosquatting: `alegro` (jedno `l`). Scammeri si registrujú preklepy známych značiek.",
  },
  {
    id: "u-orange-1",
    category: "url",
    difficulty: "medium",
    prompt: "Klikol si v SMS. Prihlásiš sa?",
    visual: { kind: "url", url: "https://orange.sk.faktura-zaplatit.com" },
    options: [
      bad("a", "Áno — vidím orange.sk", "critical"),
      ok("b", "Nie — skutočná doména je `faktura-zaplatit.com`"),
    ],
    explanation: "`orange.sk` je tu len subdoména na cudzej doméne `faktura-zaplatit.com`.",
  },
  {
    id: "u-https-1",
    category: "url",
    difficulty: "medium",
    prompt: "Stránka má zelený zámok 🔒. Je teda bezpečná?",
    options: [
      bad("a", "Áno — HTTPS = bezpečné", "medium"),
      ok("b", "Nie — HTTPS znamená šifrované, nie že nie je phishing"),
    ],
    explanation:
      "Zámok hovorí len o šifrovaní spojenia. Aj phishingové stránky majú dnes HTTPS zadarmo (Let's Encrypt).",
  },
  {
    id: "u-suffix-1",
    category: "url",
    difficulty: "hard",
    prompt: "Ktorá je pravá Booking.com?",
    options: [
      ok("a", "booking.com"),
      bad("b", "booking.com.reservation-confirm.net", "critical"),
      bad("c", "secure-booking.com", "critical"),
      bad("d", "booking-com.support", "critical"),
    ],
    explanation:
      "Posledné 2 časti pred prvým `/` sú doména. `reservation-confirm.net`, `secure-booking.com`, `booking-com.support` sú samostatné domény.",
  },
  {
    id: "u-fb-1",
    category: "url",
    difficulty: "easy",
    prompt: "Pravý Facebook login?",
    options: [
      ok("a", "facebook.com"),
      bad("b", "facebook-login.com", "critical"),
      bad("c", "fb-secure.com", "critical"),
    ],
    explanation: "Facebook = `facebook.com` (alebo `fb.com`). Iné varianty = phishing.",
  },

  // ============ FAKE vs REAL — eshops, marketplace ads, IG ads ============
  {
    id: "f-bazos-iphone-1",
    category: "fake_vs_real",
    difficulty: "easy",
    prompt: "Inzerát na Bazoši — kúpiš?",
    visual: {
      kind: "listing",
      site: "Bazos",
      title: "iPhone 15 Pro Max 256GB",
      price: "299 €",
      location: "Košice",
      description:
        "Úplne nový, neotvorená krabica. Predávam kvôli darčeku, ktorý sa nehodil. Posielam poštou po platbe vopred na účet.",
      imageEmoji: "📱",
    },
    options: [
      bad("a", "Kúpim — výhodná cena", "critical"),
      ok("b", "Scam — cena príliš nízka + platba vopred"),
      bad("c", "Pýtam si viac fotiek a kúpim", "medium"),
    ],
    explanation:
      'iPhone 15 Pro Max za 299€ + platba vopred + „darček, čo sa nehodil" = klasický eshop scam.',
  },
  {
    id: "f-bazar-auto-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt: "Inzerát na auto. Pôjdeš sa pozrieť?",
    visual: {
      kind: "listing",
      site: "Bazar",
      title: "BMW 320d 2019, 45000 km",
      price: "4 800 €",
      location: "Holandsko (privezem na SK)",
      description:
        "Auto je momentálne v Holandsku. Pošlem fotky, môžeme dohodnúť dovoz. Záloha 500€ cez Western Union pre rezerváciu.",
      imageEmoji: "🚗",
    },
    options: [
      bad("a", "Pošlem zálohu — auto je super", "critical"),
      ok("b", "Scam — Western Union + auto v zahraničí = klasika"),
      bad("c", "Najprv si vypýtam VIN", "medium"),
    ],
    explanation:
      '„Auto v zahraničí + záloha cez WU/MoneyGram" je 20 rokov starý scam pattern. Auto neexistuje.',
  },
  {
    id: "f-eshop-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt: "Eshop s -80% akciami na značky (Nike, Gucci). Cena Air Jordan 39€. Reálne?",
    options: [
      bad("a", "Áno — možno výpredaj", "critical"),
      ok("b", "Fake eshop — buď ti nepríde nič, alebo čínska kópia"),
      bad("c", "Možno sivý dovoz, kúpim", "medium"),
    ],
    explanation:
      "Značkové veci za 80% zľavu = buď fake eshop (nedoručia), alebo replika z Číny. Skontroluj recenzie a registráciu firmy.",
  },
  {
    id: "f-ig-influencer-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt: "Reklama na IG s tvárou známej slovenskej moderátorky. Kúpiš kapsuly?",
    visual: {
      kind: "instagram",
      account: "zdravie_premium_sk",
      verified: false,
      body: '„Schudla som 14 kg za 21 dní! Lekári ma chcú zažalovať. Limitovaná akcia -70% iba dnes."',
      imageEmoji: "💊",
      cta: "Zistiť viac",
    },
    options: [
      bad("a", "Kúpim — odporúča to ona", "critical"),
      ok("b", "Scam — tvár je ukradnutá, kapsuly sú placebo/škodlivé"),
      bad("c", "Skontrolujem na jej profile", "minor"),
    ],
    explanation:
      'Tváre celebrít sa kradnú do fake reklám. „Lekári to nenávidia" + „len dnes" = scam DNA. Účet bez verified značky.',
  },
  {
    id: "f-ig-crypto-1",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt: "Elon Musk live stream rozdáva Bitcoin. Pošleš 0,1 BTC, dostaneš späť 0,2 BTC. Reálne?",
    options: [
      bad("a", "Skúsim s malou sumou", "critical"),
      ok("b", "Scam — ide o deepfake / staré video"),
      bad("c", "Áno ak ide o oficiálny live", "critical"),
    ],
    explanation:
      "Crypto giveaway scam beží na YouTube non-stop. Nikto ti nepošle 2× späť. Stratíš všetko.",
  },
  {
    id: "f-romance-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      "Mesiac chatuješ s krásnou doktorkou v Sýrii. Prosí o 800€ na lietadlo, vráti to. Pošleš?",
    options: [
      bad("a", "Áno — milujem ju", "critical"),
      ok("b", "Romance scam — nikdy ju nestretneš"),
      bad("c", "Pošlem 200€ ako test", "critical"),
    ],
    explanation:
      "Romance scam: kradnuté fotky, vymyslený príbeh, prosba o peniaze na cestu/colné poplatky. Vždy scam.",
  },
  {
    id: "f-fbgroup-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt: "V FB skupine niekto predáva lístky na koncert pod cenu. Pošleš peniaze cez Revolut?",
    options: [
      bad("a", "Áno — zľava je zľava", "critical"),
      ok("b", "Nie — kupujem len cez oficiálny resale (Ticketportal/Predpredaj)"),
      bad("c", "Pošlem polovicu, druhú po doručení", "medium"),
    ],
    explanation:
      "FB skupiny sú plné scammerov s fake screenshotmi. Lístky kupuj len cez oficiálne resale platformy.",
  },
  {
    id: "f-investicia-1",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt:
      'Reklama: „Investícia 250€ → 18 000€ za 3 mesiace cez AI obchodovanie. Garantujeme." Skúsiš?',
    options: [
      bad("a", "Skúsim s 250€", "critical"),
      ok("b", "Scam — žiadna garantovaná investícia neexistuje"),
      bad("c", "Skúsim, ale len cez Revolut", "critical"),
    ],
    explanation:
      'Investičný scam (často cez `Bitcoin Trader`, `Quantum AI`). Po vklade ti volá „broker", chce viac, potom zmizne.',
  },
  {
    id: "f-marketplace-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt: 'Na FB Marketplace ti predajca pošle „doručovací link" na overenie adresy. Klikneš?',
    options: [
      bad("a", "Kliknem — chcem produkt", "critical"),
      ok("b", "Nie — Marketplace nemá takúto funkciu"),
    ],
    explanation:
      'FB Marketplace nemá interný „doručovací overovací link". Kliknutie vedie na fake login, ukradne ti účet.',
  },
  {
    id: "f-recenzie-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      'Eshop má 4,9★ z 2000 recenzií, ale všetky sú z posledných 3 týždňov a generické („Super produkt!"). Kúpiš?',
    options: [
      bad("a", "Áno — recenzie sú dobré", "medium"),
      ok("b", "Nie — fake recenzie nakúpené"),
      bad("c", "Kúpim na dobierku", "minor"),
    ],
    explanation:
      "Fake recenzie sa dajú nakúpiť. Hľadaj rozloženie v čase, detaily, fotky. Pozor na generické 5★ záplavy.",
  },

  // ============ SCENARIO — phone, QR, physical ============
  {
    id: "s-vishing-1",
    category: "scenario",
    difficulty: "medium",
    prompt: "Volá ti niekto z banky o podozrivej transakcii a pýta kód z SMS.",
    visual: {
      kind: "call",
      caller: "Tatra Banka — Bezpečnosť",
      number: "+421 2 5919 1000",
      hint: "Zobrazené ako overené v kontaktoch",
    },
    options: [
      bad("a", "Nadiktujem kód — banka volá", "critical"),
      ok("b", "Zavesím a zavolám sama na číslo z karty"),
      bad("c", "Pýtam overujúce otázky", "medium"),
    ],
    explanation:
      "Banka NIKDY nepýta kód z SMS. Číslo aj meno volajúceho sa dajú sfalšovať (caller-ID spoofing).",
  },
  {
    id: "s-quishing-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      'Na parkovacom automate visí nálepka s QR kódom „Zaplatiť rýchlo cez QR". Tvoja appka nefunguje. Naskenuješ?',
    options: [
      bad("a", "Áno — naskenujem a zaplatím", "critical"),
      ok("b", "Nie — zaplatím cez SMS na čísle automatu"),
      bad("c", "Naskenujem, skontrolujem URL", "medium"),
    ],
    explanation:
      "Quishing: scammeri lepia fake QR cez originál. Vždy použi oficiálnu appku alebo SMS na čísle, ktoré je vyrazené v automate.",
  },
  {
    id: "s-microsoft-call-1",
    category: "scenario",
    difficulty: "easy",
    prompt: 'Volá ti niekto s indickým prízvukom: „Som z Microsoftu, váš počítač je infikovaný."',
    options: [
      bad("a", "Spolupracujem, dám mu vzdialený prístup", "critical"),
      ok("b", "Zavesím a zablokujem číslo"),
      bad("c", "Pýtam sa detaily", "medium"),
    ],
    explanation:
      "Microsoft NIKDY nevolá zákazníkom. Klasický tech support scam — dá si ti AnyDesk, ukradne všetko.",
  },
  {
    id: "s-policia-call-1",
    category: "scenario",
    difficulty: "medium",
    prompt: 'Volá „policajt": „Vaše konto bolo napadnuté, presuňte peniaze na bezpečný účet."',
    options: [
      bad("a", "Presuniem — ide o moje peniaze", "critical"),
      ok("b", "Zložím a zavolám 158 sám"),
    ],
    explanation:
      'Polícia NIKDY nepýta presun peňazí na „bezpečný účet". Tento scam zruinoval mnoho slovenských dôchodcov.',
  },
  {
    id: "s-rodina-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      'WhatsApp od „dcéry" z neznámeho čísla: „Mami, stratila som telefón, potrebujem urgentne 500€ na nový. Pošli na tento účet."',
    options: [
      bad("a", "Pošlem — je to dcéra", "critical"),
      ok("b", "Zavolám dcére na pôvodné číslo a overím"),
      bad("c", "Odpíšem a pýtam detaily", "medium"),
    ],
    explanation:
      '„Hi mum scam" je v UK/SK epidémia. Vždy zavolaj na pôvodné číslo. Scammer ti nezdvihne.',
  },
  {
    id: "s-wifi-1",
    category: "scenario",
    difficulty: "medium",
    prompt: "Na letisku vidíš otvorené WiFi „Free_Airport_WiFi“. Pripojíš a zaloguješ sa do banky?",
    options: [
      bad("a", "Áno — internet zadarmo", "critical"),
      ok("b", "Pripojím cez VPN, alebo radšej mobilné dáta"),
      bad("c", "Pripojím, ale len na čítanie news", "minor"),
    ],
    explanation:
      'Otvorené WiFi môže byť „evil twin" — útočník medzi tebou a internetom. Banka cez verejné WiFi NIE.',
  },
  {
    id: "s-usb-1",
    category: "scenario",
    difficulty: "medium",
    prompt: 'Na parkovisku pred firmou nájdeš USB kľúč s nápisom „Mzdy 2024". Strčíš ho do PC?',
    options: [
      bad("a", "Strčím — som zvedavý", "critical"),
      ok("b", "Odovzdám IT bez pripojenia"),
      bad("c", "Strčím do svojho súkromného PC", "critical"),
    ],
    explanation:
      "USB drop attack — kľúč obsahuje malware, ktorý sa spustí pri pripojení. IT firmy ich rozhadzujú aj na test zamestnancov.",
  },
  {
    id: "s-verify-call-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      'Volá ti človek, predstaví sa ako pracovník banky. Pre overenie ti vraví: „Pošlem SMS s kódom, prečítate mi ho."',
    options: [
      bad("a", "Prečítam — overuje moju identitu", "critical"),
      ok("b", "Odmietnem a zavolám na banku"),
      bad("c", "Prečítam len posledné 3 čísla", "critical"),
    ],
    explanation:
      "Banka sa nikdy neoveruje cez to, že ty čítaš jej SMS kód. Naopak — kód je pre teba, aby si potvrdil/odmietol.",
  },
  {
    id: "s-redirect-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Doma sa ti zariadenia odpojili od WiFi a router pýta nové prihlasovacie údaje cez stránku v prehliadači. Zadáš ich?",
    options: [
      bad("a", "Zadám — chcem internet", "medium"),
      ok("b", "Reštartujem router fyzicky a skontrolujem nastavenia priamo cez 192.168.x.x"),
    ],
    explanation:
      "DNS hijack útok presmeruje prehliadač na fake login. Vždy choď do admin GUI routra zadaním IP, nie cez automatic redirect.",
  },
  {
    id: "s-charita-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      'Pri obchode ťa zastaví človek so zoznamom „pomáhame deťom". Pýta IBAN aj kópiu OP na potvrdenie.',
    options: [
      bad("a", "Dám — pomáham", "critical"),
      ok("b", "Pošlem cez overenú nadáciu (Dobrý anjel, Plamienok…) online"),
    ],
    explanation:
      "Žiadna seriózna charita nepýta IBAN ani kópiu OP na ulici. Identity theft scenár.",
  },
  {
    id: "s-sim-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Telefón ti zrazu stratil signál uprostred dňa. Po hodine ti chodia notifikácie z banky o platbách.",
    options: [
      bad("a", "Počkám, či sa signál vráti", "critical"),
      ok("b", "Okamžite zavolám operátora a banku z iného telefónu"),
    ],
    explanation:
      "SIM swap útok — útočník dal preniesť tvoje číslo na svoju SIM, dostáva 2FA kódy. Reaguj okamžite.",
  },

  // ============ HONEYPOT — confidence destroyers / klasiky ============
  {
    id: "h-prince-1",
    category: "honeypot",
    difficulty: "medium",
    prompt:
      "Email z „Fondu na ochranu obetí podvodov“: evidujú ti odškodné 9 400 €, stačí uhradiť „uvoľňovací poplatok“ 180 €. Akcia?",
    options: [
      bad("a", "Uhradím 180 € — chcem odškodné", "critical"),
      bad("b", "Pošlem im OP a číslo účtu na overenie", "critical"),
      ok("c", "Zmažem — recovery scam, žiadny fond nepýta poplatok vopred"),
    ],
    explanation:
      "Recovery/advance-fee scam (nástupca „nigerijského princa“) cieli najmä na ľudí, ktorí už raz naleteli. Žiadny seriózny fond ani úrad nepýta poplatok vopred za vyplatenie peňazí.",
  },
  {
    id: "h-vyhra-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: 'SMS: „Vyhrali ste iPhone 16! Pre prevzatie zaplaťte poštovné 4€." Reakcia?',
    visual: {
      kind: "sms",
      sender: "AKCIA",
      body: "Gratulujeme, vyhrali ste iPhone 16 Pro! Pre prevzatie zaplaťte 4€ za poštovné:",
      link: "https://vyhra-iphone.live",
    },
    options: [bad("a", "Zaplatím 4€", "critical"), ok("b", "Ignorujem — žiadnu súťaž som nehral")],
    explanation:
      '„Vyhrali ste" v súťaži, do ktorej si sa neprihlásil = scam. Po 4€ poplatku ti vezmú celú kartu.',
  },
  {
    id: "h-instagram-hack-1",
    category: "honeypot",
    difficulty: "easy",
    prompt:
      'Kamoška ti na Insta píše: „Hlasuj za mňa v súťaži, klikni link a prihlás sa cez Insta." Klikneš?',
    options: [
      bad("a", "Áno — pomôžem kamoške", "critical"),
      ok("b", "Najprv jej zavolám — pravdepodobne má hacknutý účet"),
    ],
    explanation:
      "Toto je #1 spôsob, ako sa kradnú IG účty na Slovensku. Klik vedie na fake login, ukradne ti účet, scammer pokračuje na tvojich kontaktoch.",
  },
  {
    id: "h-revolut-1",
    category: "honeypot",
    difficulty: "easy",
    prompt:
      'Na Bazoši kupec povie: „Pošlem ti 500€ cez Revolut, ale potrebujem tvoje heslo na overenie účtu."',
    options: [
      bad("a", "Pošlem heslo — chcem peniaze", "critical"),
      ok("b", "Nepošlem — Revolut žiadne heslo nepotrebuje"),
    ],
    explanation: "Žiadny prevod nepotrebuje heslo príjemcu. Heslo nikdy nikomu.",
  },
  {
    id: "h-google-pay-1",
    category: "honeypot",
    difficulty: "medium",
    prompt:
      "Niekto ti tvrdí, že ti omylom poslal 200€ a prosí, aby si mu poslal naspäť. Účet zatiaľ neukazuje vklad. Pošleš?",
    options: [
      bad("a", "Áno — slušné by bolo vrátiť", "critical"),
      ok("b", "Nie — počkám, kým peniaze reálne prídu (aj 24h)"),
    ],
    explanation:
      'Klasický scam: pošle ti screenshot „prevodu", ty mu pošleš peniaze, jeho prevod sa nikdy nezrealizuje.',
  },

  // ============ Filler to reach 100 — variations ============
  {
    id: "p-sms-bazos-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Predávaš na Bazoši. Záujemca napíše:",
    visual: {
      kind: "sms",
      sender: "+44 7700 900123",
      body: "Mám záujem o váš inzerát. Pre dokončenie kúpy potvrdte adresu doručenia tu:",
      link: "https://bazos-secure-payment.com/confirm",
    },
    options: [
      bad("a", "Potvrdím — chcem predať", "critical"),
      ok("b", "Ignorujem — Bazoš nemá žiaden takýto systém"),
    ],
    explanation:
      'Tzv. „Bazoš scam": kupec nikdy nemá účet, posiela fake link na zber údajov. Vždy komunikácia cez Bazoš správy.',
  },
  {
    id: "p-email-airbnb-1",
    category: "phishing",
    difficulty: "hard",
    prompt: 'Hosť ti na Airbnb napíše a pošle „mimo platformy" lacnejšiu zľavu cez email.',
    visual: {
      kind: "email",
      from: "Marko",
      fromEmail: "marko.airbnb@gmail.com",
      subject: "Lepšia ponuka — bez poplatkov platformy",
      body: "Ahoj, chcel by som rezervovať priamo, ušetríme 15% na poplatkoch. Pošlem zálohu na tvoj IBAN.",
    },
    options: [
      bad("a", "Súhlasím — ušetríme obaja", "critical"),
      ok("b", "Odmietnem — komunikácia mimo Airbnb stráca ochranu"),
    ],
    explanation:
      "Off-platform scams ti vezmú Airbnb garantie. Buď to kupec scammer alebo hostiteľ. Vždy cez platformu.",
  },
  {
    id: "u-paypal-1",
    category: "url",
    difficulty: "medium",
    prompt: "Pravý PayPal?",
    options: [
      ok("a", "paypal.com"),
      bad("b", "paypal-secure.com", "critical"),
      bad("c", "paypaI.com (s veľkým I)", "critical"),
    ],
    explanation: "Pravý PayPal = `paypal.com`. Veľké `I` namiesto malého `l` je IDN trik.",
  },
  {
    id: "u-amazon-1",
    category: "url",
    difficulty: "easy",
    prompt: "Pravý Amazon?",
    options: [
      ok("a", "amazon.de"),
      bad("b", "amaz0n.de", "critical"),
      bad("c", "amazon-eu.de", "critical"),
    ],
    explanation: "`amazon.de` (alebo .com). Číslo `0` namiesto `o` = scam.",
  },
  {
    id: "f-temu-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt: 'Reklama: „Roztoč koleso na Temu, vyhraj 1500€!". Klikneš a prihlásiš sa?',
    options: [
      bad("a", "Áno — chcem 1500€", "critical"),
      ok("b", "Ignorujem — buď fake landing alebo dark pattern"),
    ],
    explanation:
      "Fake giveaway pages zbierajú údaje a kartu. Aj reálne značky sú zneužívané v fake reklamách.",
  },
  {
    id: "s-energie-1",
    category: "scenario",
    difficulty: "medium",
    prompt: 'Pri dverách stojí „pracovník SPP" a žiada vidieť faktúru aj OP, lebo „máš preplatok".',
    options: [
      bad("a", "Ukážem — preplatok je super", "critical"),
      ok("b", "Pýtam si preukaz a zavolám priamo na SPP linku"),
    ],
    explanation: "Door-to-door scam: vyfotia OP a faktúru, prepíšu zmluvu, alebo ukradnú identitu.",
  },
  {
    id: "p-sms-balik-1",
    category: "phishing",
    difficulty: "easy",
    prompt: "Balík sa nedoručil.",
    visual: {
      kind: "sms",
      sender: "Packeta",
      body: "Vaša zásielka je pripravená v Packeta boxe. Pre vyzdvihnutie sa overte:",
      link: "https://packeta-box.online/pickup",
    },
    options: [
      bad("a", "Overím sa — chcem balík", "critical"),
      ok("b", "Skontrolujem stav v Packeta appke"),
    ],
    explanation: "Packeta = `packeta.sk`. `.online` doména = scam.",
  },
  {
    id: "p-sms-o2-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "O2 ti hlási nedoplatok.",
    visual: {
      kind: "sms",
      sender: "O2 SK",
      body: "Vážený zákazník, evidujeme nedoplatok 27,40€. Uhraďte do 24h, inak vypneme číslo:",
      link: "https://o2-sk.faktury-online.com",
    },
    options: [
      bad("a", "Uhradím — nechcem stratiť číslo", "critical"),
      ok("b", "Skontrolujem v Moje O2 appke"),
    ],
    explanation: "O2 má `o2.sk`. Vyhrážanie vypnutím + cudzia doména = scam.",
  },
  {
    id: "u-instagram-1",
    category: "url",
    difficulty: "medium",
    prompt: "Pravý Instagram login?",
    options: [
      ok("a", "instagram.com"),
      bad("b", "instagram.com-login.help", "critical"),
      bad("c", "ig-secure.com", "critical"),
    ],
    explanation: "Instagram = `instagram.com`. Vždy posledné 2 časti pred prvým `/`.",
  },
  {
    id: "f-bazos-2",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt: 'Predávaš PS5. Kupec píše „Pošlem peniaze cez DPD COD na tvoju adresu."',
    options: [
      bad("a", "Pošlem mu adresu — peniaze cez kuriéra", "critical"),
      ok("b", "Odmietnem — kuriér peniaze neprenáša, je to scam"),
    ],
    explanation: "Kuriéri neprenášajú hotovosť kupca predajcovi. Scammer chce len adresu/identitu.",
  },
  {
    id: "h-popup-1",
    category: "honeypot",
    difficulty: "easy",
    prompt:
      'Pri surfovaní vyskočí: „Váš počítač má 5 vírusov! Stiahnite Antivirus Pro hneď." Akcia?',
    options: [
      bad("a", "Stiahnem — vírusy sú zlé", "critical"),
      ok("b", "Zavriem zatlačením Esc / zatvorením tabu"),
    ],
    explanation:
      "Scareware: vyskočí v každom prehliadači, lebo je to len obrázok stránky. Stiahnutie = malware.",
  },
  {
    id: "p-email-faktura-1",
    category: "phishing",
    difficulty: "hard",
    prompt: 'Faktúra .docm/.zip príloha od „dodávateľa".',
    visual: {
      kind: "email",
      from: "Účtáreň",
      fromEmail: "ucto@dodavatel-faktura.eu",
      subject: "Faktúra č. 2024-9931 — splatnosť 7 dní",
      body: "V prílohe zasielame faktúru za služby. Pre zobrazenie povoľte makrá.",
    },
    options: [
      bad("a", "Otvorím a povolím makrá", "critical"),
      ok("b", "Neotváram — neznámy odosielateľ + makrá = malware"),
    ],
    explanation:
      "Office makrá v dokumentoch z neznámych zdrojov sú #1 vstupný vektor pre ransomware (Emotet, QakBot).",
  },
  {
    id: "s-deepfake-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Šéf ti zavolá cez WhatsApp video — vidíš jeho tvár, ale obraz pixeluje. Žiada urgentný prevod 18 000€.",
    options: [
      bad("a", "Pošlem — vidím šéfa", "critical"),
      ok("b", "Overím cez druhý kanál (osobne / firemný telefón)"),
    ],
    explanation:
      "Deepfake video calls sú reálna 2024+ hrozba. CEO fraud cez deepfake už ukradol milióny. Vždy 2-channel verifikácia.",
  },
  {
    id: "f-jobscam-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      'Inzerát: „Pracuj z domu, 80€/deň, len kopírovať texty. Začni dnes, registračný poplatok 49€."',
    options: [
      bad("a", "Zaregistrujem sa za 49€", "critical"),
      ok("b", "Ignorujem — práca, kde platíš ty, nie je práca"),
    ],
    explanation:
      "Job scam: registračný poplatok = scam DNA. Žiadny zamestnávateľ od teba nepýta peniaze.",
  },
  {
    id: "p-sms-vodafone-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Telekom ti vraj posiela bonus.",
    visual: {
      kind: "sms",
      sender: "TELEKOM",
      body: "Bonus 50€ za vernosť! Vyzdvihnite si ho do 48h:",
      link: "https://telekom.bonus-vernost.sk",
    },
    options: [
      bad("a", "Vyzdvihnem — 50€ je 50€", "critical"),
      ok("b", "Skontrolujem v Telekom appke"),
    ],
    explanation:
      "Telekom = `telekom.sk`. `bonus-vernost.sk` je samostatná doména. Bonusy sa nezdvíhajú cez SMS link.",
  },
  {
    id: "u-google-2",
    category: "url",
    difficulty: "medium",
    prompt: "Pravý Google login?",
    options: [
      ok("a", "accounts.google.com"),
      bad("b", "accounts-google.com", "critical"),
      bad("c", "google.com-signin.net", "critical"),
    ],
    explanation:
      "Pomlčka medzi `google` a `com` zmenila doménu. Pravá je `accounts.google.com` (`google.com` bez pomlčky).",
  },
  {
    id: "f-bookingmsg-1",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt:
      'Po rezervácii na Booking ti hostiteľ pošle správu cez Booking chat: „Karta vám neprešla, dokončite cez tento link." Klikneš?',
    options: [
      bad("a", "Kliknem — chcem si zachovať rezerváciu", "critical"),
      ok("b", "Skontrolujem v Booking appke a kontaktujem support"),
    ],
    explanation:
      "Reálny scam 2023-2024: ubytovatelia majú hacknuté Booking účty, posielajú phishing v ich mene. Booking nikdy nepýta dáta cez chat link.",
  },
  {
    id: "s-cookie-1",
    category: "scenario",
    difficulty: "easy",
    prompt: 'Stránka chce nainštalovať „bezpečnostný certifikát" pre prístup. Akcia?',
    options: [
      bad("a", "Nainštalujem — chcem na stránku", "critical"),
      ok("b", "Zavriem — žiadna stránka takto nepýta certifikát"),
    ],
    explanation:
      "Stránky neinštalujú certifikáty. Toto je sociálne inžinierstvo na inštaláciu malvéru.",
  },
  {
    id: "h-poslednavola-1",
    category: "honeypot",
    difficulty: "medium",
    prompt:
      "Email od „advokátskej kancelárie“: po nebohom klientovi s rovnakým priezviskom ako ty ostalo 1,2 mil. €. Stačí podpísať a poslať OP + 350 € na poplatky. Akcia?",
    options: [
      bad("a", "Pošlem OP a 350 € — možno sme príbuzní", "critical"),
      ok("b", "Zmažem — inheritance scam, cudzí advokát ťa sám nekontaktuje kvôli dedičstvu"),
    ],
    explanation:
      "Inheritance scam: hrá na priezvisko a chamtivosť. Skutočné dedičské konanie vedie notár cez súd, nie neznámy „advokát“ z e-mailu žiadajúci poplatok a kópiu dokladu vopred.",
  },
  {
    id: "p-email-banka-2fa-1",
    category: "phishing",
    difficulty: "hard",
    prompt: 'Banka ti posiela link na „aktiváciu nového bezpečnostného systému".',
    visual: {
      kind: "email",
      from: "VÚB Banka",
      fromEmail: "security@vub-online.sk",
      subject: "Povinná aktivácia 3D Secure 2.0",
      body: "Od 1. mája musia všetci klienti aktivovať nový bezpečnostný systém. Inak nebudete môcť platiť kartou online.",
      cta: "Aktivovať",
    },
    options: [
      bad("a", "Aktivujem — chcem platiť", "critical"),
      ok("b", "Skontrolujem oznam v appke / na vub.sk priamo"),
    ],
    explanation:
      "VÚB = `vub.sk`. `vub-online.sk` = klon. Bankové novinky overuj v appke alebo na pravej stránke.",
  },
  {
    id: "f-charity-fake-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      'Po katastrofe vidíš na FB výzvu „Pomôžte rodine X, IBAN: SK…" so srdcervúcou fotkou. Pošleš?',
    options: [
      bad("a", "Pošlem — chcem pomôcť", "critical"),
      ok("b", "Pošlem cez overenú zbierku (ľudialudom, donio)"),
    ],
    explanation:
      "Po katastrofách vznikajú fake zbierky s ukradnutými fotkami. Daruj cez overené platformy.",
  },
  {
    id: "u-banka-3-1",
    category: "url",
    difficulty: "medium",
    prompt: "Pravá VÚB?",
    options: [
      ok("a", "vub.sk"),
      bad("b", "vub-banking.sk", "critical"),
      bad("c", "vubbanka.sk", "critical"),
    ],
    explanation: "VÚB = `vub.sk`. `vubbanka.sk` znie podobne, ale je to iná doména.",
  },
  {
    id: "p-sms-revolut-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Revolut ti tvrdí, že máš pozastavený účet.",
    visual: {
      kind: "sms",
      sender: "Revolut",
      body: "Váš účet bol dočasne pozastavený. Pre obnovenie potvrďte identitu:",
      link: "https://revolut-verify.app",
    },
    options: [
      bad("a", "Potvrdím — chcem účet späť", "critical"),
      ok("b", "Otvorím Revolut appku — tam vidím všetky správy"),
    ],
    explanation:
      "Revolut komunikuje cez in-app správy alebo `revolut.com`. `.app` doména s pomlčkou = scam.",
  },
  {
    id: "s-anydesk-1",
    category: "scenario",
    difficulty: "medium",
    prompt: 'Banka ti zavolá: „Pre vyriešenie problému si stiahnite AnyDesk a dajte nám kód."',
    options: [
      bad("a", "Stiahnem — vyriešia problém", "critical"),
      ok("b", "Odmietnem — banka nikdy nepotrebuje vzdialený prístup"),
    ],
    explanation: "AnyDesk/TeamViewer scam: po pripojení ti scammer ukradne všetko z účtu.",
  },
  {
    id: "f-mr-beast-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      "YouTube „live“: účet vyzerá ako Elon Musk, v popise „Pošli 0,1 ETH a vrátime ti 0,2 ETH“. Reaguješ?",
    options: [
      bad("a", "Pošlem 0,1 ETH — znie to ako rýchly zárobok", "critical"),
      ok("b", "Ignorujem — crypto-doubling giveaway je vždy podvod"),
    ],
    explanation:
      "Falošné „giveaway“ livestreamy (Musk, Tesla, brandy) bežia v slučke z ukradnutých účtov. Nikto ti nepošle dvojnásobok — kryptoprevod je nezvratný a peniaze sú nenávratne preč.",
  },
  {
    id: "h-extortion-1",
    category: "honeypot",
    difficulty: "medium",
    prompt:
      'Email: „Mám video, ako pozeráš porno. Pošli 800$ v Bitcoine, inak to pošlem všetkým kontaktom."',
    options: [
      bad("a", "Zaplatím — nechcem hanbu", "critical"),
      ok("b", "Zmažem — sextortion scam, žiadne video nemá"),
    ],
    explanation:
      'Sextortion scam: rozosiela sa miliónom ľudí, žiadne video neexistuje. Heslo „má" z dávneho leaku.',
  },
  {
    id: "u-eshop-1",
    category: "url",
    difficulty: "hard",
    prompt: "Pravý Alza?",
    options: [
      ok("a", "alza.sk"),
      bad("b", "alza-eshop.sk", "critical"),
      bad("c", "alza.sk.deal-zone.com", "critical"),
      bad("d", "a1za.sk", "critical"),
    ],
    explanation: "Alza = `alza.sk`. Pomlčky, sufixy, čísla namiesto písmen = phishing.",
  },
  {
    id: "p-email-linkedin-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "LinkedIn ti hlási nové prepojenie.",
    visual: {
      kind: "email",
      from: "LinkedIn",
      fromEmail: "no-reply@linkedin-jobs.career",
      subject: "Máte 3 nové ponuky práce — kliknite",
      body: "Headhunteri vás hľadajú. Aktivujte profil pre zobrazenie ponúk.",
      cta: "Zobraziť ponuky",
    },
    options: [bad("a", "Kliknem — práca láka", "critical"), ok("b", "Otvorím linkedin.com ručne")],
    explanation: "LinkedIn = `linkedin.com`. `.career` doména je samostatná, scam phishing.",
  },
  {
    id: "s-fake-update-1",
    category: "scenario",
    difficulty: "medium",
    prompt: 'Pri surfovaní vyskočí: „Váš Chrome je zastaralý. Stiahnite update.exe."',
    options: [
      bad("a", "Stiahnem update", "critical"),
      ok("b", "Updaty robím cez Chrome menu (Pomocník → O Chrome)"),
    ],
    explanation: "Updaty prehliadača nikdy cez popup. Spustenie .exe = malware (RAT/keylogger).",
  },
  {
    id: "f-luxury-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt: 'Eshop predáva Rolexy za 199€. „Originál, švajčiarsky, posledný kus."',
    options: [
      bad("a", "Kúpim — výhodné", "critical"),
      ok("b", "Ignorujem — Rolex za 199€ je sci-fi"),
    ],
    explanation: "Rolex začína na 5000€. 199€ = čínska kópia (alebo nič ti nepríde).",
  },
  {
    id: "u-bank-suffix-1",
    category: "url",
    difficulty: "hard",
    prompt: "Si na tejto adrese po kliku v emaile.",
    visual: { kind: "url", url: "https://login.tatrabanka.sk.user-portal.io" },
    options: [
      bad("a", "Pravá Tatra banka — vidím tatrabanka.sk", "critical"),
      ok("b", "Phishing — pravá doména je `user-portal.io`"),
    ],
    explanation:
      "Doména je vždy vpravo pred prvým `/`. Tu = `user-portal.io`. Všetko vľavo sú len subdomény.",
  },
  {
    id: "h-passwordreset-1",
    category: "honeypot",
    difficulty: "easy",
    prompt:
      'Príde email: „Niekto požiadal o reset hesla na vašom Google. Ak ste to neboli vy, ignorujte." Ty si nikto. Akcia?',
    options: [
      bad("a", 'Kliknem na „toto som nebol ja" link', "medium"),
      ok("b", "Ignorujem — varovanie zo skutočnej Google príde aj keď ignoruješ"),
      bad("c", "Resetujem heslo pre istotu cez link v emaile", "critical"),
    ],
    explanation:
      "Aj reálne emaily majú phishing kópie. Ak nič nerobíš, ignoruj. Reset rob výhradne ručne na `accounts.google.com`.",
  },
  {
    id: "f-fake-shop-2",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt:
      "Eshop sa tvári profi: SK, IČO, kontakt. Recenzie 5★, ale na heureka.sk nie je. Sociálne siete prázdne. Kúpiš?",
    options: [
      bad("a", "Áno — má IČO", "medium"),
      ok("b", "Skontrolujem registráciu domény (whois) + SK firmy v ORSR"),
    ],
    explanation:
      "Fake eshopy uvádzajú vymyslené IČO. Skontroluj v ORSR a `whois` pre dátum registrácie domény.",
  },
  {
    id: "s-overpay-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      'Predávaš laptop za 500€. Kupec pošle 700€ a žiada vrátiť 200€ späť, lebo „omylom". Vrátiš?',
    options: [
      bad("a", "Vrátim — slušné", "critical"),
      ok("b", "Nevrátim — počkám, či sa pôvodný prevod nestornuje (kradnutá karta)"),
    ],
    explanation:
      "Overpayment scam: pôvodný prevod sa stornuje (kradnutá karta), ty vrátiš reálne peniaze a stratíš laptop.",
  },
  {
    id: "p-sms-fedex-1",
    category: "phishing",
    difficulty: "easy",
    prompt: "FedEx SMS o cle.",
    visual: {
      kind: "sms",
      sender: "FedEx",
      body: "Vaša zásielka čaká na zaplatenie clo 3,99€:",
      link: "https://fedex-customs.click/pay",
    },
    options: [
      bad("a", "Zaplatím — len 4€", "critical"),
      ok("b", "Skontrolujem cez fedex.com s tracking číslom"),
    ],
    explanation: "FedEx = `fedex.com`. `.click` TLD je takmer vždy spam/phishing.",
  },
  {
    id: "u-suffix-tld-1",
    category: "url",
    difficulty: "medium",
    prompt: "Ktoré tvrdenie o koncovke domény (TLD) je pravdivé?",
    options: [
      bad("a", "`.sk` zaručuje, že stránka je dôveryhodná slovenská firma", "medium"),
      bad("b", "`https://` v adrese znamená, že stránka nie je podvod", "medium"),
      ok("c", "Žiadna TLD nezaručuje bezpečnosť — rozhoduje overená doména"),
      bad("d", "`.com` je vždy bezpečnejšia ako `.click` či `.zip`", "minor"),
    ],
    explanation:
      "Aj phisheri si kúpia `.sk` doménu a HTTPS certifikát (zdarma). TLD ani zámok v adrese nič nezaručujú — over si presnú doménu vľavo od prvého `/`.",
  },
  {
    id: "f-investment-2",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt: 'Známy z FB ti odporúča platformu „CryptoYieldPro" so 5% denným ziskom. Skúsiš s 200€?',
    options: [
      bad("a", "Skúsim — známy mi to odporúča", "critical"),
      ok("b", "Nie — známy je pravdepodobne ďalšia obeť (pyramída)"),
    ],
    explanation:
      "Ponzi scheme cez crypto: prvé výplaty fungujú (peniaze nových klientov). Potom platforma zmizne.",
  },
  {
    id: "p-email-uloz-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Z banky ti príde email s upozornením.",
    visual: {
      kind: "email",
      from: "ČSOB Bezpečnosť",
      fromEmail: "no-reply@csob.sk",
      subject: "Bezpečnostné varovanie",
      body: "Pre bezpečnosť zmente heslo. Ak ste to neboli vy, prihláste sa do ČSOB SmartBanking a zmente heslo.",
    },
    options: [
      bad("a", "Kliknem v emaile na link", "medium"),
      ok("b", "Otvorím ČSOB SmartBanking ručne"),
    ],
    explanation:
      "Aj keď email JE pravý (správna doména), návyk klikať na linky v emailoch je risk. Vždy otvor appku/stránku ručne.",
  },
  {
    id: "s-fake-mail-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      'Doma máš v schránke list „Zaplatenie pokuty za parkovanie 28€, IBAN SK… variabilný 2024-X.". List vyzerá oficiálne.',
    options: [
      bad("a", "Zaplatím — chcem to mať preč", "critical"),
      ok("b", "Skontrolujem na stránke mestskej polície / parkovacej spoločnosti"),
    ],
    explanation:
      "Fake pokuty v schránke sú reálne SK 2023-2024. Vždy overíš online. Skutočná pokuta má číslo konania.",
  },
  {
    id: "u-mojsk-1",
    category: "url",
    difficulty: "medium",
    prompt: "Štátna stránka — pravá?",
    options: [
      ok("a", "slovensko.sk"),
      bad("b", "slovensko-portal.sk", "critical"),
      bad("c", "slovensko.gov.online", "critical"),
    ],
    explanation: "Štátne služby = `slovensko.sk`. Pozor — `.gov` neexistuje pre SK, je to USA TLD.",
  },
  {
    id: "h-airdrop-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: 'V crypto peňaženke máš zrazu token „CLAIM 5000$". Klikneš na claim?',
    options: [
      bad("a", "Kliknem — peniaze zadarmo", "critical"),
      ok("b", "Ignorujem — claim funkcia okradne celý wallet"),
    ],
    explanation:
      "Crypto airdrop scam: claim transakcia podpíše permission, ktorá vyprázdni peňaženku.",
  },
  {
    id: "p-sms-policia-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "SMS od polície.",
    visual: {
      kind: "sms",
      sender: "POLICIA SR",
      body: "Bola na vás podaná sťažnosť. Pre detaily kliknite:",
      link: "https://policia-sr.info/spis",
    },
    options: [
      bad("a", "Kliknem — chcem vedieť", "critical"),
      ok("b", "Polícia neposiela SMS — ignorujem"),
    ],
    explanation: "Polícia komunikuje listom alebo predvolaním. Žiadne SMS s linkom.",
  },
  {
    id: "f-fake-influencer-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      'Známy slovenský influencer ti píše DM: „Vyhrala si v mojej súťaži! Pošli adresu cez tento link."',
    options: [
      bad("a", "Pošlem — výhra je výhra", "critical"),
      ok("b", "Skontrolujem profil (verified ✓?) a kontaktujem cez oficiálne kanály"),
    ],
    explanation:
      "Fake účty kopírujúce influencerov sú #1 spôsob krádeže IG/údajov. Skontroluj verified značku a počet sledujúcich.",
  },
  {
    id: "s-loan-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      'Reklama: „Pôžička 5000€ bez registra a banky, schválime všetkým. Stačí poslať poplatok 49€."',
    options: [
      bad("a", "Pošlem 49€ — potrebujem peniaze", "critical"),
      ok("b", "Ignorujem — žiadna seriózna pôžička nemá poplatok vopred"),
    ],
    explanation: "Advance fee fraud: zaplatíš poplatok, žiadne peniaze ti neprídu, scammer zmizne.",
  },
  {
    id: "u-shopify-1",
    category: "url",
    difficulty: "medium",
    prompt: "Stránka eshopu má URL `myshop123.myshopify.com`. Je to dôveryhodné?",
    options: [
      bad("a", "Áno — Shopify je značka", "medium"),
      ok("b", "Shopify hostí kohokoľvek — over si predajcu zvlášť"),
    ],
    explanation:
      "Shopify (a podobne Wix, Squarespace) je platforma. Doména hostiteľa nehovorí nič o serióznosti predajcu. Over recenzie a IČO.",
  },
  {
    id: "p-email-shared-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "Kolega ti zdieľal Sharepoint dokument.",
    visual: {
      kind: "email",
      from: "Peter (Sharepoint)",
      fromEmail: "no-reply@sharepoint-share.online",
      subject: "Peter zdieľal s vami: Q4_Bonus.xlsx",
      body: "Otvorte dokument a prihláste sa cez Microsoft.",
      cta: "Otvoriť",
    },
    options: [
      bad("a", "Otvorím — chcem vidieť bonus", "critical"),
      ok("b", "Overím s Petrom osobne / na Teams"),
    ],
    explanation:
      "Sharepoint phishing kópie sú v 2024 epidémia. Doména `sharepoint-share.online` je fake.",
  },
  {
    id: "h-survey-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: 'Pop-up: „Vyplňte 30s prieskum a vyhrajte iPhone 15."',
    options: [bad("a", "Vyplním", "critical"), ok("b", "Zavriem — žiadny iPhone za 30s prieskum")],
    explanation:
      'Survey scam: zbiera údaje, na konci ti vezme platbu „za poštovné" a ukradne kartu.',
  },
  {
    id: "f-bazos-3",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt: 'Predávaš na Bazoši za 200€. Kupec posiela link „pre overenie účtu Bazoš". Klikneš?',
    visual: {
      kind: "url",
      url: "https://bazos.sk-overit-platbu.com",
      secure: true,
    },
    options: [
      bad("a", "Áno — chcem predať", "critical"),
      ok("b", "Bazoš nemá overovacie linky pre platby"),
    ],
    explanation:
      "Bazoš nemá ochrannú platbu cez link. Posledné 2 časti pred `/` sú `sk-overit-platbu.com`, scam doména.",
  },
  {
    id: "u-port-1",
    category: "url",
    difficulty: "hard",
    prompt: "Adresa: `https://tatrabanka.sk:8443.evil.com`. Bezpečné?",
    options: [
      bad("a", "Áno — vidím tatrabanka.sk", "critical"),
      ok("b", "Phishing — všetko pred `:` môže byť subdoména na cudzom serveri"),
    ],
    explanation:
      "Trik s portom: `tatrabanka.sk:8443` vyzerá ako port, ale tu je súčasť subdomény domény `evil.com`.",
  },
  {
    id: "p-sms-banka-blok-1",
    category: "phishing",
    difficulty: "easy",
    prompt: "SMS o blokácii karty.",
    visual: {
      kind: "sms",
      sender: "VUB",
      body: "Vaša karta bola zablokovaná za podozrivú aktivitu. Odblokujte tu:",
      link: "https://vub-odblokovanie.sk",
    },
    options: [bad("a", "Odblokujem", "critical"), ok("b", "Volám na číslo zo zadnej strany karty")],
    explanation: "VÚB = `vub.sk`. Pri probléme s kartou — vždy len telefonát na číslo z karty.",
  },
  {
    id: "s-2fa-bombing-1",
    category: "scenario",
    difficulty: "hard",
    prompt: "Telefón ti nepretržite zvoní notifikáciami z Microsoft authenticator (200x). Akcia?",
    options: [
      bad("a", "Schválim — nech to skončí", "critical"),
      ok("b", "Vypnem notifikácie a zmením heslo Microsoft účtu"),
    ],
    explanation:
      "MFA bombing/fatigue: scammer má heslo, čaká, kým schváliš zo zúfalstva. Nikdy neschvaľ neznámu výzvu.",
  },
  {
    id: "f-cardgame-1",
    category: "fake_vs_real",
    difficulty: "easy",
    prompt: 'Hra v telefóne ponúka „za 10€ získaj 100€ v hre + 50€ bonusy v skutočných peniazoch".',
    options: [
      bad("a", "Skúsim", "medium"),
      ok("b", "Ignorujem — hra peniaze do reality nevypláca, je to scam alebo gambling pasca"),
    ],
    explanation:
      "Hry, ktoré sľubujú reálne peniaze, sú buď scam, alebo neregulované gambling apky.",
  },
  {
    id: "p-email-bank-statement-1",
    category: "phishing",
    difficulty: "medium",
    prompt: 'Banka pošle „výpis" v PDF prílohe.',
    visual: {
      kind: "email",
      from: "ČSOB",
      fromEmail: "vypisy@csob-online.eu",
      subject: "Mesačný výpis č. 04/2024",
      body: "V prílohe nájdete váš výpis. Heslo: posledné 4 čísla rodného čísla.",
    },
    options: [
      bad("a", "Otvorím a zadám heslo", "critical"),
      ok("b", "ČSOB výpisy posiela len v internet bankingu, ignorujem"),
    ],
    explanation: "Banky neposielajú výpisy mailom s heslom z OP. PDF v prílohe môže byť malware.",
  },
  {
    id: "u-bank-uppercase-1",
    category: "url",
    difficulty: "hard",
    prompt: "Adresa v prehliadači:",
    visual: { kind: "url", url: "https://www.tatrabaπka.sk/auth" },
    options: [
      bad("a", "Pravá Tatra banka", "critical"),
      ok("b", "Phishing — `π` (pi) namiesto `n`"),
    ],
    explanation:
      "Unicode triky: matematické či grécke písmená, ktoré vyzerajú podobne ako latinské. Browser ti ich len zriedka označí.",
  },
  {
    id: "h-easy-job-1",
    category: "honeypot",
    difficulty: "easy",
    prompt:
      'WhatsApp z neznámeho čísla: „Ahoj, ponúkam prácu z domu, 200-500€ denne za lajkovanie videí. Zaujem?"',
    options: [bad("a", "Zaujíma", "critical"), ok("b", "Blokujem — task scam")],
    explanation:
      'Task scam: dostaneš mikropráce za pár €, potom „investuj a zarobíš viac". Nakoniec pošleš stovky/tisíce a stratíš.',
  },
  {
    id: "f-fake-stripe-1",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt:
      'Predávaš na FB Marketplace. Kupec posiela link „Stripe bezpečná platba — potvrdťe IBAN pre prijatie."',
    options: [
      bad("a", "Potvrdím IBAN", "critical"),
      ok("b", "Stripe nepýta IBAN cez link, navyše Marketplace nemá Stripe"),
    ],
    explanation:
      "Fake Stripe/PayPal/Wise stránky sú top scam pre predajcov. Marketplace platby idú priamo medzi účtami, žiadny link.",
  },
  {
    id: "s-tech-popup-1",
    category: "scenario",
    difficulty: "easy",
    prompt:
      "Stránka prejde na celú obrazovku, počítač pípa: „Volajte 0800-XXX-XXX, váš PC je infikovaný!“",
    options: [bad("a", "Volám číslo", "critical"), ok("b", "Zatváram tab cez Esc / Task Manager")],
    explanation:
      "Tech support scam — fake virus warning. Zavri prehliadač, vyčisti cache, žiadny vírus to nie je.",
  },
  {
    id: "u-mobile-app-1",
    category: "url",
    difficulty: "medium",
    prompt:
      "V SMS link, ktorý chce nainštalovať appku `bankovnictvi.apk` (mimo App Store / Google Play). Inštaluješ?",
    options: [
      bad("a", "Áno — banka mi to posiela", "critical"),
      ok("b", "Nie — appky banky idú len cez Play Store / App Store"),
    ],
    explanation:
      "Side-load APK = malware. Banky NIKDY neinštalujú appky mimo oficiálnych obchodov.",
  },

  // ============ E9.1 — +30 LEGIT URL HONEYPOTS ============
  // Goal: learn to distinguish trustworthy URLs from scam clones.
  // Severity "minor" on a wrong (paranoid) answer — over-caution is a smaller evil than clicking everything.

  // ----- Banking (10) -----
  {
    id: "h-url-bank-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Banka SLSP ti pošle link na internet banking. Vyzerá takto. Otvoríš?",
    visual: { kind: "url", url: "https://moja.slsp.sk/login", secure: true },
    options: [
      ok("a", "Áno — moja.slsp.sk je oficiálna doména SLSP"),
      bad("b", "Nie — divný subdoménový tvar", "minor"),
    ],
    explanation:
      "Subdoména `moja.slsp.sk` patrí Slovenskej sporiteľni — používajú ju pre osobné internet banking. Doména druhého rádu (`slsp.sk`) je tá, ktorá určuje vlastníka. Subdomény ako moja/online/m sú normálny pattern.",
  },
  {
    id: "h-url-bank-2",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Aj toto vyzerá ako ČSOB internet banking. Otvoríš?",
    visual: { kind: "url", url: "https://m.csob.sk", secure: true },
    options: [
      ok("a", "Áno — `m` je mobilná verzia, doména csob.sk je legit"),
      bad("b", "Nie — `m.` je podozrivé", "minor"),
    ],
    explanation:
      "Prefix `m.` (mobile) je bežný pattern u veľkých webov — m.facebook.com, m.alza.sk, m.csob.sk. Doména druhého rádu zostáva pravá: csob.sk patrí ČSOB.",
  },
  {
    id: "h-url-bank-3",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Tatra banka má B2B portál. URL vyzerá takto.",
    visual: { kind: "url", url: "https://b2b.tatrabanka.sk/login", secure: true },
    options: [
      ok("a", "Legit — `b2b.tatrabanka.sk` je oficiálna firemná zóna"),
      bad("b", "Skoro phishing, neotváram", "minor"),
    ],
    explanation:
      "Tatra banka má samostatné subdomény pre retail a B2B segment. `b2b.tatrabanka.sk` je legit — over si HTTPS certifikát (vlastník: Tatra banka, a.s.).",
  },
  {
    id: "h-url-bank-4",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Poštová banka prešla rebrandom. Kliknutie na 365.bank — risk?",
    visual: { kind: "url", url: "https://365.bank", secure: true },
    options: [
      ok("a", "Legit — `.bank` je regulovaný TLD, 365.bank je oficiálne"),
      bad("b", "TLD `.bank` znie ako scam, neklikám", "minor"),
    ],
    explanation:
      "TLD `.bank` je gTLD spravovaná organizáciou fTLD Registry Services s prísnymi požiadavkami — DNSSEC povinný, len overené finančné inštitúcie. Poštová banka je pod brandom 365.bank od 2021. Bezpečnejšie než `.com` doména.",
  },
  {
    id: "h-url-bank-5",
    category: "honeypot",
    difficulty: "medium",
    prompt: "VÚB má internet banking. Vidíš túto URL — bezpečné?",
    visual: { kind: "url", url: "https://ib.vub.sk", secure: true },
    options: [
      ok("a", "Áno — `ib.vub.sk` je oficiálny VÚB internet banking"),
      bad("b", "Krátka URL je podozrivá", "minor"),
    ],
    explanation:
      "Krátkosť URL nie je signál phishingu. `ib.` (Internet Banking) je tradičná subdoména VÚB. Doména druhého rádu vub.sk patrí VÚB banke.",
  },
  {
    id: "h-url-bank-6",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Národná banka Slovenska — pozeráš sa na zoznam regulovaných subjektov.",
    visual: {
      kind: "url",
      url: "https://www.nbs.sk/sk/dohlad-nad-financnym-trhom/zoznamy",
      secure: true,
    },
    options: [
      ok("a", "Legit — nbs.sk je doména NBS"),
      bad("b", "URL je dlhá, vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Dlhá path nie je signál — naopak, čím viac štruktúrovaných ciest (/sk/dohlad/...), tým reálnejší obsahový web. NBS používa dlhšie URL pre kategorizáciu obsahu.",
  },
  {
    id: "h-url-bank-7",
    category: "honeypot",
    difficulty: "medium",
    prompt: "George (Erste) bankovníctvo na webe. Real?",
    visual: { kind: "url", url: "https://georgebanking.com", secure: true },
    options: [
      ok("a", "Áno — George je oficiálna platforma Erste / SLSP"),
      bad("b", "Anglická doména na slovenskú banku, nedôverujem", "minor"),
    ],
    explanation:
      "George je multi-país platform Erste Group; používaný v SK pod SLSP, v ČR pod Českou spořitelnou. Doména `.com` je medzinárodná, ale brand je konzistentný a SLSP tam linkuje z slsp.sk.",
  },
  {
    id: "h-url-bank-8",
    category: "honeypot",
    difficulty: "medium",
    prompt: "ČSOB pošle e-mail s linkom na podporu. URL je takáto.",
    visual: { kind: "url", url: "https://podpora.csob.sk/kontakt", secure: true },
    options: [
      ok("a", "Legit — subdoména podpora.csob.sk je oficiálna"),
      bad("b", "Veľa subdomén = podozrivé", "minor"),
    ],
    explanation:
      "Banky používajú množstvo subdomén pre rôzne sekcie (podpora, prihlasenie, fakturacia). Vlastnícky určujúca časť je doména druhého rádu — csob.sk.",
  },
  {
    id: "h-url-bank-9",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Prima banka má krátky brand subdoménový tvar. Si si istý?",
    visual: { kind: "url", url: "https://prima.primabanka.sk", secure: true },
    options: [
      ok("a", "Áno — `prima.primabanka.sk` je legitímna"),
      bad("b", "Duplikácia slova `prima` znie ako klon", "minor"),
    ],
    explanation:
      "Subdoména pre internet banking sa náhodou volá rovnako ako brand. Doména druhého rádu primabanka.sk je vlastnícky kľúč — patrí Prima banke. Žiadny klon.",
  },
  {
    id: "h-url-bank-10",
    category: "honeypot",
    difficulty: "hard",
    prompt: "ČSOB potvrdenie cez SMS — link s tracking ID. Otvoríš?",
    visual: {
      kind: "url",
      url: "https://www.csob.sk/transakcia/0193af-confirm",
      secure: true,
    },
    options: [
      ok("a", "Áno — doména csob.sk + HTTPS + sensible path"),
      bad("b", "Náhodne vyzerajúce ID v URL je suspect", "minor"),
    ],
    explanation:
      "Tracking ID-čká v path sú normálny pattern u akejkoľvek transakčnej stránky. Dôležitá je doména druhého rádu (csob.sk) a HTTPS s validnou cert.",
  },

  // ----- E-shop / commercial (10) -----
  {
    id: "h-url-shop-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Alza objednávka — link na sledovanie. Real?",
    visual: {
      kind: "url",
      url: "https://www.alza.sk/objednavka/AB12345678",
      secure: true,
    },
    options: [
      ok("a", "Áno — alza.sk + cesta /objednavka/ je legit"),
      bad("b", "Náhodný kód v URL znie ako scam", "minor"),
    ],
    explanation:
      "Alza používa formát `/objednavka/{order-id}` na tracking page. Doména alza.sk je vlastnícky kľúč. Také URL prichádzajú aj v potvrdzovacích e-mailoch.",
  },
  {
    id: "h-url-shop-2",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Mobilná verzia Alzy. Bezpečné?",
    visual: { kind: "url", url: "https://m.alza.sk/akcia", secure: true },
    options: [
      ok("a", "Áno — m. je mobilná subdoména Alzy"),
      bad("b", "`m.` prefix znie phishingovo", "minor"),
    ],
    explanation:
      "Pre mobilné prostredie e-shopy používajú m. subdoménu (alebo respond responsive design na hlavnej doméne). Alza má m.alza.sk, mall m.mall.sk, atď. Žiadny scam.",
  },
  {
    id: "h-url-shop-3",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Heureka link na porovnanie cien.",
    visual: {
      kind: "url",
      url: "https://www.heureka.sk/iphone-15-pro/recenzie/",
      secure: true,
    },
    options: [
      ok("a", "Legit — heureka.sk je porovnávač cien"),
      bad("b", "Recenzia URL znie spammy", "minor"),
    ],
    explanation:
      "Heureka.sk patrí Heureka.cz a.s. — najznámejší cenový porovnávač v ČR/SK. Cesty `/produkt/recenzie/` sú normálny pattern.",
  },
  {
    id: "h-url-shop-4",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Slovenská pošta — sledovanie balíka cez ich web.",
    visual: {
      kind: "url",
      url: "https://tandt.posta.sk/sledovanie/RR123456789SK",
      secure: true,
    },
    options: [
      ok("a", "Áno — tandt.posta.sk je oficiálny tracking"),
      bad("b", "`tandt` znie ako náhodný hack", "minor"),
    ],
    explanation:
      'Skratka tandt znamená „Track and Trace" — interná subdoména Slovenskej pošty pre sledovanie zásielok. Doména druhého rádu posta.sk patrí Slovenskej pošte. Tracking ID v path je štandardný.',
  },
  {
    id: "h-url-shop-5",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Notino voucher uplatnenie — link z e-mailu.",
    visual: {
      kind: "url",
      url: "https://www.notino.sk/voucher/redeem/X9K2-PMNT",
      secure: true,
    },
    options: [
      ok("a", "Legit — notino.sk + cesta voucher/redeem"),
      bad("b", "Voucher kód v URL znie ako pasca", "minor"),
    ],
    explanation:
      "Notino (czech krásová e-shop) má SK doménu notino.sk, voucher/redeem path s krátkym kódom je normálny commerce pattern.",
  },
  {
    id: "h-url-shop-6",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Mall.sk pošle linka po reklamácii.",
    visual: {
      kind: "url",
      url: "https://account.mall.sk/reklamacie/12345",
      secure: true,
    },
    options: [
      ok("a", "Áno — account. je legit subdoména Mall.sk"),
      bad("b", "Reklamačná URL by mala byť na hlavnej doméne", "minor"),
    ],
    explanation:
      "Veľké e-shopy (Mall, Alza, Notino) majú samostatnú `account.` subdoménu pre user-area (objednávky, reklamácie, profil). To je dobrá architektonická prax — nie indikátor phishingu.",
  },
  {
    id: "h-url-shop-7",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Dr. Max e-shop pre lekárenský online predaj.",
    visual: { kind: "url", url: "https://eshop.drmax.sk/akcia", secure: true },
    options: [
      ok("a", "Legit — drmax.sk patrí Dr. Max lekárňam"),
      bad("b", "Krátka doména na zdravotnícku firmu znie suspect", "minor"),
    ],
    explanation:
      "Dr. Max (sieť lekární) má v SR doménu drmax.sk a e-shop subdoménu eshop.drmax.sk. SK lekárenské e-shopy potrebujú licenciu od ŠÚKL — overiteľné na sukl.sk.",
  },
  {
    id: "h-url-shop-8",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Zalando po objednávke pošle tracking link.",
    visual: {
      kind: "url",
      url: "https://www.zalando.sk/myaccount/orders/123456",
      secure: true,
    },
    options: [
      ok("a", "Áno — zalando.sk je legit, myaccount je user area"),
      bad("b", "Anglické slovo `myaccount` v SK doméne podozrivé", "minor"),
    ],
    explanation:
      "Zalando je nemecký e-shop s viacjazyčnými verziami. Anglické path slová (myaccount, orders) sú interné a nemajú vplyv na vlastníctvo domény. zalando.sk patrí Zalando SE.",
  },
  {
    id: "h-url-shop-9",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Booking.com potvrdenie rezervácie — link.",
    visual: {
      kind: "url",
      url: "https://secure.booking.com/myreservations.sk.html?aid=123",
      secure: true,
    },
    options: [
      ok("a", "Legit — secure.booking.com s SK lokalizáciou"),
      bad("b", "`?aid=123` query param znie ako tracking scam", "minor"),
    ],
    explanation:
      "Booking používa `secure.booking.com` pre transakčné stránky. `aid=` je affiliate ID (kto poslal traffic) — bežný komercia pattern, žiadny phishing.",
  },
  {
    id: "h-url-shop-10",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Kvet od Heureka.sk linkuje recenzie produktu.",
    visual: {
      kind: "url",
      url: "https://obchody.heureka.sk/alza-sk/recenzie/",
      secure: true,
    },
    options: [
      ok("a", "Legit — Heureka má `obchody.` subdoménu pre overených predajcov"),
      bad("b", "Sub-subdoména je suspect", "minor"),
    ],
    explanation:
      "Heureka má `obchody.heureka.sk` subdoménu kde sú profily overených e-shopov. Tieto stránky sú regulované — pred zverejnením Heureka manuálne overuje oprávnenosť.",
  },

  // ----- eGov / state (10) -----
  {
    id: "h-url-gov-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Slovensko.sk ti pošle notifikáciu o doručenke v elektronickej schránke.",
    visual: {
      kind: "url",
      url: "https://www.slovensko.sk/sk/elektronicka-schranka",
      secure: true,
    },
    options: [
      ok("a", "Legit — slovensko.sk je centrálny portál verejnej správy"),
      bad("b", "Štátny web by mal mať .gov.sk doménu", "minor"),
    ],
    explanation:
      "Slovensko.sk je oficiálny ústredný portál SR (NASES, gov-grade hosting). Doména `.sk` (nie `.gov.sk`) je v SR pravidelná aj pre štátne stránky vyšších úrovní.",
  },
  {
    id: "h-url-gov-2",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Finančná správa — portál pre podávanie daňových priznaní.",
    visual: {
      kind: "url",
      url: "https://podania.financnasprava.sk/dorucenia",
      secure: true,
    },
    options: [
      ok("a", "Legit — podania.financnasprava.sk je oficiálny portál"),
      bad("b", "Doména je dlhá a chýba .gov", "minor"),
    ],
    explanation:
      "FS používa `financnasprava.sk` pre informačnú časť a `podania.financnasprava.sk` pre transakčný portál (PFS). HTTPS certifikát overuje vlastníka — Finančné riaditeľstvo SR.",
  },
  {
    id: "h-url-gov-3",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Sociálna poisťovňa — portál.",
    visual: { kind: "url", url: "https://www.socpoist.sk/portal", secure: true },
    options: [
      ok("a", "Legit — socpoist.sk je SP"),
      bad("b", "Skratka domény vyzerá ako klon", "minor"),
    ],
    explanation:
      "Sociálna poisťovňa má historickú doménu socpoist.sk. Zaužívané skratky štátnych inštitúcií sú legit, kým doménu vlastní príslušná inštitúcia (overiteľné v SK-NIC whois).",
  },
  {
    id: "h-url-gov-4",
    category: "honeypot",
    difficulty: "hard",
    prompt: "MV SR — kontrola pokút online.",
    visual: { kind: "url", url: "https://www.minv.sk/?platby-pokuty", secure: true },
    options: [
      ok("a", "Legit — minv.sk je Ministerstvo vnútra SR"),
      bad("b", "Query string s pokútami znie ako pasca", "minor"),
    ],
    explanation:
      "minv.sk je oficiálna doména Ministerstva vnútra. Query string `?platby-pokuty` je SEO redirect na sekciu o platbe pokút — žiadny scam. Reálnu výzvu o pokutu však polícia neposiela cez SMS link, vždy poštou.",
  },
  {
    id: "h-url-gov-5",
    category: "honeypot",
    difficulty: "medium",
    prompt: "ÚVZ SR — verejné zdravotníctvo, oznam.",
    visual: { kind: "url", url: "https://www.uvzsr.sk/oznamy/2026", secure: true },
    options: [
      ok("a", "Legit — uvzsr.sk patrí Úradu verejného zdravotníctva"),
      bad("b", "Skratka uvzsr je suspect", "minor"),
    ],
    explanation:
      "Skratka ÚVZSR = Úrad verejného zdravotníctva SR. Štátne organizácie majú často dlhé skratkové domény. Vlastníctvo overiteľné v whois.",
  },
  {
    id: "h-url-gov-6",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Justice.gov.sk — elektronické podanie do súdneho registra.",
    visual: {
      kind: "url",
      url: "https://www.justice.gov.sk/sluzby/elektronicke-podanie",
      secure: true,
    },
    options: [
      ok("a", "Legit — justice.gov.sk je Ministerstvo spravodlivosti"),
      bad("b", ".gov.sk je nezvyčajné, asi scam", "minor"),
    ],
    explanation:
      "`.gov.sk` je rezervovaná SK-NIC zóna iba pre štátne orgány. Domény ako justice.gov.sk, finance.gov.sk, mzv.gov.sk sú garantované štátne — silnejší trust signál ako bežná .sk.",
  },
  {
    id: "h-url-gov-7",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Štatistický úrad SR — register právnických osôb (RPO) lookup.",
    visual: { kind: "url", url: "https://rpo.statistics.sk/rpo", secure: true },
    options: [
      ok("a", "Legit — statistics.sk je ŠÚ SR, rpo. je register"),
      bad("b", "Anglický `statistics` na slovenský úrad je divné", "minor"),
    ],
    explanation:
      "Štatistický úrad SR má historickú doménu statistics.sk (anglické pomenovanie z 90s, kým zaviedli .sk pre štátne orgány). RPO je oficiálny register a doména je trust-worthy.",
  },
  {
    id: "h-url-gov-8",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Obchodný register Slovenskej republiky.",
    visual: {
      kind: "url",
      url: "https://www.orsr.sk/vypis.asp?ID=237161&SID=8&P=1",
      secure: true,
    },
    options: [
      ok("a", "Legit — orsr.sk je Obchodný register SR"),
      bad("b", "Query stringy s viacero ID je suspect", "minor"),
    ],
    explanation:
      "ORSR.sk patrí Ministerstvu spravodlivosti — staršie ASP-based UI s query stringmi je len legacy infraštruktúra, nie scam. Doména druhého rádu je vlastnícky kľúč.",
  },
  {
    id: "h-url-gov-9",
    category: "honeypot",
    difficulty: "hard",
    prompt: "eKasa — portál pre živnostníkov a registrácie pokladníc.",
    visual: { kind: "url", url: "https://ekasa.financnasprava.sk", secure: true },
    options: [
      ok("a", "Legit — `ekasa.` je subdoména financnasprava.sk"),
      bad("b", "Krátky brand-subdoména na štátnom webe podozrivé", "minor"),
    ],
    explanation:
      "FS má samostatné subdomény pre rôzne služby — ekasa, podania, eda, pfs. Doménový vlastník je rovnaký (Finančné riaditeľstvo SR), len rozdelené pre architektúru.",
  },
  {
    id: "h-url-gov-10",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Datacentrum Mestia Bratislavy — služba občanom.",
    visual: { kind: "url", url: "https://datacentrum.gov.sk/sluzby", secure: true },
    options: [
      ok("a", "Legit — .gov.sk je rezervovaná štátna zóna"),
      bad("b", "Slovo `datacentrum` znie ako server scam", "minor"),
    ],
    explanation:
      "DataCentrum (DataCentrum elektronizácie územnej samosprávy Slovenska, DEUS) je príspevková organizácia MIRRI SR, .gov.sk doména im patrí. Skratka DEUS / dlhšie meno organizácie sa občas skracuje.",
  },

  // ============ DEMOGRAPHIC EXTRAS — pupils, students, seniors ============

  // --- Pupils / gaming / school ---
  {
    id: "f-discord-nitro-1",
    category: "fake_vs_real",
    difficulty: "easy",
    prompt:
      'Kamarát ti na Discorde posiela link: „Dostal som zadarmo Discord Nitro, klikni tu a vezmi si aj ty."',
    visual: {
      kind: "sms",
      sender: "Kamarát (Discord)",
      body: "yo mas nesto klukni hned a vezmi zadarmo Discord Nitro na mesiac",
      link: "https://discord-nitro-gift.click/free",
    },
    options: [
      bad("a", "Kliknem — Nitro zadarmo je super", "critical"),
      ok("b", "Nespustím — kamaráta mohli hacknúť"),
      bad("c", "Kliknem, ale len cez incognito", "medium"),
    ],
    explanation:
      "Fake Nitro linky kradnú Discord token — scammer preberá tvoj účet a pošle rovnaký link tvojim kamarátom. Darované Nitro od Discordu príde vždy priamo v appke ako darček, nie cez externý link.",
  },
  {
    id: "f-gaming-vbucks-1",
    category: "fake_vs_real",
    difficulty: "easy",
    prompt: 'Stránka ponúka: „1 000 V-Bucks / Robux ZADARMO! Zadaj meno účtu a „overovací kód"."',
    options: [
      bad("a", "Vyskúšam — načo by to bolo fake", "critical"),
      ok("b", "Ignorujem — generátor hernej meny neexistuje"),
      bad("c", "Vyskúšam, ale dám falošné meno", "medium"),
    ],
    explanation:
      "V-Bucks, Robux ani iná herná mena sa nedajú generovať z tretích stránok — sú uložené na serveroch Epic/Roblox. Tieto stránky kradnú prihlasovacie údaje alebo inštalujú malware.",
  },
  {
    id: "p-email-school-ms-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Škola ti vraj posiela link na obnovu hesla do Teams.",
    visual: {
      kind: "email",
      from: "IT Podpora Škola",
      fromEmail: "it-support@skola-portal-update.com",
      subject: "Povinná obnova prístupu do Microsoft Teams — do 24 hodín",
      body: "Platnosť vášho školského konta vyprší zajtra. Kliknite a aktualizujte heslo, inak stratíte prístup.",
      cta: "Aktualizovať heslo",
    },
    options: [
      bad("a", "Kliknem — nechcem prísť o prístup", "critical"),
      ok("b", "Prihlásim sa ručne cez office.com a overím u správcu siete"),
    ],
    explanation:
      "Škola spravuje heslá cez školský portál (office.com / outlook.com), nie cez externé domény. `skola-portal-update.com` je registrovaná cudzou osobou. Phishing takto kradne školský účet.",
  },
  {
    id: "h-tiktok-giveaway-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: 'SMS: „Boli ste vybraní na odmenu 500€ od TikToku. Pre aktiváciu sa prihláste."',
    visual: {
      kind: "sms",
      sender: "TikTok Promo SK",
      body: "Gratulujeme! Ste jeden z 100 vybraných. Aktivujte odmenu 500€ tu:",
      link: "https://tiktok-reward-sk.live/login",
    },
    options: [
      bad("a", "Prihlásim sa — 500€ je 500€", "critical"),
      ok("b", "Ignorujem — TikTok takto nič nerozdeľuje"),
    ],
    explanation:
      "TikTok ani žiadna sociálna sieť nevyplácajú odmeny cez SMS link. Toto kradne prihlasovacie údaje do TikToku alebo iného konta.",
  },
  {
    id: "f-teen-job-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      'Inzerát na Instagrame: „Pracuj z domu od 15 rokov, 20€/hod, stačí zdieľať príspevky. Registrácia 15€."',
    options: [
      bad("a", "Registrujem sa — 20€/hod je super", "critical"),
      ok("b", "Ignorujem — práca, kde ty platíš vopred, nie je práca"),
    ],
    explanation:
      "Advance fee scam: zaplatíš registráciu, dostaneš návod na ďalší nábor alebo nič. Žiadna seriózna brigáda nepýta poplatok vopred.",
  },
  {
    id: "s-school-qr-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      'V školskej chodbe visí QR kód: „Nová app — objednaj obed rýchlejšie." Po naskenovaní stránka žiada školský email a heslo. Zadáš?',
    options: [
      bad("a", "Zadám — chcem rýchle objednanie", "critical"),
      ok("b", "Nechám to — overím najprv u poverеného správcu IT školy"),
    ],
    explanation:
      "QR kódy na verejných miestach môžu byť prekryté falošnými. Školský email a heslo zadávaj len na stránke, ktorú ti ukáže IT školský správca priamo.",
  },
  {
    id: "h-free-spotify-1",
    category: "honeypot",
    difficulty: "easy",
    prompt:
      'Kamarát ti pošle link: „Mám aktivovaný Spotify Premium zadarmo, použi aj ty — zadaj tu email a heslo."',
    options: [
      bad("a", "Zadám — Spotify Premium zadarmo", "critical"),
      ok("b", "Neprihlásim sa cez cudzí link"),
    ],
    explanation:
      "Cez cudzí link odovzdáš heslo priamo scammerovi. Ak chceš Premium, Spotify ponúka 3-mesačnú skúšobnú verziu priamo na spotify.com.",
  },

  // --- Seniori ---
  {
    id: "s-vnuk-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      '"Ahoj babka/starko, som to ja, Dominik. Mal som nehodu, som v nemocnici a potrebujem 2 000€ hneď. Nehovor to mame." Hlas znie povedomо.',
    options: [
      bad("a", "Pošlem — je to vnuk", "critical"),
      bad("b", "Pošlem polovicu — pre istotu", "critical"),
      ok("c", "Zavesím a zavolám priamo vnukovi na jeho číslo"),
    ],
    explanation:
      '„Ahoj babka scam" je najčastejší podvod cielený na seniorov v SR. AI klonovanie hlasu vie z krátkych klipov na sociálnych sieťach skopirovať hlas kohokoľvek. Vždy overenie priamo na pôvodnom čísle.',
  },
  {
    id: "s-door-bank-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      'Niekto zazvoní a povie: „Dobré ráno, som z banky — kontrolujeme vklady v oblasti. Môžem vidieť vašu vkladnú knižku alebo kartu?"',
    options: [
      bad("a", "Ukážem — ide z banky", "critical"),
      ok("b", "Nepustím dnu — banka nikdy nechodí po domácnostiach bez predošlej objednávky"),
      bad("c", "Nechám ho čakať a zavolám banke na číslo, čo mi dal", "medium"),
    ],
    explanation:
      'Banky nikdy neposielajú pracovníkov „kontrolovať vklady" bez vopred dohodnutého stretnutia. Číslo, ktoré ti dal, je jeho vlastné. Volaj na číslo zo zadnej strany karty.',
  },
  {
    id: "f-pension-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      'List v schránke: „Sociálna poisťovňa SR: máte nárok na príplatok k dôchodku 128 €/mes. Zavolajte pre aktiváciu na 0900 XXX XXX."',
    options: [
      bad("a", "Zavolám — chcem príplatok", "critical"),
      ok("b", "Overím priamo na pobočke Sociálnej poisťovne, nie na čísle z listu"),
    ],
    explanation:
      "Príplatky k dôchodku prideľuje Sociálna poisťovňa automaticky — nezvoní sa na prémiové 0900 linky (tie môžu účtovať aj 4 €/min). Akékoľvek zmeny sa vybavujú osobne alebo cez overené eGov portály.",
  },
  {
    id: "s-ai-voice-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      'Zavolá ti syn/dcéra, spoznáš jeho/jej hlas: „Mama, zadržali ma colníci na hranici, potrebujem 1 800€ v Bitcoine hneď." Hlas znie 100% ako on/ona.',
    options: [
      bad("a", "Idem k Bitcoinu — spoznávam hlas", "critical"),
      ok("b", "Zavesím a zavolám dieťaťu priamo na jeho číslo"),
    ],
    explanation:
      "AI voice cloning vie z niekoľkých sekúnd videa/audia skopirovať hlas kohokoľvek. V roku 2024 táto technika ukradla státisíce eur od seniorov v EÚ. Vždy overenie na pôvodnom čísle — scammer nezdvihne.",
  },
  {
    id: "s-fake-charity-call-1",
    category: "scenario",
    difficulty: "easy",
    prompt:
      'Telefonista: „Zbierame na onkologicky choré deti, pošlite teraz 20€ — prečítajte mi číslo karty a CVV."',
    options: [
      bad("a", "Prečítam — chcem pomôcť", "critical"),
      ok("b", "Odmietnem a darujem online cez overenú nadáciu"),
    ],
    explanation:
      "Seriózne charity (Liga proti rakovine, Dobrý anjel) nikdy nepýtajú číslo karty po telefóne. Darujte priamo na ich overených weboch.",
  },

  // --- Students (16+) ---
  {
    id: "f-student-accom-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      'Inzerát: izba v Bratislave, 290€/mes, zariadená, pri metre. Prenajímateľ: „Pošlite zálohu 580€, kľúče pošlem poštou — sám som momentálne v zahraničí."',
    options: [
      bad("a", "Pošlem zálohu — cena je super", "critical"),
      ok("b", "Odmietnem — záloha pred osobnou prehliadkou = scam"),
    ],
    explanation:
      'Bývanie scam: prenajímateľ „v zahraničí" + záloha pred prehliadkou = nikdy neuvidíš ani byt, ani peniaze. Bez osobnej obhliadky vopred neplatiť nič.',
  },
  {
    id: "p-email-uni-1",
    category: "phishing",
    difficulty: "medium",
    prompt: 'Email: „UK Bratislava — váš prístup do AIS2 bude zablokovaný o 24 hodín."',
    visual: {
      kind: "email",
      from: "IT UK Bratislava",
      fromEmail: "it-support@uniba-portal-update.eu",
      subject: "Povinná aktualizácia AIS2 — zablokujeme prístup k zápisom",
      body: "Platnosť vášho prístupu vyprší. Kliknite a aktualizujte údaje do 24 hodín.",
      cta: "Aktualizovať AIS2",
    },
    options: [
      bad("a", "Kliknem — nechcem prísť o zápis predmetov", "critical"),
      ok("b", "Prihlásim sa priamo na ais2.uniba.sk — nie cez link z emailu"),
    ],
    explanation:
      "Univerzitné systémy (AIS2, MAIS) posielajú notifikácie z domény školy (`uniba.sk`, `stuba.sk`...). `uniba-portal-update.eu` je cudzí registrant. Phishing cieli na zápisové termíny, kedy sú študenti pod tlakom.",
  },
  {
    id: "f-scholarship-fake-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt:
      'Email: „Erasmus+ Slovensko: boli ste vybraní na štipendium 4 500€. Pre aktiváciu pošlite overovací poplatok 80€."',
    options: [
      bad("a", "Pošlem 80€ — 4 500€ za to stojí", "critical"),
      ok("b", "Ignorujem — Erasmus+ nikdy nepýta poplatok vopred"),
    ],
    explanation:
      "Erasmus+ granty sa prideľujú výhradne cez koordinátora na škole — bez pred-poplatkov, bez emailového výberu mimo prihlásenia. Falošné štipendiá fungujú na princípe advance fee fraud.",
  },

  // ============ E9.2 — Legit SMS / borderline (honeypot, 20× kind:"sms") ============
  // 8× Slovak Post (Slovenská pošta)
  {
    id: "h-sms-posta-legit-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "PostaSK",
      body: "Vasa zasielka EE123456789SK je pripravena na vyzdvihnutie na poste Bratislava-Petrzalka do 7 dni.",
    },
    options: [
      ok("a", "Áno — bežná notifikácia o pripravenej zásielke"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Slovenská pošta posiela informačné SMS o pripravených zásielkach so sledovacím kódom (EE…SK). Žiadny link, žiadna platba. Aj keď je SMS legit, sledovanie si vždy over zadaním kódu na posta.sk ručne, nie cez link v SMS.",
  },
  {
    id: "h-sms-posta-legit-2",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "BalikoBOX",
      body: "Vyzdvihovaci kod: 482913. Platnost 48 hodin. Lokacia: BalikoBOX OC Aupark.",
    },
    options: [ok("a", "Áno — kód použijem pri boxe"), bad("b", "Nie — vyzerá podozrivo", "minor")],
    explanation:
      "BalikoBOX kódy sú 6-miestne čísla bez akéhokoľvek linku. SMS slúži len ako notifikácia, kód zadáš priamo na termináli. Žiadna platba sa cez SMS nikdy nepýta.",
  },
  {
    id: "h-sms-posta-legit-3",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Slovenska posta",
      body: "Doruceny doporuceny list, prevzatie potvrdte podpisom u doruchovatela. ID listu: RR0091238SK.",
    },
    options: [ok("a", "Áno — počkám na doručovateľa"), bad("b", "Nie — vyzerá podozrivo", "minor")],
    explanation:
      "Notifikácia o doporučenom liste je štandardná služba pošty pre adresátov, ktorí majú aktivovanú SMS-notifikáciu. Žiadny link, žiadna platba. Trackovanie cez ID listu je možné len cez posta.sk.",
  },
  {
    id: "h-sms-posta-legit-4",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Klikol by si na link v tejto SMS?",
    visual: {
      kind: "sms",
      sender: "PostaSK",
      body: "Sledovanie zasielky CC918273645SK:",
      link: "https://tandt.posta.sk/?id=CC918273645SK",
    },
    options: [
      ok("a", "Áno — `tandt.posta.sk` je oficiálna subdoména pošty"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "tandt.posta.sk (track-and-trace) je oficiálna subdoména Slovenskej pošty. Doménu vlastní podľa SK-NIC pošta. Aj tak: bezpečnejší zvyk je otvoriť posta.sk ručne a vložiť kód.",
  },
  {
    id: "h-sms-posta-legit-5",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Posta",
      body: "Zasielka EH4438122SK bola dorucena dna 28.04.2026 o 14:32, prevzala adresat.",
    },
    options: [
      ok("a", "Áno — len potvrdenie o doručení, beriem na vedomie"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Pošta posiela potvrdzujúce SMS po úspešnom doručení. Bez linku, bez akcie zo strany prijímateľa. Iba informačná hodnota.",
  },
  {
    id: "h-sms-posta-legit-6",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "PostaSK",
      body: "Vasa zasielka cak na poste do 02.05.2026. Po tomto datume bude vratena odosielatelovi.",
    },
    options: [
      ok("a", "Áno — pôjdem na poštu si prevziať"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Pripomienka pred uplynutím odbernej lehoty (zvyčajne 14 dní) je štandard pre nevyzdvihnuté zásielky. Žiadny link, žiadny doplatok. Treba ísť osobne na pobočku.",
  },
  {
    id: "h-sms-posta-legit-7",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Klikol by si na link v tejto SMS?",
    visual: {
      kind: "sms",
      sender: "PostaSK",
      body: "Doplatok za zasielku zo zahranicia: 1,80 EUR. Detail a platba:",
      link: "https://eshop.posta.sk/colne-doplatky/EE883",
    },
    options: [
      ok("a", "Áno — `eshop.posta.sk` je oficiálna doména pre platby pošty"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Doplatky za clo/colné poplatky pri zásielkach zo zahraničia sú reálne — pošta ich rieši cez eshop.posta.sk. Suma 1,80 EUR je v korelácii s realitou (pri scamoch býva 1,99 €). Aj tak: doménu si over otvorením posta.sk ručne, prejdi do sekcie doplatkov.",
  },
  {
    id: "h-sms-posta-legit-8",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Posta",
      body: "Vyzdvihnutie zasielky moznost predlzit. Volajte 0850 122 413.",
    },
    options: [
      ok("a", "Áno — zavolám zo svojho telefónu na číslo z webu pošty"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "0850 122 413 je oficiálne info-číslo Slovenskej pošty (overiteľné na posta.sk). Aj tak: pred zavolaním si číslo skontroluj na oficiálnom webe — útočník mohol číslo v SMS zmeniť.",
  },

  // 6× banks (OTP, transaction confirmations, 3DS)
  {
    id: "h-sms-bank-legit-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "CSOB",
      body: "Overovaci kod: 472918. Nezdielajte ho s nikym, ani s pracovnikom banky.",
    },
    options: [
      ok("a", "Áno — kód zadám len v aplikácii / na webe csob.sk, ktoré som otvoril sám"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "OTP od ČSOB príde, keď si práve potvrdzuješ prihlásenie alebo platbu, ktorú si sám iniciaval. Bez linku, varovanie pred zdieľaním. Ak ti príde kód a NIČ si nerobil, znamená to, že niekto skúša prihlásenie tvojím účtom — vtedy banku ihneď kontaktuj.",
  },
  {
    id: "h-sms-bank-legit-2",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Tatra banka",
      body: "Platba 25,40 EUR v TESCO BRATISLAVA bola autorizovana z karty *4821 dna 28.04 o 17:14.",
    },
    options: [
      ok("a", "Áno — len notifikácia o mojej vlastnej platbe"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Tatra banka posiela transakčné notifikácie po prebehnutej platbe. Bez akcie. Skontroluj posledné 4 čísla karty — keď nesedia, hneď zablokuj kartu cez aplikáciu.",
  },
  {
    id: "h-sms-bank-legit-3",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "VUB",
      body: "3D Secure kod: 882134. Pre potvrdenie platby AMAZON 47,90 EUR. Platnost 5 min.",
    },
    options: [
      ok("a", "Áno — práve som platil na Amazone, kód zadám"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "3D Secure kód príde od banky pri online platbe. Pravidlo: zadaj len keď SI naozaj platil a vidíš správnu sumu + obchodníka. Ak suma alebo obchodník nesedí — kód NEZADAJ a kartu okamžite zablokuj.",
  },
  {
    id: "h-sms-bank-legit-4",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "SLSP",
      body: "Vyplata mzdy 1234,56 EUR pripisana na ucet *7821 dna 28.04.2026.",
    },
    options: [
      ok("a", "Áno — moja výplata, len beriem na vedomie"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "SLSP posiela notifikácie o pripísaných platbách. Žiadny link, žiadna akcia — iba informácia. Suma + posledné 4 čísla účtu by mali sedieť s tvojím skutočným stavom.",
  },
  {
    id: "h-sms-bank-legit-5",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "mBank",
      body: "Pridanie noveho prijemcu Jan Novak SK12 1100 0000 0029 1234 5678 v aplikacii mBank. Kod: 661482.",
    },
    options: [
      ok("a", "Áno — práve som v appke pridával príjemcu, kód zadám"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "mBank potvrdzuje pridanie nového príjemcu OTP kódom. Pravidlo: ak SI práve nepridával príjemcu a kód príde, NIEKTO skúša ovládnuť tvoj účet — kontaktuj banku okamžite cez číslo z karty (nie z SMS).",
  },
  {
    id: "h-sms-bank-legit-6",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "FioBanka",
      body: "Vyber 100 EUR z bankomatu BRATISLAVA SLOVNAFT z karty *3344 dna 28.04 o 18:42.",
    },
    options: [
      ok("a", "Áno — práve som vyberal, len potvrdenie"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Fio posiela notifikácie o výberoch. Žiadny link, len informácia o tvojej akcii. Ak miesto / suma / čas nesedia — kartu hneď blokuj.",
  },

  // 4× government offices (FS, slovensko.sk, SP, ePN)
  {
    id: "h-sms-urad-legit-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "FinSprava",
      body: "Vase danove priznanie typ B za rok 2025 bolo spracovane. Preplatok 87,40 EUR bude pripisany na ucet do 30 dni.",
    },
    options: [
      ok("a", "Áno — len informácia o spracovaní môjho priznania"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Finančná správa posiela informačné SMS po spracovaní priznania, ak má daňovník aktívnu SMS-notifikáciu cez slovensko.sk. Žiadny link, žiadna platba — preplatok sa pripíše na účet, ktorý si uviedol v priznaní. Ak chceš overiť detail, prihlás sa na pfs.financnasprava.sk ručne.",
  },
  {
    id: "h-sms-urad-legit-2",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "slovensko.sk",
      body: "V eDesk schranke mate nove podanie. Pre zobrazenie sa prihlaste cez eID na slovensko.sk.",
    },
    options: [
      ok("a", "Áno — prihlásim sa cez eID na slovensko.sk ručne"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "slovensko.sk posiela notifikácie o doručených úradných správach. SMS sama o sebe žiadny link neobsahuje — prihlasuje sa cez eID priamo na slovensko.sk. Útočník nedokáže obísť eID autentifikáciu.",
  },
  {
    id: "h-sms-urad-legit-3",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "SocPoist",
      body: "Nemocenske za obdobie 14.04-25.04.2026 vo vyske 312,80 EUR vyplatene dna 28.04.2026.",
    },
    options: [
      ok("a", "Áno — moje nemocenské, len potvrdenie"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Sociálna poisťovňa informuje o vyplatení dávky cez SMS, ak má poistenec aktívnu notifikáciu. Bez linku — informácia smeruje k bankovej notifikácii, ktorá ju potvrdí pohybom na účte.",
  },
  {
    id: "h-sms-urad-legit-4",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "ePN",
      body: "Lekar Vam dnes vystavil ePN c. 2026/04/8821, platnost od 28.04.2026. Detaily v aplikacii eZdravie.",
    },
    options: [
      ok("a", "Áno — môj lekár, otvorím eZdravie ručne"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "ePN (elektronická PN) sa vystavuje cez NCZI a notifikuje pacienta SMS. Žiadny link — detail si pacient otvorí v aplikácii eZdravie / na ezdravie.sk po prihlásení cez eID.",
  },

  // 2× borderline (requires judgement)
  {
    id: "h-sms-border-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Klikol by si na link v tejto SMS?",
    visual: {
      kind: "sms",
      sender: "Posta",
      body: "Vasa zasielka prosla colnou kontrolou. Sledovanie:",
      link: "https://tandt.posta.sk/?id=RA8821736SK",
    },
    options: [
      ok("a", "Áno — `tandt.posta.sk` je legit subdoména, kód si overím"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Doména `tandt.posta.sk` je oficiálna track-and-trace pošty. Pri zásielkach zo zahraničia po colnom konaní príde takáto notifikácia. Tip: scam by zvyčajne použil doménu typu `posta-sk.tracking.eu` alebo `posta-info.com` — overuj vlastnícky koreň.",
  },
  {
    id: "h-sms-border-2",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Klikol by si na link v tejto SMS?",
    visual: {
      kind: "sms",
      sender: "CSOB",
      body: "Detegovane neobvykle prihlasenie z noveho zariadenia (Praha, CZ). Ak ste to neboli vy:",
      link: "https://www.csob.sk/security/zablokuj-pristup",
    },
    options: [
      ok("a", "Áno — `csob.sk` je legit, ihneď riešim"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "csob.sk je oficiálna doména ČSOB s vlastníctvom v SK-NIC. Banky vážne berú nezvyčajné prihlásenia a posielajú takéto upozornenia. Aj tak: bezpečnejšia cesta je otvoriť aplikáciu/web sám a skontrolovať bezpečnosť — z nej zablokuješ prístupy.",
  },

  // ============ E9.3 finish — Industry-specific scams (+5) ============
  {
    id: "p-zdrav-fakelekar-1",
    category: "phishing",
    difficulty: "medium",
    prompt: 'Email od „lekára". Reakcia?',
    visual: {
      kind: "email",
      from: "MUDr. Jana Krátka",
      fromEmail: "ordinacia.kratka@gmail-clinic.com",
      subject: "Vaša ePZP karta vyžaduje potvrdenie údajov",
      body: "Dobrý deň. Vaša elektronická preukaz poistenca (ePZP) bude deaktivovaná do 48h, ak nepotvrdíte údaje. Kliknite a vyplňte rodné číslo a zdravotnú poisťovňu.",
      cta: "Potvrdiť údaje",
    },
    options: [
      bad("a", "Vyplním — nechcem prísť o ePZP", "critical"),
      ok("b", "Ignorujem — ordinácie nikdy takto nepotvrdzujú údaje cez Gmail"),
    ],
    explanation:
      "Ordinácie pracujú cez NCZI a eZdravie — nikdy cez gmail-clinic.com. ePZP sa nedá deaktivovať e-mailom. Phishing zacieľujúci na pacientov bezprostredne zbiera rodné číslo + zdravotnú poisťovňu = vstupenka pre identity fraud a falošné liečenie.",
  },
  {
    id: "p-zdrav-supplier-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "Email pre nemocničného pracovníka. Akcia?",
    visual: {
      kind: "email",
      from: "Updates Microsoft",
      fromEmail: "security-updates@windows-patch-2026.org",
      subject: "Kritická bezpečnostná aktualizácia — nemocničné systémy",
      body: "Pre podporu izolovaných nemocničných sietí pribudla nutná bezpečnostná aktualizácia. Stiahnite a spustite priložený inštalátor s admin právami.",
      cta: "Stiahnuť patch.exe",
    },
    options: [
      bad("a", "Spustím — IT sa neozvalo, ja to vyriešim", "critical"),
      ok("b", "Ignorujem — Microsoft posiela patch cez WSUS, nie cez email a .org doménu"),
    ],
    explanation:
      'Najčastejší ransomware vector pre nemocnice je takýto „security update" mail s priloženým EXE. Microsoft nedistribuuje patche emailom a `windows-patch-2026.org` je cudzí registrant. Spustenie binárky s admin právami v nemocničnej sieti = encryption celej infraštruktúry.',
  },
  {
    id: "p-zdrav-recept-1",
    category: "scenario",
    difficulty: "medium",
    prompt: 'Pacient pýta od sestry „prezri si môj recept".',
    visual: {
      kind: "text",
      label: "Telefonát na recepciu",
      body: 'Pán Halmaďan: „Dobrý deň, môj otec dnes nemôže prísť. Pošlite mi prosím SMS s receptom na inzulín, ja mu ho vyzdvihnem v lekárni."',
    },
    options: [
      bad("a", "Pošlem SMS s číslom receptu — pomáham seniorovi", "medium"),
      ok("b", "Odmietnem — eRecepty sa neposielajú SMS, lekáreň ich vyhľadá podľa rodného čísla"),
    ],
    explanation:
      "eRecept je v centrálnom systéme NCZI — lekáreň ho nájde pri prevzatí podľa rodného čísla pacienta + občianskeho preukazu/karty poistenca. Posielanie čísla SMS = porušenie GDPR a otvorené dvere pre vyzdvihnutie liekov inou osobou.",
  },
  {
    id: "p-disp-cargotheft-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "Email pre dispečera prepravnej firmy. Akcia?",
    visual: {
      kind: "email",
      from: "Logistics Partner DE",
      fromEmail: "dispo@logisticspartner-de.online",
      subject: "Nová zákazka 24t Frankfurt → Bratislava — urgentný re-dispatch",
      body: "Pôvodný dopravca odpadol. Cena 2200 EUR (250 nad trh). Potrebujeme CMR a SPZ vozidla na potvrdenie do 1 hodiny — odpoveď na túto adresu.",
      cta: "Odpovedať s CMR + SPZ",
    },
    options: [
      bad("a", "Pošlem CMR a SPZ — cena je dobrá, urgent", "critical"),
      ok(
        "b",
        "Overujem cez TimoCom / volanie do firmy z webu — žiadne potvrdzovanie cez .online doménu",
      ),
    ],
    explanation:
      "Cargo theft scenár: scammer získa identity vozidla a vodiča, vystupuje pred kamionovým prevádzkovateľom ako dispečer a ukradne tovar. Cena nadtrhom + tlak < 1 hodiny + .online doména = klasické signály. Overovanie sa robí cez burzu (TimoCom, Trans.eu) alebo telefón z webu.",
  },
  {
    id: "p-disp-fakecmr-1",
    category: "fake_vs_real",
    difficulty: "medium",
    prompt: 'PDF priložené k mailu od „nového dopravcu". Akcia?',
    visual: {
      kind: "email",
      from: "Marek B., dispatcher",
      fromEmail: "dispatch@trans-express-eu.icu",
      subject: "Potvrdený CMR — vozidlo SPZ BL-129XY",
      body: "V prílohe podpísaný CMR a list o sprostredkovaní. Prosím o úhradu zálohy 30 % na účet IBAN SI56 ... pred naložením.",
      cta: "Otvoriť CMR.pdf",
    },
    options: [
      bad("a", "Zaplatím zálohu — máme CMR, je to v poriadku", "critical"),
      ok(
        "b",
        "Overujem firmu cez SK obchodný register a TimoCom — `.icu` doména a SI IBAN sú red flag",
      ),
    ],
    explanation:
      "Slovenský dopravca s SI (slovinský) IBAN a `.icu` doménou je takmer vždy scam. CMR PDF sa dá ľahko sfalšovať. Vlastníka vozidla SPZ BL-129XY si over cez orsr.sk a zavolaj na číslo z webu firmy, nie z mailu.",
  },

  // ----- E9.3 finish (cont.) — 4× e-shop + 3× gastro + 3× autoservis + 3× IT/dev -----
  // 4× e-shop
  {
    id: "p-eshop-fake-order-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Si majiteľ e-shopu. Príde objednávka cez e-mail (nie cez admin panel). Reakcia?",
    visual: {
      kind: "email",
      from: "Roman Kováč",
      fromEmail: "roman.kovac.firma@outlook.com",
      subject: "Hromadná objednávka — 25× notebook ASUS, súrne",
      body: "Dobrý deň, sme firma z DE, potrebujeme 25 ks notebookov ASUS na zajtra. Súrne, klient čaká. Pošlite faktúru a údaje na úhradu. PO bude poslané neskôr.",
      cta: "Odpovedať s IBAN",
    },
    options: [
      bad("a", "Pošlem faktúru a IBAN — veľká objednávka, šéf bude rád", "critical"),
      ok("b", "Odmietnem — objednávky idú cez e-shop, žiadnu B2B robím cez ORSR-overený subjekt"),
    ],
    explanation:
      'Klasický B2B advance-fee scam: „súrne", „veľká objednávka", obíde admin panel. „Firma" buď neexistuje alebo má clean shell. Pravidlo: každú firemnú objednávku over v ORSR/FinStat pred odoslaním tovaru. „PO príde neskôr" = červená vlajka, faktúru vystavuj len po prijatí podpísanej objednávky a kreditnej previerke.',
  },
  {
    id: "p-eshop-fake-refund-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "Customer-care e-mail v admin paneli e-shopu. Akcia?",
    visual: {
      kind: "email",
      from: "Anna Novakova",
      fromEmail: "anna.novak1991@gmail.com",
      subject: "Reklamácia objednávky #45821 — chýbajúce položky",
      body: "Dobrý deň, v zásielke chýbajú 2 položky (mobilný kryt + kábel). Mám fotku. Prosím refund 47,80 EUR na nový IBAN SK00 0900 ... — pôvodný účet je zablokovaný. Faktúru pošlite e-mailom.",
      cta: "Vrátiť peniaze",
    },
    options: [
      bad("a", "Pošlem refund na nový IBAN — zákazník má nárok", "critical"),
      ok("b", "Refund len na pôvodný IBAN použitý pri platbe; požiadam o doloženie zo skladu"),
    ],
    explanation:
      "Account-takeover scam: útočník ukradol email reálnej zákazníčky a snaží sa presmerovať refund na svoj účet. Pravidlo: refund výlučne na rovnakú metódu ako platba (§ 7 zákona č. 102/2014). Nikdy nemeň IBAN na základe e-mailovej požiadavky — over telefonicky cez číslo z objednávky a skontroluj pickup foto skladu.",
  },
  {
    id: "p-eshop-iban-switch-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "E-mail od dodávateľa s aktualizovanou faktúrou. Reakcia?",
    visual: {
      kind: "email",
      from: "Účtovníctvo — Logistika SK",
      fromEmail: "uctovnictvo@logistika-sk.com",
      subject: "Aktualizovaná faktúra č. 2026/0428 — zmena bankového účtu",
      body: "Dobrý deň, prikladám aktualizovanú faktúru. Prosíme o úhradu na NOVÝ IBAN: SK56 1100 ... (pôvodný účet bol zrušený kvôli reorganizácii). Splatnosť zostáva 5 dní.",
      cta: "Otvoriť faktúru.pdf",
    },
    options: [
      bad("a", "Zmením IBAN v účtovnom systéme a zaplatím", "critical"),
      ok("b", "Zavolám dodávateľa na číslo z webu a osobne overím zmenu IBAN"),
    ],
    explanation:
      "BEC (Business Email Compromise) IBAN-switch je top 3 finančný útok na SK firmy podľa NCKB 2025. Útočník kompromituje mailový účet dodávateľa (alebo si zaregistruje look-alike doménu — `logistika-sk.com` namiesto `logistika.sk`) a posiela falošnú faktúru. Pravidlo: každú zmenu IBAN over telefonicky na číslo z webu (NIE z e-mailu) a vyžaduj písomné potvrdenie podpísané konateľom.",
  },
  {
    id: "p-eshop-admin-takeover-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "E-mail od „Shoptetu“ administrátorovi e-shopu. Akcia?",
    visual: {
      kind: "email",
      from: "Shoptet Security",
      fromEmail: "security@shoptet-admin-sk.com",
      subject: "Detegované neoprávnené prihlásenie — overte konto do 24h",
      body: "Dobrý deň, váš admin účet bude pozastavený do 24h kvôli podozrivému prihláseniu. Pre obnovu sa prihláste tu a potvrďte 2FA.",
      cta: "Overiť konto",
    },
    options: [
      bad("a", "Prihlásim sa cez link — nechcem prísť o e-shop", "critical"),
      ok(
        "b",
        "Ignorujem link; otvorím Shoptet ručne cez záložku a skontrolujem aktívne prihlásenia",
      ),
    ],
    explanation:
      "Shoptet (a podobné platformy) komunikujú výlučne z `shoptet.sk` / `shoptet.cz`. Doména `shoptet-admin-sk.com` patrí útočníkovi. Phishing cieli na admin credentials e-shopu — po prihlásení útočník zmení IBAN pre payouts, presmeruje objednávky a poškodí brand. Pravidlo: do admin panelu chodíš len cez záložku a 2FA cez TOTP appku, nikdy cez link v e-maili.",
  },

  // 3× gastro / HORECA
  {
    id: "p-gastro-fake-rsvp-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Reštaurácia dostane email s veľkou skupinovou rezerváciou. Otvoríš prílohu?",
    visual: {
      kind: "email",
      from: "Eventes Bratislava",
      fromEmail: "events@eventes-bratislava.online",
      subject: "Rezervácia 50 osôb — firemná oslava 15.05.2026",
      body: "Dobrý deň, chceme rezervovať celú reštauráciu pre 50 osôb. V prílohe menu_preferences.docx s našimi požiadavkami a kontakt na koordinátora.",
      cta: "Otvoriť menu_preferences.docx",
    },
    options: [
      bad("a", "Otvorím prílohu — chcem si pozrieť požiadavky", "critical"),
      ok("b", "Odpíšem s prosbou o telefonický kontakt; prílohu neotvorím bez overenia"),
    ],
    explanation:
      "Macro-malware v Word/Excel prílohe je klasický vector pre HORECA — útočník vie, že prevádzkar otvára neznáme prílohy zákazníkov. Doména `.online` + neznáma firma + súbor `.docx` so zapnutými makrami = ransomware risk. Pravidlo: rezervácie nad 10 osôb potvrdzuj len telefonicky alebo cez vlastný booking systém, prílohy otváraj v Google Docs viewer (sandboxed).",
  },
  {
    id: "p-gastro-pos-update-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "Volanie pre prevádzkara reštaurácie. Reakcia?",
    visual: {
      kind: "call",
      caller: "„Technik Verifone“",
      number: "neznáme číslo",
      hint: "Tvrdí, že je nutná diaľková aktualizácia POS terminálu — potrebuje ID terminálu a PIN správcu, inak prestane fungovať.",
    },
    options: [
      bad("a", "Diktovám ID a PIN — bez POS nemôžem fungovať", "critical"),
      ok("b", "Položím a zavolám Verifone na číslo z faktúry / web stránky výrobcu"),
    ],
    explanation:
      "Útočníci cielia na gastro lebo POS terminál je živá brána ku kartám zákazníkov. Verifone / Ingenico / SIA nikdy nepýtajú správcovský PIN telefónom — aktualizácie chodia automaticky cez šifrovaný kanál. Po zadaní PINu útočník skimuje karty zákazníkov a zničí dôveru reštaurácie.",
  },
  {
    id: "p-gastro-supplier-spoof-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Nový dodávateľ čerstvých produktov pre kuchyňu pošle e-mail. Reakcia?",
    visual: {
      kind: "email",
      from: "Bio Farma Záhorie",
      fromEmail: "objednavky@biofarma-zahorie.shop",
      subject: "Špeciálna ponuka — bio mäso o 30 % lacnejšie",
      body: "Dobrý deň, sme nová bio farma so Záhoria. Ponúkame mäso o 30 % lacnejšie ako konkurencia. Stačí poslať objednávku a IČO/DIČ na predfaktúru — tovar dovezieme do 48h.",
      cta: "Objednať",
    },
    options: [
      bad("a", "Pošlem IČO/DIČ a objednám — výhodná cena", "critical"),
      ok("b", "Overím farmu cez ORSR + štátny veterinárny register pred akoukoľvek komunikáciou"),
    ],
    explanation:
      "30 % pod trh + nová neoverená firma + `.shop` doména = takmer vždy fake-supplier scam. Po zaplatení predfaktúry tovar nikdy nepríde. Pravidlo: dodávateľov potravín overuj v ORSR + štátnom veterinárnom registri (svps.sk) — bio farma musí mať certifikát od BIOKONT/Naturalis. Bez certifikátu nesmie predávať mäso prevádzke s gastro povolením.",
  },

  // 3× autoservis / pneuservis
  {
    id: "p-auto-vin-check-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "Email pre autoservis od „klienta“. Reakcia?",
    visual: {
      kind: "email",
      from: "Peter — kupujúci",
      fromEmail: "kupujem.skoda@protonmail.com",
      subject: "Žiadosť o overenie histórie servisu — VIN TMBJG7NE5L0123456",
      body: "Dobrý deň, kupujem ojazdené auto a chcel by som overiť, či bolo servisované u vás. Pošlite prosím všetky záznamy o servise + meno predávajúceho a jeho telefón.",
    },
    options: [
      bad("a", "Pošlem históriu — kupujúci má právo vedieť", "critical"),
      ok(
        "b",
        "Odmietnem — záznamy posielam len overenému majiteľovi (občiansky + technický preukaz)",
      ),
    ],
    explanation:
      "Servisná história + meno + telefón majiteľa = perfektný recept pre auto-scam: útočník kontaktuje skutočného majiteľa, vystupuje ako kupujúci, dohodne predaj „mimo Bazoš“ a ukradne auto alebo zálohu. Servisné záznamy sú osobný údaj (GDPR čl. 6) — vydávaj ich len osobne na základe občianskeho a technického preukazu k vozidlu, nie e-mailom.",
  },
  {
    id: "p-pneu-fake-order-1",
    category: "phishing",
    difficulty: "easy",
    prompt: "Pneuservisu napíše neznáme číslo na WhatsApp.",
    visual: {
      kind: "sms",
      sender: "+44 7700 900882",
      body: "Dobry den, potrebujem 4 ks letnych pneu Continental 205/55 R16 na zajtra. Plat predfakturou. Postlite IBAN.",
    },
    options: [
      bad("a", "Pošlem IBAN — predfaktúra je v pohode", "critical"),
      ok("b", "Odmietnem WhatsApp objednávky; len osobne, alebo cez náš e-shop s 3DS platbou"),
    ],
    explanation:
      "WhatsApp objednávka pneu zo zahraničného (UK +44) čísla bez ORSR identifikácie + návrh predfaktúry = scam-mode triangulating: útočník vyláka IBAN, prevedie ukradnutú kartu na tvoj účet (chargeback), pneu ti nezaplatí ani neprevezme. Pravidlo: B2B objednávky cez e-shop alebo podpísanú objednávku s IČO; pri preplate vždy 3DS overenie.",
  },
  {
    id: "s-auto-fake-claim-1",
    category: "scenario",
    difficulty: "hard",
    prompt: "Volanie autoservisu týždeň po veľkej oprave. Reakcia?",
    visual: {
      kind: "call",
      caller: "„Klient — pán Horváth“",
      number: "neznáme číslo",
      hint: "Tvrdí, že po vašej oprave brzdí motorom narazil do iného auta. Druhý vodič žiada 2 800 EUR. „Klient“ chce, aby ste poslali peniaze priamo druhému vodičovi cez IBAN, vyhne sa tým súdu.",
    },
    options: [
      bad("a", "Pošlem 2 800 EUR — nechcem mať problém", "critical"),
      ok(
        "b",
        "Odmietnem — všetky reklamácie cez poistku a písomne, žiadne priame platby tretej strane",
      ),
    ],
    explanation:
      "„Súdu sa vyhneme priamou platbou“ = klasický extortion scam. Reálnu reklamáciu rieši poistka servisu (povinné poistenie zodpovednosti) cez znaleckú obhliadku a písomný protokol. Priama platba na cudzí účet nemá právny základ a útočník zopakuje finte mesiac neskôr. Pravidlo: každá reklamácia musí prísť písomne, s technickou dokumentáciou, cez poisťovaciu spoločnosť.",
  },

  // 3× IT / dev
  {
    id: "p-it-npm-supply-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "GitHub-bot e-mail vývojárovi. Reakcia?",
    visual: {
      kind: "email",
      from: "npm support",
      fromEmail: "support@npmjs-helpdesk.com",
      subject: "You've been added as maintainer to package `react-utils-pro`",
      body: "Hi, user `m4int4iner` has added you as a maintainer to react-utils-pro (12k weekly downloads). To accept and publish your first release, sign in here with your npm token.",
      cta: "Accept maintainer role",
    },
    options: [
      bad("a", "Prihlásim sa cez link — pekná dôvera v kolegu", "critical"),
      ok("b", "Ignorujem; otvorím npmjs.com ručne cez záložku a skontrolujem invitations"),
    ],
    explanation:
      "Supply-chain útok: útočník chce tvoj npm publish token, aby mohol vydať škodlivú verziu populárneho balíka. Doména `npmjs-helpdesk.com` nie je npm (pravá: `npmjs.com`). npm nikdy nepýta token cez e-mailový link — invitations vidíš na npmjs.com → Account → Packages. Pravidlo: publish-tokeny rotuj každé 90 dní, používaj `2FA: auth-and-writes`, nikdy ich nezadávaj cez link.",
  },
  {
    id: "p-it-oauth-phish-1",
    category: "phishing",
    difficulty: "hard",
    prompt: "GitHub OAuth consent obrazovka. Schváliš?",
    visual: {
      kind: "url",
      url: "https://github.com/login/oauth/authorize?client_id=8a3d&scope=repo,workflow,delete_repo",
      secure: true,
    },
    options: [
      bad("a", "Schválim — je to github.com a chcem to skúsiť", "critical"),
      ok("b", "Odmietnem — `delete_repo` + `workflow` scope na neznámu app je no-go"),
    ],
    explanation:
      "Consent-phishing: aj keď URL je legitímne `github.com`, OAuth aplikácia tretej strany žiada nebezpečnú kombináciu permissions (`repo` = read+write všetkých repov, `workflow` = úpravy GitHub Actions, `delete_repo` = mazanie). Po schválení útočník inštaluje malicious workflow a kradne secrets. Pravidlo: pred schválením vždy čítaj `client_id` aj scopes; aktívne autorizácie revoke-uj v `github.com/settings/applications`.",
  },
  {
    id: "p-it-fake-recruiter-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "LinkedIn DM od recruitera. Klikneš na repo s test assignmentom?",
    visual: {
      kind: "text",
      label: "LinkedIn DM",
      body: "Hi! We have a Senior Backend role at a US fintech ($120k–$160k remote). First round is a 90-min coding assignment — clone this repo and run `npm install && npm start`, then submit a PR. Repo: github.com/jobs-backend-tasks/payment-api-v2",
    },
    options: [
      bad("a", "Klonujem a spustím — chcem prácu", "critical"),
      ok(
        "b",
        "Najprv overím profil recruitera + spoločnosť cez LinkedIn s 2nd-degree connections; repo NEspúšťam bez sandboxu",
      ),
    ],
    explanation:
      "DPRK / Lazarus group + iné aktéri systematicky nasadzujú malware-laden „coding assignments“ cez fake recruiter accounts (aj cez populárne firmy v DM). `npm install` spustí postinstall script ktorý kradne SSH kľúče, `~/.aws/credentials`, browser cookies. Pravidlo: assignmenty od neoverených recruiterov spúšťaj výlučne v Docker sandboxe alebo VM bez prístupu k tvojim secret-om; profil recruitera over cez 2nd-degree connections + obvolaj firmu cez oficiálny web.",
  },

  // ============ E9.4 — Honeypot extension (+30) ============
  // 10× e-mails that LOOK like phishing but are legitimate
  {
    id: "h-mail-bank-realnotice-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Email od banky, naozaj urgentný tón. Reakcia?",
    visual: {
      kind: "email",
      from: "Tatra banka — bezpečnosť",
      fromEmail: "bezpecnost@tatrabanka.sk",
      subject: "Nezvyčajné prihlásenie z nového zariadenia (Linz, AT)",
      body: 'Dnes o 03:14 sa niekto pokúsil prihlásiť na váš účet z nového zariadenia v Linzi. Ak to nebol(a) ste vy, prihláste sa do Internet bankingu a v sekcii „Aktívne zariadenia" zariadenie odhláste. Heslo zmeňte cez aplikáciu Tatra banka.',
    },
    options: [
      ok("a", "Legit — `tatrabanka.sk` je oficiálna doména, postup vedie do appky"),
      bad("b", "Phishing — banka nikdy neposiela urgentné maily", "minor"),
    ],
    explanation:
      "Banky reálne posielajú bezpečnostné notifikácie z `bezpecnost@tatrabanka.sk` (overiteľné na webe banky). Pravidlo: e-mail neobsahuje žiadny link na prihlásenie — vyzýva otvoriť aplikáciu/web ručne. To je legit signál; phishing by ti dal jeden klik.",
  },
  {
    id: "h-mail-cf-realnotice-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Email po pokuse o prihlásenie. Klikneš?",
    visual: {
      kind: "email",
      from: "GitHub",
      fromEmail: "noreply@github.com",
      subject: "[GitHub] Please verify your device",
      body: "We've detected a sign-in to your account from a new device. To continue, click the verification link below. If this wasn't you, change your password.",
      cta: "Verify device",
    },
    options: [
      ok("a", "Legit — vlastnoručne som sa prihlasoval z nového notebooku"),
      bad("b", "Phishing — `verify` linky sú vždy podozrivé", "minor"),
    ],
    explanation:
      "GitHub posiela device-verification e-mail po každom prihlásení z nového zariadenia. Ak SI sa práve sám prihlasoval, je legit (over odosielateľa: `noreply@github.com`). Ak nie, NEKLIKAJ — zmeň heslo a vyhoď podozrivú session na github.com/settings/sessions.",
  },
  {
    id: "h-mail-shipping-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Email od kuriéra so suspect tónom. Reakcia?",
    visual: {
      kind: "email",
      from: "DHL Express",
      fromEmail: "noreply@dhl.com",
      subject: "Doručenie sa nepodarilo — zásielka bude vrátená",
      body: "Pri doručovaní vašej zásielky 7891234567 sa nepodarilo zastihnúť adresáta. Bez akcie do 5 dní sa zásielka vráti odosielateľovi. Pre prebookovanie navštívte mydhl.express.dhl.",
    },
    options: [
      ok("a", "Legit — `dhl.com` a `mydhl.express.dhl` sú oficiálne, otvorím ručne"),
      bad("b", "Phishing — push na termín = scam", "minor"),
    ],
    explanation:
      "DHL reálne posiela neúspešné doručenie z `dhl.com` a smeruje na `mydhl.express.dhl`. Aj scam takéto SMS/maily kopíruje, ale s podvrhnutou doménou. Doménu vždy over — DHL používa root `dhl.com` (overiteľné v whois).",
  },
  {
    id: "h-mail-stripe-real-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Email od Stripe podnikateľovi. Reakcia?",
    visual: {
      kind: "email",
      from: "Stripe",
      fromEmail: "no-reply@stripe.com",
      subject: "Akcia potrebná: aktualizácia bankového účtu pre payouts",
      body: "Aby sme mohli pokračovať vo výplatách, musíme overiť aktuálny IBAN. Prihláste sa na dashboard.stripe.com a v Settings → Payouts overte / aktualizujte bankový účet.",
    },
    options: [
      ok("a", "Legit — Stripe takto upozorňuje, otvorím dashboard.stripe.com ručne"),
      bad("b", "Phishing — kto by od podnikateľa pýtal IBAN", "minor"),
    ],
    explanation:
      "Stripe posiela KYC / payout notifikácie z `stripe.com`. Žiadny link na prihlásenie — len výzva otvoriť dashboard ručne. Legit. Phishingová verzia by mala link s predvyplneným formulárom (`stripe-verify.io`).",
  },
  {
    id: "h-mail-azure-real-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Email od Microsoftu IT-správcovi. Reakcia?",
    visual: {
      kind: "email",
      from: "Microsoft Azure",
      fromEmail: "azure-noreply@microsoft.com",
      subject: "Action required: subscription will be disabled in 3 days",
      body: "Your Azure subscription has reached the spending limit. Without billing review, services will be paused on 2026-05-01. Manage in Azure portal (portal.azure.com).",
    },
    options: [
      ok("a", "Legit — `microsoft.com` doména, smeruje na `portal.azure.com` ručne"),
      bad("b", "Phishing — vážne MS by neposielal také urgentné maily", "minor"),
    ],
    explanation:
      "Microsoft realne posiela billing-notifikácie z `azure-noreply@microsoft.com`. Klúčový signál: vyzýva otvoriť `portal.azure.com` ručne, žiadny prihlasovací link. Phishingová verzia by mala link na fake login.",
  },
  {
    id: "h-mail-gov-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Email z Finančnej správy. Reakcia?",
    visual: {
      kind: "email",
      from: "Finančná správa SR",
      fromEmail: "noreply@financnasprava.sk",
      subject: "Doručené potvrdenie podania na portáli FS",
      body: "Vaše elektronické podanie typu DPH bolo prijaté dňa 28.04.2026, identifikátor PDF-2026-091823. Detail v Osobnej internetovej zóne na pfs.financnasprava.sk po prihlásení.",
    },
    options: [
      ok("a", "Legit — doména `financnasprava.sk`, smeruje na PFS ručné prihlásenie"),
      bad("b", "Phishing — neprihlásim sa nikam", "minor"),
    ],
    explanation:
      "FS posiela potvrdenia podaní z `financnasprava.sk`. Žiadny link na prihlásenie, len ID podania na overenie v PFS. Phishingová verzia by mala link na falošný login.",
  },
  {
    id: "h-mail-eshop-real-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Email od e-shopu. Reakcia?",
    visual: {
      kind: "email",
      from: "Alza.sk",
      fromEmail: "obchod@alza.sk",
      subject: "Vaša objednávka 8821547 bola odoslaná",
      body: "Balík odoslal kuriér Packeta, sledovacie číslo Z9981234. Sledovanie cez packeta.sk po zadaní čísla. Detail objednávky v účte na alza.sk.",
    },
    options: [
      ok("a", "Legit — moja objednávka, skopírujem si tracking číslo"),
      bad("b", "Phishing — neklikám na nič v emailoch", "minor"),
    ],
    explanation:
      "Alza posiela objednávkové potvrdenia z `obchod@alza.sk`. Žiadny urgent push, len informácia + sledovacie číslo. Pravidlo: tracking si vlož ručne na packeta.sk, nie cez link v maili.",
  },
  {
    id: "h-mail-it-real-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Email od IT v korporácii. Reakcia?",
    visual: {
      kind: "email",
      from: "IT Helpdesk",
      fromEmail: "helpdesk@firma.sk",
      subject: "Naplánovaná údržba VPN — restart connection",
      body: "Dnes 22:00–23:00 prebehne reštart VPN concentratorov. Po reštarte budete musieť znovu pripojiť VPN klienta. Žiadne prihlasovacie údaje sa nemenia.",
    },
    options: [
      ok("a", "Legit — vnútorná IT komunikácia, doména firmy"),
      bad("b", "Phishing — IT mi nikdy nepíše", "minor"),
    ],
    explanation:
      'Korporátne IT bežne avizuje plánovanú údržbu z firemnej domény. Žiadny link, žiadne prihlasovacie údaje. Phishingová verzia by ťa nasmerovala na „re-authentication" link na fake stránku.',
  },
  {
    id: "h-mail-recruit-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Email od recruitera na LinkedIn. Reakcia?",
    visual: {
      kind: "email",
      from: "Anna Tomeková (Profesia)",
      fromEmail: "anna.tomekova@profesia.sk",
      subject: "Pozícia Senior Backend Developer — záujem o rozhovor?",
      body: "Dobrý deň. Hľadáme seniora pre nášho klienta (banka, BA). Plat 4200–5500 EUR. Ak má zmysel, pošlem detail a CV pošlite mi prosím cez profesia.sk profil.",
    },
    options: [
      ok("a", "Legit — `profesia.sk` doména, žiadny urgent push"),
      bad("b", "Phishing — recruiteri sú scam", "minor"),
    ],
    explanation:
      'Profesia recruiteri reálne posielajú maily z `profesia.sk`. Plat-vilka, žiadosť o CV cez platformu (nie e-mailom), žiadne pred-poplatky = legit. Scam recruiter (najmä cez WhatsApp) by ťa žiadal o data pre „verification" alebo o platbu za „onboarding".',
  },
  {
    id: "h-mail-google-real-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Email od Googlu. Reakcia?",
    visual: {
      kind: "email",
      from: "Google",
      fromEmail: "no-reply@accounts.google.com",
      subject: "Nové prihlásenie na vaše Google konto",
      body: "Práve sa niekto prihlásil na vaše Google konto z nového zariadenia (iPhone, Bratislava). Ak ste to boli vy, ignorujte. Ak nie, zabezpečte konto na myaccount.google.com.",
    },
    options: [
      ok("a", "Legit — moje vlastné prihlásenie z iPhonu"),
      bad("b", "Phishing — zabezpečenie cez link je scam", "minor"),
    ],
    explanation:
      "Google posiela device-sign-in maily z `no-reply@accounts.google.com`. Žiadny prihlasovací link — len odkaz na `myaccount.google.com`, ktorý si otvor ručne. Phishing by mal `secure-google-login.com`.",
  },

  // 8× calls that resemble vishing but are legitimate
  {
    id: "h-call-pz-real-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Volanie. Reakcia?",
    visual: {
      kind: "call",
      caller: "PZ SR — Bratislava",
      number: "0961 100 200",
      hint: "Predstavujú sa: por. Krátka, OO PZ Bratislava-Staré Mesto. Pýtajú sa ohľadom mojej včerajšej žiadosti o nový OP.",
    },
    options: [
      ok("a", "Legit — moja žiadosť, ja som im dal číslo. Overím cez minv.sk callback"),
      bad("b", "Vishing — polícia takto netelefonuje", "minor"),
    ],
    explanation:
      "Polícia reálne kontaktuje žiadateľov o OP / pas pri nezrovnalostiach v podaní. Číslo 0961 ... je oficiálny rozsah PZ. Bezpečnostný postup: zavolaj späť na centrálne číslo PZ z minv.sk — útočník nedokáže ovládnuť centrálu.",
  },
  {
    id: "h-call-bank-real-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Volanie. Reakcia?",
    visual: {
      kind: "call",
      caller: "Tatra banka — fraud team",
      number: "+421 2 5919 1000",
      hint: "Pýtajú sa, či som naozaj zaplatil 1230 EUR cez kartu na Aliexpress dnes ráno. Tvrdí, že to vyzerá ako fraud.",
    },
    options: [
      ok(
        "a",
        "Legit — fraud team reálne tieto veci rieši, ale moje údaje nedávam, zavolám späť cez 0800 zo zadnej strany karty",
      ),
      bad("b", "Vishing — banka nikdy nevolá", "minor"),
    ],
    explanation:
      "Banky reálne mávajú fraud teamy a volajú pri podozrivých transakciách. Číslo `+421 2 5919 1000` je TB centrála (overené). Pravidlo: NIKDY nezadávaj OTP/heslo do telefónu, vždy zavolaj späť na číslo zo zadnej strany karty — ten istý fraud team ti aj tak odpovie.",
  },
  {
    id: "h-call-doctor-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Volanie. Reakcia?",
    visual: {
      kind: "call",
      caller: "Sestra ambulancie",
      number: "0905 ... (mobilný)",
      hint: '„Volám z ambulancie MUDr. Halmádyho. Doktor sa chce ozvať ohľadom vašich výsledkov, prosím, zavolajte mu späť na pevnú linku 02/..."',
    },
    options: [
      ok("a", "Legit — ambulancia, ja zavolám späť na pevnú linku, ktorú si overím"),
      bad("b", "Vishing — nikomu zo seba neodpovedám", "minor"),
    ],
    explanation:
      "Ambulancie reálne volajú pacientom z mobilov sestier. Bezpečné: nepýtaj sa žiadne osobné údaje, zavolaj späť na pevnú linku, ktorú nájdeš v ezdravie.sk / zoznam ambulancií.",
  },
  {
    id: "h-call-fs-real-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Volanie. Reakcia?",
    visual: {
      kind: "call",
      caller: "Daňový úrad Bratislava",
      number: "+421 2 4827 1810",
      hint: "Inšpektorka pýta upresnenie pri mojom DPH priznaní (chýba potvrdenie zo zahraničia).",
    },
    options: [
      ok("a", "Legit — DÚ takto reálne pýta dôkazy, ale ja zavolám späť cez ústredné číslo"),
      bad("b", "Vishing — FS nikdy netelefonuje", "minor"),
    ],
    explanation:
      "Daňové úrady reálne telefonujú pri kontrolných podaniach a chýbajúcich prílohách. Číslo `+421 2 4827 1810` je BA DÚ. Postup: zaznač meno + ID prípadu, zavolaj späť cez ústredné číslo FS z financnasprava.sk. Útočník nemôže ovládnuť ústredie.",
  },
  {
    id: "h-call-courier-real-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Volanie. Reakcia?",
    visual: {
      kind: "call",
      caller: "Kuriér DPD",
      number: "0905 ... (mobilný)",
      hint: '„Som pred bytom, neviem nájsť zvonček. Volám z mobilu, aby som vás zastihol."',
    },
    options: [
      ok("a", "Legit — kuriér naozaj často volá z mobilu, žiadne údaje nepýta"),
      bad("b", "Vishing — kuriéri sú scam", "minor"),
    ],
    explanation:
      'Kuriéri (DPD/GLS/Packeta) bežne volajú z firemných mobilov. Žiadne údaje nepýtajú — len logistika. Scam-vishing kuriér by pýtal číslo karty „za doplatok".',
  },
  {
    id: "h-call-spa-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Volanie. Reakcia?",
    visual: {
      kind: "call",
      caller: "Sociálna poisťovňa — pobočka",
      number: "+421 2 ... (pevná)",
      hint: "Žiadajú dovysvetliť údaj v mojom oznámení o zmene zamestnávateľa.",
    },
    options: [
      ok("a", "Legit — SP takto reálne pracuje, ja zavolám späť cez socpoist.sk callback"),
      bad("b", "Vishing — SP mi nemá čo volať", "minor"),
    ],
    explanation:
      "Sociálna poisťovňa pri nejasnostiach v oznámeniach reálne kontaktuje cez pobočku. Pravidlo: nezadávaj rodné číslo do telefónu, zavolaj späť cez ústredné číslo SP zo socpoist.sk a pýtaj si svoj prípad cez ID.",
  },
  {
    id: "h-call-employer-real-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Volanie. Reakcia?",
    visual: {
      kind: "call",
      caller: "HR — moja firma",
      number: "+421 2 ... (firemné ústredie)",
      hint: "HR pýta podpísať novú dohodu a posiela link na dokumenty cez interný portál.",
    },
    options: [
      ok("a", "Legit — moja firma, doménu portálu si overím cez intranet"),
      bad("b", "Vishing — HR nikomu nedôverujem", "minor"),
    ],
    explanation:
      "HR reálne volá zo firemného ústredia a posiela linky na interný portál. Pravidlo: doménu portálu si over v intranet záložkách / od kolegu. Vishing-HR by mal externú doménu typu `mojafirma-hr.online`.",
  },
  {
    id: "h-call-energy-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Volanie. Reakcia?",
    visual: {
      kind: "call",
      caller: "ZSE — zákaznícka linka",
      number: "0850 111 555",
      hint: "Avizujú výpadok elektriny v mojej oblasti dňa 30.04 (plánovaný odpočet/údržba).",
    },
    options: [
      ok("a", "Legit — ZSE 0850 číslo je oficiálne, len informačný hovor"),
      bad("b", "Vishing — energetické firmy sú scam", "minor"),
    ],
    explanation:
      "ZSE / SSE / VSE posielajú info o plánovaných výpadkoch cez 0850 čísla a SMS. Žiadne údaje sa nepýtajú. Vishing-energetik by pýtal číslo zmluvy + pohrozil odpojením, ak okamžite nezaplatím cez SMS-platbu.",
  },

  // 6× listings that look suspicious but are legitimate
  {
    id: "h-list-cheap-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Inzerát na Bazoš. Reakcia?",
    visual: {
      kind: "listing",
      site: "bazos.sk",
      title: "Auto Škoda Octavia 2018, 120 000 km — RÝCHLO",
      price: "8 500 EUR",
      location: "Bratislava — sťahujem sa do zahraničia",
      description:
        "Stav výborný, servisná knižka, 1 majiteľ. Predávam súrne kvôli sťahovaniu do Rakúska. Auto si môžete prísť pozrieť, kúpa cez kúpnopredajnú zmluvu na DI.",
    },
    options: [
      ok("a", "Legit — nízka cena má reálny dôvod (sťahovanie), platba klasicky pri prevode na DI"),
      bad("b", "Scam — všetko pod cenou je podvod", "minor"),
    ],
    explanation:
      "Sťahovanie do zahraničia je reálny dôvod pre nižšiu cenu. Legit signály: predávajúci ponúka osobnú obhliadku, kúpu cez DI, žiadnu zálohu vopred. Scam by tlačil na rezervačnú zálohu na účet pred obhliadkou.",
  },
  {
    id: "h-list-deceased-real-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Inzerát z dedičstva. Reakcia?",
    visual: {
      kind: "listing",
      site: "bazos.sk",
      title: "Vintage hodinky Omega Seamaster — z pozostalosti otca",
      price: "350 EUR",
      location: "Trnava — osobné prevzatie",
      description:
        "Otec zomrel, predávam jeho zbierku. Hodinky funkčné, originálna škatuľka. Cenu som dal nižšiu, lebo nemám prehľad o trhu. Stretnutie u mňa doma alebo v meste.",
    },
    options: [
      ok("a", "Legit — pozostalosť je reálny scenár, nízka cena má dôvod"),
      bad("b", "Scam — pozostalosť je vždy scam", "minor"),
    ],
    explanation:
      'Pozostalosti sa reálne predávajú, často pod cenou (pozostalí nemajú trhovú znalosť). Legit signály: osobné prevzatie, žiadna preprava cez kuriéra so zálohou. Scam-pozostalosť (najmä z UK/USA) by žiadal preposlať tovar cez „dôveryhodného agenta" za zálohu.',
  },
  {
    id: "h-list-rental-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Prenájom bytu — pôsobí podozrivo nízko. Reakcia?",
    visual: {
      kind: "listing",
      site: "nehnutelnosti.sk",
      title: "2-izbový byt 55 m² Petržalka",
      price: "550 EUR / mesiac",
      location: "BA — Petržalka, blízko Aupark",
      description:
        "Hľadáme dlhodobého nájomcu, byt po deduške, doplníme len pár vecí. Obhliadka tento týždeň. Zmluva cez realitnú kanceláriu Reality Plus.",
    },
    options: [
      ok("a", "Legit — pod-trh, ale s dôvodom (po deduške) + zmluva cez realitku"),
      bad("b", "Scam — byty pod 600 € sú scam", "minor"),
    ],
    explanation:
      'Byty po pozostalí v Petržalke sa reálne prenajímajú za 500–600 € (rodina nemá trhovú motiváciu). Legit signály: obhliadka pred zmluvou, zmluva cez registrovanú realitku, žiadna záloha vopred. Scam-byt by žiadal 1 nájom + depozit na účet ešte pred obhliadkou („som v zahraničí, kľúče pošlem kuriérom").',
  },
  {
    id: "h-list-pottery-real-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Inzerát s neobvykle nízkou cenou. Reakcia?",
    visual: {
      kind: "listing",
      site: "bazos.sk",
      title: "Modranská keramika — sada 6 ks z pozostalosti",
      price: "20 EUR",
      location: "Pezinok — osobné prevzatie",
      description:
        "Mama vyhadzuje, ja by som rád, aby to niekto využil. Sada talieriov mierny škrabanec. Iba osobne, ja nepošlem.",
    },
    options: [
      ok("a", "Legit — drobnosti z domova predávajú často symbolicky"),
      bad("b", "Scam — nízka cena = scam", "minor"),
    ],
    explanation:
      'Drobné domáce predmety sa reálne predávajú lacno, ľudia ich chcú dať preč skôr ako ich vyhodia. Legit signál: „iba osobne, nepošlem" = predávajúci nehrá s eskrowom ani prepravou.',
  },
  {
    id: "h-list-bike-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Inzerát bicykla — pôsobí súrne. Reakcia?",
    visual: {
      kind: "listing",
      site: "bazos.sk",
      title: "Horský bicykel CUBE Stereo 27.5 — kúpený 2022",
      price: "850 EUR",
      location: "Žilina — osobné prevzatie",
      description:
        "Predávam, lebo idem na štúdium do USA, do 14 dní. Originálna cena 2200 €, používaný ~10×. Stretnutie tento víkend, pri kúpe doklad o pôvode.",
    },
    options: [
      ok("a", "Legit — dôvod (odchod do USA) + osobné prevzatie + doklad"),
      bad("b", "Scam — všetko súrne je scam", "minor"),
    ],
    explanation:
      "Odchod do zahraničia je reálny urgentný dôvod predaja drahých vecí pod cenou. Legit signály: ponuka dokladu o pôvode (chráni kupujúceho pred kradnutým bicyklom), osobné prevzatie, jasná lokalita. Scam-súrne by chcel zálohu na rezerváciu pred obhliadkou.",
  },
  {
    id: "h-list-furniture-real-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Pohovka zadarmo. Reakcia?",
    visual: {
      kind: "listing",
      site: "bazos.sk",
      title: "ZADARMO sedacia súprava — odvoz dnes/zajtra",
      price: "0 EUR",
      location: "Bratislava — Dúbravka, 3. poschodie bez výťahu",
      description:
        "Sťahujeme sa, sedačku už nepotrebujeme. Odvoz si zariadi nový majiteľ. Stav slušný, mierne použitá.",
    },
    options: [
      ok("a", "Legit — nábytok zadarmo pri sťahovaní je bežné"),
      bad("b", "Scam — nič nie je zadarmo", "minor"),
    ],
    explanation:
      'Pri sťahovaní sa veci zadarmo dávajú bežne (lacnejšie ako odvoz na zberný dvor). Žiadna platba, žiadne osobné údaje. Scam by sa pýtal „odošlite 50 € za prípravu na odvoz cez kuriéra".',
  },

  // 6× SMS od appiek (Bolt/Wolt/Uber/Yango)
  {
    id: "h-sms-bolt-real-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Bolt",
      body: "Vodic Marek (BL-742EE) je 2 min od miesta vyzdvihnutia. Cena jazdy 6,80 EUR.",
    },
    options: [ok("a", "Áno — moja jazda, len info"), bad("b", "Nie — vyzerá podozrivo", "minor")],
    explanation:
      'Bolt posiela transakčné SMS o stave jazdy. Žiadny link, žiadna platba — kreditka už je v aplikácii. Bezpečné je platiť cez aplikáciu, nie hotovosťou (predíde sa „zmenenej trase" scamu vodiča).',
  },
  {
    id: "h-sms-wolt-real-1",
    category: "honeypot",
    difficulty: "easy",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Wolt",
      body: "Tvoj kurier prevzal objednavku z Hostinec U Lipy. Doruci do 22 minut.",
    },
    options: [
      ok("a", "Áno — moja objednávka, sleduje stav"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      'Wolt posiela stavové SMS. Žiadna akcia. Aplikácia je primárny kanál — ak ti príde SMS „Wolt: zaplaťte 0,5 € za doručenie cez link", je to phishing.',
  },
  {
    id: "h-sms-uber-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Uber",
      body: "Verifikacny kod: 4821. Nikomu ho neposielajte.",
    },
    options: [
      ok("a", "Áno — práve som sa prihlasoval do appky"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Uber posiela 2FA kód pri prihlásení. Pravidlo: ak kód príde a TY si sa neprihlasoval, niekto skúša ovládnuť tvoj účet — kód NEZADAJ a v aplikácii zmeň heslo.",
  },
  {
    id: "h-sms-yango-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Yango",
      body: "Tvoja jazda je dokoncena. Cena 5,40 EUR strhnuta z karty *6628. Hodnotenie v aplikacii.",
    },
    options: [
      ok("a", "Áno — moja jazda, beriem na vedomie"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      'Yango posiela transakčné SMS po jazde. Suma + posledné 4 čísla karty by mali sedieť s aplikáciou. Žiadny link, žiadna akcia. Phishing by mal „zaplaťte zvyšok 4 EUR cez link".',
  },
  {
    id: "h-sms-airbnb-real-1",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Airbnb",
      body: "Tvoja rezervacia HMA82B7K bola potvrdena. Detail v aplikacii.",
    },
    options: [
      ok("a", "Áno — moja rezervácia, otvorím appku ručne"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      'Airbnb potvrdzuje rezervácie cez SMS. Žiadny link, len ID rezervácie. Detail si pozri v aplikácii alebo na airbnb.com — phishing-Airbnb by mal link na fake login pre „verifikáciu".',
  },
  {
    id: "h-sms-applepay-real-1",
    category: "honeypot",
    difficulty: "hard",
    prompt: "Reagoval by si na túto SMS?",
    visual: {
      kind: "sms",
      sender: "Apple",
      body: "Apple ID Verification Code: 728193. Nezdielajte. Platnost 10 min.",
    },
    options: [
      ok("a", "Áno — práve sa prihlasujem na novom MacBooku"),
      bad("b", "Nie — vyzerá podozrivo", "minor"),
    ],
    explanation:
      "Apple posiela 6-miestne 2FA kódy pri prihlasovaní na nové zariadenie. Žiadny link. Pravidlo: ak kód príde a TY sa neprihlasuješ, NIEKTO skúša ovládnuť tvoje Apple ID — okamžite zmeň heslo cez appleid.apple.com.",
  },

  // ============ E10 — Pig butchering + malvertising + crypto recovery (IOCTA 2025/2026) ============

  // ----- Pig butchering (8 questions) -----
  {
    id: "s-pig-contact-1",
    category: "scenario",
    difficulty: "easy",
    prompt:
      'Na WhatsApp ti príde správa: „Ahoj Miro, posielam číslo od Tomáša, ale možno som sa pomýlil — ospravedlňujem sa!" Neznáme zahraničné číslo. Čo urobíš?',
    options: [
      bad("a", "Odpoviem — to sa stáva, môže to byť zaujímavý človek", "critical"),
      ok("b", 'Správu ignorujem alebo odpoviem iba „Zlé číslo" a nič viac'),
      bad("c", "Odpovedám a pýtam sa kde vzal moje číslo", "medium"),
    ],
    explanation:
      '„Omylom" správa od cudzinca je klasický štart pig butchering podvodu. Útočník cielene skúša čísla — neexistuje náhodný omyl. Akákoľvek odpoveď otvára konverzáciu a potenciálne týždne manipulácie.',
  },
  {
    id: "s-pig-video-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      'Cudzinec ti píše na WhatsApp už 3 týždne, každý deň. Ponúka video hovor, ale vždy ho odkladá — „zlé spojenie", „pracovné stretnutie". Tvoja reakcia?',
    options: [
      bad("a", "Viem, že má rušnú prácu — je to vážny človek", "critical"),
      ok("b", "Bez živého videohovoru nedôverujem tejto osobe a finančné témy odmietam"),
      bad("c", "Pošlem mu najprv malú sumu — overí sa tým jeho zámer", "critical"),
    ],
    explanation:
      'Útočníci pig butchering schémy sa systematicky vyhýbajú videohvoru — ich „tvár" je ukradnutá z internetu. Tri týždne putovania bez jediného živého kontaktu je silný signál. Finančná transakcia, nech je akokoľvek malá, je vstupná brána do podvodu.',
  },
  {
    id: "s-pig-platform-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      'Nový online "priateľ" ti odporučil investičnú platformu s odkazom, kde jeho portfólio vzrástlo o 180 % za 2 mesiace. Čo kontroluješ pred registráciou?',
    options: [
      bad("a", "Nič — ak mu to funguje, prečo nie mne", "critical"),
      ok("b", "Overím platformu v registri NBS / ESMA — či má licenciu na Slovensku"),
      bad("c", "Investujem malú sumu a uvidím", "critical"),
    ],
    explanation:
      "Každý, kto ponúka investičné poradenstvo v SR, musí byť registrovaný v NBS (nbs.sk → Dohľad → Registre). Ak platforma v registri nie je, je nelegálna. 180 % za 2 mesiace je matematicky nemožný legitímny výnos.",
  },
  {
    id: "p-pig-platform-url-1",
    category: "url",
    difficulty: "medium",
    prompt:
      'Priateľ z internetu ti poslal link na „overenú" investičnú platformu. Je táto URL v poriadku?',
    visual: { kind: "url", url: "https://sk-invest-global-trade.com/dashboard", secure: true },
    options: [
      bad("a", "Áno — HTTPS a slovenský prefix sú dobré signály", "critical"),
      ok("b", "Nie — žiadna regulovaná inštitúcia nemá takúto doménu"),
    ],
    explanation:
      'Regulované investičné platformy sú buď priamo na doméne brokera (napr. xtb.com, portu.sk) alebo banky. Generické domény s „invest", „global", „trade" sú typický pig butchering scam. HTTPS nezaručuje, že stránka je legitímna.',
  },
  {
    id: "s-pig-withdraw-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      'Chceš vybrať "zisky" z online investičnej platformy. Platforma hovorí: „Pred výplatou 9 200 € musíte uhradiť daňovú zálohu 15 % (1 380 €) kryptomenou." Čo urobíš?',
    options: [
      bad("a", "Zaplatím — chcem dostať zisky", "critical"),
      ok("b", "Odmieta — toto je podvod, zálohu na daň pred výberom nikdy neplatím"),
      bad("c", "Zaplatím polovicu a uvidím", "critical"),
    ],
    explanation:
      "Toto je posledná fáza pig butchering: peniaze na platforme sú fiktívne, záloha je reálna strata. Regulovaná platforma NIKDY nevyžaduje daňovú zálohu pred výberom a vôbec nie v kryptomenách. Daň z investičného zisku platieb SR daňovnímu úradu — až po prijatí peňazí, nie pred.",
  },
  {
    id: "f-pig-fake-1",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt: "Ktorý z týchto znakov naznačuje pig butchering (NIE legitímnu investičnú platformu)?",
    options: [
      ok(
        "a",
        'Prvý kontakt bol „omylná" správa od cudzinca, potom romantické záujmy, potom investičná ponuka',
      ),
      bad("b", "Platforma je registrovaná v NBS a má bankový prevod ako možnosť vkladu", "minor"),
      bad("c", "Broker ponúka video konzultáciu s licencovaným poradcom na Slovensku", "minor"),
    ],
    explanation:
      "Legitímna platforma nikdy nezačína cez osobný romantický záujem a nikdy nefunguje výlučne cez odkaz od jednej osoby. Pig butchering je komplexná sociálna manipulácia, nie len investičná reklama.",
  },
  {
    id: "s-crypto-recovery-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      'Po strate 4 000 € na falošnej investičnej platforme ti na Facebooku napíše: „Pomáhame obetiam podvodov získať kryptomeny späť — 80 % úspešnosť, poplatok iba po vrátení." Reaguješ?',
    options: [
      bad("a", "Áno — nič nestrácam, poplatok platím až po vrátení", "critical"),
      ok("b", "Nie — recovery scam je ďalší podvod na obetí predchádzajúceho"),
      bad("c", "Pošlem malú sumu ako test — ak vráti, pošlem viac", "critical"),
    ],
    explanation:
      'Crypto recovery scam cieli priamo na obete predchádzajúcich podvodov. Útočníci vedia o tvojej strate (kupujú databázy obetí) a sľubujú „vrátenie" za poplatok. Ak zaplatíš, prídu ďalšie poplatky. Peniaze stratiť sa prakticky nedajú vrátiť technicky — kontaktuj políciu SR (158) a podaj trestné oznámenie, nie platené recovery firmy.',
  },
  {
    id: "s-pig-social-1",
    category: "scenario",
    difficulty: "easy",
    prompt:
      'Neznámy kontakt na Instagrame ti posiela správy 2 týždne — zaujíma sa o teba, komentuje fotky, pýta na prácu. Potom zmení tému: „Kamoška zarobila 5 000 € cez platformu, ukážem ti." Čo to je?',
    options: [
      bad("a", "Možno naozaj chce pomôcť — spýtam sa viac", "critical"),
      ok("b", "Pig butchering — budovanie dôvery pred investičným podvodom"),
      bad("c", "Multilevel marketing — budem opatrný, ale vypočujem si", "medium"),
    ],
    explanation:
      "Sociálna platforma (Instagram, TikTok, Tinder) + neznámý záujem + niekoľko týždňov budovania vzťahu + náhla zmena na investičnú tému = pig butchering. Kamoška, ktorá zarobila, je súčasť scenáru — neexistuje alebo je tiež obeť.",
  },

  // ----- Malvertising — fake Google / Meta ads (6 questions) -----
  {
    id: "u-malvad-bank-1",
    category: "url",
    difficulty: "easy",
    prompt:
      'Hľadaš „tatra banka prihlasenie" na Google. Prvý výsledok má štítok „Sponzorované" a URL je táto. Klikneš?',
    visual: { kind: "url", url: "https://tatrabanka-prihlasenie.sk/ib/login", secure: true },
    options: [
      bad("a", "Áno — prvý výsledok vo vyhľadávači je vždy správny", "critical"),
      ok("b", "Nie — pravá doména je tatrabanka.sk, nie tatrabanka-prihlasenie.sk"),
    ],
    explanation:
      "Malvertising = útočníci platia za Google reklamu s falošnou doménou. tatrabanka-prihlasenie.sk je samostatná doména, nie subdoména banky. Tatra banka používa výlučne tatrabanka.sk a jej subdomény (napr. tb.tatrabanka.sk). Prihlasovanie záložkou je vždy bezpečnejšie ako Google.",
  },
  {
    id: "u-malvad-bank-2",
    category: "url",
    difficulty: "easy",
    prompt:
      'Vo výsledkoch Google vidíš reklamu „VÚB Internetbanking — Prihlásenie". URL v reklame je táto. Je v poriadku?',
    visual: { kind: "url", url: "https://vub-banking.online/prihlasenie", secure: true },
    options: [
      bad("a", "Áno — VÚB je tam uvedená, určite je to ich stránka", "critical"),
      ok("b", "Nie — VÚB je na vub.sk, nie vub-banking.online"),
    ],
    explanation:
      "Zobrazený text reklamy môže hovoriť čokoľvek — kľúčová je doména v URL. vub-banking.online nie je VÚB banka. Pravá VÚB = vub.sk. HTTPS a zelený zámok nie sú dokladom autenticity — sú bežné aj na phishingových stránkach.",
  },
  {
    id: "u-malvad-m365-1",
    category: "url",
    difficulty: "medium",
    prompt:
      "Bing ti ako sponzorovaný výsledok zobrazí prihlasovanie do Microsoft 365 na tejto adrese. Prihlósiš sa?",
    visual: { kind: "url", url: "https://microsoft365-sk.login-secure.com/oauth2", secure: true },
    options: [
      bad("a", "Áno — vidím Microsoft v adrese aj HTTPS", "critical"),
      ok("b", "Nie — pravý M365 login je login.microsoftonline.com, nie login-secure.com"),
    ],
    explanation:
      'Microsoft 365 autentifikácia prebieha výlučne na login.microsoftonline.com alebo login.microsoft.com. Akákoľvek iná doména s kľúčovým slovom „microsoft" v texte je phishing. Útočník zaplatil za reklamu na Bing — spamovanie reklámnych sietí falošnými loginmi je bežná taktika.',
  },
  {
    id: "s-malvad-invest-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      'Na Facebooku vidíš reklamu: „Slovenská sporiteľňa — krypto portál pre klientov SR. Garantovaný výnos 12 % mesačne." Čo s tým?',
    options: [
      bad("a", "Kliknem — SLSP je dôveryhodná banka, to musí byť legitímne", "critical"),
      ok("b", "Ignorujem — garantovaný výnos je zákonom zakázaný a SLSP krypto portál nemá"),
      bad("c", "Registrujem sa s malou sumou — uvidím", "critical"),
    ],
    explanation:
      "SLSP (ani žiadna regulovaná banka) nesmie garantovať výnos — to je porušenie zákona o cenných papieroch. SLSP krypto portál na rok 2026 neprevádzkuje. Reklama na sociálnej sieti s takýmto obsahom je vždy podvod — nahlás ju Facebooku aj NBS.",
  },
  {
    id: "h-malvad-legit-1",
    category: "honeypot",
    difficulty: "medium",
    prompt:
      'Vo výsledkoch Google vidíš reklamu „ČSOB — Prihlásenie do George". URL v reklamnom odkaze ukazuje na csob.sk. Prihlósiš sa?',
    visual: { kind: "url", url: "https://csob.sk/george/login", secure: true },
    options: [
      ok("a", "Áno — csob.sk je pravá doména ČSOB"),
      bad("b", "Nie — reklamy sú vždy nebezpečné", "minor"),
    ],
    explanation:
      "Reklamy NIE SÚ vždy nebezpečné — nebezpečná je falošná doména. csob.sk je legitímna doména ČSOB. Kľúčové pravidlo: skontroluj doménu v URL, nie len vizuálny štítok reklamy. Ak doména sedí, reklama môže byť bezpečná.",
  },
  {
    id: "s-malvad-google-habit-1",
    category: "scenario",
    difficulty: "easy",
    prompt:
      "Ako si najlepšie zabezpečiť, že nikdy neklikneš na falošnú Google reklamu na bankové prihlásenie?",
    options: [
      bad("a", "Používam vždy Google — rýchlo nájdem čo potrebujem", "medium"),
      ok("b", "Uložím si prihlasovanie do záložiek prehliadača a tieto záložky vždy používam"),
      bad("c", 'Kontrolujem vždy, či reklama má štítok „Sponzorované" — také preskočím', "minor"),
    ],
    explanation:
      'Záložka (bookmark) v prehliadači je najbezpečnejší spôsob — priamo zasiane do prehliadača, nedá sa sfalšovať reklamou. Preskakovanie „Sponzorovaných" výsledkov je dobré, ale nie dostatočné — útočníci platia aj za organické SEO pozície.',
  },
  // ============ E37 — DB-backed pack questions (ported 2026-06-12) ============
  // These 30 questions were authored directly in the DB by the E37 unified
  // migration (20260521280000) for the 6 newer packs (heslo-2fa, ai-deepfake,
  // socialne-siete, rodicia, skoly, zdravotnictvo) and never existed in this
  // bank. The composer, ?config= share URLs and /api/test-sets validation all
  // resolve against THIS file, so the rows are ported here verbatim (prompt,
  // options, visual, severity) with locally-authored explanations. Their DB
  // UUIDs were minted from original slugs that were never recorded, so the
  // uuid<->id bridge lives in an explicit map: src/lib/quiz/bank/db-ids.ts.
  {
    id: "e37-2fa-recovery-email-1",
    category: "phishing",
    difficulty: "medium",
    prompt:
      "Príde ti e-mail z poštovej schránky: „Niekto sa pokúsil obnoviť vaše heslo. Ak ste to neboli vy, kliknite sem a okamžite zabezpečte účet.” Reaguješ?",
    visual: {
      kind: "email",
      from: "Google Bezpečnosť",
      fromEmail: "no-reply@account-security-notice.com",
      subject: "Pokus o obnovenie hesla — okamžitá akcia",
      body: "Zaznamenali sme pokus o obnovenie hesla k vášmu účtu z adresy IP v Moldavsku. Ak ste to neboli vy, kliknite na tlačidlo nižšie a okamžite zabezpečte účet.",
    },
    options: [
      bad("a", "Kliknem na tlačidlo „Zabezpečiť účet” — chcem reagovať rýchlo", "critical"),
      ok("b", "Otvorím Gmail/Outlook ručne v prehliadači a skontrolujem aktivitu prihlásení"),
      bad("c", "Odpoviem na e-mail, že to nebol som ja", "medium"),
    ],
    explanation:
      "Útočník sám spustí „obnovenie hesla” a pošle ti falošný „zabezpečovací” link — `account-security-notice.com` nie je doména Googlu. Aktivitu prihlásení kontroluj vždy priamo v účte, nie cez link z e-mailu.",
  },
  {
    id: "e37-2fa-passkey-vs-sms-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Pri prihlásení do internet bankingu si zadal heslo. Banka ti ponúka dva spôsoby druhého overenia. Ktorý je bezpečnejší voči phishing stránke, ktorá vyzerá rovnako ako tvoja banka?",
    options: [
      bad("a", "SMS kód — vidím čo zadávam a môžem ho skontrolovať", "critical"),
      ok("b", "Passkey alebo Face ID/Touch ID na telefóne"),
      bad("c", "Obe sú rovnako bezpečné, ide len o pohodlie", "critical"),
    ],
    explanation:
      "SMS kód vieš omylom zadať aj na phishingovej kópii banky — útočník ho v reálnom čase prepošle ďalej. Passkey je kryptograficky viazaný na pravú doménu, na falošnej stránke jednoducho nefunguje.",
  },
  {
    id: "e37-2fa-hibp-fake-1",
    category: "url",
    difficulty: "medium",
    prompt:
      "Vidíš reklamu: „Vaše heslo bolo uniknuté pri úniku z LinkedIn. Skontrolujte si to na haveibeenpwned.help.” Klikneš a zadáš svoje heslo na overenie?",
    visual: {
      kind: "url",
      url: "https://haveibeenpwned.help/check?utm=ad",
    },
    options: [
      bad("a", "Áno — chcem zistiť, či som postihnutý", "critical"),
      ok("b", "Nie — pravá služba je haveibeenpwned.com a NIKDY nepýta heslo, len e-mail"),
      bad("c", "Zadám len e-mail bez hesla, to je bezpečné", "minor"),
    ],
    explanation:
      "Pravá služba je `haveibeenpwned.com` a pýta len e-mail, nikdy heslo. Stránka, ktorá chce heslo „na overenie úniku”, ho práve zbiera.",
  },
  {
    id: "e37-2fa-credential-stuffing-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Pred rokom unikla databáza fóra, kde si používal rovnaké heslo ako do banky. Dnes banka odmietla tvoje prihlásenie a poslala SMS: „Prihlásenie z neznámeho zariadenia (Sofia, BG)”. Čo sa stalo?",
    options: [
      bad("a", "Banka má bezpečnostný problém, počkám pár dní", "critical"),
      ok(
        "b",
        "Útočník skúsil môj e-mail + heslo z úniku aj v banke (credential stuffing). Okamžite zmením heslo a zapnem 2FA",
      ),
      bad("c", "Niekto si len pomýlil prihlasovacie údaje", "critical"),
    ],
    explanation:
      "Credential stuffing: e-mail + heslo z úniku fóra útočník skúša vo všetkých službách. Preto sa heslá nikdy neopakujú — okamžite ho zmeň a zapni 2FA.",
  },
  {
    id: "e37-2fa-oauth-consent-1",
    category: "phishing",
    difficulty: "hard",
    prompt:
      "Po kliknutí na link v e-maili sa zobrazí Google prihlásenie. Prihlásiš sa a Google ukáže obrazovku: „Aplikácia EmailHelper chce: čítať vaše e-maily, posielať e-maily vo vašom mene, spravovať kontakty.” Schvalíš?",
    options: [
      bad("a", "Áno — vyzerá to ako oficiálna Google obrazovka", "critical"),
      ok("b", "Nie — žiadna seriózna aplikácia nepotrebuje plný prístup k mojím e-mailom"),
      bad(
        "c",
        "Áno, ale len pre čítanie — Google mi dovolí vybrať len niektoré oprávnenia",
        "critical",
      ),
    ],
    explanation:
      "OAuth consent phishing: prihlasovacia obrazovka je pravá Google, ale plný prístup k e-mailom a odosielaniu „vo tvojom mene” dáva útočníkovi kontrolu nad schránkou bez hesla. Oprávnenia čítaj vždy.",
  },
  {
    id: "e37-2fa-banking-popup-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Pracuješ v internet bankingu Tatra banky. Zrazu sa otvorí okno: „Vaše prihlásenie vypršalo. Pre pokračovanie sa znovu prihláste.” Pole na heslo je hneď v popupe. Zadáš heslo?",
    visual: {
      kind: "url",
      url: "https://moja.tatrabanka.sk/...",
      secure: true,
    },
    options: [
      bad("a", "Áno — chcem pokračovať s prácou", "critical"),
      ok(
        "b",
        "Zatvorím okno, obnovím stránku (F5) a prihlásim sa cez bežnú prihlasovaciu obrazovku banky",
      ),
      bad("c", "Otvorím inú záložku a zadám tam heslo do banky", "minor"),
    ],
    explanation:
      "Popup s políčkom na heslo uprostred prihlásenej relácie je typický overlay útok (malvér alebo škodlivé rozšírenie). Banka ťa pri vypršaní vráti na štandardnú prihlasovaciu obrazovku — heslo zadávaj len tam.",
  },
  {
    id: "e37-2fa-bitwarden-alert-1",
    category: "honeypot",
    difficulty: "medium",
    prompt:
      "Príde ti e-mail z Bitwarden: „Nová prihlasovacia aktivita: zariadenie Pixel 7, lokalita Bratislava, čas 14:23.” Tento týždeň si práve nastavil Bitwarden na novom telefóne. Reaguješ?",
    visual: {
      kind: "email",
      from: "Bitwarden",
      fromEmail: "no-reply@bitwarden.com",
      subject: "Nová prihlasovacia aktivita",
      body: "Zaznamenali sme prihlásenie z nového zariadenia. Zariadenie: Pixel 7. Lokalita: Bratislava, SK. Čas: 14:23 SEČ. Ak ste to neboli vy, navštívte Bitwarden a zmente master password.",
    },
    options: [
      bad("a", "Toto je phishing — ignorujem a mažem", "minor"),
      ok(
        "b",
        "Skontrolujem v Bitwarden aplikácii (Settings → Devices) — ak sa zariadenie zhoduje, OK; ak nie, zmením master password",
      ),
      bad("c", "Kliknem na link v e-maili a overím, či je to moje zariadenie", "critical"),
    ],
    explanation:
      "Notifikácia sedí s tvojou skutočnou aktivitou a `no-reply@bitwarden.com` je pravá doména — správnosť ale over v aplikácii (Settings → Devices), nie klikom na link. Aj pravý formát e-mailu sa dá napodobniť.",
  },
  {
    id: "e37-ai-spear-invoice-1",
    category: "phishing",
    difficulty: "hard",
    prompt:
      "Príde ti e-mail s predmetom „Projekt Atlas — finálna verzia faktúry”. V tele sa odvoláva na minulotýždňový workshop, na ktorom si bol, a na pravého kolegu Jana Nováka. Príloha: faktura_atlas.pdf. Otvoríš prílohu?",
    visual: {
      kind: "email",
      from: "Jana Nováková",
      fromEmail: "jana.novakova@atlas-projekt-2026.com",
      subject: "Projekt Atlas — finálna verzia faktúry",
      body: "Ahoj, posielam finálnu faktúru za workshop, ktorý sme robili minulý týždeň v Bratislave (15.05.). Pripomínam, že platba je do konca mesiaca. Ďakujem, Jana",
    },
    options: [
      bad("a", "Áno — kontext sedí, e-mail pôsobí autenticky", "critical"),
      ok(
        "b",
        "Napíšem Janovi na Slack/Teams (nie odpovedať na e-mail) a opýtam sa, či mi posielal faktúru",
      ),
      bad(
        "c",
        "Otvorím prílohu cez Google Drive preview — to je bezpečnejšie ako stiahnuť",
        "medium",
      ),
    ],
    explanation:
      "AI spear-phishing skladá presný kontext (workshop, mená kolegov) z LinkedIn a webu firmy. Kontext už nie je dôkaz pravosti — prílohy over cez nezávislý kanál (Slack/Teams), nie odpoveďou na e-mail.",
  },
  {
    id: "e37-ai-trading-bot-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      "Vidíš reklamu na Instagrame: „AI trading bot — 12 % mesačný výnos garantovaný. Náš ChatGPT-poháňaný algoritmus už zarobil 4 000 € pre 12 000 Slovákov.” Klikneš?",
    options: [
      bad("a", "Áno — 12 000 overeným Slovákom by som mohol dôverovať", "critical"),
      ok(
        "b",
        "Nie — garantovaný výnos je vždy investičný podvod. Žiadny algoritmus, ani AI, nemá garantovaný zisk",
      ),
      bad("c", "Áno, ale vložím len 50 € ako test — keď to funguje, pridám viac", "critical"),
    ],
    explanation:
      "„Garantovaný výnos” neexistuje — to je definícia investičného podvodu a AI marketing na tom nič nemení. Aj „test s 50 €” ťa dostane do ich systému a nasleduje nátlak na vyšší vklad.",
  },
  {
    id: "e37-ai-dating-profile-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      "Na zoznamke matchneš s profilom: dokonalá tvár, 28 rokov, ostré detaily. V albume sú 3 fotky v rovnakom svetle bez akýchkoľvek záberov zo života (s rodinou, kamarátmi, z dovolenky). Reaguješ?",
    options: [
      bad("a", "Začnem si písať — profil je pekný a pôsobí dôveryhodne", "critical"),
      ok(
        "b",
        "Reverse image search cez Google Lens / Bing. Skontrolujem znaky AI generovania (asymetrické uši, anomálie v pozadí). Ak fotka nikde inde nie je — blokujem",
      ),
      bad("c", "Požiadam o video hovor — to dokáže, že je skutočný", "minor"),
    ],
    explanation:
      "AI generovaný profil: dokonalá tvár, rovnaké svetlo, žiadne zábery zo života. Video hovor už nestačí — deepfake beží aj naživo. Reverse image search a anomálie (uši, pozadie) sú spoľahlivejší filter.",
  },
  {
    id: "e37-ai-voice-extortion-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Príde ti správa s audio nahrávkou. Hlas, ktorý znie ako ty, hovorí kompromitujúce vety. Útočník píše: „Pošli 500 € v Bitcoine alebo nahrávku zverejním tvojim kontaktom.” Hlas znie skutočne. Zareaguješ?",
    options: [
      bad("a", "Zaplatím — nahrávka znie príliš autenticky, môže to byť reálne", "critical"),
      ok(
        "b",
        "Neplatím. Hlas mohol byť klonovaný z mojich verejných videí (TikTok, IG, voicemail). Nahlásim na polícii (kybernetická kriminalita) a zablokujem",
      ),
      bad(
        "c",
        "Odpoviem útočníkovi a požiadam o ukážku celej nahrávky, aby som overil",
        "critical",
      ),
    ],
    explanation:
      "Hlas sa dá naklonovať z pár sekúnd verejného videa. Platba ani komunikácia s vydieračom nič nezastavia — ulož dôkazy, blokuj a nahlás kybernetickú kriminalitu polícii.",
  },
  {
    id: "e37-soc-meta-business-1",
    category: "phishing",
    difficulty: "hard",
    prompt:
      "Tvoja FB stránka má 12 000 sledovateľov. Príde DM od „Meta Business Help”: „Vaša stránka porušila pravidlá. Odvolajte sa do 24h, inak ju zrušíme.” Odkaz: https://meta-business-appeal.com/verify. Klikneš a prihlásiš sa?",
    visual: {
      kind: "url",
      url: "https://meta-business-appeal.com/verify",
    },
    options: [
      bad("a", "Áno — 24h je málo času, musím konať", "critical"),
      ok(
        "b",
        "Nie — Meta ti správy o porušení posiela do Quality / Page Support priamo v Business Suite, nie cez DM. Skontrolujem tam",
      ),
      bad("c", "Zatelefonujem na číslo z DM, aby som overil", "critical"),
    ],
    explanation:
      "Meta neposiela upozornenia o porušení pravidiel cez DM — nájdeš ich priamo v Business Suite (Page Support). `meta-business-appeal.com` je phishingová doména na krádež admin prístupu.",
  },
  {
    id: "e37-soc-ig-help-center-1",
    category: "phishing",
    difficulty: "medium",
    prompt:
      "Dostaneš DM na Instagrame od účtu „instagram_help_center”: „Váš účet porušil naše pravidlá. Odvolajte sa cez tento formulár, inak váš účet zrušíme.” Link vedie na stránku, kde sa máš prihlásiť cez svoje IG údaje. Čo urobíš?",
    visual: {
      kind: "url",
      url: "https://instagram-appeal-form.online/verify",
    },
    options: [
      bad("a", "Vyplním formulár — nechcem stratiť účet", "critical"),
      ok(
        "b",
        "Nahlásim DM ako spam, zablokujem účet. Skutočné Instagram správy o porušení nájdem v Settings → Account Status, nie cez DM",
      ),
      bad("c", "Odpoviem na DM s otázkou na detail porušenia", "medium"),
    ],
    explanation:
      "Instagram ti oznámenia o porušení zobrazuje v Settings → Account Status, nikdy cez DM od „help center” účtu. Formulár chce len tvoje prihlasovacie údaje.",
  },
  {
    id: "e37-soc-telegram-invest-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      "Niekto ťa pridal do Telegram skupiny „Investovanie SK — premium 2026”. Vidíš screenshoty zárobkov, „mentor” Andrew ponúka VIP signály za 200 € a 80 členov píše, ako už zarobili. Reakcia?",
    options: [
      bad("a", "Zaplatím 200 € — 80 ľudí potvrdzuje, že to funguje", "critical"),
      ok(
        "b",
        "Opustím skupinu a nahlásim ju ako spam. 80 „nadšených členov” sú platení boti alebo komparzisti, classic pig-butchering",
      ),
      bad("c", "Napíšem mentorovi súkromne, aby som zistil viac", "critical"),
    ],
    explanation:
      "Pig-butchering: screenshoty zárobkov a desiatky „spokojných členov” sú boti alebo komparz. Nikto cudzí ťa nepridáva do skupiny preto, aby ti zarobil peniaze.",
  },
  {
    id: "e37-soc-fb-ad-eshop-1",
    category: "url",
    difficulty: "medium",
    prompt:
      "Vidíš sponzorovanú reklamu na FB: „Slovenská pošta výpredaj — Apple Watch za 49 €. Posledných 100 ks.” Doména v URL: slovenska-posta-shop.online. Platba kartou. Objednáš?",
    visual: {
      kind: "url",
      url: "https://slovenska-posta-shop.online/apple-watch-49",
    },
    options: [
      bad("a", "Áno — 49 € za hodinky je super deal, riskujem", "critical"),
      ok(
        "b",
        "Nie — pravá Slovenská pošta nepredáva Apple Watch a doména .online je červená vlajka. Reklamu nahlásim FB ako podvod",
      ),
      bad("c", "Skontrolujem recenzie eshopu — ak sú dobré, objednám", "medium"),
    ],
    explanation:
      "Slovenská pošta nepredáva elektroniku a „posledných 100 ks” je nátlak na rýchlu platbu. Falošný e-shop má aj falošné recenzie — `*.online` klon štátnej značky rovno nahlás.",
  },
  {
    id: "e37-soc-messenger-kod-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      "Na Messengeri ti píše kamarát: „Ahoj, omylom som zadal tvoje číslo pri registrácii. Príde ti SMS s kódom, môžeš mi ho preposlať? Vďaka.” Kód príde. Pošleš?",
    visual: {
      kind: "sms",
      sender: "Google",
      body: "Váš overovací kód: 884213. Nikomu ho neposielajte.",
    },
    options: [
      bad("a", "Áno — kamarát potrebuje pomoc, nič ma to nestojí", "critical"),
      ok(
        "b",
        "Zatelefonujem kamarátovi cez bežné číslo (nie Messenger) a overím. SMS kód je pravdepodobne moje vlastné 2FA — útočník hackol jeho účet",
      ),
      bad("c", "Pošlem kód, ale dopíšem „len pre tebe, nedávaj ďalej”", "critical"),
    ],
    explanation:
      "Účet kamaráta je hacknutý a kód, ktorý ti prišiel, je tvoje vlastné 2FA — preposlaním odovzdáš svoj účet. Over hlasom cez bežný telefonát, nie cez Messenger.",
  },
  {
    id: "e37-soc-fb-2fa-mail-1",
    category: "honeypot",
    difficulty: "medium",
    prompt:
      "Príde ti e-mail z Facebook (security@facebookmail.com): „Práve si zapol dvojfaktorové overenie. Ak si to nebol ty, klikni sem.” Pred 5 minútami si naozaj 2FA zapínal. Reaguješ?",
    visual: {
      kind: "email",
      from: "Facebook",
      fromEmail: "security@facebookmail.com",
      subject: "Dvojfaktorové overenie zapnuté",
      body: "Práve si na svojom Facebook účte zapol dvojfaktorové overenie. Ak si to nebol ty, klikni sem a okamžite zabezpečte svoj účet.",
    },
    options: [
      bad("a", "Toto je phishing — útočníci ma chcú odvrátiť. Mažem", "minor"),
      ok(
        "b",
        "E-mail z @facebookmail.com je legitímny. Skontrolujem v FB → Settings → Security, či sa zhoduje. Ak áno, OK",
      ),
      bad("c", "Pre istotu kliknem na link v e-maili, aby som potvrdil", "critical"),
    ],
    explanation:
      "`security@facebookmail.com` je skutočná odosielacia doména Facebooku a e-mail sedí s akciou, ktorú si práve urobil. Aj tak over v nastaveniach účtu — klik na link v e-maili nie je nikdy nutný.",
  },
  {
    id: "e37-rod-sextortion-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Tvoja 14-ročná dcéra ti vystrašene ukáže e-mail: „Máme tvoje intímne fotky. Pošli 200 € v Bitcoine, inak ich rozošleme tvojim kontaktom z Instagramu.” Vraj nikomu fotky neposlala. Čo robíš?",
    visual: {
      kind: "email",
      from: "Anonym",
      fromEmail: "anonym-247@proton.me",
      subject: "Posledné varovanie",
      body: "Máme tvoje intímne fotky. Máš 48 hodín. 200 € v Bitcoine na adresu: bc1q... Inak fotky rozošleme všetkým tvojim kontaktom na Instagrame.",
    },
    options: [
      bad("a", "Zaplatíme — chceme to mať z hlavy a nechceme, aby sa rozšírilo", "critical"),
      ok(
        "b",
        "Neplatíme. 99 % sextortion e-mailov je len strašenie bez reálnych fotiek. Uložíme dôkaz (screenshot), nahlásime na Internet hotline (Zodpovedne.sk) a polícii",
      ),
      bad("c", "Odpovieme útočníkovi, že to nahlásime, nech vie", "critical"),
    ],
    explanation:
      "Hromadný sextortion bluf — fotky takmer nikdy neexistujú a platba len potvrdí, že adresa žije. Ulož dôkazy, nahlás cez Zodpovedne.sk (Internet hotline) a polícii; dieťa potrebuje podporu, nie výsluch.",
  },
  {
    id: "e37-rod-grooming-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      "Pri kontrole dcérinho IG vidíš nové sledovanie: profil „Mia_13_BA”. V DM píše tvojej dcére: „Kde chodíš do školy? Bývam v Petržalke, môžeme sa stretnúť po vyučovaní.” Reaguješ?",
    options: [
      bad("a", "Necháme to byť — deti sa online spoznávajú, je to bežné", "critical"),
      ok(
        "b",
        "Profil nahlásime IG (kategória: predator / grooming), zablokujeme. Pravdepodobne dospelý predátor sa vydáva za dieťa. Porozprávame sa s dcérou o stretnutiach z internetu",
      ),
      bad("c", "Napíšem samej Mii súkromne, kto je a odkiaľ pozná moju dcéru", "critical"),
    ],
    explanation:
      "Dospelý predátor sa bežne vydáva za rovesníka — otázky na školu a návrh stretnutia sú typické grooming kroky. Nahlás profil, blokuj a otvor s dieťaťom tému stretnutí z internetu.",
  },
  {
    id: "e37-rod-family-link-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Pri kontrole router logu vidíš, že tvoj 13-ročný syn používa druhý Google účet (firmaXYZ@gmail.com), na ktorý sa nevzťahuje vaša Family Link kontrola. Akcia?",
    options: [
      bad("a", "Nič — chce súkromie, chápem", "critical"),
      ok(
        "b",
        "Pokojne sa s ním porozprávame. Family Link sa dá obísť, no dôvody (čas a obsah), prečo ho používame, sú dôležitejšie ako nástroj. Dohodneme nové pravidlá",
      ),
      bad("c", "Okamžite mu zatvoríme Wi-Fi pre tablet, nech vie, čo to znamená", "minor"),
    ],
    explanation:
      "Technická kontrola sa vždy dá obísť — druhý účet je signál, že pravidlám nerozumie alebo mu nevyhovujú. Trest bez rozhovoru ho naučí len lepšie sa skrývať.",
  },
  {
    id: "e37-rod-disney-sms-1",
    category: "phishing",
    difficulty: "medium",
    prompt:
      "Príde ti SMS: „Vaše dieťa Lucia vyhralo víkend v Disneylandu Paris! Aktivujte vstupenku do 24h, inak prepadne: bit.ly/disney-prize-sk”. Reaguješ?",
    visual: {
      kind: "sms",
      sender: "Disney-SK",
      body: "Vaše dieťa Lucia vyhralo víkend v Disneylandu Paris! Aktivujte vstupenku do 24h, inak prepadne:",
      link: "https://bit.ly/disney-prize-sk",
    },
    options: [
      bad("a", "Áno — meno dcéry sedí, nemám čo stratiť, ide o výhru", "critical"),
      ok(
        "b",
        "Nie — meno dcéry je zo môjho verejného FB profilu. Disney súťaže neoznamuje cez SMS s bit.ly linkom. SMS nahlásim ako podvod (operátor) a polícii",
      ),
      bad("c", "Pošlem link manželovi/manželke, nech sa pozrie", "minor"),
    ],
    explanation:
      "Meno dieťaťa útočník vyčítal z verejných profilov — personalizácia nie je dôkaz. Skutočné súťaže neoznamujú výhru cez SMS s `bit.ly` linkom a 24-hodinový deadline je klasický nátlak.",
  },
  {
    id: "e37-sko-edupage-1",
    category: "phishing",
    difficulty: "medium",
    prompt:
      "Príde ti ako učiteľovi e-mail: „EduPage — vaše prihlásenie vypršalo. Pre obnovu prístupu k triednej knihe sa znovu prihláste cez tento link.” Doména linku: portal.edupage-sk.com. Klikneš?",
    visual: {
      kind: "email",
      from: "EduPage Support",
      fromEmail: "no-reply@edupage-sk.com",
      subject: "Obnovte prístup k triednej knihe",
      body: "Vaše prihlásenie vypršalo. Pre obnovu prístupu k triednej knihe sa znovu prihláste cez tento link do 24h.",
    },
    options: [
      bad("a", "Áno — koniec polroka, potrebujem prístup k triednej knihe", "critical"),
      ok(
        "b",
        "Nie — pravá EduPage doména je portal.edupage.org. Otvorím EduPage cez záložku v prehliadači a prihlásim sa ručne",
      ),
      bad(
        "c",
        "Otvorím link na pracovnom notebooku — školské IT to vyrieši, ak je to phishing",
        "critical",
      ),
    ],
    explanation:
      "Pravý EduPage beží na `edupage.org` — `edupage-sk.com` je klon na zber učiteľských prístupov k údajom žiakov. Prihlasuj sa cez vlastnú záložku, nie cez linky z e-mailov.",
  },
  {
    id: "e37-sko-eu-dotacia-1",
    category: "phishing",
    difficulty: "medium",
    prompt:
      "Riaditeľke ZŠ príde e-mail: „EU dotácia pre digitalizáciu škôl 2026 — vaša škola bola predschválená na 18 000 €. Registrujte sa do piatka cez formulár (priložený).” Formulár pýta IBAN školy + jej rodné číslo. Reaguje?",
    visual: {
      kind: "email",
      from: "EU Komisia — Digitalizácia škôl",
      fromEmail: "grant-2026@eu-digitalisation-program.com",
      subject: "Predschválená dotácia 18 000 €",
      body: "Vaša škola bola predschválená na dotáciu 18 000 € z programu Digitálna Európa 2026. Registrujte sa cez priložený formulár do piatka 17:00. Neregistrované školy strácajú nárok.",
    },
    options: [
      bad("a", "Vyplníme — termín je krátky, dotácia veľká, nemôžeme premeškať", "critical"),
      ok(
        "b",
        "Overíme priamo cez MIRRI / Ministerstvo školstva (telefonát na overené číslo, nie z e-mailu). Dotácie sa nikdy nevyhlasujú e-mailom ad-hoc",
      ),
      bad("c", "Zavoláme na číslo uvedené v e-maile, aby sme overili", "critical"),
    ],
    explanation:
      "Dotácie sa nevyhlasujú ad-hoc e-mailom s deadline do piatka. Over cez MIRRI / ministerstvo na čísle, ktoré si sám vyhľadáš — kontakt uvedený v podvodnom e-maile patrí útočníkovi.",
  },
  {
    id: "e37-sko-vyzvednutie-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Recepcii ZŠ volá muž: „Som otec Lucie K. zo 4.A. Manželka ochorela, nemôže prísť po dcéru. Akú má dnes poslednú hodinu a kde čaká po vyučovaní?” V triednej knihe je len matka uvedená ako kontakt. Reaguješ?",
    visual: {
      kind: "call",
      caller: "„Otec Lucie K.”",
      number: "+421 944 222 333",
      hint: "Číslo nie je v triednej knihe ako kontakt",
    },
    options: [
      bad("a", "Poviem informácie — otec má právo vedieť detaily o svojom dieťati", "critical"),
      ok(
        "b",
        "Nepoviem nič. „Pán, prosím Vás, dohovorte sa s manželkou alebo s triednou učiteľkou. Informácie o žiakovi neposkytujeme telefonicky.” Zaznamenám hovor",
      ),
      bad("c", "Spýtam sa otca na rodné číslo dcéry, ak vie, poviem detaily", "critical"),
    ],
    explanation:
      "Sociálne inžinierstvo na recepcii: rozvrh a miesto čakania dieťaťa sú presne to, čo útočník potrebuje. Informácie o žiakoch sa telefonicky neposkytujú — over cez kontakt v triednej knihe.",
  },
  {
    id: "e37-zdr-erecept-overenie-1",
    category: "phishing",
    difficulty: "medium",
    prompt:
      "Lekárke v ambulancii príde e-mail: „NCZI — overenie prístupu k eReceptu. Pre pokračovanie v predpisovaní liekov sa do 24h overte cez tento link.” Doména: erecept-overenie.online. Klikne?",
    visual: {
      kind: "email",
      from: "NCZI — eRecept",
      fromEmail: "no-reply@erecept-overenie.online",
      subject: "Overenie prístupu k eReceptu — 24h",
      body: "Z dôvodu kontroly NCZI vás žiadame overiť prístup k eReceptu do 24 hodín. Bez overenia bude prístup pozastavený.",
    },
    options: [
      bad("a", "Áno — bez prístupu nemôžem predpisovať, čas tlačí", "critical"),
      ok(
        "b",
        "Nie — NCZI komunikuje len cez ehealth.gov.sk / nczisk.sk a nikdy nepýta opätovné overenie cez e-mail. Skontrolujem priamo v NCZI portáli alebo zavolám podpore",
      ),
      bad(
        "c",
        "Otvorím link na mobile (osobnom), aby som neohrozila počítač v ambulancii",
        "critical",
      ),
    ],
    explanation:
      "NCZI nikdy nepýta „opätovné overenie” prístupu cez e-mailový link — `erecept-overenie.online` je phishing. Prístup kontroluj priamo na `ehealth.gov.sk` / `nczisk.sk`.",
  },
  {
    id: "e37-zdr-vysledky-call-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Recepcii ambulancie volá muž: „Som MUDr. Horváth z Onkologického ústavu, máme akútneho pacienta. Pošlite mi laboratórne výsledky pána Kováča (RČ XXXXXX/XXXX) na môj e-mail dr.horvath.onko@gmail.com.” Reaguje?",
    visual: {
      kind: "call",
      caller: "„MUDr. Horváth”",
      number: "+421 944 555 777",
      hint: "Číslo nie je z domény Onkologického ústavu",
    },
    options: [
      bad("a", "Pošle — kolega lekár pýta, ide o život pacienta", "critical"),
      ok(
        "b",
        "Nepošle. „Pán doktor, pošlem to cez NCZI eZdravie / našu certifikovanú e-mailovú adresu, gmail.com nie je bezpečný kanál pre zdravotné údaje.” Overí MUDr. Horvátha cez oficiálny kontakt nemocnice",
      ),
      bad("c", "Pošle len anonymizované výsledky (bez mena), to je v poriadku", "medium"),
    ],
    explanation:
      "Zdravotné údaje sa neposielajú na `gmail.com` ani na základe telefonátu — totožnosť lekára over cez oficiálnu linku nemocnice a použi certifikovaný kanál (eZdravie). Anonymizácia telefonát nelegitimizuje.",
  },
  {
    id: "e37-zdr-iban-switch-1",
    category: "phishing",
    difficulty: "hard",
    prompt:
      "Účtovníčke kliniky príde e-mail od dlhoročného dodávateľa zdravotníckeho materiálu: „Zmenili sme banku, nový IBAN: SK21 1100 0000 0029 4612 3784. Faktúru z minulého týždňa (2 850 €) uhraďte na novú adresu.” Doména: dodavatel-sk@medicalsupplies-eu.com (predtým @medicalsupplies.sk). Reaguje?",
    visual: {
      kind: "email",
      from: "MedicalSupplies SK",
      fromEmail: "dodavatel-sk@medicalsupplies-eu.com",
      subject: "Zmena bankového účtu — okamžite",
      body: "Vážená pani účtovníčka, zmenili sme bankového partnera. Prosíme, faktúru č. 2026/0451 (2 850 €) uhraďte na nový IBAN: SK21 1100 0000 0029 4612 3784. Variabilný symbol ostáva. Ďakujem, Peter Kováč",
    },
    options: [
      bad("a", "Uhradí — dodávateľ má právo zmeniť banku, nemusíme komplikovať", "critical"),
      ok(
        "b",
        "Zavolá dodávateľovi cez overené číslo (zo zmluvy, NIE z e-mailu) a overí zmenu IBAN-u. Doména sa nevýrazne zmenila (.sk → -eu.com) — to je BEC útok",
      ),
      bad("c", "Uhradí, ale len 50 % ako test", "critical"),
    ],
    explanation:
      "BEC / IBAN-switch: doména dodávateľa sa nenápadne zmenila (`.sk` → `-eu.com`). Každú zmenu účtu over telefonátom na číslo zo zmluvy — nikdy na kontakt z e-mailu. Čiastočná úhrada nie je test.",
  },
  {
    id: "e37-zdr-makro-priloha-1",
    category: "phishing",
    difficulty: "hard",
    prompt:
      "Sestre na neurológii príde e-mail: „Konzultácia — CT vyšetrenie pacienta Nový. Príloha v Word formáte (.docx) s makrami. Prosíme o promptnú odpoveď.” Pacient „Nový” nie je v ich evidencii. Otvorí?",
    visual: {
      kind: "email",
      from: "MUDr. Šimko",
      fromEmail: "konzultacia@neuro-clinic-pp.com",
      subject: "Konzultácia — CT pacient Nový",
      body: "Dobrý deň, posielam CT pacienta Nový na konzultáciu. Príloha obsahuje makrá pre zobrazenie obrazov (Word). Prosím o promptnú odpoveď.",
    },
    options: [
      bad("a", "Otvorí — môže to byť nový pacient z urgentu, makrá zapnem", "critical"),
      ok(
        "b",
        "Neotvorí. Word s makrami od externého odosielateľa = klasický ransomware vektor. Nahlási IT klinikie a presunie e-mail do karantény",
      ),
      bad("c", "Otvorí len v Protected View bez povolenia makier", "medium"),
    ],
    explanation:
      "Word príloha s makrami od externého odosielateľa je klasický ransomware vektor a nemocnice sú top cieľ. Ani Protected View nie je hradba, ak makrá nakoniec povolíš — e-mail patrí IT a do karantény.",
  },
  {
    id: "e37-zdr-nczi-sms-1",
    category: "phishing",
    difficulty: "medium",
    prompt:
      "Pediatrovi príde SMS: „NCZI: Vaša licencia eRecept vyprší o 48h. Aktualizujte si ju, inak stratíte právo predpisovať: nczi-licencia.sk/update”. Aktualizuje?",
    visual: {
      kind: "sms",
      sender: "NCZI-Info",
      body: "Vaša licencia eRecept vyprší o 48h. Aktualizujte si ju, inak stratíte právo predpisovať:",
      link: "https://nczi-licencia.sk/update",
    },
    options: [
      bad("a", "Aktualizuje — bez licencie nemôžem predpisovať, naliehavé", "critical"),
      ok(
        "b",
        "Nie — NCZI a SLEK neoznamujú vypršanie licencie cez SMS s linkom. Prihlási sa do ehealth.gov.sk priamo cez záložku v prehliadači a skontroluje",
      ),
      bad("c", "Pošle SMS adminovi kliniky na overenie", "medium"),
    ],
    explanation:
      "NCZI ani SLEK neriešia licencie cez SMS s linkom — `nczi-licencia.sk` je doménový klon. Stav over prihlásením na `ehealth.gov.sk` cez vlastnú záložku.",
  },
  {
    id: "e37-zdr-slovensko-sso-1",
    category: "honeypot",
    difficulty: "medium",
    prompt:
      "Pri prihlasovaní do eZdravia portálu sa zobrazí presmerovanie na slovensko.sk. URL: https://www.slovensko.sk/sk/eform-prihlasenie?service=ehealth. Pokračuješ?",
    visual: {
      kind: "url",
      url: "https://www.slovensko.sk/sk/eform-prihlasenie?service=ehealth",
      secure: true,
    },
    options: [
      bad("a", "Nie — presmerovanie na inú doménu je podozrivé, zatvorím", "minor"),
      ok(
        "b",
        "Áno — slovensko.sk je oficiálny štátny SSO. Cez tento bod sa autentikuje aj NCZI eZdravie pre lekárov. Pokračujem s eID",
      ),
      bad("c", "Áno — kliknem aj na druhé predložené presmerovanie z neznámej domény", "critical"),
    ],
    explanation:
      "Presmerovanie na `slovensko.sk` je legitímne — je to oficiálne štátne SSO, cez ktoré sa prihlasuje aj eZdravie. Dôležitá je presná doména a HTTPS, nie reflexívne odmietnutie.",
  },

  // ── E60 — current Slovak scams (2024–2025): harder, hyper-real ───────────────
  {
    id: "e60-slsp-sms-call-combo-1",
    category: "phishing",
    difficulty: "hard",
    prompt:
      "Príde SMS od „SLSP“. O minútu volá „pracovník oddelenia podvodov“ z čísla, ktoré sa zhoduje s číslom banky, a žiada previesť peniaze na „bezpečný účet“. Čo spravíš?",
    visual: {
      kind: "sms",
      sender: "SLSP",
      body: "Zaznamenali sme podozrivú platbu 412 € v Holandsku. Ak ste to neboli vy, overte:",
      link: "https://slsp-overenie.sk/blok",
    },
    options: [
      bad("a", "Prevediem — chcem zachrániť úspory", "critical"),
      bad("b", "Nadiktujem kód z SMS, nech platbu zruší", "critical"),
      ok("c", "Zložím a zavolám banke na číslo zo zadnej strany karty"),
    ],
    explanation:
      "Najčastejší slovenský scam 2024–25: SMS + nadväzný hovor zo „spoofnutého“ čísla banky. Banka NIKDY nepýta kódy ani prevod na „bezpečný účet“ — taký účet neexistuje. Číslo na displeji sa dá sfalšovať.",
  },
  {
    id: "e60-365bank-vishing-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Volá „bezpečnostné oddelenie 365.bank“. Číslo na displeji sedí s oficiálnym. Žiada, aby si v appke potvrdil „ochrannú“ notifikáciu. Akcia?",
    visual: {
      kind: "call",
      caller: "365.bank",
      number: "+421 2 5965 8331",
      hint: "číslo sa zhoduje s oficiálnym — ale dá sa sfalšovať (spoofing)",
    },
    options: [
      bad("a", "Potvrdím — veď volá banka z pravého čísla", "critical"),
      ok("b", "Zložím a sám zavolám banke cez číslo z appky/karty"),
      bad("c", "Prečítam mu kód z notifikácie, nech to vyrieši", "critical"),
    ],
    explanation:
      "Caller ID sa dá sfalšovať — zhodné číslo nič nedokazuje. Potvrdenie notifikácie = schválenie útočníkovho prihlásenia alebo platby. Banka ti nikdy nezavolá, aby si „potvrdil ochranu“.",
  },
  {
    id: "e60-gls-redelivery-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "SMS o opätovnom doručení balíka GLS s drobným poplatkom. Klikneš?",
    visual: {
      kind: "sms",
      sender: "GLS",
      body: "Vaša zásielka sa nepodarila doručiť. Doplaťte 1,45 € za nové doručenie:",
      link: "https://gls-redelivery.com/sk",
    },
    options: [
      bad("a", "Zaplatím — je to len pár centov", "critical"),
      ok("b", "Overím balík cez oficiálnu GLS appku/web podľa tracking čísla"),
    ],
    explanation:
      "GLS doména je `gls-group.com` / `gls-slovakia.sk`. Kuriéri nepýtajú doplatky cez odkaz v SMS. `gls-redelivery.com` je phishing — karta ide priamo scammerovi.",
  },
  {
    id: "e60-sps-incomplete-address-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "SMS od „SPS“: adresa vraj nie je úplná, treba ju doplniť cez odkaz. Spravíš to?",
    visual: {
      kind: "sms",
      sender: "SPS",
      body: "Vaša adresa je neúplná, zásielku nevieme doručiť. Doplňte údaje:",
      link: "https://sps-update.info/adresa",
    },
    options: [
      bad("a", "Doplním adresu aj kartu pre „overenie“", "critical"),
      ok("b", "Ignorujem — kuriér si adresu overí telefonicky, nie cez link"),
    ],
    explanation:
      "Klasický trik „neúplná adresa“. Stránka pýta adresu a potom kartu na „groš“ overovaciu platbu. Reálny kuriér rieši adresu cez svoj oficiálny portál alebo telefonát, nie cez `.info` doménu.",
  },
  {
    id: "e60-whatsapp-dcera-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "WhatsApp z neznámeho čísla: „Mami, rozbil sa mi telefón, toto je moje nové číslo. Súrne potrebujem 480 € na nový, pošli na tento účet, vrátim ti.“ Akcia?",
    visual: {
      kind: "text",
      label: "WhatsApp · neznáme číslo +421 949 ***",
      body: "Mami, rozbil sa mi telefón, toto je nové číslo 🙏 Súrne potrebujem 480 € na nový, pošli prosím na IBAN, vrátim ti hneď.",
    },
    options: [
      bad("a", "Pošlem hneď — veď je to dieťa v núdzi", "critical"),
      bad("b", "Najprv napíšem na to nové číslo, či je to naozaj ona", "medium"),
      ok("c", "Zavolám na jej staré, známe číslo a overím to"),
    ],
    explanation:
      "Scam „dcéra/syn v núdzi“ (hi-mum). Útočník píše z cudzieho čísla — overovať naň nemá zmysel, odpovie ti scammer. Vždy zavolaj na pôvodné známe číslo alebo over otázkou, ktorú vie len ona.",
  },
  {
    id: "e60-booking-inapp-pay-1",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt:
      "V appke Booking.com ti hotel pošle správu: kvôli „overeniu rezervácie“ zadaj kartu cez priložený odkaz, inak rezerváciu zrušia. Spravíš to?",
    visual: {
      kind: "text",
      label: "Booking.com · správa od ubytovania",
      body: "Pre potvrdenie rezervácie prosím overte platobnú kartu do 12 h cez tento odkaz, inak bude rezervácia zrušená: secure-booking-verify.com/r/8821",
    },
    options: [
      bad("a", "Zadám kartu — nechcem prísť o rezerváciu", "critical"),
      ok("b", "Neklikám — platby riešim len cez oficiálne Booking, kontaktujem podporu"),
    ],
    explanation:
      "Útočníci kompromitujú hotelové konto a píšu cez pravú appku. Booking ani hotel nepýtajú kartu cez externý odkaz v chate. `secure-booking-verify.com` nie je Booking.com.",
  },
  {
    id: "e60-qr-efaktura-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      "V schránke máš list „e-faktúra za energie“: preplatok ti vraj vrátia, stačí naskenovať QR a zadať údaje karty. Spravíš to?",
    visual: {
      kind: "text",
      label: "List v schránke · „ZSE — vyúčtovanie“",
      body: "Vznikol vám preplatok 38,20 €. Pre vrátenie naskenujte QR kód a zadajte číslo karty a CVV.",
    },
    options: [
      bad("a", "Naskenujem QR a zadám kartu — chcem preplatok", "critical"),
      ok("b", "Preplatok mi prídu sami na účet; QR ignorujem a overím v mojom účte ZSE"),
    ],
    explanation:
      "Quishing (QR phishing). Na vrátenie preplatku nikdy netreba CVV — to slúži len na platby OD teba. Dodávateľ pošle preplatok na účet zo zmluvy. Over si to v oficiálnom zákazníckom portáli.",
  },
  {
    id: "e60-celebrity-crypto-1",
    category: "fake_vs_real",
    difficulty: "hard",
    prompt:
      "Na Facebooku vidíš video, kde známa slovenská tvár (a logo NBS) odporúča „AI obchodnú platformu“ so zaručeným ziskom. Stačí vraj vložiť 250 €. Reaguješ?",
    visual: {
      kind: "text",
      label: "FB reklama · video s tvárou celebrity + logo NBS",
      body: "„Zarobil som 12 400 € za mesiac s touto AI platformou. Stačí vložiť 250 € a registrovať sa dnes.“ (deepfake hlas + logo NBS)",
    },
    options: [
      bad("a", "Zaregistrujem sa a vložím 250 €", "critical"),
      bad("b", "Nechám tam aspoň telefón, nech mi zavolajú s detailmi", "critical"),
      ok("c", "Je to deepfake reklama — nereagujem a nahlásim ju"),
    ],
    explanation:
      "Celebrity a NBS takéto platformy NEodporúčajú — ide o deepfake. Po registrácii ti „poradca“ volá týždne a tlačí na ďalšie vklady (pig butchering). Vložené peniaze nikdy neuvidíš.",
  },
  {
    id: "e60-buyer-refund-card-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      "Eshop ti napíše, že tvoja objednávka zlyhala a peniaze ti „vrátia“ — stačí zadať číslo karty a kód, aby ti refund prišiel. Spravíš to?",
    options: [
      bad("a", "Zadám kartu a kód, nech mi vrátia peniaze", "critical"),
      ok("b", "Refund chodí späť automaticky na pôvodnú kartu — žiadne údaje netreba"),
    ],
    explanation:
      "Vrátenie peňazí ide vždy späť na kartu, ktorou si platil — predajca nepotrebuje tvoje číslo karty ani kód. Pýtanie údajov „kvôli refundu“ je vždy podvod na vyprázdnenie účtu.",
  },
  {
    id: "e60-sim-portout-1",
    category: "scenario",
    difficulty: "hard",
    prompt:
      "Príde SMS: „Vaše číslo bolo požiadané o prenos k inému operátorovi, dokončenie o 2 h.“ Ty si o nič nežiadal. Akcia?",
    visual: {
      kind: "sms",
      sender: "Operátor",
      body: "Žiadosť o prenos vášho čísla k inému operátorovi bola prijatá. Prenos dokončíme o 2 hodiny.",
    },
    options: [
      bad("a", "Nič — je to asi omyl, vyrieši sa samo", "critical"),
      ok("b", "Okamžite volám operátorovi a blokujem prenos; je to pokus o SIM swap"),
    ],
    explanation:
      "Prenos čísla (SIM swap) útočníkovi presmeruje tvoje SMS — vrátane 2FA kódov z banky. Ak si o prenos nežiadal, ihneď ho cez operátora zablokuj a skontroluj prístupy do banky.",
  },
  {
    id: "e60-europol-robocall-1",
    category: "scenario",
    difficulty: "medium",
    prompt:
      "Dvíhaš hovor — automatický anglický hlas: „This is Europol. Your identity is linked to a crime. Press 1 to speak to an officer.“ Akcia?",
    visual: {
      kind: "call",
      caller: "Europol (?)",
      number: "+44 20 3318 ****",
      hint: "automatický anglický hlas, žiada stlačiť 1",
    },
    options: [
      bad("a", "Stlačím 1 a vypočujem si, o čo ide", "medium"),
      ok("b", "Zložím — polícia ani Europol takto nevolajú robotickým hovorom"),
    ],
    explanation:
      "Europol/polícia nikdy nevolajú automatickým robohlasom ani nepýtajú stláčať tlačidlá. Stlačenie 1 ťa spojí s podvodníkom, ktorý ťa zastrašuje a vymáha peniaze či údaje.",
  },
  {
    id: "e60-financnasprava-exekucia-1",
    category: "phishing",
    difficulty: "medium",
    prompt: "SMS o nedoplatku Finančnej správe a hrozbe exekúcie s odkazom na úhradu. Zaplatíš?",
    visual: {
      kind: "sms",
      sender: "FinancnaSprava",
      body: "Evidujeme nedoplatok 247 €. Pri neuhradení do 24 h hrozí exekúcia. Uhraďte:",
      link: "https://financnasprava-uhrada.sk/platba",
    },
    options: [
      bad("a", "Zaplatím hneď, nechcem exekúciu", "critical"),
      ok("b", "Overím si to v osobnej zóne na `financnasprava.sk`, SMS ignorujem"),
    ],
    explanation:
      "Finančná správa komunikuje cez osobnú internetovú zónu a poštu, nie cez SMS s platobným odkazom. Tlak časom („do 24 h hrozí exekúcia“) je znak podvodu.",
  },
];

const TEST_SIZE = 15;

export function getTestQuestions(): Question[] {
  // Shuffle and take TEST_SIZE, ensuring some category mix.
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);

  // Pick at least 2 from each category for balanced test
  const cats: Category[] = ["phishing", "url", "fake_vs_real", "scenario", "honeypot"];
  const selected: Question[] = [];
  const used = new Set<string>();

  for (const c of cats) {
    const quota = c === "honeypot" ? 4 : 2;
    const fromCat = shuffled.filter((q) => q.category === c).slice(0, quota);
    for (const q of fromCat) {
      if (!used.has(q.id)) {
        selected.push(q);
        used.add(q.id);
      }
    }
  }
  // Fill the rest randomly — but cap honeypot at 4/15 (~27 %) so the
  // expanding honeypot bank (E9.x) does not flip default test into a
  // paranoia-trainer with too few real scam scenarios.
  const HONEYPOT_CAP = 4;
  let honeypotCount = selected.filter((q) => q.category === "honeypot").length;
  for (const q of shuffled) {
    if (selected.length >= TEST_SIZE) break;
    if (used.has(q.id)) continue;
    if (q.category === "honeypot" && honeypotCount >= HONEYPOT_CAP) continue;
    selected.push(q);
    used.add(q.id);
    if (q.category === "honeypot") honeypotCount++;
  }

  // Final shuffle so categories aren't grouped
  return selected.sort(() => Math.random() - 0.5).slice(0, TEST_SIZE);
}

/**
 * Compute time limit (seconds) for a question based on:
 *  - text length of the visual context (reading)
 *  - prompt + options length (comprehension + decision)
 *  - difficulty bump
 *
 * Slovak average reading speed ~ 4 words/sec when scanning.
 * We use chars/sec ≈ 22 (≈4 words/sec * ~5 chars/word) for reading,
 * then add a fixed comprehension + decision buffer.
 */
export function getQuestionById(id: string): Question | null {
  return QUESTIONS.find((q) => q.id === id) ?? null;
}

export function getQuestionTimeLimit(q: Question): number {
  const visualText = visualToText(q.visual);
  const optionsText = q.options.map((o) => o.label).join(" ");
  const totalChars = q.prompt.length + visualText.length + optionsText.length;

  // Reading time: ~22 chars/sec
  const readingSec = totalChars / 22;
  // Comprehension + decision buffer
  const comprehensionSec = 4;
  // Difficulty bump: easy +0, medium +2, hard +4
  const diffBump = q.difficulty === "easy" ? 0 : q.difficulty === "medium" ? 2 : 4;

  const raw = readingSec + comprehensionSec + diffBump;

  // Clamp 8 .. 30 seconds (round to whole seconds, +20% safety margin)
  const withMargin = raw * 1.2;
  return Math.max(8, Math.min(30, Math.round(withMargin)));
}

function visualToText(v?: Visual): string {
  if (!v) return "";
  switch (v.kind) {
    case "sms":
      return `${v.sender} ${v.body} ${v.link ?? ""}`;
    case "email":
      return `${v.from} ${v.fromEmail} ${v.subject} ${v.body} ${v.cta ?? ""}`;
    case "url":
      return v.url;
    case "instagram":
      return `${v.account} ${v.body} ${v.cta ?? ""} ${v.price ?? ""}`;
    case "listing":
      return `${v.site} ${v.title} ${v.price} ${v.location ?? ""} ${v.description}`;
    case "call":
      return `${v.caller} ${v.number} ${v.hint ?? ""}`;
    case "text":
      return `${v.label} ${v.body}`;
  }
}
