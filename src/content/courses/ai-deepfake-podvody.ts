import type { Course } from "./_schema";

export const aiDeepfakeCourse: Course = {
  slug: "ai-hlasove-a-deepfake-podvody",
  title: `AI deepfake podvody — falošný hlas, falošná tvár, skutočná škoda`,
  tagline:
    '„Mama, prevedz mi 800 €" hlasom tvojho dieťaťa: ako fungujú klonovanie hlasu a deepfake (umelo vygenerované falošné video či hlas) a ako ich rozoznáš naživo.',
  category: "voice",
  difficulty: "pokročilý",
  estimatedMinutes: 7,
  heroEmoji: "🤖",
  publishedAt: "2026-04-30",
  updatedAt: "2026-04-30",
  sections: [
    {
      kind: "embed",
      heading: "Pozri si na úvod: ako rozoznať deepfake",
      audio: {
        provider: "youtube",
        url: "https://www.youtube.com/watch?v=q1cnrZO95TE",
        title: "Ako rozoznať deepfake videá?!",
        sourceName: "Zmudri",
        sourceUrl: "https://www.youtube.com/watch?v=q1cnrZO95TE",
        description:
          "Edukačné video slovenskej vzdelávacej platformy Zmudri — ako rozoznať deepfake.",
      },
    },
    {
      kind: "intro",
      heading: "Klonovanie hlasu: od sci-fi po bežný podvod",
      body: `Ešte v roku 2020 bolo klonovanie hlasu doménou hollywoodskych štúdií. Dnes ho zvládne ktokoľvek s 30-sekundovým klipom z TikToku, YouTube alebo Instagram reels — zadarmo, cez desiatky verejných nástrojov. Výsledok je hlas, ktorý znie identicky ako váš syn, vaša mama, váš CEO. Deepfake video ide ešte ďalej: reálne vyzerajúce videohovory, na ktorých „vidíte" tvár osoby, ktorá skutočne nie je na druhom konci. Tieto technológie nie sú budúcnosť — sú súčasnosť. A útočníci ich používajú každý deň.`,
    },
    {
      kind: "example",
      heading: `Scenár #1 — Klonovaný hlas syna`,
      visual: {
        kind: "call",
        caller: "Martin (syn)",
        number: "+421 9xx xxx xxx",
        hint: `„Otecko, to som ja. Mal som nehodu, som v nemocnici v Brne. Nemám doklady, potrebujem 1 500 EUR hneď. Prosím, preveď to na toto číslo účtu a nikomu nehovor, kým neprídem domov."`,
      },
      commentary: `Útočník stiahol hlasovú nahrávku z verejného videa, naklonil ju za menej ako 2 minúty. Rodičia počujú skutočný hlas syna — mozog to nedokáže odfiltrovať v stresovej situácii. Obrana: dopredu si dohodnite „rodinné heslo". Ak ho syn nevie povedať, nie je to syn.`,
    },
    {
      kind: "example",
      heading: `Scenár #2 — CEO deepfake videohovor`,
      visual: {
        kind: "call",
        caller: "CEO — Ján Horváth (videhovor)",
        number: "Microsoft Teams — overená organizácia",
        hint: `Vidíte tvár svojho riaditeľa. Hovorí: „Máme urgentný akvizičný deal. Previesť 85 000 EUR na escrow účet dnes do 14:00. Diskrétnosť prosím — neinformujte finančnú."`,
      },
      commentary: `V roku 2024 spoločnosť v Hongkongu takto prišla o 25 miliónov USD. Deepfake video na Teams-hovore s falošnou tvárou CEO. Overenie: zvolajte fyzické stretnutie alebo zavolajte CEO na iný kanál (mobil). Finančné prevody nad istú sumu musia mať vždy druhý schvaľovací podpis.`,
    },
    {
      kind: "example",
      heading: `Scenár #3 — Politický deepfake na sociálnych sieťach`,
      visual: {
        kind: "text",
        label: "Video zdieľané na Facebooku, 80k zdieľaní",
        body: `„ŠOKUJÚCE: Premiér Fico priamo povedal, že všetky bankové vklady budú v pondelok zmrazené. Preveďte peniaze do krypta IHNEĎ" — pod videom je link na kryptoburzu.`,
      },
      commentary: `Deepfake videá politikov a celebrít sú vytvárané masovo na šírenie paniky alebo propagáciu podvodov. Overte zdroj priamo na oficiálnom webe vlády alebo spravodajských agentúr (TASR, SME, Denník N). Ak video nevydala overená inštitúcia — je to fake.`,
    },
    {
      kind: "redflags",
      heading: "Ako spoznať AI deepfake",
      flags: [
        `Neprirodzene rýchle žmurkanie alebo neprirodzená mimika pri videu.`,
        `Okraje tváre/vlasov sa pri pohybe rozmazávajú alebo „trepocú".`,
        `Hlas znie roboticky na emocionálnych vrcholoch — AI sa ťažko učí plakať alebo smiať.`,
        `Urgentná žiadosť o peniaze kombinovaná s „nehovor nikomu".`,
        `Video alebo hovor prichádza z neobvyklého kontaktu alebo platformy.`,
        `Scenár, ktorý predtým nikdy nenastal: „syn v zahraničí bez dokladov".`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Obrana v ére AI klonov",
      do: [
        `Dohodnite si rodinné heslo — frázu, ktorú vie len rodina. Ak hovorí „syn" a heslo nevie, zaveste.`,
        `Pri akejkoľvek žiadosti o peniaze cez nový kanál zavolajte späť na uložené číslo z kontaktov.`,
        `Videá politikov a celebrít o peňazích overujte priamo na ich verifikovaných profiloch.`,
        `Vo firme zaviesť pravidlo: finančné prevody nad X EUR bez písomného potvrdenia cez firemný email = nie.`,
        `Obmedzte verejné hlasové klipy — dlhé videá na sociálnych sieťach sú surovinou pre klonovanie.`,
      ],
      dont: [
        `Neposielajte peniaze na základe telefonátu od „príbuzného v núdzi" bez overenia.`,
        `Nezverejňujte deepfake videá „zo zábavy" — pomáhate šíriť dezinformácie, aj keď to viete.`,
        `Nepodliehajte časovému tlaku — urgencia je zámerná zbraň. „Stihnem to aj o hodinu."`,
      ],
    },
    {
      kind: "scenario",
      heading: "Nedeľný obed — telefón zavibruje",
      story: `Sedíte pri obede. Zavolá číslo vášho syna. Hovorí „tato" a vysvetluje, že je vo Viedni zastihnutý bez peňaženky po nehodičke. Počujete jeho hlas, dokonca aj jeho typický smiech pri nervozite. Pýta si 900 EUR prevodom hneď.`,
      right_action: `Zavesíte. Vytočíte syna na jeho čísle z kontaktov. Syn zdvíha z domu — je v poriadku a o ničom nevie. Nahlásite hovor na 158 (podvod, klonovanie hlasu) a upozorníte príbuzných.`,
    },
  ],
  sources: [
    { label: "Europol — AI-enabled fraud 2024", url: "https://www.europol.europa.eu/" },
    {
      label: "Hong Kong deepfake 25M USD case",
      url: "https://www.bbc.com/news/business-68402437",
    },
    { label: "SK-CERT — AI a kybernetická bezpečnosť", url: "https://www.sk-cert.sk/" },
  ],
};
