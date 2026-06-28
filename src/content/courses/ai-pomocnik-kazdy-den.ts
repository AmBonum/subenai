import type { Course } from "./_schema";

export const aiPomocnikCourse: Course = {
  slug: "ai-pomocnik-kazdy-den",
  title: `AI asistent — ako z neho dostať presne to, čo chceš`,
  tagline:
    "Preklad, recept, list lekárovi alebo úradu — AI to zvládne za 10 sekúnd, keď vieš, ako sa opýtať. 6 šablón promtov pre bežný život.",
  category: "obecne",
  difficulty: "začiatočník",
  estimatedMinutes: 9,
  heroEmoji: "🤝",
  publishedAt: "2026-04-30",
  updatedAt: "2026-04-30",
  sections: [
    {
      kind: "intro",
      heading: "AI nie je vševed — ale veľa vie",
      body: `Predstav si asistenta, ktorý prečítal milióny kníh, článkov a webstránok, hovorí takmer každým jazykom a je dostupný 24 hodín denne zadarmo. To je AI asistent — ChatGPT, Gemini alebo Microsoft Copilot. Vie napísať email, preložiť text, vysvetliť pojmy, navrhnúť recept, pomôcť s úradným listom alebo pripraviť otázky pre lekára. Lenže — nie je vševed. Niekedy si niečo vymyslí (odborníci tomu hovoria „halucinácie"). Nedokáže zavolať záchranku, neskontroluje tvoje zdravie a nie je zodpovedný za chyby. Táto kapitola ti ukáže, kedy sa na AI spoľahnúť a kedy radšej siahnuť po odborníkovi.`,
    },
    {
      kind: "example",
      heading: "5 konkrétnych situácií, kde AI ušetrí čas",
      visual: {
        kind: "text",
        label: "Príklady otázok, s ktorými AI pomôže",
        body: `1. „Prelož tento text z angličtiny do slovenčiny: [vlož text]"
2. „Navrhni mi jednoduchý recept na večeru z brokolice, ryže a kuracieho mäsa"
3. „Pomôž mi napísať sťažnostný list na servis, kde mi nepravdivo opísali auto"
4. „Vysvetli mi čo znamená: hypertenzia II. stupňa" (pojem, nie moja diagnóza)
5. „Napíš 5 otázok, ktoré sa opýtam lekára pri kontrole pečene"`,
      },
      commentary: `Všetky tieto situácie majú spoločné jedno: ide o všeobecnú radu, preklad, návrh alebo vysvetlenie pojmu. Tam AI exceluje. Osobná zdravotná diagnóza, právne poradenstvo ani finančné investičné rozhodnutia — to si nechaj na odborníka.`,
    },
    {
      kind: "example",
      heading: "Ako sa dobre opýtať — 3 zložky dobrej otázky",
      visual: {
        kind: "text",
        label: "Porovnanie slabej a skvelej otázky",
        body: `Slabá otázka:
„Recept"

Lepšia otázka:
„Daj mi recept na tortu"

Skvelá otázka:
„Navrhni mi jednoduchý recept na čokoládovú tortu pre 10 ľudí. Nemám vajcia — nahraď ich niečím iným. Kroky napíš jednoducho, som začiatočník."`,
      },
      commentary: `Tri zložky dobrej otázky: (1) Kontext — kto si a akú máš situáciu, (2) Úloha — čo presne chceš, (3) Formát — ako má odpoveď vyzerať. Čím viac AI vie o tvojej situácii, tým presnejšia bude odpoveď. Nie si otravný — chatbot to zvláda.`,
    },
    {
      kind: "checklist",
      heading: "Kedy AI pomôže — a kedy treba odborníka",
      items: [
        {
          good: true,
          text: `Prekladanie textov, receptov, pokynov v aplikácii, návodov v cudzom jazyku.`,
        },
        {
          good: true,
          text: `Písanie listov, sťažností, odpovedí na emaily — AI navrhne draft, ty ho skontroluješ a opravíš.`,
        },
        {
          good: true,
          text: `Vysvetlenie cudzích pojmov — medicínskych, právnych, technických — zrozumiteľným jazykom.`,
        },
        {
          good: true,
          text: `Príprava otázok pred návštevou lekára, advokáta alebo poisťovne.`,
        },
        {
          good: true,
          text: `Návrhy receptov, cestovných itinerárov, darčekových nápadov alebo scenárov pre oslavu.`,
        },
        {
          good: false,
          text: `Nepoužívaj AI na diagnostiku svojich chorôb — môže si veci vymýšľať. Lekár pozná tvoj celý zdravotný stav.`,
        },
        {
          good: false,
          text: `Nezveraj AI finančné rozhodnutia (kam investovať, či zobrať úver) — sú príliš individuálne.`,
        },
        {
          good: false,
          text: `Neplánuj s AI registráciu firmy, testament ani súdny spor bez overenia výsledku u notára alebo advokáta.`,
        },
      ],
    },
    {
      kind: "redflags",
      heading: "Kedy si odpoveď AI overiť",
      flags: [
        `AI uvádza konkrétne čísla, mená alebo dátumy bez odkazu na zdroj — možno si ich vymyslela.`,
        `Odpoveď znie sebavedomo, ale téma je zdravotná, právna alebo finančná — overenie u odborníka povinné.`,
        `AI odkazuje na konkrétnu webstránku — skontroluj, či URL naozaj existuje a patrí dôveryhodnej organizácii.`,
        `AI opisuje konkrétnu osobu alebo firmu — tieto údaje môžu byť zastarané alebo zmiešané z rôznych zdrojov.`,
        `Odpoveď je príliš krátka na zložitú otázku — upresni otázku a spýtaj sa znova.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Elena — recept vs. lieky",
      story: `Elena (72) sa naučila používať Gemini na mobile. Najprv sa opýta: „Navrhni mi sladší hrnčekový koláč bez cukru — mám diabetickú diétu." Dostane výborný recept s ovocím a stéviou. Povie si: „Toto je skvelé, opýtam sa aj na lieky." Napíše: „Mám predpísaný Metformin a Amlodipín — môžem ich kombinovať s grapefruitovým džúsom?"`,
      right_action: `Recept bez cukru — bezpečný, AI v tom vyniká. Interakcia liekov s jedlom — stop. Grapefruit mení vstrebávanie niektorých liekov (vrátane Amlodipínu) a AI môže dať nepresný alebo zastaraný údaj. Správny postup: Elena túto otázku položí lekárnikovi pri výdaji liekov alebo zavolá na bezplatnú informačnú linku svojej zdravotnej poisťovne.`,
    },
  ],
  sources: [
    {
      label: "UNESCO — AI gramotnosť a vzdelávanie",
      url: "https://www.unesco.org/en/artificial-intelligence",
    },
    {
      label: "EU AI Office — zodpovedné použitie AI",
      url: "https://digital-strategy.ec.europa.eu/en/policies/ai-office",
    },
    {
      label: "OpenAI ChatGPT — pomocná stránka",
      url: "https://help.openai.com/",
    },
    {
      label: "Google Gemini — aplikácia",
      url: "https://gemini.google.com/",
    },
  ],
};
