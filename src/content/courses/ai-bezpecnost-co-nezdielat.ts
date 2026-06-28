import type { Course } from "./_schema";

export const aiBezpecnostCourse: Course = {
  slug: "ai-bezpecnost-co-nezdielat",
  title: `AI a bezpečnosť — čo chatbotu písať a čo nie`,
  tagline:
    "ChatGPT, Gemini a Copilot sú šikovné nástroje. Aké údaje im NIKDY nedávať a ako bezpečne písať promty bez úniku citlivých dát.",
  category: "obecne",
  difficulty: "začiatočník",
  estimatedMinutes: 8,
  heroEmoji: "🛡️",
  publishedAt: "2026-04-30",
  updatedAt: "2026-04-30",
  sections: [
    {
      kind: "intro",
      heading: "AI asistenti sú výborní pomocníci — ale aj cudzinci",
      body: `ChatGPT, Gemini, Copilot — milióny ľudí ich dnes používajú každý deň na písanie emailov, prekladanie textov alebo hľadanie rád. Sú rýchle, dostupné zadarmo a väčšinou dávajú dobrú odpoveď. Lenže každý text, ktorý chatbotu napíšeš, odchádza na server v cudzej krajine — väčšinou v USA alebo Ázii. Firmy ako OpenAI, Google alebo Microsoft majú právo tieto texty použiť na zlepšenie svojej AI. Nie je to podvod — je to súčasť podmienok, s ktorými súhlasíme. Problém nastáva, keď napíšeme niečo, čo by sme cudziemu človeku na ulici nikdy nepovedali: rodné číslo, heslo k banke, lekársku diagnózu alebo firemné tajomstvo. Táto kapitola ti ukáže, kde je hranica.`,
    },
    {
      kind: "redflags",
      heading: "Toto chatbotu NIKDY nepísať",
      flags: [
        `Rodné číslo, číslo občianskeho preukazu alebo pasu — stačí na krádež identity.`,
        `Heslo k emailu, Facebooku, banke alebo akémukoľvek účtu — ani v otázke „navrhni mi lepšie heslo, moje je X".`,
        `Číslo platobnej karty, CVV kód alebo IBAN bankového účtu.`,
        `Celé meno + adresa + dátum narodenia naraz — dohromady to stačí podvodníkovi na veľa.`,
        `Lekárska diagnóza s uvedením mena — „mám cukrovku, som Mária Kováčová, trvalé bydlisko..."`,
        `Firemné dokumenty, zmluvy, cenníky, interné dáta — zdieľaním porušíš povinnosť mlčanlivosti.`,
        `Fotografie dokladov — nikdy ich nevkladaj do chatbota ani do žiadnej inej nezabezpečenej online služby.`,
      ],
    },
    {
      kind: "example",
      heading: `Marta pomáha s formulárom — a povie príliš veľa`,
      visual: {
        kind: "text",
        label: "Text, ktorý Marta vložila do ChatGPT",
        body: `„Pomôž mi vyplniť žiadosť o príspevok. Tu sú moje údaje: Mária Kováčová, rodné číslo 595412/1234, trvalý pobyt Slovenská 12, 08001 Prešov, diagnóza diabetes mellitus II. stupňa."`,
      },
      commentary: `Marta chcela len pomôcť s formulárom — a dala chatbotu všetko naraz: meno, rodné číslo, adresu aj zdravotný stav. Správny postup je opýtať sa len na štruktúru formulára. „Aké kolonky sú povinné v žiadosti o príspevok na bývanie?" — a osobné údaje doplníš až na papieri, nie v chatbote.`,
    },
    {
      kind: "checklist",
      heading: "Bezpečné návyky pri práci s AI",
      items: [
        {
          good: true,
          text: `Pýtaj sa na rady a návody, nie na pomoc s vyplňovaním formulárov s osobnými dátami.`,
        },
        {
          good: true,
          text: `Pred vložením dokumentu skontroluj, či neobsahuje rodné čísla alebo čísla kont — anonymizuj ich.`,
        },
        {
          good: true,
          text: `V ChatGPT môžeš vypnúť trénovanie na tvojich dátach: Nastavenia → Ovládanie dát → vypni „Zlepšiť modely".`,
        },
        {
          good: true,
          text: `Používaj AI na všeobecné rady — recepty, preklady, vysvetlenia pojmov. Tam je bezpečná.`,
        },
        {
          good: false,
          text: `Neskladaj do chatbota celé meno + adresu + číslo dokladu naraz — ani v príklade, ani v otázke.`,
        },
        {
          good: false,
          text: `Nepoužívaj firemný AI chatbot na súkromné veci a naopak — firemné dáta patria firme.`,
        },
        {
          good: false,
          text: `Nekriticky sa nespoliehaj na odpoveď AI pri zdravotných, právnych a finančných otázkach — vždy over u odborníka.`,
        },
      ],
    },
    {
      kind: "do_dont",
      heading: "Ako podvodníci zneužívajú AI",
      do: [
        `Keď dostaneš email alebo správu s perfektnou slovenčinou bez chýb — daj si pozor. Phishing (podvodné vylákanie prihlasovacích či platobných údajov) sa dnes píše AI a neprezradia ho pravopisné chyby.`,
        `Chatbot na webe banky alebo e-shopu, ktorý ťa odkazuje na „inú stránku" — vždy skontroluj adresu v prehliadači.`,
        `AI zákaznícke centrum podvodnej stránky vyzerá rovnako ako pravé — overuj firmu podľa URL, nie podľa vzhľadu chatu.`,
        `Ak ti chatbot ponúkne „zľavu po zadaní čísla karty" — okamžite zavrieš okno. Legitímny chatbot kartu nikdy nepýta.`,
      ],
      dont: [
        `Nezadávaj kartové dáta do žiadneho chatbota — ani takého, čo vyzerá presne ako tvoja banka.`,
        `Neklikaj na tlačidlá v chate, ktoré ťa presmerujú mimo overenú stránku banky alebo e-shopu.`,
        `Nepredpokladaj, že „živý chat" na webe je vždy skutočný človek — môže to byť AI plne pod kontrolou podvodníka.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Ján chce pomôcť vnukovi — ale zájde ďalej",
      story: `Ján (68) sa naučil ChatGPT od vnuka. Začal ho používať — zhrnutia kníh, preklady, recepty. Všetko funguje výborne. Potom si povie: „Mám zdravotnú kartu, chcem ju preložiť do angličtiny na cestu do Rakúska. Odfotím ju a vložím do chatbotu."`,
      right_action: `Zhrnutie knihy alebo recept — výborne, bez rizika. Zdravotná karta s menom, rodným číslom a diagnózami — stop. Správny postup: Ján skopíruje iba samotný text diagnózy bez osobných polí a preloží len ten. Meno, rodné číslo a dátum narodenia preloží ručne pri tlači. Tak má anglický preklad bez zdieľania citlivých dát.`,
    },
  ],
  sources: [
    {
      label: "European AI Act — práva občanov",
      url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    },
    {
      label: "GDPR — ochrana osobných údajov EÚ",
      url: "https://gdpr.eu/",
    },
    {
      label: "OpenAI — nastavenia súkromia",
      url: "https://openai.com/security-and-privacy",
    },
    {
      label: "ENISA — kybernetická bezpečnosť a AI",
      url: "https://www.enisa.europa.eu/",
    },
  ],
};
