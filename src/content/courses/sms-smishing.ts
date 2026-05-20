import type { Course } from "./_schema";

export const smsSmishingCourse: Course = {
  slug: "sms-smishing",
  title: "Ako nedať sa nachytať na podvodné SMS",
  tagline:
    "5 typov podvodných SMS, ktoré teraz lietajú na Slovensku — a ako ich rozoznáš za 3 sekundy podľa červených vlajok.",
  category: "sms",
  difficulty: "začiatočník",
  estimatedMinutes: 8,
  heroEmoji: "📱",
  relatedQuestionsCategory: "phishing",
  publishedAt: "2026-04-26",
  updatedAt: "2026-04-26",
  sections: [
    {
      kind: "intro",
      heading: "Prečo SMS, prečo teraz",
      body: `Smishing (SMS phishing) je momentálne najčastejší typ podvodu na Slovensku. Útočník ti pošle krátku správu, ktorá vyzerá ako od pošty, banky alebo úradu, a tlačí ťa, aby si urýchlene klikol. Stačia tri sekundy nepozornosti — a si na falošnej stránke, ktorá ti zoberie buď peniaze, alebo prístup do internet bankingu.`,
    },
    {
      kind: "example",
      heading: `Vzor #1 — „Slovenská pošta"`,
      visual: {
        kind: "sms",
        sender: "Posta-SK",
        body: `Vasa zasielka je pripravena na dorucenie. Doplatte 1,50 EUR za colne poplatky: posta-sk.delivery-pay.com`,
        time: "dnes 14:32",
      },
      commentary: `Klasika. Skutočná Slovenská pošta nikdy nepýta doplatok cez SMS link — colné poplatky sa platia pri preberaní alebo cez Pošta SR appku. Doména posta-sk.delivery-pay.com patrí útočníkovi (skutočná je posta.sk).`,
    },
    {
      kind: "example",
      heading: `Vzor #2 — „ČSOB bezpečnosť"`,
      visual: {
        kind: "sms",
        sender: "+44 7700 900123",
        body: `CSOB: Bezpecnostne upozornenie. Vasa karta bola docasne zablokovana. Overte sa: csob-secure.online`,
        time: "dnes 09:11",
      },
      commentary: `Britské číslo (+44) píše „ČSOB"? Žiadna slovenská banka neposiela bezpečnostné SMS zo zahraničných čísiel. A doména csob-secure.online je úplný blbec na pohľad — pravá je csob.sk.`,
    },
    {
      kind: "example",
      heading: `Vzor #3 — „Polícia SR — nezaplatená pokuta"`,
      visual: {
        kind: "sms",
        sender: "Policia-SK",
        body: `Mate nezaplatenu pokutu 78 EUR. Pri neuhradeni do 24h hrozi sudne konanie: minv-pokuta.sk-platba.eu`,
        time: "dnes 11:47",
      },
      commentary: `Polícia SR pokuty cez SMS neposiela. Doručia ich poštou s číslom konania, alebo cez elektronickú schránku na slovensko.sk. Žiadny súdny tlak za 24 hodín neexistuje.`,
    },
    {
      kind: "example",
      heading: `Vzor #4 — „slovensko.sk: aktualizácia eID"`,
      visual: {
        kind: "sms",
        sender: "slovensko-sk",
        body: `Vasa elektronicka identifikacna karta vyprsala. Predizte si ju online: slovensko-id.sk-overenie.com`,
        time: "včera 18:02",
      },
      commentary: `Štátna stránka slovensko.sk neposiela SMS upozornenia o eID. Predĺženie eID rieši okresné riaditeľstvo PZ osobne. Doména s viacerými pomlčkami a koncovkou .com na štátnu službu je instantný red flag.`,
    },
    {
      kind: "example",
      heading: `Vzor #5 — „Daňový úrad — preplatok"`,
      visual: {
        kind: "sms",
        sender: "FinSprava",
        body: `Mate naroky na vratenie preplatku 213 EUR. Vyplnte udaje pre vyplatu: dane-vratka.sk-finsprava.eu`,
        time: "dnes 15:21",
      },
      commentary: `„Bonus" peňazí je psychologická páka — tešíš sa, klikáš rýchlejšie. Finančná správa preplatok automaticky pošle na účet, ktorý je v daňovom priznaní. Žiadny SMS „doplň údaje na vyplatenie" neexistuje.`,
    },
    {
      kind: "redflags",
      heading: "8 indícií, podľa ktorých rozoznáš smishing za 3 sekundy",
      flags: [
        `Skrátený link (bit.ly, tinyurl, t.co) alebo doména s viacerými pomlčkami.`,
        `Pravopisné chyby alebo chýbajúca diakritika („Vasa zasielka").`,
        `Odosielateľ je číslo zo zahraničia (+44, +1, +234) namiesto SK alphanumeric ID.`,
        `Časový tlak — „do 24 hodín", „posledná šanca", „inak hrozí".`,
        `Žiadosť o citlivý údaj (heslo, kód z SMS, OTP, PIN) cez správu.`,
        `Doména v linke nepatrí inštitúcii — csob-secure.online namiesto csob.sk.`,
        `SMS sa tvári ako od štátu, ale štát skoro nikdy SMS na vybavovanie nepoužíva.`,
        `Príliš dobrá ponuka („vrátenie preplatku", „výhra v súťaži, ktorú si nehral").`,
      ],
    },
    {
      kind: "do_dont",
      heading: "Pravidlá, ktoré ťa zachránia",
      do: [
        `Pri pochybnostiach zavolaj inštitúcii (banka, pošta, polícia) priamo na číslo z ich oficiálneho webu.`,
        `Otvor stránku ručne vpísaním adresy do prehliadača — nikdy z linku v SMS.`,
        `Zapni si dvojfaktorovú autentifikáciu (2FA) všade, kde sa dá. Najmä na e-maile.`,
        `Podozrivú SMS nahlas na 7726 (bezplatná linka pre spam SMS) alebo na NCKB.`,
      ],
      dont: [
        `Neklikať na link zo SMS, ani „len zo zvedavosti".`,
        `Neodpovedať „STOP" — potvrdíš tým, že číslo je aktívne.`,
        `Nediktovať OTP / PIN / heslo nikomu, ani „bankárovi" cez telefón.`,
        `Neinstalovať appky z linkov mimo App Store / Google Play.`,
      ],
    },
    {
      kind: "scenario",
      heading: "Reálny scenár",
      story: `Príde ti SMS „Vaša zásielka čaká na pošte, doplatte 1,30 € za clo". Vieš, že práve čakáš balík z AliExpressu. Linkajú ti posta-sk.payment-now.com.`,
      right_action: `Otvoríš Pošta SR appku alebo posta.sk ručne. Tam zistíš stav zásielky a prípadný doplatok. Link zo SMS ignoruješ. Ak balík nikde nie je, SMS ide do koša.`,
    },
  ],
  sources: [
    { label: "NBÚ — odporúčania pre občanov", url: "https://www.nbu.gov.sk/" },
    { label: "Slovenská pošta — bezpečnostné upozornenia", url: "https://www.posta.sk/" },
    { label: "NCKB — najčastejšie typy podvodov", url: "https://www.sk-cert.sk/" },
  ],
};
