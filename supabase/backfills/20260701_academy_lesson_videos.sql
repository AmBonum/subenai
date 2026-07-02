-- E63.2 / E64 — targeted body_mdx UPDATE for every lesson that carries a
-- scam-awareness video embed. Plain UPDATEs (the INSERT..ON CONFLICT import
-- does not take via the Management API). Idempotent: sets the current
-- courseToMarkdown body (video-first). Safe to re-run.

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: ako funguje smishing

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PU5TZXk0NmJkRVlnIiwidGl0bGUiOiJTbWlzaGluZyDigJQgcG9kdm9kbsOpIFNNUyIsInNvdXJjZU5hbWUiOiJUYXRyYSBiYW5rYSIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9TlNleTQ2YmRFWWciLCJkZXNjcmlwdGlvbiI6Iktyw6F0a2Ugb3N2ZXRvdsOpIHZpZGVvIFRhdHJhIGJhbmt5IG8gcG9kdm9kbsO9Y2ggU01TLiBOw6F6b3Juw6EgdWvDocW+a2EsIG5pZSBhdXRlbnRpY2vDoSBuYWhyw6F2a2EuIn0=]]

## Prečo SMS, prečo teraz

Smishing (phishing cez SMS) je momentálne najčastejší typ podvodu (scam) na Slovensku. Ide o phishing (podvodné vylákanie prihlasovacích či platobných údajov) doručený cez textovú správu: útočník ti pošle krátku správu, ktorá vyzerá ako od pošty, banky alebo úradu, a tlačí ťa, aby si urýchlene klikol. Stačia tri sekundy nepozornosti — a si na falošnej stránke, ktorá ti zoberie buď peniaze, alebo prístup do internet bankingu.

## Vzor #1 — „Slovenská pošta"

[[visual:b64:eyJraW5kIjoic21zIiwic2VuZGVyIjoiUG9zdGEtU0siLCJib2R5IjoiVmFzYSB6YXNpZWxrYSBqZSBwcmlwcmF2ZW5hIG5hIGRvcnVjZW5pZS4gRG9wbGF0dGUgMSw1MCBFVVIgemEgY29sbmUgcG9wbGF0a3k6IHBvc3RhLXNrLmRlbGl2ZXJ5LXBheS5jb20iLCJ0aW1lIjoiZG5lcyAxNDozMiJ9]]

Klasika. Skutočná Slovenská pošta nikdy nepýta doplatok cez SMS link — colné poplatky sa platia pri preberaní alebo cez Pošta SR appku. Doména posta-sk.delivery-pay.com patrí útočníkovi (skutočná je posta.sk).

## Vzor #2 — „ČSOB bezpečnosť"

[[visual:b64:eyJraW5kIjoic21zIiwic2VuZGVyIjoiKzQ0IDc3MDAgOTAwMTIzIiwiYm9keSI6IkNTT0I6IEJlenBlY25vc3RuZSB1cG96b3JuZW5pZS4gVmFzYSBrYXJ0YSBib2xhIGRvY2FzbmUgemFibG9rb3ZhbmEuIE92ZXJ0ZSBzYTogY3NvYi1zZWN1cmUub25saW5lIiwidGltZSI6ImRuZXMgMDk6MTEifQ==]]

Britské číslo (+44) píše „ČSOB"? Žiadna slovenská banka neposiela bezpečnostné SMS zo zahraničných čísiel. A doména csob-secure.online je úplný blbec na pohľad — pravá je csob.sk.

## Vzor #3 — „Polícia SR — nezaplatená pokuta"

[[visual:b64:eyJraW5kIjoic21zIiwic2VuZGVyIjoiUG9saWNpYS1TSyIsImJvZHkiOiJNYXRlIG5lemFwbGF0ZW51IHBva3V0dSA3OCBFVVIuIFByaSBuZXVocmFkZW5pIGRvIDI0aCBocm96aSBzdWRuZSBrb25hbmllOiBtaW52LXBva3V0YS5zay1wbGF0YmEuZXUiLCJ0aW1lIjoiZG5lcyAxMTo0NyJ9]]

Polícia SR pokuty cez SMS neposiela. Doručia ich poštou s číslom konania, alebo cez elektronickú schránku na slovensko.sk. Žiadny súdny tlak za 24 hodín neexistuje.

## Vzor #4 — „slovensko.sk: aktualizácia eID"

[[visual:b64:eyJraW5kIjoic21zIiwic2VuZGVyIjoic2xvdmVuc2tvLXNrIiwiYm9keSI6IlZhc2EgZWxla3Ryb25pY2thIGlkZW50aWZpa2FjbmEga2FydGEgdnlwcnNhbGEuIFByZWRpenRlIHNpIGp1IG9ubGluZTogc2xvdmVuc2tvLWlkLnNrLW92ZXJlbmllLmNvbSIsInRpbWUiOiJ2xI1lcmEgMTg6MDIifQ==]]

Štátna stránka slovensko.sk neposiela SMS upozornenia o eID. Predĺženie eID rieši okresné riaditeľstvo PZ osobne. Doména s viacerými pomlčkami a koncovkou .com pri štátnej službe je okamžitý varovný signál.

## Vzor #5 — „Daňový úrad — preplatok"

[[visual:b64:eyJraW5kIjoic21zIiwic2VuZGVyIjoiRmluU3ByYXZhIiwiYm9keSI6Ik1hdGUgbmFyb2t5IG5hIHZyYXRlbmllIHByZXBsYXRrdSAyMTMgRVVSLiBWeXBsbnRlIHVkYWplIHByZSB2eXBsYXR1OiBkYW5lLXZyYXRrYS5zay1maW5zcHJhdmEuZXUiLCJ0aW1lIjoiZG5lcyAxNToyMSJ9]]

„Bonus" peňazí je psychologická páka — tešíš sa, klikáš rýchlejšie. Finančná správa preplatok automaticky pošle na účet, ktorý je v daňovom priznaní. Žiadny SMS „doplň údaje na vyplatenie" neexistuje.

## 8 indícií, podľa ktorých rozoznáš smishing za 3 sekundy

**Červená vlajka:** Skrátený odkaz (bit.ly, tinyurl, t.co) alebo doména s viacerými pomlčkami.

**Červená vlajka:** Pravopisné chyby alebo chýbajúca diakritika („Vasa zasielka").

**Červená vlajka:** Odosielateľ je číslo zo zahraničia (+44, +1, +234) namiesto slovenského alfanumerického názvu odosielateľa.

**Červená vlajka:** Časový tlak — „do 24 hodín", „posledná šanca", „inak hrozí".

**Červená vlajka:** Žiadosť o citlivý údaj (heslo, kód z SMS, OTP — jednorazový overovací kód, PIN) cez správu.

**Červená vlajka:** Doména v odkaze nepatrí inštitúcii — csob-secure.online namiesto csob.sk.

**Červená vlajka:** SMS sa tvári ako od štátu, ale štát skoro nikdy SMS na vybavovanie nepoužíva.

**Červená vlajka:** Príliš dobrá ponuka („vrátenie preplatku", „výhra v súťaži, ktorú si nehral").

## Pravidlá, ktoré ťa zachránia

### ✅ Rob

- Pri pochybnostiach zavolaj inštitúcii (banka, pošta, polícia) priamo na číslo z ich oficiálneho webu.
- Otvor stránku ručne vpísaním adresy do prehliadača — nikdy nie z odkazu v SMS.
- Zapni si dvojfaktorovú autentifikáciu (2FA) všade, kde sa dá. Najmä na e-maile.
- Podozrivú SMS nahlas na 7726 (bezplatná linka pre spam SMS) alebo na NCKB.

### ❌ Nerob

- Neklikať na odkaz zo SMS, ani „len zo zvedavosti".
- Neodpovedať „STOP" — potvrdíš tým, že číslo je aktívne.
- Nediktovať OTP / PIN / heslo nikomu, ani „bankárovi" cez telefón.
- Neinštalovať aplikácie z odkazov mimo App Store / Google Play.

## Reálny scenár

Príde ti SMS „Vaša zásielka čaká na pošte, doplatte 1,30 € za clo". Vieš, že práve čakáš balík z AliExpressu. Posielajú ti odkaz posta-sk.payment-now.com.

**Zlaté pravidlo:** Otvoríš Pošta SR appku alebo posta.sk ručne. Tam zistíš stav zásielky a prípadný doplatok. Odkaz zo SMS ignoruješ. Ak balík nikde nie je, SMS ide do koša.$body$, updated_at = now()
WHERE slug = 'sms-smishing' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: čo je phishing (1 min)

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PUJfbmFLSWE4OHpjIiwidGl0bGUiOiLEjG8gamUgcGhpc2hpbmcgYSBha28gY2hyw6FuacWlIHN2b2plIMO6ZGFqZSIsInNvdXJjZU5hbWUiOiJUYXRyYSBiYW5rYSAjcHJlZGlnaXRhbG51YmV6cGVjbm9zdCIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9Ql9uYUtJYTg4emMiLCJkZXNjcmlwdGlvbiI6Iktyw6F0a2Ugb3N2ZXRvdsOpIHZpZGVvIFRhdHJhIGJhbmt5IOKAlCBuw6F6b3Juw6EgdWvDocW+a2EsIGFrbyBwaGlzaGluZyBmdW5ndWplLiBOaWUgamUgdG8gYXV0ZW50aWNrw6EgbmFocsOhdmthLiJ9]]

## Email je stále útok č. 1

Aj keď SMS vedie v rýchlosti, e-mail je stále hlavný kanál pre cielené phishingové (podvodné vylákanie prihlasovacích či platobných údajov) útoky. Útočník má v ňom miesto na presvedčivý dizajn, falošné logá a kvalitne preložený text. Cieľ je rovnaký: dostať ťa na falošnú stránku alebo aby si stiahol prílohu.

## Vzor #1 — „Slovenská sporiteľňa" o blokovaní účtu

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiU2xvdmVuc2vDoSBzcG9yaXRlxL7FiGEiLCJmcm9tRW1haWwiOiJuby1yZXBseUBzbHNwLWJlenBlY25vc3Qub25saW5lIiwic3ViamVjdCI6IkJlenBlxI1ub3N0bsOpIHVwb3pvcm5lbmllIOKAlCBvdmVydGUgc2EgZG8gMjQgaG9kw61uIiwiYm9keSI6IlbDocW+ZW7DvSBrbGllbnQsIG5hIHZhxaFvbSDDusSNdGUgYm9saSB6YXpuYW1lbmFuw6kgbmVvYnZ5a2zDqSBwb2h5YnkuIEFrIHNhIGRvIDI0IGhvZMOtbiBuZXByaWFobGFzaXRlIGNleiBuacW+xaFpZSB1dmVkZW7DvSBvZGtheiwgdsOhxaEgcHLDrXN0dXAgZG8gaW50ZXJuZXQgYmFua2luZ3UgYnVkZSBwb3phc3RhdmVuw70uIiwiY3RhIjoiT3ZlcmnFpSDDusSNZXQifQ==]]

Doména odosielateľa slsp-bezpecnost.online — Slovenská sporiteľňa píše z @slsp.sk, nie z náhodne registrovanej .online. „Overte sa do 24 hodín" je pavlovovský reflex na strach. Žiadna banka takto nekomunikuje.

## Vzor #2 — „Microsoft 365" o vypršaní hesla

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiTWljcm9zb2Z0IEFjY291bnQgVGVhbSIsImZyb21FbWFpbCI6InNlY3VyaXR5QG1pY3Jvc29mdC11cGRhdGUtc2VydmljZXMuY29tIiwic3ViamVjdCI6IlZhxaFlIGhlc2xvIHZ5cHLFocOtIG8gMjQgaG9kw61uIOKAlCBva2Ftxb5pdGUgaG8gb2Jub3Z0ZSIsImJvZHkiOiJWYcWhZSBoZXNsbyBrIE1pY3Jvc29mdCAzNjUgw7rEjXR1IHZ5cHLFocOtIG8gMjQgaG9kw61uLiBBYnkgc3RlIHByZWRpxaFsaSBwcmVydcWhZW5pdSBwcsOtc3R1cHUgayBwb8WhdGUgYSBPbmVEcml2ZSwga2xpa25pdGUgYSBvYm5vdnRlIGhlc2xvLiIsImN0YSI6Ik9ibm92acWlIGhlc2xvIn0=]]

Microsoft komunikuje výhradne z @microsoft.com a @account.microsoft.com. Doména microsoft-update-services.com je registrovaná pred mesiacom. „Vyprší o 24 hodín" je klasická naliehavosť.

## Vzor #3 — „CEO/šéf" žiada urgentnú platbu (BEC)

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiUGV0ZXIgTm92w6FrIChDRU8pIiwiZnJvbUVtYWlsIjoicGV0ZXIubm92YWtAZmlybWEtc2suY28iLCJzdWJqZWN0IjoiVXJnZW50bmUg4oCUIHBvdHJlYnVqZW0gcHJldm9kLCBzb20gbmEgbWVldGluZy11IiwiYm9keSI6IkFob2osIHNvbSB0ZXJheiBuYSB6w6FrYXpuw61ja29tIG1lZXRpbmd1IGEgbmVtw7TFvmVtIHZvbGHFpS4gUG90cmVidWplbSB1cmdlbnRuZSBwcmV2b2RvbSBwb3NsYcWlIDcgODAwIEVVUiBuYSDDusSNZXQgZG9kw6F2YXRlxL5hLCDEjcOtc2xvIElCQU46IFNLMzUgLi4uIFBvxaFsaSBtaSBwb3R2cmRlbmllLCDEj2FrdWplbS4ifQ==]]

Tzv. Business Email Compromise (podvod cez kompromitovaný firemný e-mail), skrátene BEC. Útočník si spravil doménu firma-sk.co (skutočná je firma.sk). Píše v štýle CEO, vyvíja tlak. Žiadny šéf nepýta urgentnú platbu cez e-mail bez verifikácie. Vždy zavolaj na známy telefónny kontakt.

## Vzor #4 — „Faktúra na zaplatenie" s prílohou .zip

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiw5rEjXRvdm7DrWN0dm8iLCJmcm9tRW1haWwiOiJ1Y3Rvdm5pY3R2b0Btb2phZG9kYXZrYS1mYWt0dXJhLmNvbSIsInN1YmplY3QiOiJGYWt0w7pyYSDEjS4gMjAyNC0xMTg3IG5hIMO6aHJhZHUiLCJib2R5IjoiViBwcsOtbG9oZSBuw6FqZGV0ZSBmYWt0w7pydSDEjS4gMjAyNC0xMTg3IHNwbGF0bsO6IGRvIDcgZG7DrS4gUHJpIHBvY2h5Ym5vc3RpYWNoIGtvbnRha3R1anRlIG5hxaFlIMO6xI10b3Zuw61jdHZvLiBQcsOtbG9oYTogZmFrdHVyYV8xMTg3LnppcCJ9]]

Faktúra v .zip alebo .iso prílohe je takmer vždy malware (škodlivý softvér). Skutočné faktúry sú PDF priamo alebo cez známy systém. Ak nečakáš faktúru od tejto firmy — neotváraj.

## Vzor #5 — „LinkedIn" — nová pracovná ponuka

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiTGlua2VkSW4gVGFsZW50IiwiZnJvbUVtYWlsIjoidGFsZW50QGxpbmtlZGluLWNhcmVlcnMtZXUuY29tIiwic3ViamVjdCI6IlNlbmlvciBFbmdpbmVlciBAIEFwcGxlIOKAlCBtw6FtZSB6w6F1amVtIG8gdsOhxaEgcHJvZmlsIiwiYm9keSI6IkFob2osIHbDocWhIHByb2ZpbCB6YXVqYWwgcmVjcnVpdGVyYSBzcG9sb8SNbm9zdGkgQXBwbGUuIFBvesOtY2lhOiBTZW5pb3IgU29mdHdhcmUgRW5naW5lZXIsIHBsYXQgMTUwLTIwMGsgRVVSLiBOacW+xaFpZSBuw6FqZGV0ZSBvZGtheiBuYSBwb2hvdm9yIOKAlCB2eXBsxYh0ZSBrcsOhdGt5IHByb2ZpbCBjZXogbsOhxaEgcG9ydMOhbC4iLCJjdGEiOiJPdHZvcmnFpSBwcm9maWwifQ==]]

