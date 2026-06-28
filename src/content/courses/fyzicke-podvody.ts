import type { Course } from "./_schema";

export const fyzickePodvodyCourse: Course = {
  slug: "fyzicke-podvody",
  title: `Fyzické podvody — ako vás okradnú „naživo"`,
  tagline:
    '„Vy ste náš nový sused", „som z plynární", podvrhnutá platobná páska v reštaurácii — 6 podvodov, ktoré sa dejú naživo.',
  category: "obecne",
  difficulty: "začiatočník",
  estimatedMinutes: 8,
  heroEmoji: "🚪",
  publishedAt: "2026-04-30",
  updatedAt: "2026-04-30",
  sections: [
    {
      kind: "intro",
      heading: "Pred obrazovkou si ostražitý. Čo pri dverách?",
      body: `Phishing (podvodné vylákanie prihlasovacích či platobných údajov), smishing (phishing cez SMS), vishing (phishing cez telefonát) — väčšina ľudí vie, že hrozby číhajú online. Lenže podvody existujú aj v realite, tvárou v tvár. A práve tu zlyhávajú aj tí, ktorí by „na e-mail nenaleteli". Fyzický kontakt buduje dôveru rýchlejšie než akákoľvek správa — útočník vidí tvoju reakciu, prispôsobuje sa v reálnom čase a využíva spoločenský tlak. Výsledok: rozhodneš sa rýchlejšie a menej kriticky. Táto kapitola ti ukáže najčastejšie scenáre a jednoduchú obranu.`,
    },
    {
      kind: "example",
      heading: `Scenár #1 — „Kontrola plynu"`,
      visual: {
        kind: "text",
        label: "Pri dverách stojí muž v oranžovej veste",
        body: `„Dobrý deň, volám sa Novák, SPP technik. Evidujeme únik plynu v bloku. Potrebujem sa pozrieť na váš merač — je to len minúta. Máte doma niekoho dospelého?"`,
      },
      commentary: `Reálny technik plynárne príde vždy po predchádzajúcom oznámení (SMS, list, príp. email). Nikdy nemá núdzovú kontrolu „len tak". Ak nemáte avízo, zavolajte zákaznícku linku SPP/ZSE/MH Teplárenský priamo — nie číslo z vizitky, ktorú vám ukáže.`,
    },
    {
      kind: "example",
      heading: `Scenár #2 — Výherca bez losovania`,
      visual: {
        kind: "text",
        label: "V schránke nájdete obálku so zlatým písmom",
        body: `„Blahoželáme! Boli ste vyžrebovaní ako výherca Honda Civic v hodnote 18 900 EUR. Na prevzatie výhry je potrebné uhradiť manipulačný poplatok 89 EUR a dostaviť sa osobne na adresu…"`,
      },
      commentary: `Skutočná výhra nikdy nevyžaduje platbu vopred. „Manipulačný poplatok", „notársky poplatok" ani „DPH na výhru" neexistujú. Ak ste sa nezúčastnili súťaže, nemôžete vyhrať. List vyhodíte, poplatok nezaplatíte.`,
    },
    {
      kind: "example",
      heading: `Scenár #3 — Falošný inšpektor`,
      visual: {
        kind: "text",
        label: "Na parkovisku vás zastaví muž v uniforme",
        body: `„Dobrý deň, inšpekcia životného prostredia. Váš vozidlový registračný list nám hlási emisnú chybu. Pokuta je 120 EUR, ale dám vám 60 EUR v hotovosti na mieste a ide sa ďalej."`,
      },
      commentary: `Inšpektori vydávajú pokarhania len úradnou cestou — nikdy nevyberajú hotovosť na ulici. Ponuka „zľavy za hotovosť" je univerzálny znak korupcie alebo podvodu. Pýtajte si preukaz totožnosti + služobný odznak a zavolajte na príslušný úrad.`,
    },
    {
      kind: "example",
      heading: `Scenár #4 — Hra na ulici (3-card monte a príbuzní)`,
      visual: {
        kind: "text",
        label: "Skupinka ľudí okolo stola pri turistickom chodníku",
        body: `Hrá sa „nájdi kráľovnú". Jeden hráč pred vami vyhrá 50 EUR. Predavač vás vyzve, že tiež môžete. Vsadíte 20 EUR. Karta, ktorú si pamätáte, zrazu nie je na mieste.`,
      },
      commentary: `Všetci „náhodní výhercovia" okolo sú komplicovia. Hra je zmanipulovaná — nevyhráte nikdy. Rovnaký vzor funguje pri „náprstkovej hre" či „stroj-na-výhry v stane". Pravidlo: ak okolostojaci vyhráva pred vami, je to súčasť inscenácie.`,
    },
    {
      kind: "redflags",
      heading: "Varovné signály pri fyzickom kontakte",
      flags: [
        `Návšteva bez predchádzajúceho avíza od „technika" alebo „inšpektora".`,
        `Požiadavka na hotovostnú platbu na mieste — poplatok, pokuta, záloha.`,
        `Výhra v súťaži, do ktorej ste sa nezapísali.`,
        `Tlak konať rýchlo: „inam ideme", „platnosť výhry vyprší o hodinu".`,
        `Preukaz, ktorý „nemôžete odfotiť" alebo si ho neviete overiť.`,
        `Cudzinec v núdzi, ktorý potrebuje hotovosť a potom sľubuje vrátiť.`,
        `Ponuka „zľavy za hotovosť" namiesto riadneho dokladu.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Ako sa brániť v reálnom živote",
      do: [
        `Pýtajte si preukaz totožnosti a služobný odznak — každý oprávnený technik či inšpektor ich má.`,
        `Overte si číslo zákazníckej linky sami (z webu spoločnosti) a zavolajte cez neho.`,
        `Nechajte návštevníka počkať vonku a najprv si ho overte, kým mu otvoríte.`,
        `Výherné oznámenia porovnajte s oficiálnym webom spoločnosti.`,
        `Akúkoľvek podozrivú ponuku nahláste na www.minv.sk alebo 158.`,
      ],
      dont: [
        `Nevpúšťajte „technikov" bez avíza od spoločnosti.`,
        `Nikdy neplaťte hotovosť na mieste bez riadneho dokladu (paragon, rozhodnutie).`,
        `Nedávajte peniaze cudzincom v núdzi na ulici — kontaktujte pre nich mestskú políciu.`,
        `Nezúčastňujte sa hier na ulici — vždy sú nečestné.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Sobotné predpoludnie — zvonček",
      story: `Práve ste doma sami. Zazvonili. Cez kukátko vidíte muža v reflexnej veste s tabletom. „Dobrý deň, technik SVB, kontrola plynovodného potrubia po havárii u susedov. Potrebujem prístup do panelu na chodbe a zobrať vzorku z vášho kohútika."`,
      right_action: `Povedzte: „Počkajte, zavolám si to overiť." Zavriete dvere (nezamknete ich, viete ich otvoriť). Cez Google nájdete zákaznícku linku svojho plynárenského operátora. Zavoláte — a zistíte, že žiadna havarijná kontrola nebola plánovaná. Muža cez dvere informujete, že nevpustíte nikoho bez potvrdenia od spoločnosti, a zavoláte 158.`,
    },
  ],
  sources: [
    { label: "PZ SR — podvody a bezpečnosť", url: "https://www.minv.sk/" },
    { label: "SK-CERT — podvodné techniky", url: "https://www.sk-cert.sk/" },
    {
      label: "Spotrebiteľský poradca — inšpektori",
      url: "https://www.soi.sk/",
    },
  ],
};
