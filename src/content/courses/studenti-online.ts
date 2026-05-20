import type { Course } from "./_schema";

export const studentiOnlineCourse: Course = {
  slug: "studenti-online",
  title: "Internet safety pre študentov — Discord, Steam, brigády",
  tagline: "5 podvodov, ktoré cielia stredoškolákov a vysokoškolákov v SR v 2026.",
  category: "obecne",
  difficulty: "začiatočník",
  estimatedMinutes: 8,
  heroEmoji: "🎓",
  relatedQuestionsCategory: "scenario",
  publishedAt: "2026-05-20",
  updatedAt: "2026-05-20",
  sections: [
    {
      kind: "intro",
      heading: "Internet safety pre študentov — riziká, ktoré rodičia nevidia",
      body: `Internet safety pre študentov v 2026 už nie je o „nezverejňuj telefónne číslo". Útočníci sa dnes presunuli tam, kde sú študenti reálne — Discord servery, Steam trade, Telegram skupiny s brigádami, kryptozarábanie cez Pump.fun. Falošná „brigáda za 2 000 € týždenne z domu" v Telegrame je v 90 % prípadov muling — pereš špinavé peniaze cez svoj účet a do roka máš trestné stíhanie. Steam Item scam ti za 5 minút berie 800 € inventár, ktorý si si budoval roky. Tento kurz ti ukáže 5 najčastejších pascí pre študentov a ako ich obísť bez paranoie.`,
    },
    {
      kind: "example",
      heading: `Vzor #1 — Telegram „brigáda 2 000 € týždenne"`,
      visual: {
        kind: "text",
        label: "Telegram skupina @brigady_sk_2026",
        body: `🔥 BRIGÁDA Z DOMU 🔥 2 000 € týždenne, 1–2 hodiny denne, len treba slovenský bankový účet. Posielame ti peniaze, ty ich rozdeľuješ klientom podľa inštrukcií, necháš si 5 % províziu. Pre VŠ aj SŠ, hneď začať. Napíš @lukas_hr_manager`,
      },
      commentary: `Klasický money muling — pereš výnosy z phishingu, romance scamov a krypto podvodov cez svoj účet. Po 6 mesiacoch ti banka zablokuje účet a polícia ti zaklope. Trest za pranie peňazí: 4–10 rokov.`,
    },
    {
      kind: "example",
      heading: `Vzor #2 — Discord „free Nitro" phishing`,
      visual: {
        kind: "url",
        url: "https://discord-nitro-gift.com/claim/x82h",
      },
      commentary: `Skutočný Discord Nitro link je vždy discord.gift/xxxxx. Doména discord-nitro-gift.com vedie na falošný login, ktorý ukradne tvoj Discord token. S tokenom hacker hneď spamuje tvojich kamarátov a kradne ďalšie účty.`,
    },
    {
      kind: "example",
      heading: `Vzor #3 — Steam trade scam (fake middleman)`,
      visual: {
        kind: "text",
        label: `Steam chat — „obchodník" s CS:GO knife`,
        body: `Predám AWP Dragon Lore za 280 € (cena na Steam Market 410 €). Použijeme dôveryhodného middlemana — môj kamarát Steam moderátor, jeho profil: steamcommunity.com.trade-secure.net/profile/xyz`,
      },
      commentary: `Steam neexistujú „middleman moderátori". Doména steamcommunity.com.trade-secure.net je phishing — skutočná je len steamcommunity.com. Cieľ: zobrať ti účet aj s celým inventárom (často hodnota 500–5 000 €).`,
    },
    {
      kind: "example",
      heading: `Vzor #4 — „Investícia do krypta s mentorom"`,
      visual: {
        kind: "instagram",
        account: "crypto_mentor_sk",
        verified: false,
        body: `Hľadám 3 študentov pre 1:1 mentoring. Naučím ťa zarábať 800–1 200 € týždenne pasívne. Začiatočný vklad len 200 €. Reagujem na DM 🚀`,
        cta: "Poslať správu",
      },
      commentary: `Pig-butchering pre študentov. „Mentor" 2 týždne učí, ukazuje falošné zisky na svojej platforme, ty doplníš 200 €, vidíš „zisk", pridáš 800 €, doplníš celé úspory — všetko zmizne v deň výberu.`,
    },
    {
      kind: "checklist",
      heading: "Checklist študentskej bezpečnosti online",
      items: [
        {
          good: true,
          text: "2FA na Discord, Steam, Instagram, school email — všetky cez authenticator (Google / Microsoft Authenticator).",
        },
        {
          good: true,
          text: `Heslá v správcovi (Bitwarden zdarma, Proton Pass) — žiadne „heslo123" alebo dátum narodenia.`,
        },
        {
          good: true,
          text: "Steam Mobile Authenticator + Trade Confirmations — chráni inventár pri ukradnutí účtu.",
        },
        {
          good: true,
          text: "Pre školský e-mail nikdy nepoužívať rovnaké heslo ako pre osobné konta.",
        },
        {
          good: false,
          text: `Brigády cez Telegram / Signal kanály s „pošli IBAN a začni hneď" — vždy muling alebo scam.`,
        },
        {
          good: false,
          text: `Klikanie na „free Nitro / free V-Bucks / free Steam keys" linky z Discordu.`,
        },
        {
          good: false,
          text: `Posielanie kopie OP / pasu na „overenie" niekomu z chat appky, koho nepoznáš osobne.`,
        },
      ],
    },
    {
      kind: "redflags",
      heading: "7 znakov, že ti niekto na Discord / Telegrame chystá podvod",
      flags: [
        `Núka „brigádu z domu" za 1 500+ €/týždeň so „slovenským účtom" ako jedinou požiadavkou.`,
        `Pýta tvoju kópiu OP / pasu / selfie s dokladom — väčšinou na otvorenie účtu na tvoje meno.`,
        `Steam trade s odkazom na „middleman moderátora" — Steam takých nemá.`,
        `„Mentor", „coach", „guru" pre krypto / forex zo Slovenska s Lambo fotkami z Dubaja.`,
        `„Free Nitro / V-Bucks / Steam key" linky vyžadujúce login.`,
        `Naliehanie na presun konverzácie na WhatsApp / Telegram / Signal — preč z platformy.`,
        `Vágne „skvelá príležitosť, ale musíš sa rozhodnúť dnes do polnoci".`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá pre študentský digitálny život",
      do: [
        `Zapni si Steam Mobile Authenticator hneď, ako máš účet — chráni inventár aj pri kompromitovanom hesle.`,
        `Brigády hľadaj na Profesia.sk, Kariéra.sk, alebo cez nástenku tvojej VŠ — nie cez Telegram.`,
        `Pri zaujímavej DM ponuke skontroluj vek účtu (Instagram → o profile → vytvorený dátum) — mladý účet = scam.`,
        `Vždy over linky cez ručné zadanie do prehliadača — discord.com, steamcommunity.com.`,
      ],
      dont: [
        `Nikdy nepožičiavaj svoj bankový účet kamarátovi / „brigáde" / Telegram skupine. Stávaš sa mula.`,
        `Nedávaj na verejné fórum (Reddit, Discord) tvoj e-mail z VŠ — útočník si rýchlo nájde meno + heslo z únikov.`,
        `Neotváraj prílohy z e-mailov, ktoré sa tvária ako „Vaše skúškové potvrdenie" mimo školského systému.`,
        `Nedôveruj žiadnemu „mentorovi", ktorý sám priznáva, že nemá overiteľnú prácu mimo Instagramu.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — brigáda na leto za 1 800 €/týždeň",
      story: `Si v 3. ročníku VŠ, potrebuješ peniaze na leto. V Telegram skupine „Brigady Slovensko 2026" vidíš ponuku: „Účet za 1 800 €/týždeň, len musíš mať slovenský bankový účet a 18+. Peniaze ti prídu od klientov, ty ich preposielaš podľa môjho zoznamu, ostáva ti 5 %." Manažér Lukáš je príjemný, profesionálny.`,
      right_action: `Odmietneš. Toto je money muling — pereš peniaze z phishingu a podvodov cez tvoj účet. Banka ti účet zablokuje do 6 mesiacov, polícia ťa obviní z prania špinavých peňazí (4–10 rokov + nemožnosť získať pôžičku, hypotéku, prácu v štáte). Reálne letné brigády sú na Profesia.sk za 6–9 €/h, nie 1 800 € týždenne za „prepošli prevod".`,
    },
  ],
  sources: [
    { label: "SK-CERT — bezpečnosť pre mladých", url: "https://www.sk-cert.sk/" },
    { label: "Profesia.sk — overené brigády", url: "https://www.profesia.sk/" },
    { label: "Linka detskej istoty 116 111", url: "https://www.ldi.sk/" },
    { label: "Steam Support — Trade Scams", url: "https://help.steampowered.com/" },
  ],
};