LinkedIn píše z @linkedin.com. Doména linkedin-careers-eu.com nepatrí im. Príliš dobrá ponuka („Apple, 200k") je páka — útočník chce, aby si vyplnil falošný „profil" s heslami.

## Vzor #6 — „PayPal: nová prihláška z neznámeho zariadenia"

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiUGF5UGFsIFNlcnZpY2UiLCJmcm9tRW1haWwiOiJzZXJ2aWNlQHBheXBhbC1hY2NvdW50LXByb3RlY3QuY29tIiwic3ViamVjdCI6IkJvbGEgemF6bmFtZW5hbsOhIG5vdsOhIHByaWhsw6HFoWthIHogbmV6bsOhbWVobyB6YXJpYWRlbmlhIiwiYm9keSI6IlogdsOhxaFobyDDusSNdHUgUGF5UGFsIHNhIHByw6F2ZSBuaWVrdG8gcG9rw7pzaWwgcHJpaGzDoXNpxaUgeiBuZXpuw6FtZWhvIHphcmlhZGVuaWEgKFByYWhhLCDEjGVza28pLiBBayBzdGUgdG8gbmVib2xpIHZ5LCBva2Ftxb5pdGUgemFiZXpwZcSNdGUgw7rEjWV0LiIsImN0YSI6IlphYmV6cGXEjWnFpSDDusSNZXQifQ==]]

PayPal píše z @paypal.com. Aj samotná správa môže byť pravdivá pocitovo (mohol by si sa skutočne prihlasovať z iného miesta), ale doména a CTA tlačia na rýchle kliknutie.

## 10 vecí, na ktoré sa pozri pred kliknutím

**Červená vlajka:** Doména odosielateľa nepatrí firme — pozri si ju ZA znakom @, nie len zobrazené meno.

**Červená vlajka:** Generické oslovenie („Vážený klient", „Dear Customer") namiesto mena.

**Červená vlajka:** Tlak na čas („do 24 hodín", „okamžite", „inak").

**Červená vlajka:** Hroziaca strata (zablokovanie účtu, vymazanie dát, zákonné konanie).

**Červená vlajka:** Príliš dobrá ponuka (výhra, recruiter z Apple, vrátenie peňazí).

**Červená vlajka:** Príloha .zip / .iso / .exe / .scr — nikdy neotvárať.

**Červená vlajka:** Pravopisné chyby alebo zlý preklad (najmä pri „banke SR").

**Červená vlajka:** Žiadosť o heslo, OTP (jednorazový overovací kód) či PIN cez e-mail.

**Červená vlajka:** Odkaz, ktorý po nabehnutí kurzorom ukazuje inú doménu ako text odkazu.

**Červená vlajka:** Nečakaná faktúra od dodávateľa, s ktorým nemáš zmluvu.

## Rýchla 30-sekundová kontrola

- ❌ Doména za @ vyzerá ako „banka-secure.online".
- ❌ Som pozvaný na pohovor, hoci som nikam neposielal CV.
- ❌ E-mail mi tlačí čas alebo ma straší.
- ✅ Doména súhlasí — slsp.sk, microsoft.com, paypal.com.
- ✅ E-mail rieši niečo, čo som naozaj v posledných dňoch robil.
- ✅ Otvorím stránku ručne, nie z odkazu v e-maile.

## Pravidlá

### ✅ Rob

- Pri každom „bankovom" e-maile otvor banku ručne v prehliadači.
- Zapni 2FA (dvojfaktorové overenie) na e-mail (Gmail, Outlook). Ten je kľúčom k všetkému ostatnému.
- Pri urgentnom príkaze od „šéfa" mu zavolaj — neodpisuj e-mailom.
- Prílohu otváraj iba vtedy, keď ju očakávaš a poznáš odosielateľa.

### ❌ Nerob

- Nedôveruj zobrazenému menu odosielateľa — len doméne za @.
- Neklikaj na odkazy „obnoviť heslo" z e-mailu — vždy ručne.
- Nepreposielaj podozrivý e-mail kolegom — môžu kliknúť za teba.
- Nedávaj odpoveď „STOP" ani „odhlásiť" útočníkovi.

## Reálny scenár — pondelok ráno

Otvoríš Outlook. „Microsoft: vaše heslo vyprší dnes o 18:00, kliknite a obnovte." Si v strese, máš online meeting o 5 minút. Klikneš?

**Zlaté pravidlo:** Nie. Otvoríš si konto Microsoft ručne v inej karte (account.microsoft.com) a prihlásiš sa zaužívaným postupom. Tam buď naozaj uvidíš upozornenie, alebo nie. Žiadnu „obnovu" cez e-mail nikdy nerob.$body$, updated_at = now()
WHERE slug = 'email-phishing' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Telefón je psychologická bomba

Vishing (phishing cez telefonát) zneužíva najsilnejšiu zbraň útočníka — živý hlas. Pri SMS si môžeš dať pauzu, e-mail si môžeš dvakrát prečítať. Ale keď ti zavolá „bankár" a tlačí ťa, mozog sa zasekne. Práve preto je vishing finančne najškodlivejší typ podvodu — priemerná škoda na jednu obeť je rádovo tisíce eur.

## Scenár #1 — „bankár" o úniku peňazí

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6IlNsb3ZlbnNrw6Egc3Bvcml0ZcS+xYhhIiwibnVtYmVyIjoiKzQyMSAyIDU4MjYgMTExMSIsImhpbnQiOiLigJ5Eb2Jyw70gZGXFiCwgdm9sw6FtIHogYmV6cGXEjW5vc3Ruw6lobyBvZGRlbGVuaWEuIFogdsOhxaFobyDDusSNdHUgc2EgcHLDoXZlIHNuYcW+w60gb2TDrXPFpSA0IDgwMCBFVVIgZG8gemFocmFuacSNaWEuIEFieSBzbWUgdG8gemFzdGF2aWxpLCBwb3RyZWJ1amVtIG9kIHbDoXMga8OzZCwga3RvcsO9IHbDoW0gdGVyYXogcHLDrWRlIFNNU2tvdS5cIiJ9]]

Skutočný bankár od teba NIKDY nepýta kód z SMS. Ten kód je práve to, čím útočník schvaľuje prevod (3D Secure / strong customer authentication). Diktovaním kódu mu sám podpíšeš odchod peňazí.

## Scenár #2 — „policajt" o vyšetrovaní

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6IlBaIFNSIOKAlCB2ecWhZXRyb3ZhbmllIiwibnVtYmVyIjoiMDgwMCBuZXpvYnJhesOtIiwiaGludCI6IuKAnlZvbMOhbSB6IHBvbMOtY2llLiBWYcWhYSBpZGVudGl0YSBib2xhIHpuZXXFvml0w6EgcHJpIG5lbGVnw6Fsbm9tIHByZXZvZGUuIFByZSBvY2hyYW51IHZhxaFpY2ggw7pzcG9yIGljaCBtdXPDrXRlIHByZXZpZXPFpSBuYSBiZXpwZcSNbsO9IMO6xI1ldCwga3RvcsO9IHbDoW0gdGVyYXogbmFkaWt0dWplbS5cIiJ9]]

„Bezpečný účet polície" neexistuje. Polícia nikdy nepýta peniaze prevodom. Ak by skutočne vyšetrovala podvod, vyzve ťa na výsluch listinne, nie cez okamžitý prevod.

## Scenár #3 — „Microsoft support" o vírusoch

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6Ik1pY3Jvc29mdCBUZWNobmljYWwiLCJudW1iZXIiOiIrMSA4MDAgLi4uIChuZXpuw6FtZSkiLCJoaW50Ijoi4oCeSGVsbG8sIHRoaXMgaXMgTWljcm9zb2Z0IFRlY2huaWNhbCBTdXBwb3J0LiBZb3VyIGNvbXB1dGVyIGlzIHNlbmRpbmcgdXMgY3JpdGljYWwgZXJyb3IgcmVwb3J0cy4gUGxlYXNlIGluc3RhbGwgb3VyIHJlbW90ZSBhY2Nlc3MgdG9vbCBzbyB3ZSBjYW4gaGVscCB5b3UuXCIifQ==]]

Microsoft NIKDY nezavolá. Bodka. Tento typ podvodu cielí najmä na anglicky hovoriacich seniorov, ale prichádza aj na slovenské čísla. „Vzdialený prístup" je vstupenka pre útočníka — vidí ti všetko vrátane bankingu.

## Scenár #4 — „dcéra v núdzi" (deepfake hlas — umelo vygenerovaný falošný hlas)

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6Im5lem7DoW1lIMSNw61zbG8iLCJudW1iZXIiOiIrNDIxIDl4eCB4eHggeHh4IiwiaGludCI6IuKAnk1hbWksIHRvIHNvbSBqYSwgbcOhbSBwcm9ibMOpbSwgdWtyYWRsaSBtaSBwZcWIYcW+ZW5rdSwgbcO0xb5lxaEgbWkgcsO9Y2hsbyBwb3NsYcWlIDgwMCBFVVIgbmEgdGVudG8gw7rEjWV0PyBQcm9zw61tLCBuaWtvbXUgbmVob3ZvciwgdnlzdmV0bMOtbSB0byBwb3RvbS5cIiJ9]]

AI dnes vie naklonovať hlas z 30 sekúnd nahrávky (napr. zo sociálnych sietí). „Niekomu nehovor" je psychologický prevod — útočník izoluje obeť od overenia. Vždy zavolaj späť na známe číslo, ktoré máš v kontaktoch.

## Ako vyzerá vishing — edukatívne video

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PVNiWnoyUTJ0LWFVIiwidGl0bGUiOiJQb2R2b2QgbmEgdGVsZWbDs25lICh2aXNoaW5nKSIsInNvdXJjZU5hbWUiOiJUYXRyYSBiYW5rYSAjcHJlZGlnaXRhbG51YmV6cGVjbm9zdCIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9U2JaejJRMnQtYVUiLCJkZXNjcmlwdGlvbiI6Ik9maWNpw6FsbmUgb3N2ZXRvdsOpIHZpZGVvIFRhdHJhIGJhbmt5IOKAlCBuw6F6b3Juw6EgKGhyYW7DoSkgdWvDocW+a2EgcHJpZWJlaHUgcG9kdm9kbsOpaG8gaG92b3J1LCBuaWUgYXV0ZW50aWNrw6EgbmFocsOhdmthLiBWxaHDrW1haiBzaSB0w7NuLCBuYWxpZWhhdm9zxaUgYSBww710YW5pZSBrw7NkdS4ifQ==]]

## Indície, že hovor je podvod

**Červená vlajka:** Volajúci od „banky" pýta kód z SMS, OTP (jednorazový overovací kód), PIN alebo heslo do internet bankingu.

**Červená vlajka:** „Polícia" / „daňový úrad" / „súd" tlačí na okamžitý prevod alebo platbu.

**Červená vlajka:** „Microsoft", „Google", „Apple support" volá z vlastnej iniciatívy.

**Červená vlajka:** Volajúci požaduje, aby si nezavesil a šiel s telefónom k bankomatu.

**Červená vlajka:** „Príbuzný v núdzi" žiada peniaze a hovorí „nikomu nehovor".

**Červená vlajka:** Zvuk hovoru je čudný — buď príliš čistý (deepfake), alebo veľa pozadia (call centrum).

**Červená vlajka:** Číslo zo zahraničia, ktoré sa tvári ako slovenská inštitúcia.

## Pravidlá, ktoré ťa zachránia

### ✅ Rob

- Zavesiť. Hneď. Žiadne vysvetľovanie, žiadne „len chvíľku".
- Zavolať banke / polícii späť na ich oficiálne číslo z webu (NIE číslo, ktoré ti volalo).
- Ak ti volá „príbuzný v núdzi", zavolaj mu späť na známe číslo z kontaktov.
- Nahlásiť podvod na 158 (PZ SR) alebo NCKB pre štatistiku.

### ❌ Nerob

- Nediktovať OTP, PIN, heslo, kód z SMS — ani „bankárovi", ani „polícii".
- Neísť k bankomatu na pokyn neznámeho hlasu.
- Nedávať vzdialený prístup do PC nikomu, kto zavolal sám.
- Nesúhlasiť s prevodom „na bezpečný účet". Taký účet neexistuje.

## Reálny scenár — utorok poobede

Zazvoní ti telefón. Číslo +421 2 5826 1111. „Dobrý deň, volám zo Slovenskej sporiteľne, oddelenie podvodov. Z vášho účtu sa pokúša odísť 3 200 EUR. Aby sme to zastavili, potrebujem rýchlo kód, ktorý vám teraz pošle banka SMSkou."

**Zlaté pravidlo:** Zavesíš. Otvoríš si SLSP appku alebo internet banking. Tam vidíš, či sa skutočne niečo deje. Ak chceš, zavoláš banke na číslo z webu slsp.sk (nie z toho, ktoré ti volalo). 99 % prípadov — žiadny prevod sa nedeje, len útočník skúša šancu.$body$, updated_at = now()
WHERE slug = 'vishing-telefonicke-podvody' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: podvodník v online bazári

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PWpTeWJ0bjVvMWFVIiwidGl0bGUiOiJBa28gb2RoYWxpxaUgcG9kdm9kbsOta2EgdiBvbmxpbmUgYmF6w6FyaSIsInNvdXJjZU5hbWUiOiJUYXRyYSBiYW5rYSAjcHJlZGlnaXRhbG51YmV6cGVjbm9zdCIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9alN5YnRuNW8xYVUiLCJkZXNjcmlwdGlvbiI6Ik9zdmV0b3bDqSB2aWRlbyBUYXRyYSBiYW5reSBvIHBvZHZvZG9jaCB2IGJhesOhcm9jaC4gTsOhem9ybsOhIHVrw6HFvmthLCBuaWUgYXV0ZW50aWNrw6EgbmFocsOhdmthLiJ9]]

## Bazoš a Facebook Marketplace ako lovisko

Slovenský trh ovládajú dve platformy: Bazoš a FB Marketplace. Obe majú minimálnu moderáciu, takže útočník si vytvorí účet za 5 minút a má tisíce potenciálnych obetí. Schémy sú dvojaké — útočník buď vystupuje ako „predávajúci" (vyláka ti zálohu), alebo ako „kupec" (vyláka ti údaje karty cez falošnú platobnú stránku).

## Vzor #1 — auto za polovicu trhovej ceny

[[visual:b64:eyJraW5kIjoibGlzdGluZyIsInNpdGUiOiJCYXpvxaEiLCJ0aXRsZSI6IkJNVyAzMjBkLCAyMDE4LCA5MCAwMDAga20g4oCUIHPDunJuZSIsInByaWNlIjoiOSA4MDAg4oKsIiwibG9jYXRpb24iOiJCcmF0aXNsYXZhIiwiZGVzY3JpcHRpb24iOiJTw7pybmUgcHJlZMOhbSwgc8WlYWh1amVtIHNhIGRvIE5lbWVja2EuIEF1dG8gamUgdiBwZXJmZWt0bm9tIHN0YXZlLCBwcnbDvSBtYWppdGXEvi4gUG9zaWVsYW0gZm90a3kgYWogcGFwaWVyZSBuYSBXaGF0c0FwcC4gWsOhdWplbWNhIHBvxaFsZSAxIDAwMCDigqwgesOhbG9odSwgZG92b3ogYSBvYmhsaWFka2EgdiBCcmF0aXNsYXZlIGRvIDMgZG7DrS4iLCJpbWFnZUVtb2ppIjoi8J+alyJ9]]

