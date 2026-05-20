import type { Course } from "./_schema";

export const dataHygieneCourse: Course = {
  slug: "data-hygiene",
  title: `Data hygiene — ako neprísť o digitálnu identitu`,
  tagline:
    "2FA, správca hesiel a kontrola únikov: 30 minút setup-u, ktorý ti zachráni roky digitálnych problémov.",
  category: "data",
  difficulty: "začiatočník",
  estimatedMinutes: 10,
  heroEmoji: "🛡️",
  publishedAt: "2026-04-26",
  updatedAt: "2026-04-26",
  sections: [
    {
      kind: "intro",
      heading: `Prečo „mňa to nezaujíma" nestačí`,
      body: `Aj keď nikdy neklikneš na podvodnú SMS, tvoje údaje sa môžu dostať na čierny trh inou cestou — únik z firmy, kde máš účet (LinkedIn, MyHeritage, AdultFriendFinder, Marriott — všetky reálne úniky posledných rokov). Útočník potom skúša tvoje heslo na desiatkach iných služieb. Ak používaš to isté heslo viackrát, máš problém.`,
    },
    {
      kind: "redflags",
      heading: "Indície, že tvoja identita je v ohrození",
      flags: [
        `Používaš to isté heslo na viacerých službách.`,
        `Heslo je „menoSluzby123" alebo dátum narodenia.`,
        `Nemáš zapnuté 2FA na e-maile (ten je kľúč ku všetkému).`,
        `Posledných 12 mesiacov si nezmenil žiadne heslo.`,
        `Tvoj e-mail je v haveibeenpwned.com — pravdepodobne uniklo aspoň jedno heslo.`,
        `Ukladáš si heslá v Notes / Excel / na papier vedľa monitora.`,
        `Občas posielaš heslo cez SMS / e-mail kolegovi.`,
        `Tvoj telefón nemá nastavený PIN ani biometriu.`,
      ],
    },
    {
      kind: "checklist",
      heading: `7-bodový setup, ktorý ťa vyrieši na roky`,
      items: [
        {
          good: true,
          text: `Nainštaluj password manager (Bitwarden zadarmo, 1Password platený). Migruj všetky heslá tam.`,
        },
        {
          good: true,
          text: `Vygeneruj nové unikátne heslá pre top 10 služieb (e-mail, banka, eshop, soc. siete).`,
        },
        {
          good: true,
          text: `Zapni 2FA cez authenticator app (Google Authenticator, Authy) — NIE cez SMS, ak sa dá.`,
        },
        {
          good: true,
          text: `Zaregistruj e-mail na haveibeenpwned.com — dostaneš upozornenie pri každom novom úniku.`,
        },
        {
          good: true,
          text: `Skontroluj prepojené appky vo svojom Google / Microsoft / Apple účte. Zruš tie, čo nepoužívaš.`,
        },
        {
          good: true,
          text: `Nastav recovery options (záložný e-mail, telefón, recovery codes).`,
        },
        {
          good: true,
          text: `Nastav obrazovku zámku na telefóne (PIN aspoň 6-miestny + biometria).`,
        },
      ],
    },
    {
      kind: "do_dont",
      heading: `Heslá — pravidlá`,
      do: [
        `Generovať náhodné heslá v password manageri (16+ znakov).`,
        `Mať unikátne heslo pre každú službu.`,
        `Pre veci, ktoré si musíš pamätať (master password), používať passphrase typu „kone-jablko-lampa-2x4".`,
        `Pravidelne kontrolovať haveibeenpwned.com (alebo nechať notify).`,
      ],
      dont: [
        `Neopakovať heslá medzi službami. NIKDY.`,
        `Nezdieľať heslo cez e-mail / SMS / Slack v plain texte.`,
        `Neskladovať heslá v poznámkach v telefóne.`,
        `Nepoužívať „heslo123", dátum narodenia, meno mačky.`,
      ],
    },
    {
      kind: "do_dont",
      heading: `2FA — pravidlá`,
      do: [
        `Authenticator app (Google Authenticator, Authy, 1Password) — najsilnejšie.`,
        `Hardvérový kľúč (YubiKey) pre kritické účty (bankovníctvo, kryptoburzy).`,
        `Uložiť si recovery codes do password managera + offline.`,
        `Zapnúť 2FA na e-maile ako prvé. Ten je kľúč k resetu všetkého ostatného.`,
      ],
      dont: [
        `Nezálohovať 2FA seedy do iCloud / Google Drive bez šifrovania.`,
        `SMS 2FA len keď nie je iná možnosť (SIM swap útok existuje).`,
        `Nediktovať OTP z 2FA nikomu — ani „bankárovi" cez telefón.`,
        `Nezatvárať 2FA recovery flow bez toho, aby si si zapísal záložné kódy.`,
      ],
    },
    {
      kind: "example",
      heading: `Vzor — ako vyzerá únik dát`,
      visual: {
        kind: "text",
        label: `LinkedIn 2021 leak (700 mil. profilov)`,
        body: `V roku 2021 unikli údaje 700 miliónov LinkedIn profilov: meno, e-mail, telefón, pracovná pozícia, a hashe niektorých hesiel. Ak si v tom čase mal LinkedIn účet, tvoj e-mail sa pravdepodobne objavil v zozname.

Útočníci tieto úniky používajú na:
• Targeted phishing (poznajú tvoju firmu, pozíciu, kolegov).
• Credential stuffing — skúšajú heslo z LinkedIn-u na Gmail-i, banke.
• Social engineering — „Volám z LinkedIn HR, váš profil treba overiť."

Test: zadaj svoj e-mail na haveibeenpwned.com a uvidíš, kde všade si.`,
      },
      commentary: `Únik nie je tvoja chyba — firma má bezpečnostnú dieru. Tvoja zodpovednosť je len jedna: nepoužívať to isté heslo druhý raz. Password manager + 2FA = problém vyriešený.`,
    },
    {
      kind: "checklist",
      heading: `Mesačná údržba (5 minút)`,
      items: [
        {
          good: true,
          text: `Skontrolovať e-mail v haveibeenpwned.com (alebo notifikácie z password managera).`,
        },
        {
          good: true,
          text: `Skontrolovať aktívne sessions na Gmail / Facebook / Instagram (Settings → Where you're logged in).`,
        },
        {
          good: true,
          text: `Skontrolovať autorizované appky a zrušiť tie, čo už nepoužívaš.`,
        },
        {
          good: true,
          text: `Pri akomkoľvek upozornení na nový login z neznámeho zariadenia — okamžite zmeniť heslo.`,
        },
      ],
    },
    {
      kind: "scenario",
      heading: `Reálny scenár — pondelok ráno, e-mail z neznámeho zariadenia`,
      story: `Príde ti e-mail: „New sign-in to your Google account from Lagos, Nigeria. If this wasn't you, secure your account." Ty si bol celý víkend doma v Žiline.`,
      right_action: `Otvor Google account ručne (nie z linku v e-maile). Choď do Security → Recent sign-ins. Ak je tam Lagos — okamžite zmeň heslo, odhlás všetky sessions, skontroluj 2FA. Ak nie — pravdepodobne phishing.`,
    },
  ],
  sources: [
    { label: `Have I Been Pwned — únik databázy`, url: "https://haveibeenpwned.com/" },
    { label: `Bitwarden — bezplatný password manager`, url: "https://bitwarden.com/" },
    { label: `NCKB — odporúčania pre digitálnu hygienu`, url: "https://www.sk-cert.sk/" },
  ],
};
