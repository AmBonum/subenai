import type { Course } from "./_schema";

export const dataHygieneCourse: Course = {
  slug: "data-hygiene",
  title: `Data hygiene — ako neprísť o digitálnu identitu`,
  tagline:
    "2FA (dvojfaktorové overenie), správca hesiel a kontrola únikov: 30 minút nastavovania, ktoré ti ušetria roky digitálnych problémov.",
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
      body: `Aj keď nikdy neklikneš na podvodnú SMS, tvoje údaje sa môžu dostať na čierny trh inou cestou — únikom z firmy, kde máš účet (LinkedIn, MyHeritage, AdultFriendFinder, Marriott — všetko reálne úniky údajov posledných rokov). Útočník potom skúša tvoje heslo na desiatkach iných služieb. Ak používaš to isté heslo viackrát, máš problém.`,
    },
    {
      kind: "redflags",
      heading: "Indície, že tvoja identita je v ohrození",
      flags: [
        `Používaš to isté heslo na viacerých službách.`,
        `Heslo je „menoSluzby123" alebo dátum narodenia.`,
        `Nemáš zapnuté 2FA na e-maile (ten je kľúčom ku všetkému).`,
        `Za posledných 12 mesiacov si nezmenil žiadne heslo.`,
        `Tvoj e-mail je v haveibeenpwned.com — pravdepodobne uniklo aspoň jedno heslo.`,
        `Ukladáš si heslá v Poznámkach, Exceli alebo na papier vedľa monitora.`,
        `Občas posielaš heslo kolegovi cez SMS či e-mail.`,
        `Tvoj telefón nemá nastavený PIN ani biometriu.`,
      ],
    },
    {
      kind: "checklist",
      heading: `7-bodové nastavenie, ktoré ťa zabezpečí na roky`,
      items: [
        {
          good: true,
          text: `Nainštaluj si password manager (správcu hesiel — Bitwarden zadarmo, 1Password platený). Presuň doň všetky heslá.`,
        },
        {
          good: true,
          text: `Vygeneruj nové unikátne heslá pre 10 najdôležitejších služieb (e-mail, banka, e-shop, sociálne siete).`,
        },
        {
          good: true,
          text: `Zapni 2FA cez authenticator (overovaciu aplikáciu — Google Authenticator, Authy) — ak sa dá, NIE cez SMS.`,
        },
        {
          good: true,
          text: `Zaregistruj e-mail na haveibeenpwned.com — dostaneš upozornenie pri každom novom úniku.`,
        },
        {
          good: true,
          text: `Skontroluj prepojené aplikácie vo svojom Google / Microsoft / Apple účte. Zruš tie, ktoré nepoužívaš.`,
        },
        {
          good: true,
          text: `Nastav možnosti obnovy účtu (záložný e-mail, telefón, záložné kódy).`,
        },
        {
          good: true,
          text: `Nastav si zamykaciu obrazovku na telefóne (PIN aspoň 6-miestny a biometria).`,
        },
      ],
    },
    {
      kind: "do_dont",
      heading: `Heslá — pravidlá`,
      do: [
        `Generovať náhodné heslá v správcovi hesiel (16 a viac znakov).`,
        `Mať unikátne heslo pre každú službu.`,
        `Pre heslá, ktoré si musíš pamätať (hlavné heslo, tzv. master password), používať prístupovú frázu typu „kone-jablko-lampa-2x4".`,
        `Pravidelne kontrolovať haveibeenpwned.com (alebo si nechať posielať upozornenia).`,
      ],
      dont: [
        `Neopakovať heslá medzi službami. NIKDY.`,
        `Nezdieľať heslo cez e-mail, SMS či Slack v čitateľnej podobe.`,
        `Neukladať heslá v poznámkach v telefóne.`,
        `Nepoužívať „heslo123", dátum narodenia ani meno mačky.`,
      ],
    },
    {
      kind: "do_dont",
      heading: `2FA — pravidlá`,
      do: [
        `Overovacia aplikácia (Google Authenticator, Authy, 1Password) — najsilnejšia ochrana.`,
        `Hardvérový kľúč (YubiKey) pre kritické účty (bankovníctvo, kryptoburzy).`,
        `Uložiť si záložné kódy do správcu hesiel aj offline.`,
        `Zapnúť 2FA na e-maile ako prvé. Ten je kľúčom k obnove všetkého ostatného.`,
      ],
      dont: [
        `Nezálohovať tajné kľúče (seedy) 2FA do iCloudu či Google Drivu bez šifrovania.`,
        `SMS 2FA používať len vtedy, keď nie je iná možnosť (útok SIM swap, čiže prenos čísla na cudziu SIM, existuje).`,
        `Nediktovať OTP (jednorazový overovací kód) z 2FA nikomu — ani „bankárovi" cez telefón.`,
        `Nezatvárať obnovu 2FA bez toho, aby si si zapísal záložné kódy.`,
      ],
    },
    {
      kind: "example",
      heading: `Vzor — ako vyzerá únik dát`,
      visual: {
        kind: "text",
        label: `Únik LinkedIn 2021 (700 mil. profilov)`,
        body: `V roku 2021 unikli údaje 700 miliónov profilov LinkedIn: meno, e-mail, telefón, pracovná pozícia a hashe niektorých hesiel. Ak si v tom čase mal účet na LinkedIne, tvoj e-mail sa pravdepodobne objavil v zozname.

Útočníci tieto úniky používajú na:
• Cielený phishing (podvodné vylákanie údajov) — poznajú tvoju firmu, pozíciu, kolegov.
• Credential stuffing (hromadné skúšanie uniknutých prihlasovacích údajov) — skúšajú heslo z LinkedInu na Gmaile či v banke.
• Sociálne inžinierstvo (manipulácia s cieľom získať údaje) — „Volám z personálneho oddelenia LinkedIn, váš profil treba overiť."

Test: zadaj svoj e-mail na haveibeenpwned.com a uvidíš, kde všade si.`,
      },
      commentary: `Únik nie je tvoja chyba — bezpečnostnú dieru má firma. Tvoja zodpovednosť je len jedna: nepoužívať to isté heslo druhýkrát. Správca hesiel a 2FA = problém vyriešený.`,
    },
    {
      kind: "checklist",
      heading: `Mesačná údržba (5 minút)`,
      items: [
        {
          good: true,
          text: `Skontrolovať e-mail na haveibeenpwned.com (alebo notifikácie zo správcu hesiel).`,
        },
        {
          good: true,
          text: `Skontrolovať aktívne prihlásenia na Gmaile / Facebooku / Instagrame (Nastavenia → Kde si prihlásený).`,
        },
        {
          good: true,
          text: `Skontrolovať autorizované aplikácie a zrušiť tie, ktoré už nepoužívaš.`,
        },
        {
          good: true,
          text: `Pri akomkoľvek upozornení na nové prihlásenie z neznámeho zariadenia — okamžite zmeniť heslo.`,
        },
      ],
    },
    {
      kind: "scenario",
      heading: `Reálny scenár — pondelok ráno, e-mail z neznámeho zariadenia`,
      story: `Príde ti e-mail: „New sign-in to your Google account from Lagos, Nigeria. If this wasn't you, secure your account." Ty si bol celý víkend doma v Žiline.`,
      right_action: `Otvor si Google účet ručne (nie z odkazu v e-maile). Choď do Zabezpečenie → Nedávne prihlásenia. Ak je tam Lagos — okamžite zmeň heslo, odhlás všetky relácie a skontroluj 2FA. Ak nie — pravdepodobne ide o phishing (podvodné vylákanie prihlasovacích či platobných údajov).`,
    },
  ],
  sources: [
    { label: `Have I Been Pwned — únik databázy`, url: "https://haveibeenpwned.com/" },
    { label: `Bitwarden — bezplatný password manager`, url: "https://bitwarden.com/" },
    { label: `NCKB — odporúčania pre digitálnu hygienu`, url: "https://www.sk-cert.sk/" },
  ],
};