BMW z roku 2018 s 90 tis. km má reálnu cenu 18 – 22 tisíc EUR. „Polovica" + „súrne" + „sťahujem sa" je kombinácia, ktorá NIKDY nie je pravdivá. Po zálohe auto nepríde a telefón prestane fungovať.

## Vzor #2 — byt v centre za 250 €

[[visual:b64:eyJraW5kIjoibGlzdGluZyIsInNpdGUiOiJCYXpvxaEiLCJ0aXRsZSI6IjItaXpib3bDvSBieXQsIFN0YXLDqSBNZXN0bywgQnJhdGlzbGF2YSIsInByaWNlIjoiMjUwIOKCrCAvIG1lc2lhYyIsImxvY2F0aW9uIjoiQnJhdGlzbGF2YSDigJQgU3RhcsOpIE1lc3RvIiwiZGVzY3JpcHRpb24iOiJQZWtuw70gMi1pemJvdsO9IGJ5dCB2IGNlbnRyZS4gU29tIHRlcmF6IHYgemFocmFuacSNw60sIGvEvsO6xI1lIHBvxaFsZW0ga3VyacOpcm9tIHBvIHByaWphdMOtIGRlcG96aXR1IDUwMCDigqwuIEtvbXVuaWvDoWNpYSBjZXogV2hhdHNBcHAgLyBlLW1haWwuIiwiaW1hZ2VFbW9qaSI6IvCfj6IifQ==]]

Trhová cena 2-izbového bytu v Starom Meste je 700 – 1 200 € + energie. „Som v zahraničí, kľúče cez kuriéra po depozite" nie je nikdy reálne. Vždy si byt obhliadni osobne pred akoukoľvek platbou.

## Vzor #3 — „kupec" pošle fake Stripe / PayPal link

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiS29udmVyesOhY2lhIHMg4oCea3VwY29tXCIiLCJib2R5IjoiS3VwZWM6IOKAnkFob2osIG3DoW0gesOhdWplbSBvIHR2b2ogdGVsZWbDs24uIFNvbSB6IFRybmF2eSwgbmV2aWVtIHByw61zxaUgb3NvYm5lLCBtw7TFvmVtIHRpIHphcGxhdGnFpSBjZXogU3RyaXBlLiBQb8WhbGVtIHRpIGxpbmssIHZ5cGxuw63FoSDDumRhamUga2FydHkgYSBwZW5pYXplIHRpIHByw61kdSBuYSDDusSNZXQuXCJcblxuVHk6IGRvc3RhbmXFoSBsaW5rIHN0cmlwZS1wYXltZW50LWliYW4uY29tIOKAlCB2eXplcsOhIGFrbyBTdHJpcGUuXG5cblBvIHZ5cGxuZW7DrSDEjcOtc2xhIGthcnR5ICsgQ1ZWIGEgT1RQIOKAlCBrdXBlYyB6bWl6bmUsIHoga2FydHkgc2Egc3Ryw6FjYSA4NTAg4oKsLiJ9]]

Stripe ani PayPal ti nikdy nedajú zaplatiť „cez odkaz, kde vyplníš svoje údaje" — naopak, peniaze dostaneš ty na svoj účet. Útočník ťa cez falošnú platobnú bránu donúti zadať údaje, ktoré okamžite zneužije.

## Vzor #4 — „náhodný preklep" v sume prevodu

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiU2Now6ltYSDigJ5vbXlsb20gc29tIHRpIHBvc2xhbCB2aWFjXCIiLCJib2R5IjoiMS4gS3VwZWMgc2kg4oCea8O6cGlcIiB0dm9qIHRvdmFyIHphIDIwMCDigqwuXG4yLiBQb8WhbGUgdGkgc2NyZWVuc2hvdCBwcmV2b2R1IG5hIDIgMDAwIOKCrCAoZmFrZSBzY3JlZW5zaG90LCDFvmlhZG55IHNrdXRvxI1uw70gcHJldm9kIG5lcHJpxaFpZWwpLlxuMy4gSG92b3LDrTog4oCeQWNoLCBvbXlsb20gc29tIHByaWRhbCBudWx1LCBwb8WhbGkgbWkgMSA4MDAg4oKsIHNww6TFpSwgcHJvc8OtbS5cIlxuNC4gUG/FoWxlxaEgbXUgMSA4MDAg4oKsIOKAlCB6IHR2b2ppY2ggcGXFiGF6w60uIFByZXZvZCBuYSAyIDAwMCDigqwgbmlrZHkgbmVkb3JhesOtLiJ9]]

Klasická schéma „chargeback" (spätné stiahnutie platby) alebo „falošný prevod". Skutočný príchod peňazí sleduj VÝLUČNE v internetbankingu (nie zo snímky obrazovky od kupca). Nikdy nepošli „vrátenie" peňazí skôr, než suma reálne dorazí na účet.

## Indície, podľa ktorých rozoznáš podvod

**Červená vlajka:** Cena je výrazne pod trhovou (auto za polovicu, byt za štvrtinu).

**Červená vlajka:** Predávajúci „je v zahraničí, dovoz cez kuriéra po zálohe".

**Červená vlajka:** Komunikácia mimo platformy (WhatsApp, Telegram, Signal).

**Červená vlajka:** Naliehanie na rýchlu platbu („mám iného záujemcu").

**Červená vlajka:** „Kupec" ti pošle odkaz na zaplatenie (Stripe, PayPal) — pritom norma je opačná.

**Červená vlajka:** Inzerát má fotku z internetu (odhalí to spätné vyhľadávanie obrázka).

**Červená vlajka:** Profil predávajúceho je nový, bez histórie a recenzií.

**Červená vlajka:** Žiadosť o zálohu vopred bez možnosti obhliadky.

## Pravidlá pre kupujúceho

- ✅ Vec si vždy obhliadni osobne pred akoukoľvek platbou.
- ✅ Auto pred kúpou skontroluj cez kontrolu VIN (číslo karosérie) a servisnú históriu.
- ✅ Nájom bytu — fyzická prehliadka, nájomná zmluva pred prevodom depozitu.
- ❌ Záloha na účet predávajúceho cez prevod, ktorého neuvidíš osobne.
- ❌ Komunikácia mimo platformy — Bazoš/FB má aspoň minimálnu kontrolu.
- ❌ „Polovica trhovej ceny" — nikdy ti nikto nedá auto za 50 % zadarmo.

## Pravidlá pre predávajúceho

- ✅ Platba pri preberaní (cash) alebo overený prevod priamo na tvoj účet.
- ✅ Kontrola príchodu sumy v internetbankingu — nie zo snímky obrazovky.
- ✅ Pri vyšších sumách — overenie totožnosti kupujúceho cez OP.
- ❌ „Odkaz na Stripe / PayPal" od kupca — takto inkaso neprebieha.
- ❌ „Pošli mi naspäť, omylom som dal viac" — pred reálnym príchodom sumy.
- ❌ Posielanie tovaru na adresu, ktorá nezodpovedá platbe.

## Pravidlá pre obe strany

### ✅ Rob

- Pri pochybnostiach radšej od obchodu odstúpiť, než stratiť peniaze.
- Verejné miesto na stretnutie (parkovisko OC, polícia ako miesto výmeny).
- Nahlásiť podvodný inzerát platforme (Bazoš → Nahlásiť).
- Pri obchodoch nad 1 000 € — vždy zmluva, kúpno-predajná zmluva.

### ❌ Nerob

- Neposielať zálohu cez kryptomeny (je to nezvratné).
- Neposielať údaje karty, OTP (jednorazový overovací kód) ani CVV nikomu, ani „kupcovi".
- Neveriť snímkam obrazovky o prevodoch — len reálnemu príchodu na účet.
- Nedávať OP ani pas v plnom rozlíšení neznámym (kradnú identitu).

## Reálny scenár — predávaš telefón na FB Marketplace

Pýta sa „Maťo z Košíc": „Ahoj, mám záujem, ale neviem prísť. Môžem zaplatiť cez Stripe? Pošlem ti link, kde vyplníš údaje karty a peniaze ti prídu."

**Zlaté pravidlo:** Odpovieš: „Stripe takto nefunguje, peniaze ti prídu cez bežný prevod alebo v hotovosti pri preberaní. Ak chceš, môžeme sa stretnúť, alebo ti tovar pošlem po príchode peňazí na účet." Ak protestuje — ukončíš konverzáciu.$body$, updated_at = now()
WHERE slug = 'marketplace-bazos-podvody' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: príliš lákavé výnosy

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PTJpM3ZtTlg2clRJIiwidGl0bGUiOiJCdcSPdGUgb3BhdHJuw60gcHJpIGludmVzdGnEjW7DvWNoIHBvbnVrw6FjaCBzIHByw61sacWhIGzDoWthdsO9bSB2w71ub3NvbSIsInNvdXJjZU5hbWUiOiJUYXRyYSBiYW5rYSIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9Mmkzdm1OWDZyVEkiLCJkZXNjcmlwdGlvbiI6Ik9zdmV0b3bDqSB2aWRlbyBUYXRyYSBiYW5reSBvIGludmVzdGnEjW7DvWNoIHBvZHZvZG9jaC4gTsOhem9ybsOhIHVrw6HFvmthLCBuaWUgYXV0ZW50aWNrw6EgbmFocsOhdmthLiJ9]]

## Investičný podvod nie je „blbosť pre dôchodcov"

Krypto a AI-trading scamy (podvody) sa cielia na inú demografiu, než by si čakal — 25 až 55 rokov, technicky zruční, ale finančne neistí. Ponuka je vždy rovnaká: zaručený výnos, exkluzívny prístup a presvedčivá známa tvár (Elon Musk, Andrej Kiska, Boris Kollár). V skutočnosti ide o profesionálny podvod riadený z call-centra, ktorý ťa povedie tri týždne za ruku — kým ti účet nevybielia.

## Schéma #1 — deepfake reklama na Instagrame

[[visual:b64:eyJraW5kIjoiaW5zdGFncmFtIiwiYWNjb3VudCI6ImVsb25fbXVza19pbnZlc3QiLCJ2ZXJpZmllZCI6dHJ1ZSwiYm9keSI6IkVsb24gTXVzazog4oCexI5ha3VqZW0gdsWhZXRrw71tLCBrdG8gc2EgcHJpZGFsIGsgbW9qZWogQUktdHJhZGluZyBwbGF0Zm9ybWUgVGVzbGFRdWFudHVtLiBQcnbDvSBtZXNpYWMgdsOhbSB6YXJvYsOtIDEyICUgaXN0w71tIHpob2Rub3RlbsOtbS4gU3RhxI3DrSAyNTAgRVVSIHZrbGFkLlwiIiwiY3RhIjoiU2vDunMgdG8gcyAyNTAgRVVSIiwiaW1hZ2VFbW9qaSI6IvCfpJYiLCJwcmljZSI6IjI1MCDigqwifQ==]]

Reklama je deepfake (umelo vygenerované falošné video či hlas) — Muskov hlas a obraz sú vygenerované AI z verejných videí. Ani Musk, ani žiadna iná známa osobnosť ti nikdy nesľúbi „istý" výnos cez reklamu na Instagrame. Verifikovaný účet je často kúpený alebo získaný phishingom (podvodným vylákaním prihlasovacích či platobných údajov).

## Schéma #2 — „AI auto-trader bot"

[[visual:b64:eyJraW5kIjoidXJsIiwidXJsIjoiaHR0cHM6Ly90ZXNsYXF1YW50dW0tYWkuaW8vZGFzaGJvYXJkIiwic2VjdXJlIjp0cnVlfQ==]]

Profesionálny dashboard ti ukazuje, ako tvojich „250 EUR" za týždeň narástlo na 480 EUR. Čísla sú falošné — nikdy sa neobchodovalo, len ti zobrazujú JavaScript animáciu. Keď chceš peniaze von, požiadajú „daň zo zisku" 800 EUR vopred. Kým zaplatíš, zmiznú.

## Schéma #3 — pump & dump cez Telegram skupinu

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiVGVsZWdyYW0g4oCeVklQIHNpZ25hbHNcIiIsImJvZHkiOiJBZG1pbjog4oCeRG5lcyBvIDE5OjAwIG5ha3VwdWp0ZSAkTU9PTiB0b2tlbi4gQ2VuYSAwLDAwMyBVU0QsIHRhcmdldCAwLDA1IFVTRCBkbyBkdm9jaCBkbsOtLiBUb3RvIGplIG5hxaFhIDE3LiDDunNwZcWhbsOhIG9wZXLDoWNpYS5cIlxuXG4xOTowMCDigJQgdG9rZW4gc2Egc2t1dG/EjW5lIHBvaG5lIChvcmdhbml6w6F0b3JpIHXFviBuYWvDunBpbGkgdsSNZXJhIHphIDAsMDAxKS5cbjE5OjE1IOKAlCBrb211bml0YSBtYXPDrXZuZSBrdXB1amUsIGNlbmEgdnlsZXTDrSBuYSAwLDAwOC5cbjE5OjMwIOKAlCBvcmdhbml6w6F0b3JpIHByZWTDoXZhasO6IHbFoWV0a28gKERVTVApLCBjZW5hIHBhZMOhIG5hIDAsMDAwNS5cblxuVHZvamljaCA1MDAgRVVSIHNhIHptZW5pbG8gbmEgMzAgRVVSLiJ9]]

Klasický pump & dump (umelé vyhnanie a následný prepad ceny) na neznámych meme tokenoch. Skupina je skutočná, signály sú skutočné, ale ty si vždy ten posledný. Profesionálni „insideri" zarobia, drobní investori (ty) prerobia. Funguje desaťročia, len sa presunul z lacných akcií do kryptomien.

## Schéma #4 — „osobný broker" cez WhatsApp

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiS29udmVyesOhY2lhIHMg4oCeTWFyZWtvbVwiIiwiYm9keSI6Ik1hcmVrIHogVFEgQ2FwaXRhbDog4oCeVmlkw61tLCDFvmUgbcOhxaEgw7rEjWV0IG5hIG5hxaFlaiBwbGF0Zm9ybWUuIFNvbSB0dm9qIG9zb2Juw70gYWNjb3VudCBtYW5hZ2VyLiBBYnkgc2kgdXLDvWNobGlsIHpob2Rub3RlbmllLCBuYXZyaHVqZW0genbDvcWhacWlIHZrbGFkIG5hIDUgMDAwIEVVUiBhIHZ5dcW+acWlIGxldmVyYWdlIDE6NTAuXCJcblxuUG8gMiBkxYhvY2g6IOKAnk9qb2osIHRyaCBzYSBvdG/EjWlsLCB0dm9qYSBwb3rDrWNpYSBocm96w60gbGlrdmlkw6FjaW91LiBQb8WhbGkgxI9hbMWhw61jaCAzIDAwMCBFVVIgbWFyZ2luIGNhbGwgZG8gaG9kaW55LlwiXG5cblBvIHTDvcW+ZG5pOiDigJ5OZXBvZGFyaWxvIHNhIHphY2hyw6FuacWlIHBvesOtY2l1LCBhbGUgbcOhxaEgbsOhcm9rIG5hIHJlZnVuZMOhY2l1IOKAlCBwb8WhbGkgMSAyMDAgRVVSIGRhxYguXCIifQ==]]

Neexistuje legitímny broker, ktorý ti zavolá cez WhatsApp a tlačí ťa na vyšší vklad. Marek sedí v call-centre v Albánsku alebo Izraeli a číta scenár. „Margin call" (výzva na doplnenie zálohy) a „daň z refundácie" sú len rôzne obmeny toho istého: pošli ešte viac peňazí.

## Schéma #5 — fake broker s licenciou „CySEC"

[[visual:b64:eyJraW5kIjoidXJsIiwidXJsIjoiaHR0cHM6Ly9ldS10cmFkZXItcHJvLmNvbS9yZWd1bGF0ZWQiLCJzZWN1cmUiOnRydWV9]]

