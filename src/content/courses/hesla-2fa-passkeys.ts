import type { Course } from "./_schema";

export const hesla2faPasskeysCourse: Course = {
  slug: "hesla-2fa-passkeys",
  title: "Heslá, 2FA a passkeys — praktický sprievodca 2026",
  tagline: "3 nástroje za 30 minút, vďaka ktorým ti nikto neukradne účet ani po úniku hesla.",
  category: "data",
  difficulty: "začiatočník",
  estimatedMinutes: 10,
  heroEmoji: "🔐",
  relatedQuestionsCategory: "url",
  publishedAt: "2026-05-20",
  updatedAt: "2026-05-20",
  sections: [
    {
      kind: "intro",
      heading: "Heslá v 2026 nestačia — toto je dnešný minimálny štandard",
      body: `Heslá samotné v 2026 účet neochránia. V databázach unikli miliardy kombinácií e-mail + heslo (overiť si môžeš svoju adresu na haveibeenpwned.com — 99 % šanca, že tam si). Riešenie je trojvrstvové: po prvé správca hesiel (Bitwarden, 1Password, Proton Pass) — generuje unikátne 20-znakové heslá pre každý web. Po druhé dvojfaktorová autentifikácia (2FA) cez authenticator appku alebo hardvérový kľúč YubiKey. Po tretie passkeys — náhrada hesla biometriou + dôveryhodným zariadením, ktoré sa nedajú phishing-ovať. Tento kurz ti ukáže, ako tieto tri vrstvy nasadíš za víkend.`,
    },
    {
      kind: "example",
      heading: `Bitwarden — správca hesiel zdarma`,
      visual: {
        kind: "text",
        label: "Bitwarden setup za 10 minút",
        body: `1. bitwarden.com → vytvor účet s veľmi silným master heslom (12+ slov vo vete, ktorú si pamätáš).\n2. Inštaluj rozšírenie do prehliadača + appku na telefón.\n3. Pri každom webe nechaj Bitwarden vygenerovať 20-znakové heslo — nikdy si ho nezapamätáš, ani nemusíš.\n4. Importuj heslá z Chrome / Safari (oboje majú export). Po importe ich z prehliadača vymaž.`,
      },
      commentary: `Bitwarden je open-source, audit-ovaný, zdarma na všetky zariadenia. Platená verzia (10 $/rok) pridáva integrované 2FA. Alternatívy: 1Password (39 $/rok, krajšie UI), Proton Pass (od Proton Mailu, súčasť Proton Unlimited).`,
    },
    {
      kind: "example",
      heading: `2FA — Google Authenticator, Microsoft Authenticator, Authy`,
      visual: {
        kind: "text",
        label: "Aktivácia 2FA na e-maile (Gmail)",
        body: `Google účet → Bezpečnosť → Dvojstupňové overenie → Aplikácia Authenticator. Naskenuješ QR kód cez authenticator appku. Pri ďalšom prihlásení Google vyžiada 6-miestny kód z appky (mení sa každých 30 sekúnd).`,
      },
      commentary: `2FA cez appku je oveľa bezpečnejšie ako 2FA cez SMS — SIM swap útok ti SMS ukradne, authenticator appku nie. Pre kritické účty (Gmail, banka, Bitwarden master) zapni 2FA vždy.`,
    },
    {
      kind: "example",
      heading: `YubiKey — fyzický kľúč pre maximálnu ochranu`,
      visual: {
        kind: "text",
        label: "YubiKey 5C NFC (~70 €)",
        body: `Hardvérový kľúč v tvare USB-C. Pri prihlásení ho vsuneš do telefónu / notebooku a stlačíš tlačidlo. Phishing site ho nevie použiť (kľúč overuje doménu). Ideálne 2 kusy — jeden v peňaženke, druhý doma v šuflíku ako záloha.`,
      },
      commentary: `YubiKey je zlatý štandard pre 2FA — odolný proti phishingu, ktorý 6-miestne kódy nie sú. Podporuje ho Gmail, Microsoft, GitHub, Facebook, AWS, Bitwarden. Pre bežného užívateľa luxus, pre IT alebo finančníka nutnosť.`,
    },
    {
      kind: "example",
      heading: `Passkey — náhrada hesla biometriou`,
      visual: {
        kind: "text",
        label: "Vytvorenie passkey na Google účte (2026)",
        body: `Google → Bezpečnosť → Passkeys → Vytvoriť passkey. Telefón požiada o Touch ID / Face ID. Hotovo. Pri ďalšom prihlásení už neexistuje heslo — len biometrika na tvojom zariadení.`,
      },
      commentary: `Passkey je v podstate kryptografický kľúč viazaný na tvoje zariadenie + biometriu. Nedá sa phishingovať, nedá sa ukradnúť z databázy (ani neexistuje na serveri v plnej podobe). V 2026 podporuje Google, Apple, Microsoft, Amazon, GitHub, eBay.`,
    },
    {
      kind: "checklist",
      heading: "Checklist nasadenia za víkend",
      items: [
        {
          good: true,
          text: `Master heslo do správcu hesiel: 4–6 náhodných slov + číslo + symbol („KrabicaVlakÚvodom42!"). Zapíš na papier, daj do trezora.`,
        },
        {
          good: true,
          text: "Bitwarden / 1Password / Proton Pass nainštalovaný na všetkých zariadeniach + prehliadačoch.",
        },
        {
          good: true,
          text: "2FA zapnuté cez authenticator appku na: Gmail, banka, Facebook, Instagram, GitHub, Bitwarden, Discord.",
        },
        {
          good: true,
          text: "haveibeenpwned.com — over všetky svoje e-maily. Pri pozitíve zmeň heslá tých účtov ako prvé.",
        },
        {
          good: true,
          text: "Passkey nasaď na Google a Apple — kde podporujú, tam to je najmenej námahy a najviac bezpečnosti.",
        },
        {
          good: false,
          text: "Heslá v Excel súbore / poznámkach v telefóne / Notes na Macu — žiadna ochrana, prvý phishing ich má.",
        },
        {
          good: false,
          text: "Rovnaké heslo na 5 weboch — pri úniku jedného si zranený na všetkých piatich.",
        },
      ],
    },
    {
      kind: "redflags",
      heading: "8 znakov, že tvoja hesielná hygiena je v roku 2015",
      flags: [
        `Rovnaké heslo používaš na viacero účtov (banka, e-mail, e-shop).`,
        `Heslo obsahuje meno, dátum narodenia, mená detí / domáceho miláčika.`,
        `2FA máš len cez SMS, nie cez authenticator appku.`,
        `Heslá si pamätáš v hlave — to znamená, že sú slabé alebo opakované.`,
        `Heslá máš v Chrome / Safari bez master hesla zariadenia.`,
        `Nikdy si neoveril, či tvoje e-maily nie sú v úniku (haveibeenpwned.com).`,
        `Pri otázke „aké máš heslo na Gmail" vieš odpovedať bez správcu — heslo je slabé.`,
        `Tvoja recovery e-mailová adresa je rovnaká ako primárna — pri kompromitácii hlavnej, prídeš o všetko.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá hesielnej hygieny 2026",
      do: [
        `Začni s jedným správcom hesiel a postupne pridávaj weby — netreba urobiť všetko za deň.`,
        `Pre kritické účty (banka, e-mail, správca hesiel) zapni hardvérový kľúč YubiKey alebo passkey.`,
        `Raz za 3 mesiace skontroluj svoje e-maily na haveibeenpwned.com a zmeň heslá v kompromitovaných službách.`,
        `Recovery e-mail nech je iná adresa než primárna, ideálne s vlastným silným heslom + 2FA.`,
      ],
      dont: [
        `Nikdy nepoužívaj rovnaké heslo na dve služby — toto je jediné pravidlo, ktoré naozaj zmení tvoju bezpečnosť.`,
        `Nedávaj 2FA kódy nikomu po telefóne, ani „bankárovi", ani „technikovi". 6-miestny kód = tvoj účet.`,
        `Neukladaj master heslo do správcu hesiel v inom správcovi — kruh, ktorý nemá zmysel.`,
        `Nepoužívaj „prihlásiť cez Facebook" / „prihlásiť cez Google" na kritické služby — pri strate jedného účtu strácaš všetky pripojené.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — únik dát z e-shopu",
      story: `Pošta-SK e-mailom oznámi, že tvoj obľúbený e-shop unikol databázou. Tvoj e-mail + heslo sú teraz v dark webe. Heslo používaš aj na Gmail a Bitwarden.`,
      right_action: `Najprv zmeň heslo na Gmail (najkritickejšie — cez Gmail sa resetuje všetko ostatné). Potom master heslo Bitwardenu. Potom pomocou Bitwardenu prejdi 10 najdôležitejších účtov (banka, Facebook, Instagram, Apple, Microsoft) a každému daj nové 20-znakové heslo. Zapni 2FA všade, kde ešte nie je. Skontroluj haveibeenpwned.com — uvidíš, ktoré ďalšie úniky ťa zasahujú. Celkový čas: 1 hodina, výsledok: do týždňa máš lepšiu hesielnú hygienu ako 95 % populácie.`,
    },
  ],
  sources: [
    { label: "Have I Been Pwned — over úniky", url: "https://haveibeenpwned.com/" },
    { label: "Bitwarden — open-source správca hesiel", url: "https://bitwarden.com/" },
    { label: "SK-CERT — odporúčania pre heslá", url: "https://www.sk-cert.sk/" },
    { label: "Yubico — hardvérové kľúče", url: "https://www.yubico.com/" },
  ],
};
