import type { Course } from "./_schema";

export const romanceScamsCourse: Course = {
  slug: "romance-scams-catfishing",
  title: `Online láska, ktorá ťa pripraví o úspory`,
  tagline:
    'Catfishing pattern, „vojakovi v Sýrii treba peniaze" a 4 ďalšie príbehy: ako vyzerá online láska, ktorá ťa pripraví o úspory.',
  category: "vztahy",
  difficulty: "začiatočník",
  estimatedMinutes: 10,
  heroEmoji: "💔",
  publishedAt: "2026-04-26",
  updatedAt: "2026-04-26",
  sections: [
    {
      kind: "intro",
      heading: `Najškodlivejší typ podvodu — emócie + osamelosť`,
      body: `Romance scam (catfishing) cielí najmä rozvedených, ovdovených a osamelých ľudí 45+. Útočník si buduje vzťah cez Tinder, Facebook, Instagram alebo špecializované zoznamky 6 týždňov až 6 mesiacov. Až keď je obeť emocionálne investovaná, príde žiadosť o peniaze. Priemerná škoda v SR podľa polície je nad 5 000 EUR per obeť, často aj reputačná škoda (intímne fotky).`,
    },
    {
      kind: "example",
      heading: `Príbeh #1 — „vojak v Sýrii"`,
      visual: {
        kind: "text",
        label: `Konverzácia z Tinderu (10. týždeň)`,
        body: `Mark, 47, US Army major: „Drahá, mám problém. Naša jednotka v Sýrii má presun, ale môj satelitný telefón je pokazený a vojenský systém prevodov nefunguje. Potrebujem 3 200 USD na náhradné vybavenie. Hneď ako sa vrátim do USA o 2 mesiace, vrátim ti to aj s úrokmi. Verím ti."`,
      },
      commentary: `Klasický Sweetheart Scam pattern. „Vojak v zahraničí" — preto nemôže prísť osobne. „Pokazené vybavenie" — preto pýta peniaze. „Hneď ako sa vrátim" — preto nestihneš overiť. Skutoční vojaci nemajú problém s prevodmi, ich vybavenie zabezpečuje armáda.`,
    },
    {
      kind: "example",
      heading: `Príbeh #2 — „inžinier na ropnej plošine"`,
      visual: {
        kind: "text",
        label: `Konverzácia z Facebook Messenger (12. týždeň)`,
        body: `Tomás, 52, ropná plošina pri Nórsku: „Skončil sa mi kontrakt a chcem prísť za tebou do Bratislavy. Ale firma mi zadržala výplatu kým neuhradím colné poplatky 2 800 EUR za nástroje. Mohla by si mi to pomôcť uhradiť? Vrátim ti hneď ako prídem, peniaze mám na nórskom účte."`,
      },
      commentary: `Iný frame, rovnaký scenár. „Ropná plošina" — exotická lokácia, neoveriteľná. „Colné poplatky / nástroje / výplata zadržaná" — konkrétne, ale neoveriteľné. Žiadna firma neoveruje colný dlh cez peňaženku zamestnanca, ani cez peňaženky ich partnerov.`,
    },
    {
      kind: "example",
      heading: `Príbeh #3 — „chirurg, ktorému zomrel pacient"`,
      visual: {
        kind: "text",
        label: `Konverzácia, 18. týždeň`,
        body: `Daniel, 49, chirurg v Nemecku: „Drahá, mám obrovský problém. Môj pacient počas operácie zomrel a rodina ma žaluje. Advokát chce 8 500 EUR zálohu, inak prídem o licenciu. Musíš mi pomôcť, prosím — keď to vyhráme, vrátim ti to."`,
      },
      commentary: `„Profesionálna katastrofa" je psychologická páka — chcel by si pomôcť. Ale advokáti nikdy nepýtajú zálohu cez prevod od cudzieho človeka v zahraničí. Súdne spory v Nemecku riešia poistovne lekárov, nie partnerky obvinených.`,
    },
    {
      kind: "example",
      heading: `Príbeh #4 — „investícia spolu" (kombinácia s E5.8)`,
      visual: {
        kind: "text",
        label: `Konverzácia, 14. týždeň`,
        body: `Kristína, 39, finančná poradkyňa zo Singapuru: „Miláčik, mám pre nás plán. Môj broker má exkluzívny prístup k AI-trading platforme, ktorá zarobí 8 % mesačne. Prevedieme spolu 6 000 EUR a za rok si kúpime byt. Pošlem ti link, ja idem 6 000, ty 4 000, OK?"`,
      },
      commentary: `Romance scam často prechádza do investment scamu (pozri kurz Investičné podvody). „Spoločná investícia" je príkaz na presun cez zdielanú platformu — ktorá je fake. Útočník nikdy nevkladá svojich 6 000, len ich „ukáže" na falošnom screenshot-e. Reálne pošle iba obeť.`,
    },
    {
      kind: "example",
      heading: `Príbeh #5 — sextortion (intímne fotky)`,
      visual: {
        kind: "text",
        label: `E-mail, deň po video-hovore`,
        body: `„Mám záznam z nášho video-hovoru. Ak nedostanem 1 200 EUR v Bitcoine do 48 hodín, video pošlem všetkým tvojim Facebook kontaktom a tvojej rodine. Tu je BTC adresa: bc1qxy..."`,
      },
      commentary: `Sextortion často nadväzuje na romance scam alebo „náhodné" video flirt-y. Útočník nahral konverzáciu (alebo ju len tvrdí). Ak zaplatíš, žiada ďalšie. Správny postup: nezaplatiť, nahlásiť polícii (158) a NCKB. Útočník nemá pohodlnú metódu, ako kontakty získať — väčšinou blufuje.`,
    },
    {
      kind: "redflags",
      heading: "Indície romance scamu",
      flags: [
        `Profil príliš dokonalý — model alebo vojak v uniforme, jediná-dve fotky.`,
        `Nikdy nemôže video-call bez výhovorky („zlý signál", „pracujem v noci").`,
        `Žije ďaleko, často „v zahraničí", a stále plánuje prísť.`,
        `Po pár týždňoch začne hovoriť o láske, manželstve, spoločnej budúcnosti.`,
        `Príde nečakaná „krízová situácia" — peniaze, doprava, lekár.`,
        `Žiadosť o prevod cez Western Union, krypto, alebo darčekové karty (iTunes, Google Play).`,
        `Píše s gramatickými chybami, ktoré nesedia s deklarovaným pôvodom (americký lekár s česko-slovenskou syntaxou).`,
        `Obrátený search obrázku ti ukáže, že fotka je ukradnutá z iného účtu.`,
      ],
    },
    {
      kind: "checklist",
      heading: "Rýchly test — je tvoj online vzťah real?",
      items: [
        {
          good: true,
          text: `Mali sme video-hovor, kde som videla/videl tvár live (nie nahrávku).`,
        },
        { good: true, text: `Stretli sme sa osobne aspoň raz.` },
        { good: true, text: `Mám viac ako 5 fotiek z rôznych prostredí, ktoré navzájom súhlasia.` },
        {
          good: false,
          text: `Pýtal/a si o peniaze (v akejkoľvek forme — pôžička, investícia, dar).`,
        },
        { good: false, text: `Vždy je „skoro" osobné stretnutie, ale niečo prekazí.` },
        {
          good: false,
          text: `Posielam mu/jej peniaze cez krypto, Western Union, darčekové karty.`,
        },
        { good: false, text: `Vyhýba sa video-callu, alebo robí len krátky.` },
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá, ktoré ťa zachránia",
      do: [
        `Pred akýmkoľvek prevodom — fyzické stretnutie alebo aspoň dlhý live video-call.`,
        `Reverse image search profilových fotiek (TinEye, Google Images).`,
        `Zdieľaj rozhovory s priateľom alebo rodinou — vonkajší pohľad odhalí pattern.`,
        `Pri sextortion nezaplatiť — nahlásiť polícii (158) a NCKB.`,
        `Pri podozrení nahlás profil platforme (Tinder, Bumble, FB Dating).`,
      ],
      dont: [
        `Neposielať peniaze niekomu, koho si nevidel/a osobne, bez výnimky.`,
        `Nezdieľať intímne fotky / video — žiadny krásny vzťah ich nevyžaduje na týždeň 6.`,
        `Nepripájať sa k „spoločnej investičnej platforme", ktorú odporúča online partner.`,
        `Neuplácať sextortion — vyžiada si ďalšiu sumu, a ďalšiu.`,
        `Nezatajiť to rodine zo studu — práve to útočník chce, aby si zostal/a izolovaný/á.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — 4 mesiace komunikácie, prvá žiadosť",
      story: `Komunikuješ s „Markom", americkým inžinierom v Saudskej Arábii, už 4 mesiace. Krásna konverzácia, hovorí o spoločnej budúcnosti v Bratislave. Dnes prišla správa: „Drahá, môj otec je v nemocnici, urgentná operácia, potrebujem 4 800 USD do 24 hodín. Pošlem ti to späť hneď ako sa vrátim. Verím ti, ty si jediná, na koho sa môžem obrátiť."`,
      right_action: `Žiadne peniaze. Reverse image search jeho fotiek (90 % šanca, že sú ukradnuté). Volaj americkú ambasádu — „American citizens services" reálne pomáha občanom v núdzi, vrátane lekárskej krízy. Ak Mark protestuje, alebo zmizne — bol to scam celý čas. Povedz to rodine alebo priateľovi, neoľutuješ.`,
    },
  ],
  sources: [
    { label: `PZ SR — varovania pred romance scam`, url: "https://www.minv.sk/" },
    { label: `NCKB — sociálne inžinierstvo`, url: "https://www.sk-cert.sk/" },
    {
      label: `FTC — Romance Scams (US, ale univerzálny pattern)`,
      url: "https://consumer.ftc.gov/",
    },
  ],
};