Stránka prezentuje „regulácia CySEC #248/12, FCA #FRN-887234". Čísla sú vymyslené alebo patria úplne inej firme. Skutočný regulovaný broker (Interactive Brokers, eToro) má licenciu overiteľnú v registri CySEC / NBS. Vždy si ju over priamo na regulátorovi, nie cez link na ich stránke.

## Indície investičného podvodu

**Červená vlajka:** „Garantovaný" alebo „istý" výnos. Žiadny legitímny produkt to neponúka.

**Červená vlajka:** Známa osobnosť (Musk, Kiska) odporúča „exkluzívne" v IG reklame.

**Červená vlajka:** Osobný account manager ti volá / píše cez WhatsApp / Telegram.

**Červená vlajka:** Tlak zvýšiť vklad, použiť „páku", „nezmeškať okamih".

**Červená vlajka:** Daň / poplatok / refundácia, ktorú musíš zaplatiť skôr ako uvidíš peniaze.

**Červená vlajka:** Doména .io / .co / .xyz, ktorá nie je v zozname Národnej banky Slovenska.

**Červená vlajka:** Komunita na Telegrame, kde admin sám nikdy nestratil.

**Červená vlajka:** Dashboard ukazuje úžasné zisky, ale výber sa odkladá.

**Červená vlajka:** Stránka má regulačné čísla, ktoré nesedia s registrom regulátora.

**Červená vlajka:** Sociálny dôkaz — snímky obrazovky „zákazníkov, ktorí už zarobili 50-tisíc EUR".

## Pravidlá, ktoré ťa zachránia pred krypto/AI podvodom

### ✅ Rob

- Pred vkladom over brokera v registri NBS (https://www.nbs.sk/sk/dohlad-nad-financnym-trhom/zoznamy).
- Používaj len známe regulované platformy (Interactive Brokers, Trading 212, eToro, XTB).
- Kryptomeny drž len na známych burzách (Coinbase, Kraken, Binance) a v hardvérovej peňaženke (Ledger, Trezor).
- Investuj len sumu, o ktorú si môžeš dovoliť prísť.
- Ak ťa kontaktuje „osobný broker" — okamžite ukonči hovor.

### ❌ Nerob

- Neklikať na investičnú reklamu v zozname príspevkov na IG / FB / TikTok.
- Nezadávať údaje karty na stránku, ktorú odporučila deepfake celebrita.
- Neposielať „daň zo zisku" alebo „margin call" vopred.
- Nedávať vzdialený prístup do počítača ani do bankovej aplikácie „account managerovi".
- Nenakupovať bezcenné kryptomeny na základe signálov z Telegramu.

## Reálny scenár — utorok večer, scrolluješ Instagram

Reklama: krátke video, Boris Kollár hovorí „Pripojil som sa k novej AI-trading platforme, prvý mesiac mi zarobila 18 %. Skúste to aj vy, stačí 250 EUR." Po kliknutí pekná stránka, registrácia, „account manager Tomáš" volá za 30 minút.

**Zlaté pravidlo:** Reklamu nahlásiš (Meta umožňuje nahlásiť ju ako podvod), platformu zatvoríš. Boris Kollár nikdy neodporučí investičnú platformu cez sociálnu sieť — ide o deepfake. Žiadny legitímny broker nezavolá za 30 minút. Vklad nikdy neurobíš.$body$, updated_at = now()
WHERE slug = 'investicne-podvody-krypto-ai' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: falošní dodávatelia a riaditelia

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PXgxSXZDSVdjcHJrIiwidGl0bGUiOiJQb3pvciBuYSBmYWxvxaFuw71jaCBkb2TDoXZhdGXEvm92IMSNaSByaWFkaXRlxL5vdiBmaXJpZW0iLCJzb3VyY2VOYW1lIjoiVGF0cmEgYmFua2EiLCJzb3VyY2VVcmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PXgxSXZDSVdjcHJrIiwiZGVzY3JpcHRpb24iOiJPc3ZldG92w6kgdmlkZW8gVGF0cmEgYmFua3kgbyBwb2R2b2RvY2ggdHlwdSBCRUMgKGZhbG/FoW7DvSByaWFkaXRlxL4vZG9kw6F2YXRlxL4pLiBOw6F6b3Juw6EgdWvDocW+a2EuIn0=]]

## BEC = jeden e-mail, 50 000 EUR preč

Business Email Compromise cieli na účtovníkov, asistentov, finančných manažérov v SK firmách. Útočník 2 – 4 týždne sleduje firemnú komunikáciu (cez jeden phishnutý účet alebo verejné LinkedIn dáta), naučí sa štýl CEO/CFO a potom v správnu chvíľu (pred dovolenkou, pri uzávierke) pošle „súrnu" žiadosť o prevod. Priemerná škoda na incident v EÚ podľa Europolu presahuje 50 000 EUR. Prevencia je 90 % o procese, 10 % o technike.

## Typ #1 — fake CEO ("som na meeting-u, urgentne preveď")

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiUGV0ZXIgTm92w6FrIChDRU8pIiwiZnJvbUVtYWlsIjoicGV0ZXIubm92YWtAZmlybWEtc2suY28iLCJzdWJqZWN0IjoiU8O6cm5lIOKAlCBwb3RyZWJ1amVtIHByZXZvZCwgc29tIG5hIGtsaWVudHNrb20gbWVldGluZ3UiLCJib2R5IjoiTcOhcmlhLCBzb20gdGVyYXogbmEgesOha2F6bsOtY2tvbSBtZWV0aW5ndSB2IE1uw61jaG92ZSBhIG5lbcO0xb5lbSB2b2xhxaUuIFBvdHJlYnVqZW0gdXJnZW50bmUgcHJldm9kb20gcG9zbGHFpSA0NyA4MDAgRVVSIG5hIMO6xI1ldCBub3bDqWhvIGRvZMOhdmF0ZcS+YS4gSUJBTjogREU4OSAzNzA0IDAwNDQgMDUzMiAwMTMwIDAwLiBTdmlmOiBDT0JBREVGRlhYWC4gUG/FoWxpIHBvdHZyZGVuaWUgcG8gdnlrb25hbsOtLCDEj2FrdWplbS4ifQ==]]

Klasický CEO Fraud. Doména 'firma-sk.co' (skutočná je 'firma.sk'). Štýl je natrénovaný — útočník čítal váš e-mailový archív týždne. „Som na meetingu, nemôžem volať" je obrana proti out-of-band verifikácii. Tento jeden e-mail je najdrahší v EÚ.

## Typ #2 — fake CFO mení bankové údaje dodávateľa

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiSmFuYSBIb3J2w6F0aG92w6EgKENGTykiLCJmcm9tRW1haWwiOiJqYW5hLmhvcnZhdGhvdmFAZmlybWEuc2siLCJzdWJqZWN0IjoiQWt0dWFsaXrDoWNpYSBiYW5rb3bDqWhvIMO6xI10dSBwcmUgZG9kw6F2YXRlxL5hIE1ldGFsVGVjaCIsImJvZHkiOiJNw6FyaWEsIE1ldGFsVGVjaCBtaSBwcsOhdmUgdm9sYWwg4oCUIG1lbmlhIGJhbmtvdsO9IMO6xI1ldCBrdsO0bGkgYWt2aXrDrWNpaS4gTm92w70gSUJBTiBwcmUgZmFrdMO6cnk6IFNLMzUgMTEwMCAwMDAwIDAwOTkgODg3NyA2NjU1LiBQb3XFvmkgaG8gbmEgZmFrdMO6cnUgIzIwMjQtMTE4NyAoMTIgNDAwIEVVUiksIGt0b3LDuiBtw6HFoSBkbmVzIHNwbGF0bsO6LiBQb3R2cmTDrW0gZS1tYWlsb20ga2XEjyBidWRlIMO6xI1ldCBha3TDrXZueS4ifQ==]]

Útočník phishol jeden interný účet (CFO) alebo spoofuje (podvrhnutie identity odosielateľa) doménu. Cieľ: prevod existujúcej legitímnej faktúry na ich účet. Túto schému zachytí len telefonický callback dodávateľovi — žiadny e-mail nestačí, lebo aj „potvrdenie" môže prísť z toho istého kompromitovaného účtu.

## Typ #3 — fake právnik („dôverné M&A, žiadne otázky")

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiRHIuIE1hcmVrIFBvbMOhaywgUG9sw6FrICYgUGFydG5lcnMiLCJmcm9tRW1haWwiOiJtYXJlay5wb2xha0Bwb2xhay1wYXJ0bmVycy1sZWdhbC5jb20iLCJzdWJqZWN0IjoiRMO0dmVybsOpIOKAlCBha3ZpesOtY2lhLCBwcmV2b2QgZXNjcm93IiwiYm9keSI6Ik3DoXJpYSwgdmHFoWEgc3BvbG/EjW5vc8WlIGplIHYgcHJvY2VzZSBha3ZpesOtY2llLCBrdG9yw7ogbsOhxaEgw7pyYWQgc3Byb3N0cmVka292w6F2YS4gUHJlIHByw6F2bnUgaXN0b3R1IHBvdHJlYnVqZW1lIGVzY3JvdyBwcmV2b2QgNzggMDAwIEVVUiBuYSBuw6HFoSDDusSNZXQgZG8gMTc6MDAgZG5lcy4gQ0VPIFBldGVyIE5vdsOhayB0byBvZHNvdWhsYXNpbCDDunN0bmUsIGFsZSBrdsO0bGkgcmVndWxhxI1uw6ltdSBlbWJhcmd1IG5lbcO0xb5lIGtvbXVuaWtvdmHFpSBww61zb21uZS4gUG96bsOhdGUgbmFzbGVkdWrDumNpY2ggNDggaG9kw61uIGFrbyBjb25maWRlbnRpYWxpdHkgcGVyaW9kIOKAlCDFvmlhZG5lIG90w6F6a3kga29sZWdvbS4ifQ==]]

Pridáva autoritu („právnik", „M&A") a izoláciu („nehovor s kolegami"). „Embargo" je psychologický trik — útočník vie, že callback by ho odhalil. Žiadny advokát nedonúti účtovníka k prevodu bez podpísanej zmluvy a bez možnosti overiť ho s CEO.

## Typ #4 — phishing (podvodné vylákanie údajov) CEO účtu cez Microsoft 365 spoof

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiTWljcm9zb2Z0IDM2NSBTZWN1cml0eSIsImZyb21FbWFpbCI6Im5vLXJlcGx5QG0zNjUtYWNjb3VudC1zZWN1cml0eS5jb20iLCJzdWJqZWN0IjoiVmHFoWUgaGVzbG8gTWljcm9zb2Z0IDM2NSB2eXByxaHDrSBvIDI0aCDigJQgb2thbcW+aXTDoSBha2NpYSBwb3RyZWJuw6EiLCJib2R5IjoiQ0VPL2FkbWluOiB2YcWhZSBoZXNsbyBrIE1pY3Jvc29mdCAzNjUgw7rEjXR1IHZ5cHLFocOtIG8gMjQgaG9kw61uLiBBYnkgc3RlIHphY2hvdmFsaSBwcsOtc3R1cCBrIE91dGxvb2ssIE9uZURyaXZlIGEgVGVhbXMsIHBvdHZyxI90ZSBzw7rEjWFzbsOpIGhlc2xvIGNleiBuacW+xaFpZSB1dmVkZW7DvSBvZGthei4iLCJjdGEiOiJaYWNob3ZhxaUgcHLDrXN0dXAifQ==]]

Toto je vstupný vektor pre BEC. Útočník phishne CEO heslo, prihlási sa do Outlooku, číta komunikáciu, naučí sa štýl. Až potom (po týždňoch) pošle z reálneho CEO mailboxu falošnú žiadosť o prevod. To je ten najnebezpečnejší typ — žiadny spoofing, e-mail je z naozaj firemnej domény.

## Typ #5 — payroll diversion (zamestnanec mení svoj výplatný účet)

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiVG9tw6HFoSBLcmFqxI1pIiwiZnJvbUVtYWlsIjoidG9tYXMua3JhamNpQGZpcm1hLXNrLmNvIiwic3ViamVjdCI6IlptZW5hIGJhbmtvdsOpaG8gw7rEjXR1IHByZSB2w71wbGF0dSIsImJvZHkiOiJNw6FyaWEsIHByb3PDrW0gem1lxYggbcO0aiB2w71wbGF0bsO9IMO6xI1ldCBwcmUgbmFzbGVkdWrDumN1IHbDvXBsYXR1LiBPdHZvcmlsIHNvbSBzaSBub3bDvSDDusSNZXQgdiBUYXRyYSBiYW5rZS4gSUJBTjogU0sxMSAxMTAwIDAwMDAgMDA2NiA1NTQ0IDMzMjIuIMSOYWt1amVtLCBUb23DocWhIn0=]]

Útočník phishne zamestnanca alebo spoofuje doménu, požiada o presmerovanie výplaty. Účtovníctvo to často vykoná bez overenia (zdá sa neškodné). Skutočný zamestnanec zistí, až keď výplata nepríde. Ochrana: každú zmenu výplatného účtu overiť osobne alebo telefonicky na predchádzajúce známe číslo.

## Indície BEC v príchodzom e-maile

**Červená vlajka:** Doména odosielateľa je „skoro" správna — 'firma-sk.co' namiesto 'firma.sk'.

**Červená vlajka:** Naliehanie na čas — „dnes do 17:00", „pred odchodom na dovolenku".

**Červená vlajka:** Zákaz overenia — „som na meetingu, nemôžem volať", „dôverné, neukáž kolegom".

**Červená vlajka:** Žiadosť o prevod na nový (predtým nepoužitý) účet.

**Červená vlajka:** Zmena bankového účtu existujúceho dodávateľa, len cez e-mail.

**Červená vlajka:** Štýl odosielateľa sa „skoro" hodí, ale niečo nesedí (vykanie, formálnosť).

**Červená vlajka:** Žiadosť o platbu mimo bežného workflow (Excel-faktúra, krypto, gift cards).

**Červená vlajka:** Reply-To pole sa líši od From poľa.

## Procesné obrany (90 % BEC zachytíš procesom, nie technikou)

### ✅ Rob

- Two-person rule pre prevody nad 5 000 EUR — vždy schvaľujú dvaja ľudia.
- Out-of-band verifikácia — pri každej žiadosti o prevod zavolaj CEO/CFO na známe číslo (nie z e-mailu).
- Zmena bankového účtu dodávateľa — vždy potvrdiť osobne / telefonicky na pred-existujúce číslo.
- Zmena výplatného účtu zamestnanca — vždy overenie cez HR, ideálne osobne.
- 2FA (dvojfaktorové overenie) na všetkých Microsoft 365 / Google Workspace účtoch (najmä management).
- Pravidelný BEC training pre účtovníctvo — phishing simulácie 2x ročne.

### ❌ Nerob

- Nevykonať prevod len na základe e-mailu, bez druhej verifikácie.
- Neignorovať „skoro správnu" doménu — vždy preveriť písmeno po písmene.
- Nepoužiť kontaktné číslo z e-mailu na callback — vždy z firemného adresára.
- Neprijímať „embargo" / „dôvernosť" ako dôvod nepovedať to nikomu.
- Neodkladaj procesné kontroly „lebo CEO sa hnevá, že to dlho trvá".

## Pred-prevodový checklist (vytlač a polož na stôl účtovníčke)

- ✅ Doménu odosielateľa som skontroloval/a znak po znaku.
- ✅ CEO/CFO som zavolal/a na známe číslo a verifikoval/a žiadosť.
- ✅ Pri novom IBAN som zavolal/a dodávateľovi na pred-existujúce číslo.
- ✅ Pri prevode nad 5 000 EUR mám second approval od kolegu.
- ❌ „Súrne, do hodiny" — ZASTAV, over znova.
- ❌ „Nehovor o tom kolegom, dôverné" — ZASTAV, over.
- ❌ Komunikácia ide len cez e-mail, žiadny telefonický kontakt.

