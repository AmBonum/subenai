import type { Course } from "./_schema";

export const pribehyObetiCourse: Course = {
  slug: "pribehy-skutocnych-obeti",
  title: "Príbehy Slovákov, ktorí prišli o peniaze online",
  tagline:
    "4 anonymizované prípady z roku 2025–2026: čo sa stalo, koľko stálo, ako sa dalo predísť.",
  category: "obecne",
  difficulty: "začiatočník",
  estimatedMinutes: 12,
  heroEmoji: "📖",
  relatedQuestionsCategory: "scenario",
  publishedAt: "2026-05-20",
  updatedAt: "2026-05-20",
  sections: [
    {
      kind: "intro",
      heading: "Príbehy Slovákov, ktorí prišli o peniaze — aby si neopakoval ich chyby",
      body: `Príbehy obetí podvodov sú najlepšia učebnica, lebo presviedčajú lepšie ako teória. „Mne sa to nestane" je presne to, čo si pred podvodom mysleli aj ľudia v týchto 4 príbehoch — inžinier IT, učiteľka, dôchodca, finančná riaditeľka. Stratili spolu 87 000 €. Ich príbehy sú anonymizované, ale zostavené podľa reálnych prípadov, ktoré v rokoch 2025 – 2026 riešili NCKB, polícia SR a slovenské banky. Každý príbeh končí konkrétnym ponaučením — čo sa malo urobiť inak.`,
    },
    {
      kind: "example",
      heading: `Príbeh #1 — Tatiana (34, finančná manažérka): 4 800 € z banky cez „bezpečnostnú výzvu"`,
      visual: {
        kind: "sms",
        sender: "VUB",
        body: `VUB: Pokus o neopravnenu transakciu 4 800 EUR z Vasho uctu. Pre okamzite zablokovanie zavolajte na +421 2 4863 1111.`,
        time: "piatok 21:12",
      },
      commentary: `Tatiana zavolala a „bankár" jej cez pol hodinu „presúval peniaze na bezpečný účet" cez jej internetbanking (internetové bankovníctvo) — diktoval kroky, ona klikala. Suma 4 800 € išla na účet nastrčenej osoby v Bulharsku. Ponaučenie: VÚB nikdy nežiada presun peňazí. Vždy zaves a volaj na číslo z karty.`,
    },
    {
      kind: "example",
      heading: `Príbeh #2 — Peter (52, IT inžinier): 18 000 € z krypto „investície"`,
      visual: {
        kind: "instagram",
        account: "elena_trader_eu",
        verified: false,
        body: `Hľadám 5 ľudí na 1:1 krypto mentoring. Vlani môjmu klientovi z Brna 24 000 € za 4 mesiace 💎 DM ✉️`,
        cta: "Poslať správu",
      },
      commentary: `Peter (skúsený IT-čkár, na obyčajný phishing (podvodné vylákanie prihlasovacích či platobných údajov) by nenaletel) sa s „Elenou" rozprával 6 týždňov. Začala s 500 €, „zisk" 12 % za týždeň na falošnej platforme. Doplatil 17 500 €. Pri pokuse o výber: „daňový poplatok 4 000 € dopredu". Vtedy mu zacvaklo. Ponaučenie: pig butchering (dlhodobý investičný podvod budovaný cez vzťah). Žiadna reálna investícia nedáva 12 % týždenne. Žiadny „mentor" nehľadá klientov cez DM.`,
    },
    {
      kind: "example",
      heading: `Príbeh #3 — pán Jozef (76, dôchodca): 12 200 € pre „vnuka v nemocnici"`,
      visual: {
        kind: "call",
        caller: "neznáme číslo",
        number: "+421 940 222 555",
        hint: "AI klon hlasu vnuka — zostrihaný z TikTok stories",
      },
      commentary: `Volal „vnuk Maroš" — hlas presne ako jeho, plač, autonehoda na D1, 12 200 € pre advokáta, „kuriér Pavol" príde za hodinu k bytu. Pán Jozef vybral z banky úspory, odovzdal cudziemu mužovi obálku. Skutočný Maroš bol na pive s kamarátmi. Polícia peniaze nenašla. Ponaučenie: rodinné kontrolné slovo (vopred dohodnuté), žiadne hotovosti kuriérovi.`,
    },
    {
      kind: "example",
      heading: `Príbeh #4 — Mária (41, marketingová riaditeľka): 52 000 € cez BEC / deepfake CEO`,
      visual: {
        kind: "email",
        from: "Tomáš Holec — CEO",
        fromEmail: "tomas.holec@firma-eu.com",
        subject: "URGENT — akvizícia, len medzi nami",
        body: `Mária, riešim akvizíciu v Rakúsku, právnici nestihli pripraviť papiere. Potrebujem rýchly prevod 52 000 € na predbežnú zálohu, zdôvodním na pondelkovom calle. IBAN AT89… Sprav to dnes do 16:00, nik nesmie vedieť kým nepodpíšeme.`,
      },
      commentary: `Po prevode si Mária na chodbe všimla CEO — opýtala sa na akvizíciu. „Akú akvizíciu?" Doména firma-eu.com oproti reálnej firma-sk.eu. Útočník mal navyše 8-sekundový hlasový deepfake (umelo vygenerované falošné video či hlas) z videa CEO na LinkedIne ako „potvrdenie". 52 000 € išlo do Hongkongu. Tomuto typu útoku cez kompromitovaný firemný e-mail sa hovorí BEC (podvod cez kompromitovaný firemný e-mail). Ponaučenie: každý prevod nad limit musí mať druhé schválenie. CEO „súrne a tajne" = vždy podvod.`,
    },
    {
      kind: "redflags",
      heading: "Spoločné menovatele všetkých 4 príbehov",
      flags: [
        `Naliehavosť — „do 30 minút", „dnes do 16:00", „kuriér ide hneď", „posledná šanca".`,
        `Tajomstvo — „nikomu nehovor", „polícia ma sleduje", „nikto v firme nesmie vedieť".`,
        `Autorita s rolou — bankár, CEO, vnuk v núdzi, krypto mentorka „úspešnejšia ako ty".`,
        `Presun komunikácie do iného kanála — z e-mailu na WhatsApp, z Instagramu na Telegram.`,
        `Suma rastúca po krôčikoch — najprv malá platba (500 €), potom väčšia, potom úspory.`,
        `Žiadna možnosť overiť druhým kanálom — útočník vždy zariadi, aby si nemohol zavolať „naozaj".`,
        `Pocit hanby na konci — všetci 4 sa hanbili prísť na políciu, čo presne uľahčuje ďalšie podvody.`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Čo mali urobiť inak",
      do: [
        `Tatiana: zavesiť a zavolať na číslo na karte VÚB — overenie cez nezávislý kanál.`,
        `Peter: skontrolovať „mentorku" cez verejné registre, LinkedIn s históriou, reálne projekty. Žiadne neexistovali.`,
        `Pán Jozef: položiť tomu „vnukovi" kontrolnú otázku — „ako sa volá tvoj prvý pes?" — útočník nevie.`,
        `Mária: zavolať CEO osobne, alebo aspoň na známe firemné číslo. Druhé schválenie pri sume nad 5 000 € povinné.`,
      ],
      dont: [
        `Nikdy nepresúvajte peniaze pod časovým tlakom — vždy aspoň hodina pauza.`,
        `Nedávajte hotovosť ani kartu cudzincovi pred dverami, ani „kuriérovi banky".`,
        `Nedôverujte „mentorom z Instagramu" so snímkami obrazovky ich ziskov — podvrh sa dá vyrobiť za 2 minúty v Photoshope.`,
        `Nehanbite sa hlásiť podvod — polícia to počuje denne, vďaka vašej výpovedi chytia ďalších páchateľov.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár — buď siedmym, čo nenaletel",
      story: `Si v práci, je 15:47 v piatok. Príde e-mail od „šéfa", že potrebuje súrne 8 400 € na zálohu pre nového klienta. Štýl písania sedí. E-mail vyzerá legitímne. Šéf má telefón vypnutý, je „na rokovaní". Inštrukcia: „rieš to do 17:00, povedz mi až v pondelok".`,
      right_action: `Nereaguješ. Aj keby si mal stratiť bonus za rýchlosť, počkáš. Volaš asistentke šéfa, posielaš správu cez Slack/Teams, kontroluješ doménu odosielateľa znak po znaku. Pri akejkoľvek pochybnosti čakáš do pondelka. Ak je e-mail naozaj od šéfa, pochváli ťa za opatrnosť. Ak je to BEC, zachránil si firmu 8 400 €. Mária z príbehu č. 4 by ti dnes potvrdila, že to čakanie do pondelka stálo za to.`,
    },
  ],
  sources: [
    { label: "SK-CERT — výročné správy o incidentoch", url: "https://www.sk-cert.sk/" },
    { label: "NBÚ — odporúčania pre občanov", url: "https://www.nbu.gov.sk/" },
    { label: "Polícia SR — kybernetická kriminalita", url: "https://www.minv.sk/" },
    { label: "Národná banka Slovenska — finančná osveta", url: "https://www.nbs.sk/" },
  ],
};