## Reálny scenár — piatok 16:30, pred dovolenkou

Si účtovníčka v 30-osobovej firme. CEO Peter Novák ide o hodinu na 2-týždňovú dovolenku. Príde e-mail z 'peter.novak@firma-sk.co': „Mária, súrne preveď 47 800 EUR na nového dodávateľa pred mojím odchodom. IBAN posielam v ďalšej správe. Žiadam ťa, aby si to spravila ešte dnes — ďakujem."

**Zlaté pravidlo:** Zavoláš Petrovi na jeho mobilné číslo (z firemného adresára, nie z e-mailu). Ak nedvíha, napíšeš na osobný WhatsApp / Signal. Aj keby to spôsobilo 30-minútové zdržanie — Peter to ocení viac ako stratu 47 800 EUR. Doménu 'firma-sk.co' po druhom pohľade vidíš — vy ste '.sk', nie '.co'. To je ten varovný signál.$body$, updated_at = now()
WHERE slug = 'bec-pracovisko-fake-ceo' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si (a pusti rodičom): podvody na seniorov

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PXdGZVhwb19BdnRRIiwidGl0bGUiOiJJbnRlbGlnZW50bsO9IHNlbmlvciDigJQgcG9kdm9keSBuYSBpbnRlcm5ldGUgYSBjZXogdGVsZWbDs24iLCJzb3VyY2VOYW1lIjoiNXBlxYhhesOtIiwic291cmNlVXJsIjoiaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj13RmVYcG9fQXZ0USIsImRlc2NyaXB0aW9uIjoiRWR1a2HEjW7DqSB2aWRlbyBzw6lyaWUg4oCeSW50ZWxpZ2VudG7DvSBzZW5pb3LigJwgKDVwZcWIYXrDrSkgbyBwaGlzaGluZ3UgYSB2aXNoaW5ndSDigJQgcHJlc25lIHRvLCDEjW8gbcO0xb5lxaEgcHVzdGnFpSByb2RpxI1vbSBhIHN0YXLDvW0gcm9kacSNb20uIn0=]]

## Prečo sú seniori v hľadáčiku

Podľa dát Europolu seniori tvoria viac ako 60 % obetí telefonických podvodov. Dôvodov je niekoľko: väčšie úspory na účte, menší technologický prehľad a väčšia ochota dôverovať autoritám (banka, polícia, lekár). Ty — ako ich blízky — si prvá obranná línia. Nie preto, že by boli neschopní, ale preto, že útočníci sú profesionáli, ktorí tým trávia celý pracovný čas. Táto kapitola ti dáva konkrétne nástroje na rozhovor, nastavenia a reakciu po prípadnom útoku.

## Scenár #1 — „Vnuk" volá z cudziny

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6Im5lem7DoW1lIMSNw61zbG8gKCs0MyA5eHgpIiwibnVtYmVyIjoiKzQzIDkxMiAzNDUgNjc4IiwiaGludCI6IuKAnkJhYmnEjWthLCB0byBzb20gamEsIFBldGVyLCBtw6FtIHR1IHByb2Jsw6ltLCB6csOhxb5rYSBhdXRvbSB2IFJha8O6c2t1LiBQb3RyZWJ1amVtIHrDoWxvaHUgbmEgcHLDoXZuaWthLCAxIDIwMCBFVVIuIE1hbWEgbmV2aWUsIHByb3PDrW0sIG5lcG92ZXogamVqIG5pxI0sIHByw61kZSB0YW0gbmlla3RvIHByZXZ6aWHFpSBvYsOhbGt1LlwiIn0=]]

Útočníci prehľadávajú sociálne siete, vedia meno vnuka aj mesto, kde býva babička. Hlas „naklonuje" umelá inteligencia (deepfake — umelo vygenerované falošné video či hlas) alebo jednoducho dúfajú, že babička ho v rozrušení nespozná. Rodinné pravidlo: zavolaj späť na číslo, ktoré máš uložené v kontaktoch. Vždy.

## Scenár #2 — Falošný bankový „poradca"

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6IlbDmkIgQmFua2Eg4oCUIGJlenBlxI1ub3PFpSIsIm51bWJlciI6Iis0MjEgMiB4eHh4IHh4eHgiLCJoaW50Ijoi4oCeUMOhbiBLb3bDocSNLCB6YXpuYW1lbmFuw6EgcG9kb3pyaXbDuiB0cmFuc2FrY2lhIG5hIHZhxaFvbSDDusSNdGUuIEFieSBzbWUgdsOhcyBvY2hyw6FuaWxpLCBwcm9zw61tIGNob8SPdGUgaWhuZcSPIGsgYmFua29tYXR1IGEgdXJvYnRlIOKAnmJlenBlxI1ub3N0bsO9IHByZXZvZFwiIHBvZMS+YSBtw7RqaG8gbsOhdm9kdS5cIiJ9]]

Banka nikdy nepýta „bezpečnostný prevod pri bankomate". Len čo stojíš pri bankomate s telefónom v ruke a konáš podľa cudzieho návodu, peniaze odchádzajú z tvojho účtu. Správny krok: zavesiť a zavolať banke na číslo zo zadnej strany karty.

## Čo urobiť so svojimi blízkymi ešte dnes

- ✅ Dohodnite si rodinné „bezpečnostné slovo" — ktokoľvek ho nevie, nie je člen rodiny.
- ✅ Uložte rodičom do telefónu zákaznícku linku ich banky — priamo. Nech číslo nemusia hľadať.
- ✅ Nastavte SMS notifikácie pre každú transakciu na účte — každý výber, každý prevod.
- ✅ Zapnite 2FA (dvojfaktorové overenie) na ich e-mailovom účte — stačí SMS, nemusí to byť aplikácia.
- ✅ Povedzte im: banka, polícia ani Microsoft nikdy nežiadajú kód z SMS ani heslo.
- ✅ Ak máte obavu, nastavte denný limit prevodov — banka to umožní za 5 minút v pobočke.
- ❌ Nevysmievajte sa im, ak na niečo naleteli — hanba ich odradí od včasného nahlásenia.
- ❌ Nespoliehajte sa, že „u nás doma to nenastane" — nastane. Štatistika hovorí jasne.

## Ak sa podvod stane — čo urobiť ihneď

### ✅ Rob

- Zavolajte banke okamžite — každá minúta zvyšuje šancu na zastavenie prevodu. Číslo: zadná strana karty.
- Nahláste prípad na políciu (158) — bez nahlásenia nie je možné stíhanie ani štatistiky.
- Zmeňte heslá k e-mailu a internet bankingu z bezpečného zariadenia.
- Informujte ostatných príbuzných — útočníci volajú aj druhýkrát, keď vedia, že obeť „funguje".
- Podporte blízkeho emocionálne — hanba a šok sú normálne reakcie, nie slabosť.

### ❌ Nerob

- Neposielajte ďalšie peniaze na „vrátenie platby" ani „poistenie" — to je ďalší útok.
- Nekritizujte blízkeho, že dal peniaze — podvod je prepracovaný a obviňovanie obete nepomáha.
- Nečakajte, kým sa to „samo vyrieši" — rýchly zásah banky funguje iba prvých 24 hodín.

## Mama zavolá v panike

Mama ti zavolá: „Volali z banky, že mi zablokujú účet, pomôž mi, prosím si ťa. Povedali, že mám ísť k bankomatu a zadať kód, ktorý mi pošlú." Je rozrušená, verí tomu. Chce ísť hneď.

**Zlaté pravidlo:** Vysvetlíš jej pokojne: „Mama, to je podvod. Banka nikdy takto nevolá. Nikam nechoď, nič nerob." Potom spolu zavoláte na číslo z jej bankovej karty — nie na to, ktoré jej nechali. Banka overí, že žiadna blokácia nie je. Mama je v pohode, peniaze sú v bezpečí.$body$, updated_at = now()
WHERE slug = 'chran-svojich-blizkych' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: ako rozoznať deepfake

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PXExY25yWk85NVRFIiwidGl0bGUiOiJBa28gcm96b3puYcWlIGRlZXBmYWtlIHZpZGXDoT8hIiwic291cmNlTmFtZSI6IlptdWRyaSIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9cTFjbnJaTzk1VEUiLCJkZXNjcmlwdGlvbiI6IkVkdWthxI1uw6kgdmlkZW8gc2xvdmVuc2tlaiB2emRlbMOhdmFjZWogcGxhdGZvcm15IFptdWRyaSDigJQgYWtvIHJvem96bmHFpSBkZWVwZmFrZS4ifQ==]]

## Klonovanie hlasu: od sci-fi po bežný podvod

Ešte v roku 2020 bolo klonovanie hlasu doménou hollywoodskych štúdií. Dnes ho zvládne ktokoľvek s 30-sekundovým klipom z TikToku, YouTube alebo Instagram reels — zadarmo, cez desiatky verejných nástrojov. Výsledok je hlas, ktorý znie identicky ako váš syn, vaša mama, váš CEO. Deepfake video ide ešte ďalej: reálne vyzerajúce videohovory, na ktorých „vidíte" tvár osoby, ktorá skutočne nie je na druhom konci. Tieto technológie nie sú budúcnosť — sú súčasnosť. A útočníci ich používajú každý deň.

## Scenár #1 — Klonovaný hlas syna

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6Ik1hcnRpbiAoc3luKSIsIm51bWJlciI6Iis0MjEgOXh4IHh4eCB4eHgiLCJoaW50Ijoi4oCeT3RlY2tvLCB0byBzb20gamEuIE1hbCBzb20gbmVob2R1LCBzb20gdiBuZW1vY25pY2kgdiBCcm5lLiBOZW3DoW0gZG9rbGFkeSwgcG90cmVidWplbSAxIDUwMCBFVVIgaG5lxI8uIFByb3PDrW0sIHByZXZlxI8gdG8gbmEgdG90byDEjcOtc2xvIMO6xI10dSBhIG5pa29tdSBuZWhvdm9yLCBrw71tIG5lcHLDrWRlbSBkb21vdi5cIiJ9]]

Útočník stiahol hlasovú nahrávku z verejného videa, naklonil ju za menej ako 2 minúty. Rodičia počujú skutočný hlas syna — mozog to nedokáže odfiltrovať v stresovej situácii. Obrana: dopredu si dohodnite „rodinné heslo". Ak ho syn nevie povedať, nie je to syn.

## Scenár #2 — CEO deepfake videohovor

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6IkNFTyDigJQgSsOhbiBIb3J2w6F0aCAodmlkZWhvdm9yKSIsIm51bWJlciI6Ik1pY3Jvc29mdCBUZWFtcyDigJQgb3ZlcmVuw6Egb3JnYW5pesOhY2lhIiwiaGludCI6IlZpZMOtdGUgdHbDoXIgc3ZvamhvIHJpYWRpdGXEvmEuIEhvdm9yw606IOKAnk3DoW1lIHVyZ2VudG7DvSBha3ZpemnEjW7DvSBkZWFsLiBQcmV2aWVzxaUgODUgMDAwIEVVUiBuYSBlc2Nyb3cgw7rEjWV0IGRuZXMgZG8gMTQ6MDAuIERpc2tyw6l0bm9zxaUgcHJvc8OtbSDigJQgbmVpbmZvcm11anRlIGZpbmFuxI1uw7ouXCIifQ==]]

V roku 2024 spoločnosť v Hongkongu takto prišla o 25 miliónov USD. Deepfake video na Teams-hovore s falošnou tvárou CEO. Overenie: zvolajte fyzické stretnutie alebo zavolajte CEO na iný kanál (mobil). Finančné prevody nad istú sumu musia mať vždy druhý schvaľovací podpis.

## Scenár #3 — Politický deepfake na sociálnych sieťach

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiVmlkZW8gemRpZcS+YW7DqSBuYSBGYWNlYm9va3UsIDgwayB6ZGllxL5hbsOtIiwiYm9keSI6IuKAnsWgT0tVSsOaQ0U6IFByZW1pw6lyIEZpY28gcHJpYW1vIHBvdmVkYWwsIMW+ZSB2xaFldGt5IGJhbmtvdsOpIHZrbGFkeSBidWTDuiB2IHBvbmRlbG9rIHptcmF6ZW7DqS4gUHJldmXEj3RlIHBlbmlhemUgZG8ga3J5cHRhIElITkXEjlwiIOKAlCBwb2QgdmlkZW9tIGplIGxpbmsgbmEga3J5cHRvYnVyenUuIn0=]]

Deepfake videá politikov a celebrít sú vytvárané masovo na šírenie paniky alebo propagáciu podvodov. Overte zdroj priamo na oficiálnom webe vlády alebo spravodajských agentúr (TASR, SME, Denník N). Ak video nevydala overená inštitúcia — je to fake.

## Ako spoznať AI deepfake

**Červená vlajka:** Neprirodzene rýchle žmurkanie alebo neprirodzená mimika pri videu.

**Červená vlajka:** Okraje tváre/vlasov sa pri pohybe rozmazávajú alebo „trepocú".

**Červená vlajka:** Hlas znie roboticky na emocionálnych vrcholoch — AI sa ťažko učí plakať alebo smiať.

**Červená vlajka:** Urgentná žiadosť o peniaze kombinovaná s „nehovor nikomu".

**Červená vlajka:** Video alebo hovor prichádza z neobvyklého kontaktu alebo platformy.

**Červená vlajka:** Scenár, ktorý predtým nikdy nenastal: „syn v zahraničí bez dokladov".

## Obrana v ére AI klonov

### ✅ Rob

- Dohodnite si rodinné heslo — frázu, ktorú vie len rodina. Ak hovorí „syn" a heslo nevie, zaveste.
- Pri akejkoľvek žiadosti o peniaze cez nový kanál zavolajte späť na uložené číslo z kontaktov.
- Videá politikov a celebrít o peňazích overujte priamo na ich verifikovaných profiloch.
- Vo firme zaviesť pravidlo: finančné prevody nad X EUR bez písomného potvrdenia cez firemný email = nie.
- Obmedzte verejné hlasové klipy — dlhé videá na sociálnych sieťach sú surovinou pre klonovanie.

### ❌ Nerob

- Neposielajte peniaze na základe telefonátu od „príbuzného v núdzi" bez overenia.
- Nezverejňujte deepfake videá „zo zábavy" — pomáhate šíriť dezinformácie, aj keď to viete.
- Nepodliehajte časovému tlaku — urgencia je zámerná zbraň. „Stihnem to aj o hodinu."

## Nedeľný obed — telefón zavibruje

Sedíte pri obede. Zavolá číslo vášho syna. Hovorí „tato" a vysvetluje, že je vo Viedni zastihnutý bez peňaženky po nehodičke. Počujete jeho hlas, dokonca aj jeho typický smiech pri nervozite. Pýta si 900 EUR prevodom hneď.

**Zlaté pravidlo:** Zavesíte. Vytočíte syna na jeho čísle z kontaktov. Syn zdvíha z domu — je v poriadku a o ničom nevie. Nahlásite hovor na 158 (podvod, klonovanie hlasu) a upozorníte príbuzných.$body$, updated_at = now()
WHERE slug = 'ai-hlasove-a-deepfake-podvody' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: príliš lákavé investičné ponuky

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PTJpM3ZtTlg2clRJIiwidGl0bGUiOiJCdcSPdGUgb3BhdHJuw60gcHJpIGludmVzdGnEjW7DvWNoIHBvbnVrw6FjaCBzIHByw61sacWhIGzDoWthdsO9bSB2w71ub3NvbSIsInNvdXJjZU5hbWUiOiJUYXRyYSBiYW5rYSIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9Mmkzdm1OWDZyVEkiLCJkZXNjcmlwdGlvbiI6Ik9maWNpw6FsbmUgb3N2ZXRvdsOpIHZpZGVvIFRhdHJhIGJhbmt5IOKAlCBuw6F6b3Juw6EgKGhyYW7DoSkgdWvDocW+a2EsIG5pZSBhdXRlbnRpY2vDoSBuYWhyw6F2a2EuIn0=]]

## Čo je „pig butchering"?

Pig butchering (doslova „vykŕmiť a zabiť") je kombinovaný podvod, pri ktorom útočník najprv buduje vzťah s obeťou — romantický alebo priateľský — a potom ju lákavými investičnými „príležitosťami" pozvoľna oberá o celé úspory. Nie je to rýchly útok: trvá týždne až mesiace. Podľa Europolu je dnes táto schéma zodpovedná za väčšinu z miliárd eur ročne strácaných na investičných podvodoch v EÚ. Cieľ: ľudia v každom veku — od vysokoškolských študentov po dôchodcov.

## Fáza 1 — Prvý kontakt: „Bol som to omylom"

Na WhatsApp sa ti ozve správa: „Ahoj Katarína, toto číslo mi dal Tomáš, volám sa Li Wei, ale asi som sa pomýlil v čísle — ospravedlňujem sa!" Odhováraš ho a on sa zdvorilo ospravedlní. O deň neskôr napíše znova: „Keďže sme sa už porozprávali, chcem sa aspoň predstaviť — pracujem v oblasti financií v Ženeve, momentálne v Bratislave na konferencii." Fotka: atraktívny Ázijčan v elegantnom obleku pred hotelom.

**Zlaté pravidlo:** Nezodpovedáš vôbec (alebo zdvorilo ukončíš konverzáciu). „Omylom" správy od cudzincov, ktorí hneď začnú hovoriť o práci a cestovaní, sú štartovací scenár pig butchering podvodu. Neexistuje „náhodný omyl" — čísla sa volia cielene.

## Fáza 2 — Budovanie dôvery: týždne chatu

Li Wei ti píše každý deň. Zaujíma sa o teba, pýta sa na prácu, rodinu, záujmy. Posiela fotky z „pracovných ciest" — Dubaj, Singapur, Zürich. Pôsobí sofistikovane, empaticky, vtipne. Po troch týždňoch sa cítiš, akoby si ho dobre poznala. Nikdy sa nespomenulo nič o peniazoch alebo investíciách.

**Zlaté pravidlo:** Búriš sa: ako sa môže človek, ktorého si nikdy nevidela na videohovore (vždy má technický problém), stať tvojím dôverným priateľom? Videá, fotky ani profil na LinkedIn nedokážu nahradiť overený živý kontakt. Každý, kto sa po týždňoch intenzívneho písania stále vyhýba videochatu, má dôvod niečo skrývať.

## Fáza 3 — Prvý nástup na investičnú platformu

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiU2NyZWVuc2hvdCBXaGF0c0FwcCBrb252ZXJ6w6FjaWUiLCJib2R5IjoiTGkgV2VpOiDigJ5WaWVtLCDFvmUgc2kgb3BhdHJuw6EsIGFsZSBjaGNlbSBzYSBzIHRlYm91IHBvZGVsacWlIG8gbmllxI1vLCDEjW8gem1lbmlsbyBtw7RqIMW+aXZvdC4gUHJhY3VqZW0gcyByb2Rpbm7DvW0gYnJva2Vyb20sIGt0b3LDvSBtw6EgcHLDrXN0dXAgayBwcml2w6F0bmVqIG9iY2hvZG5laiBwbGF0Zm9ybWUuIFphIHBvc2xlZG7DqSAzIG1lc2lhY2Ugc29tIHpob2Rub3RpbCAyMjAgJS4gSW52ZXN0dWplbSBsZW4gc3VtdSwga3RvcsO6IHNpIG3DtMW+ZW0gZG92b2xpxaUgc3RyYXRpxaUg4oCUIDIgMDAwIOKCrCBzdGHEjcOtIG5hIHphxI1pYXRvay4gTmVtdXPDrcWhIG5pxI0gcm9iacWlLCBqYSB0aSB1a8Ohxb5lbSBrYcW+ZMO9IGtyb2suXCIifQ==]]

„Rodinný broker", „privátna platforma", konkrétne percentá zisku a ubezpečenie „stačí málo" — to sú tri signály z učebnice. Žiadna legitímna investičná platforma nie je dostupná iba cez osobný kontakt. Zisky nad 200 % za mesiac sú bez extrémneho rizika fyzicky nemožné.

## Fáza 4 — Falošný zisk a eskalácia

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiUGxhdGZvcm1hIGludmVzdHNrLWdsb2JhbC10cmFkZS5jb20iLCJib2R5IjoiVHZvaiBkYXNoYm9hcmQgdWthenVqZTogVmxvxb5lbsOpOiAyIDAwMCDigqwgfCBBa3R1w6FsbmEgaG9kbm90YTogNCA4NzAg4oKsICgrMTQzICUpLiBWw71iZXI6IE1pbmltw6FsbnkgdsO9YmVyIDUgMDAwIOKCrC4g4oCeTGkgV2VpLCB2aWTDrW0gemlzayEgQWxlIG5lZG9zdGFuZW0gaG8/XCIg4oCUIOKAnk5ldmFkw60sIGRvbG/FvsOtbSByb3pkaWVsIGphLCBzdGHEjcOtIGFrIHByaWTDocWhIMSPYWzFocOtY2ggMSA1MDAg4oKsIGEgbcO0xb5lxaEgaG5lxI8gdnliZXJhxaUuXCIifQ==]]

Zisky na platforme sú fiktívne — číslice sa menia ako v počítačovej hre a kontroluje ich útočník. Podmienka „minimálny výber" je zámer: donútiť ťa vložiť viac. Žiadna regulovaná platforma nedrží tvoje peniaze takýmto spôsobom.

## Fáza 5 — Daňová pasca a zmiznutie

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiRS1tYWlsIOKAnnBsYXRmb3JteVwiIiwiYm9keSI6Ik9kOiBzdXBwb3J0QGludmVzdHNrLWdsb2JhbC10cmFkZS5jb20gfCBQcmVkbWV0OiBWw6HFoSB2w71iZXIgYm9sIHBvemFzdGF2ZW7DvVxuXG5Ww6HFvmVuw6EgcGFuaSwgcHJlZCB1dm/Evm5lbsOtbSB2w71iZXJ1IDE4IDQwMCDigqwgbXVzw610ZSB1aHJhZGnFpSBkYcWIb3bDuiB6w6Fsb2h1IDE1ICUgKDIgNzYwIOKCrCkgcG9kxL5hIG1lZHppbsOhcm9kbsOpaG8gbmFyaWFkZW5pYSBPRUNELiBQbGF0YnUgcmVhbGl6dWp0ZSBkbyA0OCBob2TDrW4ga3J5cHRvbWVub3UgbmEgYWRyZXN1IGJjMXEuLi4ifQ==]]

„Daňová záloha" pred výberom je posledná pasca. Ak zaplatíš, príde ďalší poplatok — AML povinnosť (opatrenia proti praniu špinavých peňazí), poistné a podobne. Keď odmietneš, platforma sa „zasekne" a Li Wei prestane odpovedať. Regulovaní brokeri nikdy nevyžadujú daňové zálohy v kryptomenách pred výberom — dane platíš VY svojmu daňovému úradu PO prijatí peňazí.

## 7 signálov pig butchering útoku

**Červená vlajka:** Prvý kontakt je „omylom" — správa adresovaná inému menu alebo číslu.

**Červená vlajka:** Cudzinec s luxusným životným štýlom (fotky z hotelov, luxusné autá, exotické krajiny) buduje intenzívny vzťah čisto online.

**Červená vlajka:** Videohovor sa nikdy neuskutoční — technický problém, rušná práca, iný dôvod.

**Červená vlajka:** Po týždňoch/mesiacoch osobného chatu nasleduje návrh „súkromnej" investičnej príležitosti so zaručeným ziskom.

**Červená vlajka:** Platforma je prístupná len cez odkaz od kontaktu, nie cez bežný obchod s aplikáciami či regulátora.

**Červená vlajka:** Podmienka výberu peňazí je vždy nová — minimálna suma, daň, poplatok, „overenie".

**Červená vlajka:** Kontakt namiesto teba „vysvetlí" ako platiť daň — v kryptomenách, pred výberom.

## Ako sa chrániť

### ✅ Rob

- Overte každého cudzinca, s ktorým komunikujete online: reverzné vyhľadávanie fotky (Google Obrázky / TinEye), LinkedIn, overenie telefónneho čísla.
- Trvajte na živom videohovore cez WhatsApp alebo FaceTime pred akýmkoľvek finančným rozhovorom.
- Skontrolujte investičnú platformu v registri NBS (nbs.sk) alebo ESMA (esma.europa.eu) — ak tam nie je, je nelegálna.
- Poraďte sa s niekým dôveryhodným (rodina, priateľ) pred akýmkoľvek presunom peňazí.
- Ak ste sa stali obeťou: kontaktujte políciu SR (158) a NBS, zablokujte prístupy, zdokumentujte všetku komunikáciu.

### ❌ Nerob

- Neposielajte peniaze nikomu, koho poznáte iba z online kontaktu, bez fyzického stretnutia.
- Neinvestujte cez platformu, ku ktorej vás naviedol romantický záujem alebo „priateľ" z internetu.
- Neplaťte žiadne „dane" ani „poplatky" pred výberom investičného zisku — to je vždy podvod.
- Nepokúšajte sa o pomstu ani o „získanie peňazí späť" cez iné „recovery" firmy (firmy sľubujúce vrátenie ukradnutých peňazí) — to je ďalší podvod.$body$, updated_at = now()
WHERE slug = 'pig-butchering-podvod' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: nebezpečne nízke ceny e-shopov

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PU9QVVo1Z2gzLXZRIiwidGl0bGUiOiJOZWJlenBlxI1uZSBuw616a2UgY2VueSBlLXNob3BvdiIsInNvdXJjZU5hbWUiOiJUYXRyYSBiYW5rYSAjcHJlZGlnaXRhbG51YmV6cGVjbm9zdCIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9T1BVWjVnaDMtdlEiLCJkZXNjcmlwdGlvbiI6Ik9zdmV0b3bDqSB2aWRlbyBUYXRyYSBiYW5reSBvIGZhbG/FoW7DvWNoIGUtc2hvcG9jaC4gTsOhem9ybsOhIHVrw6HFvmthLCBuaWUgYXV0ZW50aWNrw6EgbmFocsOhdmthLiJ9]]

## Falošný e-shop poznáš za 2 minúty — ak vieš, kde pozerať

Falošný e-shop v roku 2026 nevyzerá ako tých päť chýb spred desiatich rokov. Má slušnú grafiku, fotky produktov, reálne názvy značiek a recenzie napísané ChatGPT-om. Často je to klon legitímneho českého alebo poľského obchodu, len s iným číslom IBAN na konci. Slováci ročne stratia milióny eur cez „výhodné" iPhony za 299 € z falošných reklám na Facebooku alebo z e-shopov, ktoré sa volajú elektromax-sk-vypredaj.com. Dobrá správa: dvojminútová kontrola pred zaplatením ťa zachráni v 95 % prípadov.

## Vzor #1 — FB reklama na iPhone za 299 €

[[visual:b64:eyJraW5kIjoidXJsIiwidXJsIjoiaHR0cHM6Ly9hcHBsZS12eXByb2Rlai1zay5zaG9wL2lwaG9uZS0xNS1wcm8tMjk5ZXVyIiwic2VjdXJlIjp0cnVlfQ==]]

Visiačik HTTPS neznamená nič — kúpiš ho hocikde za 5 €. Doména apple-vyprodej-sk.shop nie je Apple. Apple v SR predáva cez apple.com/sk alebo cez autorizovaných predajcov ako iStores či Datart.

## Vzor #2 — Klon Alza.sk

[[visual:b64:eyJraW5kIjoidXJsIiwidXJsIjoiaHR0cHM6Ly9hbHphLXNrLXZ5cHJlZGFqLm9ubGluZS9ub3RlYm9va3kifQ==]]

Skutočná Alza je len na alza.sk. Hocijaká poddoména s pomlčkou alebo TLD .online / .shop / .store je podvod. Pri pochybnostiach zadaj alza.sk priamo do prehliadača.

## Vzor #3 — Falošná recenzia s ChatGPT podpisom

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiUmVjZW56aWEgbmEgcG9kdm9kbm9tIGUtc2hvcGUiLCJib2R5IjoiU29tIHZlxL5taSBzcG9rb2puw6EgcyBtb2rDrW0gbsOha3Vwb20hIFByb2R1a3QgcHJpxaFpZWwgcsO9Y2hsbyBhIGt2YWxpdGEgcHJlZMSNaWxhIG1vamUgb8SNYWvDoXZhbmlhLiBVcsSNaXRlIG9kcG9yw7rEjWFtIHRlbnRvIG9iY2hvZCBrYcW+ZMOpbXUsIGt0byBoxL5hZMOhIGt2YWxpdG7DqSB2w71yb2JreSB6YSB2w71ob2Ruw7ogY2VudS4g4q2Q4q2Q4q2Q4q2Q4q2QIOKAlCBNw6FyaWEgSy4ifQ==]]

Vágna, bez konkrétneho produktu, bez detailu o doručení, bez fotky. Reálna recenzia spomína model, čas dodania a často aj problém s podporou. Recenzie generované umelou inteligenciou tvoria dnes 80 % obsahu na falošných e-shopoch.

## Vzor #4 — Platba len prevodom

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiUG9rbGFkxYhhIGZha2UgZS1zaG9wdSIsImJvZHkiOiJBa2NlcHR1amVtZTogQmFua292w70gcHJldm9kIG5hIElCQU4gQVQ4OSAzNzA0IDQwNDAgMDUzMiAwMTMwLiBQbyBwcmlww61zYW7DrSBwbGF0YnkgdG92YXIgb2RvxaFsZW1lIGRvIDIgcHJhY292bsO9Y2ggZG7DrS4ifQ==]]

Rakúsky IBAN (AT) pre slovenský e-shop? Žiadna karta, žiadny PayPal, žiadna dobierka? Legitímny obchod má aspoň 2 – 3 platobné metódy s ochranou kupujúceho. Prevod je nevratný.

## 7-bodový checklist pred zaplatením

- ✅ Doména presne sedí — alza.sk, nie alza-sk-vypredaj.online (ručne overiť v prehliadači).
- ✅ Kontakt obsahuje slovenskú adresu sídla, IČO a DPH — overiť na finstat.sk alebo orsr.sk.
- ✅ V pätičke sú VOP, reklamačný poriadok a GDPR (s reálnymi menami, nie „Lorem ipsum").
- ✅ Recenzie sú na nezávislých portáloch (Heureka.sk, Google Reviews) — nie len na ich vlastnom webe.
- ✅ Web ponúka aspoň platbu kartou (Visa/Mastercard) alebo dobierku — máš ochranu cez chargeback (spätné vrátenie platby cez banku).
- ❌ Cena je 50 – 80 % pod trhom („iPhone 15 Pro za 299 €") — neexistuje, vždy ide o podvod.
- ❌ Doména je mladá (menej ako 6 mesiacov) — overiť cez whois.sk alebo who.is.

## 6 znakov, podľa ktorých e-shop pôjde do koša

**Červená vlajka:** Doména obsahuje pomlčky, slová „shop / outlet / vypredaj / sk" a TLD .online, .store, .shop.

**Červená vlajka:** Žiadne IČO, žiadna adresa, žiadny telefón — len kontaktný formulár.

**Červená vlajka:** Recenzie sú len 5-hviezdičkové, vágne, bez konkrétnych mien a produktov.

**Červená vlajka:** Platba výhradne bankovým prevodom alebo cez krypto — žiadna karta.

**Červená vlajka:** Ceny 50 – 80 % pod trhom pri značkovom tovare (Apple, Samsung, Dyson).

**Červená vlajka:** Stránka v slovenčine, ale s pravopisnými chybami („objedávka", „bezplátne", „garácia").

## Ako nakupovať online bezpečne

### ✅ Rob

- Pri novom e-shope kontroluj IČO na finstat.sk — overíš obrat, vek firmy aj exekúcie.
- Plať kartou alebo cez PayPal — pri nedoručenom tovare máš 120 dní na chargeback.
- Hľadaj recenzie tvarom „názov-eshopu skusenosti" na Google a Heureka.sk.
- Pri zľavách nad 50 % na značkový tovar predpokladaj podvod, kým sa nepresvedčíš o opaku.

### ❌ Nerob

- Nepoužívaj bankový prevod ako jedinú možnosť — peniaze sú prakticky nevratné.
- Neklikaj na e-shopy z reklám na Facebooku či Instagrame bez kontroly domény mimo platformy.
- Nedôveruj recenziám len na webe predajcu — sú často generované umelou inteligenciou.
- Nedávaj číslo karty na stránku bez HTTPS (visiačik vľavo od URL).

## Reálny scenár — Dyson za 189 € z Instagramu

Vidíš sponzorovanú reklamu na Instagrame: Dyson V15 za 189 € (bežne 749 €), oficiálny výpredaj značky 2026, posledných 7 kusov. Klikneš, otvorí sa dyson-vypredaj-sk.shop — vyzerá moderne, fotky sú originálne. V pokladni je IBAN v Maďarsku a kontakt len cez formulár.

**Zlaté pravidlo:** Zatvoríš stránku. Otvoríš si dyson.sk v novom okne — žiadna takáto akcia neexistuje. Reklamu nahlásiš na Instagrame (3 bodky → Report Ad → Scam or Fraud). Ak ti to nedá pokoj, pozrieš model V15 na alza.sk alebo datart.sk za reálnu cenu. Ušetril si 189 €.$body$, updated_at = now()
WHERE slug = 'fake-eshop-ako-overit' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: nebezpečne nízke ceny e-shopov

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PU9QVVo1Z2gzLXZRIiwidGl0bGUiOiJOZWJlenBlxI1uZSBuw616a2UgY2VueSBlLXNob3BvdiIsInNvdXJjZU5hbWUiOiJUYXRyYSBiYW5rYSAjcHJlZGlnaXRhbG51YmV6cGVjbm9zdCIsInNvdXJjZVVybCI6Imh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9T1BVWjVnaDMtdlEiLCJkZXNjcmlwdGlvbiI6Ik9maWNpw6FsbmUgb3N2ZXRvdsOpIHZpZGVvIFRhdHJhIGJhbmt5IOKAlCBuw6F6b3Juw6EgKGhyYW7DoSkgdWvDocW+a2EsIG5pZSBhdXRlbnRpY2vDoSBuYWhyw6F2a2EuIn0=]]

## Bezpečné online nákupy začínajú pri výbere platby

Bezpečné online nákupy nie sú o tom, že prestaneš nakupovať. Sú o tom, že si vyberáš platobnú metódu, ktorá ti dáva páku, keď sa niečo pokazí. Kartová platba má chargeback (vrátenie peňazí cez banku do 120 dní). PayPal má Buyer Protection (ochranu kupujúceho). Apple Pay a Google Pay maskujú reálne číslo karty. Revolut a Wise ti dovolia vytvoriť jednorazovú virtuálnu kartu len na ten konkrétny nákup. Bankový prevod nemá nič z toho — keď peniaze odídu, sú preč. Tento kurz ti ukáže, ako tieto nástroje použiť v praxi pri nákupe na Slovensku.

## Vzor #1 — Virtuálna karta z Revolutu

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiUmV2b2x1dCDihpIgS2FydHkg4oaSIFZpcnR1w6FsbmUga2FydHkiLCJib2R5IjoiVnl0dm9yIGplZG5vcmF6b3bDuiB2aXJ0dcOhbG51IGthcnR1LiBQbyBwcnZvbSBwb3XFvml0w60gc2EgYXV0b21hdGlja3kgZGVha3RpdnVqZS4gTGltaXQgbmFzdGF2IHByZXNuZSBuYSBzdW11IG7DoWt1cHUgKyA1ICUgcmV6ZXJ2YSBuYSBEUEgvcG/FoXRvdm7DqS4gxIzDrXNsbyBrYXJ0eSBwbGF0w60gbGVuIDI0IGhvZMOtbi4ifQ==]]

Ideálne pre nedôveryhodné e-shopy. Aj keď údaje uniknú, karta je mŕtva po jednom použití. Revolut, Wise aj Curve túto funkciu majú v základnej (bezplatnej) verzii.

## Vzor #2 — Reklama „posledná šanca" z Facebooku

[[visual:b64:eyJraW5kIjoidXJsIiwidXJsIjoiaHR0cHM6Ly9sdXh1cy1ob2Rpbmt5LXNrLnNob3Avcm9sZXgtc3VibWFyaW5lci00OTlldXIiLCJzZWN1cmUiOnRydWV9]]

Rolex Submariner stojí 9 000 € a viac. Pri 95 % zľave to nie je akcia, je to podvod. Aj keby si zaplatil, v lepšom prípade dostaneš falzifikát z Číny, v horšom nič. Kartu na takéto stránky nikdy nezadávaj.

## Vzor #3 — Reklamácia cez chargeback

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoixb1pYWRvc8WlIG8gY2hhcmdlYmFjayAoVsOaQiBpbnRlcm5ldCBiYW5raW5nKSIsImJvZHkiOiJLYXJ0eSDihpIgRGV0YWlsIGthcnR5IOKGkiBSZWtsYW3DoWNpYSB0cmFuc2FrY2llLiBWeWJlciBkw7R2b2Qg4oCeVG92YXIgbmVib2wgZG9ydcSNZW7DvVwiIGFsZWJvIOKAnlRvdmFyIG5lem9kcG92ZWTDoSBwb3Bpc3VcIi4gUHJpbG/FvmnFpSBzY3JlZW5zaG90IG9iamVkbsOhdmt5LCBrb211bmlrw6FjaXUgcyBwcmVkYWpjb20sIGTDtGtheiBuZWRvcnXEjWVuaWEuIEJhbmthIHByZcWhZXRyw60gZG8gMzDigJM0NSBkbsOtLiJ9]]

Chargeback funguje pre Visa aj Mastercard, lehota je 120 dní od transakcie. Funguje aj pri falošných e-shopoch, ktoré sa medzitým „rozplynuli" — banka peniaze stiahne z acquiringovej banky obchodníka (banky, ktorá obchodníkovi spracúva kartové platby).

## Vzor #4 — Apple Pay namiesto fyzickej karty

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiUG9rbGFkxYhhIGUtc2hvcHUgcyBBcHBsZSBQYXkiLCJib2R5IjoiVnliZXJpZcWhIEFwcGxlIFBheSDihpIgVG91Y2ggSUQgLyBGYWNlIElEIOKGkiBwbGF0YmEgcHJlYmVobmUuIE9iY2hvZG7DrWsgbmlrZHkgbmVkb3N0YW5lIHR2b2plIHNrdXRvxI1uw6kgxI3DrXNsbyBrYXJ0eSwgbGVuIGplZG5vcmF6b3bDvSB0b2tlbi4gUHJpIMO6bmlrdSBkYXRhYsOhenkgb2JjaG9kbsOta2EgdHZvamUgw7pkYWplIG5pa2RlIG5pZSBzw7ouIn0=]]

Apple Pay aj Google Pay používajú tokenizáciu (nahradenie čísla karty náhradným kódom) — tvoje číslo karty je nahradené unikátnym tokenom viazaným na tvoje zariadenie. Token bez biometrie nikto nepoužije.

## Checklist bezpečnej platby online

- ✅ Platíš kartou Visa / Mastercard — máš chargeback do 120 dní.
- ✅ Pri novom e-shope použiješ virtuálnu jednorazovú kartu (Revolut, Wise, Curve).
- ✅ Apple Pay / Google Pay tam, kde sa dá — obchodník nikdy nevidí reálne číslo karty.
- ✅ PayPal pri zahraničných nákupoch — Buyer Protection pokrýva nedoručenie a reklamácie.
- ❌ Bankový prevod na IBAN ako jediná možnosť — nevratné, žiadna ochrana.
- ❌ Krypto platba (BTC, USDT) — anonymné, nevratné, žiadna autorita ti nepomôže.
- ❌ Posielanie údajov karty cez chat alebo e-mail — nikdy, žiadny obchodník toto nepýta.

## 6 platobných red flagov v pokladni

**Červená vlajka:** Pokladnica nemá HTTPS (visiačik vľavo od adresy URL) — neplať za žiadnych okolností.

**Červená vlajka:** Jedinou možnosťou platby je bankový prevod (najmä na zahraničný IBAN AT/HU/RO).

**Červená vlajka:** Pýtajú PIN ku karte alebo CVV cez e-mail či chat — žiadny obchodník toto legitímne nepýta.

**Červená vlajka:** Suma sa po kliknutí na „zaplatiť" zmení (napr. z € na inú menu) — vždy zruš a začni odznova.

**Červená vlajka:** Najprv pýtajú „overovací" prevod malej sumy — klasický scam (podvod), peniaze sú preč.

**Červená vlajka:** Cena za poštovné je vyššia ako samotný produkt — typický falošný e-shop na dropshipping (predaj tovaru, ktorý predajca nemá na sklade a posiela ho priamo od dodávateľa).

## Pravidlá platby v 2026

### ✅ Rob

- Pre nedôveryhodné e-shopy vždy použi virtuálnu kartu (Revolut, Wise) s limitom presne na sumu.
- Pri zahraničných nákupoch z USA či Číny preferuj PayPal kvôli Buyer Protection.
- Aktivuj si SMS alebo push notifikácie pre každú transakciu — podvod uvidíš do 5 sekúnd.
- Pri reklamácii vždy nechaj papierovú stopu — screenshot objednávky, e-maily, čísla transakcií.

### ❌ Nerob

- Nepoužívaj kreditnú kartu so zostatkom 5 000 € na hocijakom e-shope — výhradne virtuálku.
- Nikdy nikomu nedávaj CVV cez telefón, vrátane „bankára".
- Neukladaj kartu do prehliadača Chrome — keď ti niekto napadne účet, má aj kartu.
- Nepoužívaj rovnaké heslo na e-shop a banku — výrazne tak znížiš dosah úniku dát.

## Reálny scenár — Black Friday cez sponzorovaný príspevok

Vidíš FB reklamu: Sony PS5 za 249 € (bežne 549 €), Black Friday early access (skorý prístup k akcii). Stránka vyzerá ako Alza, ale doména je alza-blackfriday.com. Si v pokušení — keby to bola pravda, ušetril by si 300 €.

**Zlaté pravidlo:** Otvoríš si alza.sk priamo v prehliadači (zadáš ju ručne). Žiadna takáto akcia tam nie je. Zatvoríš podvodnú stránku. Ak by si bol veľmi zvedavý, vytvoríš si v Revolute jednorazovú virtuálnu kartu na 249 € a zaplatíš ňou — no s 99 % pravdepodobnosťou o tých 249 € prídeš, takže radšej nič. Reálna 30 % zľava na PS5 je asi 380 €, nie 249 €.$body$, updated_at = now()
WHERE slug = 'bezpecne-online-nakupy' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: podvody na seniorov (video)

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PXdGZVhwb19BdnRRIiwidGl0bGUiOiJJbnRlbGlnZW50bsO9IHNlbmlvciDigJQgcG9kdm9keSBuYSBpbnRlcm5ldGUgYSBjZXogdGVsZWbDs24iLCJzb3VyY2VOYW1lIjoiNXBlxYhhesOtIiwic291cmNlVXJsIjoiaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj13RmVYcG9fQXZ0USIsImRlc2NyaXB0aW9uIjoiRWR1a2HEjW7DqSB2aWRlbyBzw6lyaWUg4oCeSW50ZWxpZ2VudG7DvSBzZW5pb3LigJwgKDVwZcWIYXrDrSkgbyBwaGlzaGluZ3UgYSB2aXNoaW5ndSDigJQgaWRlw6FsbmUgcHVzdGnFpSBhaiByb2RpxI1vbSBhIHN0YXLDvW0gcm9kacSNb20uIn0=]]

## Bezpečnosť rodiny — tri rôzne generácie, tri rôzne riziká

Bezpečnosť rodiny online v roku 2026 znamená tri úplne odlišné konverzácie. S deťmi (7 – 14) riešiš rodičovskú kontrolu, kyberšikanu a Discord/TikTok. S tínedžermi (15 – 18) hovoríš o sextingu (posielanie intímneho obsahu), falošných profiloch a o tom, prečo Snapchat nie je súkromný. So seniormi — rodičmi a starými rodičmi — nastavuješ ich smartfón tak, aby im romance scammer (podvodník cez predstieraný ľúbostný vzťah) a falošný „vnuk v núdzi" nezobrali úspory. Tento kurz dáva konkrétne kroky pre každú skupinu — nie strašenie, ale praktické zapnutie 2FA (dvojfaktorové overenie), blokovanie webov a krízová linka 116 111, ktorá pre dieťa zachraňuje životy.

## Deti — kyberšikana na Discord serveri

[[visual:b64:eyJraW5kIjoidGV4dCIsImxhYmVsIjoiU3Byw6F2YSBuYSBEaXNjb3JkIHNlcnZlcmkgxaFrb2xza2VqIHRyaWVkeSIsImJvZHkiOiJ0b21hczogamFuYSBqZSBvemFqIGtyYXZhdGEsIHBvenJpdGUgYWtvIHZ5emVyYSBsb2wgKHByaWxvxb5lbsOhIHVwcmF2ZW7DoSBmb3RrYSlcbmx1a2FzOiDwn5iC8J+YgvCfmIJcbnBldHJhOiBhIGVzdGUgYWogc21yZGkgcHJ5XG50b21hczoga2VkIHByaWRlIHphanRyYSBkbyBza29seSB0YWsganUgbmF0b2NpbWUifQ==]]

Kyberšikana sa neskončí o 15:00 ako tá v škole — pokračuje 24/7 na telefóne dieťaťa. Linka detskej istoty 116 111 (zdarma, anonymne, 24/7) je prvý krok. Discord report a screenshot druhý.

## Tínedžeri — falošný profil „od dievčaťa zo školy"

[[visual:b64:eyJraW5kIjoiaW5zdGFncmFtIiwiYWNjb3VudCI6Imx1Y2lhX3pvX3Nrb2x5XzIwMjYiLCJ2ZXJpZmllZCI6ZmFsc2UsImJvZHkiOiJhaG9qLCB2aWRpbSB6ZSBjaG9kaXMgZG8gbmFzZWogc2tvbHksIG1hcyBwZWtuZSBvY2kg8J+YiiBuYXBpcyBtaSBuYSBzbmFwOiBsdWNpYWhvdC5zbmFwIiwiY3RhIjoiU2xlZG92YcWlIn0=]]

Sextortion (vydieranie intímnym obsahom) v roku 2026: podvodník naviaže kontakt ako „spolužiačka", presunie konverzáciu na Snapchat, vypýta intímnu fotku a potom vydiera. Pre tínedžera katastrofa — preto musí vedieť, že hovor s rodičom NIE JE trest, je jediné riešenie.

## Seniori — „vnuk mal nehodu"

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6Im5lem7DoW1lIMSNw61zbG8iLCJudW1iZXIiOiIrNDIxIDk0MCA1NTUgMTExIiwiaGludCI6IsSNYXN0byBhaiDEjWVza8O9IGvDs2QgKzQyMCBhbGVibyB6YWhyYW5pxI1uw70g4oCUIGNhbGxlciBJRCBzYSBkw6Egc2ZhbMWhb3ZhxaUifQ==]]

„Babka, mal som autonehodu, súrne 3 800 € na advokáta, neviem rozprávať, hlas mám rozbitý." Klasika. V roku 2026 navyše s AI klonom hlasu (deepfake — umelo vygenerovaný falošný hlas) reálneho vnuka z videa na TikToku/Instagrame. Žiadne peniaze sa nikdy neposielajú prevodom ani „kuriérovi" k bytu.

## Seniori — falošný „technik z Microsoftu"

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6Ik1pY3Jvc29mdCBTdXBwb3J0IiwibnVtYmVyIjoiKzQyMSAyIDAwMDAgMTIzNCIsImhpbnQiOiJNaWNyb3NvZnQgbmlrZHkgbmV2b2zDoSB1xb7DrXZhdGXEvm9tIOKAlCBuaWtkeSJ9]]

Volajúci tvrdí, že počítač babky je „nakazený vírusom", potrebuje inštalovať TeamViewer/AnyDesk na „opravu". Cieľ: prístup do internet bankingu. Žiadna IT firma nikdy nevolá nevyžiadane.

## Kontrolný zoznam pre rodičovský smartfón (8 – 14 rokov)

- ✅ Apple: Screen Time → Content & Privacy Restrictions. Android: Google Family Link — obe zdarma, jeden víkend nastaviť.
- ✅ Limit obrazovkového času, blokovanie obsahu pre dospelých (18+), schvaľovanie každej novej aplikácie cez rodičovský telefón.
- ✅ Vypnutie nákupov v aplikáciách (in-app — Apple ID / Google Play → vyžadovať heslo pri každom nákupe).
- ✅ Dohoda s dieťaťom napísaná: „v izbe telefón nie po 21:00, pri jedle nie, pri úlohách nie".
- ❌ Stalkerware (sledovací softvér — mSpy, FlexiSpy) bez vedomia tínedžera — nelegálne, zničí dôveru, nefunguje dlhodobo.
- ❌ „Mne neverí, lebo si stiahol Snapchat" — Snapchat nie je zlý, dôležitý je rozhovor, nie zákaz.

## Varovné signály, že dieťa zažíva problém

**Červená vlajka:** Náhle vypína telefón / otáča obrazovku, keď vojdeš do izby.

**Červená vlajka:** Prestáva chodiť do školy alebo na krúžky, ktoré roky miloval.

**Červená vlajka:** Spí horšie, je vyhasnutý, podráždený — bez zjavnej príčiny.

**Červená vlajka:** Stratil priateľov, prestal písať s niekým, s kým bol roky.

**Červená vlajka:** Bojí sa pozrieť na nové správy / notifikácie.

**Červená vlajka:** Hovorí o sebe negatívne („som škaredý", „nikto ma nemá rád") — nové, intenzívne.

**Červená vlajka:** Zmizli mu peniaze z vrecka alebo karty — môže byť obeť sextortion.

## Pravidlá pre rodinu

### ✅ Rob

- Pre starých rodičov nastav 2FA na ich e-mail a banku (najlepšie cez SMS, autentifikátor je pre nich ťažký).
- Pre dieťa povedz nahlas: „Ak ti niekto na nete urobí čokoľvek, čo ťa vystraší, povieš mi a NIE som naštvaný. Pomôžem."
- Spoločne s tínedžerom prejdite nastavenia súkromia na Instagrame / TikToku — kto vidí príbehy (stories), kto môže komentovať.
- Číslo 116 111 (Linka detskej istoty) vytlač a daj na chladničku — anonymne, zdarma, 24/7.

### ❌ Nerob

- Nikdy nedovoľ starým rodičom inštalovať „pomocné" appky (TeamViewer, AnyDesk) z telefonického návodu.
- Netrestajte dieťa za to, že vám povedalo o sextortion / podvode — potrestáte tým budúce priznania.
- Nečítajte tínedžerovi správy bez jeho vedomia — buď sa s vami baví, alebo s falošnou „Luciou".
- Nedávajte deťom kartu rodiča s NFC (bezkontaktná platba) bez limitu — nastavte vreckové na vlastnú detskú kartu (napríklad Revolut <18).

## Reálny scenár — babka a „vnuk Maťo"

Babke (74) volá človek: „Babka, to som ja, Maťo. Mal som autonehodu na D1, niekoho som zranil. Súrne potrebujem 4 200 € na advokáta, inak idem do väzby. Príde po peniaze môj kolega Pavol, nemôžem ti to povedať podrobnejšie, polícia ma sleduje." Hlas naozaj znie ako Maťov — útočník zostrihal AI klon z jeho instagramových príbehov.

**Zlaté pravidlo:** Babka zavesí. Zavolá Maťovi priamo na jeho známe číslo. Ak je nedostupný, zavolá jeho mame (svojej dcére) na overenie. Polícia v SR nikdy nevyžaduje úhradu „za advokáta v hotovosti k bytu". Toto je vždy podvod — a v roku 2026 už aj s AI klonom hlasu. Najlepšia prevencia: rodina má vopred dohodnuté „rodinné kontrolné slovo" — slovo, ktoré pozná len rodina a útočník ho nezistí.$body$, updated_at = now()
WHERE slug = 'rodina-deti-seniori' AND content_type = 'lesson';

UPDATE public.blog_posts
SET body_mdx = $body$## Pozri si na úvod: ako vyzerá typický scam

[[audio:b64:eyJwcm92aWRlciI6InlvdXR1YmUiLCJ1cmwiOiJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PUIxYk01YWE0T3FJIiwidGl0bGUiOiJTY2FtIHMgUFBQw610cm9tIiwic291cmNlTmFtZSI6IlRhdHJhIGJhbmthICNwcmVkaWdpdGFsbnViZXpwZWNub3N0Iiwic291cmNlVXJsIjoiaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1CMWJNNWFhNE9xSSIsImRlc2NyaXB0aW9uIjoiT2ZpY2nDoWxuZSBvc3ZldG92w6kgdmlkZW8gVGF0cmEgYmFua3kg4oCUIG7DoXpvcm7DoSAoaHJhbsOhKSB1a8Ohxb5rYSwgbmllIGF1dGVudGlja8OhIG5haHLDoXZrYS4ifQ==]]

## Top podvody na Slovensku v 2026 — čo sa zmenilo oproti 2025

Top podvody na Slovensku v 2026 majú jeden spoločný menovateľ: AI. Deepfake (umelo vygenerované falošné video či hlas) hlas z 8 sekúnd nahrávky, ChatGPT-generované e-maily bez gramatických chýb, falošné AI investičné platformy s realistickým UI. Zároveň prišli nové vlny — EÚ AI Akt (platný od augusta 2026) spustil vlnu phishingu (podvodné vylákanie prihlasovacích či platobných údajov) „povinná registrácia AI nástrojov", rebranding Slovenskej pošty na „Slovak Post" v marci dal útočníkom 6 mesiacov priestoru s „aktualizáciou údajov k novému značeniu" e-mailmi. Krypto pump-and-dump na meme coiny zlikvidoval slovenských retailových investorov za vyše 12 miliónov €. Tento kurz prejde 5 najaktuálnejších schém v SR a ako každú rozoznáš za pár sekúnd.

## Schéma #1 — „Povinná registrácia AI nástrojov podľa EÚ AI Aktu"

[[visual:b64:eyJraW5kIjoiZW1haWwiLCJmcm9tIjoiRXVyw7Nwc2thIGtvbWlzaWEg4oCUIEFJIE9mZmljZSIsImZyb21FbWFpbCI6InJlZ2lzdHJhdGlvbkBldS1haS1hY3QuY29tcGxpYW5jZS1wb3J0YWwuZXUiLCJzdWJqZWN0IjoiVVJHRU5UOiBSZWdpc3Ryw6FjaWEgQ2hhdEdQVCDDusSNdHUgcG9kxL5hIEFydGljbGUgMTIgQUkgQWN0IOKAlCBkbyAzMC42LjIwMjYiLCJib2R5IjoiVsOhxb5lbsO9IHXFvsOtdmF0ZcS+LCBwb2TEvmEgbm92w6lobyBFw5ogQUkgQWt0dSAow7rEjWlubsO9IDEuOC4yMDI2KSBzdGUgcG92aW5uw70gcmVnaXN0cm92YcWlIHbDocWhIMO6xI1ldCBPcGVuQUkgLyBDbGF1ZGUgLyBHZW1pbmkgY2V6IG9maWNpw6FsbnkgcG9ydMOhbC4gTmVzcGxuZW5pZSBocm96w60gcG9rdXRvdSBhxb4gMzUgMDAwIOKCrC4gUmVnaXN0csOhY2lhOiA1IG1pbsO6dCwgemRhcm1hLiIsImN0YSI6IlJlZ2lzdHJvdmHFpSDDusSNZXQifQ==]]

EÚ AI Akt nevyžaduje od jednotlivcov žiadnu registráciu — povinnosti má dodávateľ (OpenAI, Anthropic), nie ty. Doména eu-ai-act.compliance-portal.eu je phishing, oficiálny zdroj je digital-strategy.ec.europa.eu.

## Schéma #2 — „Slovak Post" rebranding podvod

[[visual:b64:eyJraW5kIjoic21zIiwic2VuZGVyIjoiU2xvdmFrUG9zdCIsImJvZHkiOiJQbyByZWJyYW5kaW5ndSBuYSBTbG92YWsgUG9zdCBqZSBudXRuZSBwb3R2cmRpdCB2YXNlIGRvcnVjaWFjaWUgdWRhamUsIGluYWsgaHJvemkgcHJlcnVzZW5pZSBzbHV6YnkuIE92ZXJpdDogc2xvdmFrLXBvc3QudXBkYXRlLWFjY291bnQuc2siLCJ0aW1lIjoiZG5lcyAxMzowOCJ9]]

Slovenská pošta v marci 2026 prešla rebrandom — útočníci to využili na hromadné SMS „aktualizácia údajov". Skutočná pošta neposiela SMS s linkom. Doména slovak-post.update-account.sk je podvodná, pravá je posta.sk alebo nový brand slovakpost.sk.

## Schéma #3 — Krypto pump-and-dump na meme coiny

[[visual:b64:eyJraW5kIjoiaW5zdGFncmFtIiwiYWNjb3VudCI6InNsb3Zha19jcnlwdG9fc2lnbmFscyIsInZlcmlmaWVkIjpmYWxzZSwiYm9keSI6IvCfmoAgU0xPVkFLIERPR0UgY29pbiBzcMO6xaHFpWFtZSB2IHN0cmVkdSAxODowMCBuYSBTb2xhbmUuIFZzdHVwbsOhIGNlbmEgMCwwMDAxIFVTRFQuIENpZcS+IDEwMHggemEgNDggaG9kw61uLiBQb3NsZWRuw71jaCAyMDAgbWllc3QgdiBwcml2w6F0bmVqIHNrdXBpbmUsIGxpbmsgdiBiaW8uIiwiY3RhIjoiUHJpcG9qacWlIHNhIiwiaW1hZ2VFbW9qaSI6IvCfkJUifQ==]]

Klasický pump-and-dump. Influencer cez Telegram skupinu organizuje „pump" — všetci kúpia v rovnaký čas, cena vyletí, on a jeho ľudia predajú na vrchole, ostatní zostanú so 99 % stratou. V SR sa cez 2025–2026 stratilo viac ako 12 miliónov € na týchto schémach.

## Schéma #4 — Deepfake CEO call

[[visual:b64:eyJraW5kIjoiY2FsbCIsImNhbGxlciI6IkNFTyBmaXJteSAoZGVlcGZha2UgaGxhc3UpIiwibnVtYmVyIjoic2tyw712YSBzYSBjZXogV2hhdHNBcHAgY2FsbCDigJQgxb5pYWRuZSBjYWxsZXIgSUQiLCJoaW50IjoiQUkga2xvbiBobGFzdSB6byA4IHNla8O6bmQgTGlua2VkSW4gdmlkZWEgQ0VPIn0=]]

V 2026 BEC podvody (podvod cez kompromitovaný firemný e-mail) postúpili — útočník volá cez WhatsApp s deepfake hlasom CEO, „súrny prevod 80 000 € na rakúsky účet, akvizícia, nikomu o tom nesmieš povedať". Hlas je 95 % autentický. Obrana: vždy druhé schválenie cez nezávislý kanál (osobne alebo Slack DM s overením kontextu).

## Schéma #5 — Falošné AI investičné platformy s celebritami

[[visual:b64:eyJraW5kIjoidXJsIiwidXJsIjoiaHR0cHM6Ly90cmFkaW5nYm90LWFpLWVsb24tMjAyNi5jb20vc2svcmVnaXN0cmFjaWEiLCJzZWN1cmUiOnRydWV9]]

Reklama: „Elon Musk uvádza novú AI investičnú platformu pre Slovákov. Začnete s 250 €, do mesiaca máte 3 800 €." Deepfake video Elona Muska / Andreja Kisku schvaľujúce platformu. Skutočnosť: pig butchering (dlhodobý investičný podvod budovaný cez vzťah) platforma, peniaze nikdy nevidíš.

## Spoločné znaky podvodov v 2026

**Červená vlajka:** AI generovaný obsah bez gramatických chýb — staré varovanie „hľadaj preklepy" už neplatí.

**Červená vlajka:** Deepfake hlasy a videá — overenie cez druhý nezávislý kanál je nutné.

**Červená vlajka:** Zneužívanie aktuálnych regulácií (EÚ AI Akt, GDPR aktualizácie, DORA) ako zámienka pre „povinnú akciu".

**Červená vlajka:** Rebranding známych značiek (Slovenská pošta → Slovak Post) ako zámienka pre „aktualizáciu údajov".

**Červená vlajka:** Krypto podvody s celebritami (Musk, Kiska, Kollár) — všetky deepfake, žiadna z nich nepropaguje krypto.

**Červená vlajka:** Telegram / Discord komunity „signals" — pump-and-dump organizovaný cez „exkluzívne tipy".

**Červená vlajka:** Tlak cez „limitované miesta" — „posledných 200 v skupine", „len prvých 50 účastníkov".

## Pravidlá pre 2026

### ✅ Rob

- Pri každej „úradnej" výzve (EÚ, ministerstvo, pošta) over informáciu na oficiálnom .gov / .gov.sk webe ručným zadaním adresy.
- Pri akejkoľvek finančnej požiadavke od šéfa / rodiny over druhým kanálom (osobne, Slack, iný telefón).
- Pre rodinu zaveď „kontrolné slovo" — útočník s deepfake hlasom ho nepozná.
- Krypto investície len cez regulované burzy (Coinbase, Kraken) — žiadne „signal" Telegram skupiny.

### ❌ Nerob

- Nereaguj na e-mail / SMS s výzvou „registrovať podľa EÚ regulácie" — žiadne také individuálne registrácie pre občanov neexistujú.
- Nedôveruj caller ID, deepfake videám, ani „celebritným" odporúčaniam investícií.
- Nepripájaj sa do „exkluzívnych" Telegram krypto skupín — sú pump-and-dump v 99 % prípadov.
- Nedôveruj „novej značke" bez overenia cez oficiálny web — fake rebranding domén je v 2026 top schéma.

## Reálny scenár — „povinná aktualizácia údajov k Slovak Post"

Príde ti SMS: „Slovak Post: Po rebrandingu je nutné potvrdiť doručovacie údaje, inak hrozí prerušenie služby. Overiť: slovak-post.update-account.sk." Naozaj čakáš balík z Aliexpressu — zdá sa to dôveryhodné.

**Zlaté pravidlo:** Otvor si posta.sk / slovakpost.sk priamo v prehliadači (zadáš ručne). Skontroluj stav zásielky cez Pošta SR appku. SMS so „povinnou aktualizáciou" ignoruješ a nahlásiš na 7726 (bezplatná linka pre spam SMS). Žiadna pošta nevyžaduje aktualizáciu cez SMS link — vždy iba cez prihlásenie do oficiálnej appky alebo na webe.$body$, updated_at = now()
WHERE slug = 'top-podvody-2026-sk' AND content_type = 'lesson';

