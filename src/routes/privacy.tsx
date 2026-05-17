import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/layout/Footer";
import { CONTACT_EMAIL } from "@/config/site";
import { ROUTES } from "@/config/routes";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Zásady ochrany súkromia — subenai" },
      {
        name: "description",
        content:
          "Aké údaje spracúvame, na akom právnom základe, ako dlho ich uchovávame a aké práva máš podľa GDPR a slovenského zákona o ochrane osobných údajov.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            ← Späť na domov
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Zásady ochrany súkromia
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Posledná aktualizácia: 18. mája 2026 (verzia 1.4.0)
          </p>
        </header>

        <article className="prose prose-sm max-w-none space-y-6 text-foreground prose-headings:text-foreground prose-a:text-primary">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">1. Prevádzkovateľ</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Prevádzkovateľom v zmysle čl. 4 ods. 7 GDPR a § 5 písm. o) zákona č. 18/2018 Z. z. je:
            </p>
            <ul className="list-none space-y-1 pl-0 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">am.bonum s. r. o.</strong>
              </li>
              <li>Sídlo: Škultétyho 1560/3, 052 01 Spišská Nová Ves, Slovensko</li>
              <li>IČO: 55 055 290 · DIČ: 2121850005 · IČ DPH: nie sme platcami DPH</li>
              <li>
                Zápis: Mestský súd Košice, oddiel Sro, vložka č. 55453/V (deň zápisu
                23.&nbsp;11.&nbsp;2022)
              </li>
              <li>Štatutár: Ľubomír Volčko, konateľ konajúci samostatne</li>
              <li>
                Kontakt vo veciach ochrany osobných údajov:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Zodpovednú osobu (DPO) prevádzkovateľ nemá určenú — povinnosť mu nevyplýva z čl. 37
              ods. 1 GDPR ani z § 44 zákona č. 18/2018 Z. z. (nejde o orgán verejnej moci, hlavné
              činnosti nezahŕňajú systematické monitorovanie dotknutých osôb vo veľkom rozsahu, ani
              spracúvanie osobitných kategórií údajov podľa čl. 9 GDPR vo veľkom rozsahu).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">2. Aké údaje spracúvame</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>Tvoje odpovede a skóre v teste</strong> — odpovede na 15 otázok, čas
                odpovede, výsledné skóre a archetyp osobnosti. Bez týchto sa test nedá vyhodnotiť
                ani uložiť.
              </li>
              <li>
                <strong>Tvoje konkrétne odpovede</strong> — pre každú otázku ID otázky, vybraná
                možnosť (a, b, c, d), či bola správna, čas reakcie, kategória a obtiažnosť. Bez
                týchto sa po dokončení testu nedá zobraziť detailné review odpovedí.
              </li>
              <li>
                <strong>Anonymný identifikátor relácie</strong> — generovaný automaticky Supabase.
                Neobsahuje tvoje meno, e-mail ani IP adresu. Slúži na previazanie odpovedí s
                výsledkom.
              </li>
              <li>
                <strong>Záznam súhlasu s cookies</strong> — verzia zásad, ktoré si schválil/a,
                časová pečiatka a vybrané kategórie. Uložené lokálne v tvojom prehliadači.
              </li>
              <li>
                <strong>Edukačný „TrapDialog" po teste</strong> — popup ktorý vás vyzve vyplniť
                citlivé údaje (rodné číslo, číslo karty, CVV, IBAN, heslo, OTP). Toto je čisto
                vzdelávací moment.{" "}
                <strong className="text-foreground">
                  Hodnoty ktoré v ňom vyplníš NIKDY neopustia tvoj prehliadač
                </strong>{" "}
                — neodošlú sa na server, neuložia sa do databázy, nezapíšu sa do{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">localStorage</code>. Po
                zatvorení dialógu zaniknú v pamäti. Ukladáme iba jeden pomocný flag
                (`iiq_trap_seen`) aby sme ti popup znovu nezobrazili pri ďalšej návšteve — žiadne
                tvoje hodnoty.
              </li>
              <li>
                <strong>Voliteľné prieskumové odpovede</strong> — ak vyplníš post-test survey:
                veková kategória, pohlavie, mesto, krajina, sebahodnotenie opatrnosti (1–5),
                najväčšia obava na internete, či si už raz nasadol/a podvodu, odkiaľ si sa
                dozvedel/a o teste, či máš záujem o kurzy a aké témy.{" "}
                <strong>Žiadne pole nie je povinné</strong>, môžeš odoslať aj prázdny formulár.
              </li>
              <li>
                <strong>Technické údaje pre anti-cheat</strong> — čas zobrazenia otázky,
                presmerovania, počet pokusov. Spracúvané výlučne na zabránenie zneužitiu testu.
              </li>
              <li>
                <strong>Server logy hostingu</strong> — Cloudflare a Supabase si na obmedzený čas
                (typicky 7–30 dní) ukladajú IP adresu a hlavičky požiadaviek na účely bezpečnosti a
                prevencie útokov. K týmto logom prevádzkovateľ nepristupuje pri bežnej prevádzke.
              </li>
            </ul>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>Nepožadujeme a nespracúvame:</strong> e-mail, meno, telefónne číslo, adresu,
              presnú geolokáciu, údaje o platobnej karte, ani žiadne osobitné kategórie údajov v
              zmysle čl. 9 GDPR (zdravie, viera, politické názory atď.).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">3. Účel a právny základ spracúvania</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-semibold">Účel</th>
                    <th className="py-2 pr-4 text-left font-semibold">Právny základ</th>
                    <th className="py-2 text-left font-semibold">Doba uchovávania</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Vykonanie testu a uloženie skóre</td>
                    <td className="py-2 pr-4">Plnenie zmluvy / čl. 6 ods. 1 písm. b GDPR</td>
                    <td className="py-2">36 mesiacov</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Review odpovedí po dokončení testu</td>
                    <td className="py-2 pr-4">Plnenie zmluvy / čl. 6 ods. 1 písm. b GDPR</td>
                    <td className="py-2">36 mesiacov</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Voliteľné prieskumové odpovede (post-test survey)</td>
                    <td className="py-2 pr-4">Súhlas / čl. 6 ods. 1 písm. a GDPR</td>
                    <td className="py-2">36 mesiacov / odvolanie súhlasu</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Anti-cheat a bezpečnosť</td>
                    <td className="py-2 pr-4">Oprávnený záujem / čl. 6 ods. 1 písm. f GDPR</td>
                    <td className="py-2">12 mesiacov</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      Vlastné zostavy testov (Composer) — len ID otázok, prah úspešnosti, voliteľný
                      názov zostavy
                    </td>
                    <td className="py-2 pr-4">Plnenie zmluvy / čl. 6 ods. 1 písm. b GDPR</td>
                    <td className="py-2">12 mesiacov od vytvorenia</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      Edu odpovede (meno + e-mail respondenta v opt-in režime „Education mode")
                    </td>
                    <td className="py-2 pr-4">Súhlas / čl. 6 ods. 1 písm. a GDPR</td>
                    <td className="py-2">12 mesiacov, potom auto-anonymizácia</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Analytika a vylepšovanie produktu</td>
                    <td className="py-2 pr-4">Súhlas / čl. 6 ods. 1 písm. a GDPR</td>
                    <td className="py-2">do 13 mesiacov / odvolanie súhlasu</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Záznam súhlasu samotného</td>
                    <td className="py-2 pr-4">
                      Splnenie zákonnej povinnosti / čl. 6 ods. 1 písm. c GDPR
                    </td>
                    <td className="py-2">Po dobu platnosti súhlasu + 12 mesiacov</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Sponzorské platby (faktúra, AML, účtovníctvo)</td>
                    <td className="py-2 pr-4">
                      Plnenie zmluvy + zákon č. 431/2002 Z. z. / čl. 6 ods. 1 písm. b a c GDPR
                    </td>
                    <td className="py-2">10 rokov</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">4. Príjemcovia a sprostredkovatelia</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>Supabase Inc.</strong> (USA, dáta uložené v EU regióne Frankfurt) —
                sprostredkovateľ podľa čl. 28 GDPR, prenos do tretej krajiny zabezpečený
                Štandardnými zmluvnými doložkami (SCC).
              </li>
              <li>
                <strong>Cloudflare, Inc.</strong> (USA, EU PoP) — sprostredkovateľ pre hosting a
                CDN, GDPR Data Processing Addendum + SCC.
              </li>
              <li>
                <strong>Stripe Payments Europe, Ltd.</strong> (Írsko) so subprocesorom{" "}
                <strong>Stripe, Inc.</strong> (USA) — platobný sprostredkovateľ pre dobrovoľné
                podporné platby (zber kartových údajov, vystavenie faktúry, recurring odbery). SCC
                pripojenie podľa čl. 46 GDPR. Aktivuje sa iba ak otvoríš stránku{" "}
                <Link to={ROUTES.podpora} className="underline underline-offset-2">
                  /podpora
                </Link>
                .
              </li>
              <li>
                <strong>Resend, Inc.</strong> (USA) — sprostredkovateľ pre transakčné e-maily
                (potvrdenie podpory, magic link na správu odberu, varovanie pri refunde). SCC
                pripojenie. Žiadne marketingové e-maily.
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Údaje neposkytujeme reklamným sieťam, dátovým brokerom ani sociálnym sieťam. Údaje
              nepredávame.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong>Zdieľanie na sociálnych sieťach:</strong> ak klikneš tlačidlo „Zdieľaj na
              Facebook / Messenger / WhatsApp / X / LinkedIn / Telegram", otvoríme priamo oficiálnu
              stránku tej platformy s predvyplneným textom a linkom na výsledok. Žiadny kód tých
              platforiem (FB Pixel, X widget a podobne) sa do našej stránky nenačítava — share
              tlačidlá sú obyčajné odkazy. Po kliku odchádzaš na server tej platformy a od toho
              momentu sa na teba vzťahujú jej vlastné podmienky a privacy policy.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong>UTM parametre v share linkoch</strong> (napr.
              <code className="rounded bg-muted px-1 py-0.5 text-xs">?utm_source=facebook</code>):
              keď niekto klikne na nami vygenerovaný share link, URL obsahuje informáciu o tom, z
              ktorej platformy návšteva pochádza. Tieto parametre{" "}
              <strong>čítame iba ak máš v consent dialógu zapnutý súhlas s analytikou</strong>; bez
              súhlasu sa parametre ignorujú a nikam neodosielajú. Slúžia výhradne na agregovaný
              prehľad „odkiaľ chodia návštevníci", nie na profilovanie konkrétnej osoby.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">5. Tvoje práva</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Voči prevádzkovateľovi máš podľa čl. 15–22 GDPR a § 21–28 zákona č. 18/2018 Z.z. tieto
              práva:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                právo na <strong>prístup</strong> k osobným údajom (čl. 15)
              </li>
              <li>
                právo na <strong>opravu</strong> nepresných údajov (čl. 16)
              </li>
              <li>
                právo na <strong>vymazanie</strong> („právo byť zabudnutý", čl. 17)
              </li>
              <li>
                právo na <strong>obmedzenie spracúvania</strong> (čl. 18)
              </li>
              <li>
                právo na <strong>prenosnosť údajov</strong> (čl. 20)
              </li>
              <li>
                právo <strong>namietať</strong> proti spracúvaniu na základe oprávneného záujmu (čl.
                21)
              </li>
              <li>
                právo <strong>kedykoľvek odvolať súhlas</strong> bez vplyvu na zákonnosť spracúvania
                pred jeho odvolaním (čl. 7 ods. 3)
              </li>
              <li>
                právo <strong>podať sťažnosť</strong> Úradu na ochranu osobných údajov SR — Hraničná
                12, 820 07 Bratislava,{" "}
                <a
                  href="https://dataprotection.gov.sk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  dataprotection.gov.sk
                </a>
              </li>
            </ul>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              Žiadosti vybavujeme do 30 dní od doručenia (čl. 12 ods. 3 GDPR). Bezplatne, pokiaľ
              žiadosť nie je zjavne neopodstatnená alebo neprimeraná.
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>Self-service vymazanie:</strong> Keďže pokus o test je čisto anonymný a
              neviazaný na e-mail, najrýchlejšia cesta k vymazaniu vlastného výsledku je{" "}
              <strong>otvoriť svoj share link</strong> (napríklad <code>/r/abc123</code>) a kliknúť
              na tlačidlo „Vymazať tento výsledok" v dolnej časti stránky. Riadok je okamžite
              fyzicky vymazaný z databázy a share link prestane existovať. Bez emailovej
              komunikácie, bez čakania.
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>Automatická retencia:</strong> Naša databáza má naplánovanú dennú úlohu
              (Postgres pg_cron, runs 03:17 UTC), ktorá fyzicky vymaže záznamy staršie než 36
              mesiacov. Doba sa neresetuje žiadnou aktivitou — počíta sa od pôvodného vytvorenia
              pokusu. Tieto pravidlá sú zapísané priamo v migráciách (<code>20260426110000_*</code>)
              a nie sú odporúčaním.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">6. Automatizované rozhodovanie a profilovanie</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Vyhodnotenie testu (skóre, percentil, archetyp) je automatizované podľa pevne
              stanoveného algoritmu, no
              <strong> nemá žiadny právny ani podobne významný účinok</strong> na teba v zmysle čl.
              22 GDPR. Slúži výlučne na zábavu a edukáciu. Profilovanie na marketingové účely
              vykonávame iba s explicitným súhlasom (kategória „marketing" v cookie banneri);
              aktuálne žiadne marketingové profilovanie neprebieha.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Review odpovedí na share linku je read-only zobrazenie tvojich uložených odpovedí —
              žiadne nové automatizované rozhodnutie sa ním netvorí, nevzniká žiadny ďalší profil
              ani skóre.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">7. Sponzorovanie projektu</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ak sa rozhodneš podporiť projekt cez stránku{" "}
              <Link to={ROUTES.podpora} className="underline underline-offset-2">
                /podpora
              </Link>{" "}
              (jednorazovo alebo mesačne), spracujeme nasledujúce údaje výlučne pre účely vystavenia
              faktúry, AML compliance a vedenia účtovných záznamov:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>E-mail</strong> — pre faktúru a budúcu komunikáciu k odberu (napr. zmena
                karty, zrušenie odberu)
              </li>
              <li>
                <strong>Meno alebo názov firmy</strong> — povinný údaj na faktúre per § 74 zákona č.
                222/2004 Z. z.
              </li>
              <li>
                <strong>DIČ</strong> — voliteľne, pre B2B faktúru s nárokom na odpočet
              </li>
              <li>
                <strong>Fakturačná adresa</strong> — vyžadovaná Stripe pri sumách ≥ 35 €
              </li>
              <li>
                <strong>Údaje o platbe (kartové údaje, IBAN)</strong> — spracúva výlučne
                <strong> Stripe Payments Europe, Ltd.</strong> (Írsko) ako náš platobný
                sprostredkovateľ. My ich nikdy nevidíme ani neukladáme. Stripe je SCC-pripojený na
                Stripe Inc. (USA) per čl. 46 GDPR.
              </li>
            </ul>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>Právny základ:</strong> čl. 6 ods. 1 písm. b GDPR (zmluva o poskytovaní
              digitálnej služby) v kombinácii s písm. c (právna povinnosť vedenia účtovných záznamov
              per zákon č. 431/2002 Z. z.).
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>Doba uchovávania:</strong> <strong>10 rokov</strong> per § 35 zákona č.
              431/2002 Z. z. o účtovníctve. Táto retencia má prednosť pred GDPR čl. 17 (právo na
              vymazanie) — pri žiadosti o vymazanie anonymizujeme zobrazované polia (`display_name`,
              `display_link`, `display_message`), ale samotný účtovný záznam o transakcii zostáva v
              databáze pre prípadný daňový audit.
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>Refund a zrušenie odberu:</strong> dobrovoľný príspevok je{" "}
              <strong>nevratný</strong> (digitálna služba poskytnutá okamžite, právo na odstúpenie
              zaniká podľa § 7 ods. 6 zákona č. 102/2014 Z. z. — pred platbou explicitne zaškrtneš
              súhlas). Mesačný odber môžeš <strong>kedykoľvek zrušiť jediným klikom</strong> cez
              Stripe Customer Portal, ktorého link ti pošleme po zadaní e-mailu na adrese{" "}
              <Link to={ROUTES.spravovat} className="underline underline-offset-2">
                /spravovat-podporu
              </Link>
              . Zrušenie sa vzťahuje na nasledujúce fakturačné obdobia, nie minulé.
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>Dobrovoľné údaje pre verejné poďakovanie:</strong> pri checkoute si môžeš
              zvoliť, či ťa zobrazíme na stránke{" "}
              <Link to={ROUTES.sponzori} className="underline underline-offset-2">
                /sponzori
              </Link>{" "}
              (default je vypnuté). Granularne — meno, voliteľný odkaz, voliteľná správa do 80
              znakov. Súhlas môžeš kedykoľvek odvolať e-mailom na{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>Maximálna jednorazová suma 500 €</strong> — držíme limit pod hranicou KYC
              povinnosti per § 10 zákona č. 297/2008 Z. z. o ochrane pred legalizáciou príjmov z
              trestnej činnosti. Nad túto sumu prijímame podporu len bankovým prevodom mimo Stripe.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">8. Education mode (zber edu odpovedí)</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Od mája 2026 si autori vzdelávacích testov (učitelia, lektori, HR) môžu pri tvorbe
              vlastnej zostavy v Composeri zapnúť možnosť{" "}
              <strong>zbierať odpovede s menom a e-mailom respondenta</strong>. Cieľ: učiteľ chce
              vidieť, ako sa konkrétny študent zlepšuje. Tento režim je <strong>opt-in</strong> —
              predvolene je vypnutý a nedotýka sa štandardných anonymných testov na{" "}
              <code>/test</code> ani firemných zostáv bez tejto voľby.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>Aké údaje:</strong> meno respondenta, e-mail, skóre, detail odpovedí
                (rovnaké stĺpce ako pri anonymnom teste).
              </li>
              <li>
                <strong>Komu sú prístupné:</strong> autorovi testu cez password-protected dashboard
                (heslo si autor zvolil pri vytváraní zostavy, hash uložený cez bcrypt). Naše servery
                dáta hostujú; mimo dashboardu k nim nikto nepristupuje.
              </li>
              <li>
                <strong>Účel:</strong> hodnotenie testu autorom (učiteľom, HR).
              </li>
              <li>
                <strong>Právna rola:</strong> v tomto scenári je{" "}
                <strong>autor testu kontrolór</strong> (čl. 4 ods. 7 GDPR) — určuje účel a
                prostriedky spracúvania osobných údajov respondenta.{" "}
                <strong>am.bonum s. r. o. je sprostredkovateľ</strong> podľa čl. 28 GDPR — dáta
                hostuje a spracúva výlučne na pokyn autora. Šablónu zmluvy o sprostredkovaní (DPA)
                poskytneme na vyžiadanie e-mailom na{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  subenai.podpora@gmail.com
                </code>
                .
              </li>
              <li>
                <strong>Právny základ:</strong> súhlas respondenta podľa čl. 6 ods. 1 písm. a GDPR.
                Súhlas je vyžadovaný explicitne na intake formulári pred začatím testu; bez neho
                test nepokračuje.
              </li>
              <li>
                <strong>Doba uchovávania: 12 mesiacov</strong> od vytvorenia záznamu, potom
                automaticky meno a e-mail anonymizujeme (skóre + odpovede zostávajú pre štatistiku
                autora). Autor môže konkrétneho respondenta vymazať skôr cez dashboard.
              </li>
            </ul>
            <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Ak ste respondent edu testu:</strong> primárny
              kontakt pre uplatnenie vašich GDPR práv (čl. 15–22 — prístup, oprava, vymazanie,
              prenos) je <strong>autor testu</strong>, nie my. My ako sprostredkovateľ vaše dáta len
              hostujeme a po pokyne autora ich vymažeme. Ak neviete, kto je autor, alebo nemá
              odpoveď, kontaktujte nás na{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                subenai.podpora@gmail.com
              </code>{" "}
              — pomôžeme vám autora identifikovať a postúpime žiadosť.
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">9. Bezpečnosť</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Komunikácia prebieha cez HTTPS (TLS 1.3), údaje v Supabase sú šifrované at-rest aj
              in-transit, prístup k databáze je chránený Row Level Security politikami.
              Stripe-hostované formuláre kartových údajov sú PCI DSS Level 1 certifikované — naše
              servery žiadne kartové údaje nikdy nevidia. Heslá autorov edu zostáv ukladáme výlučne
              ako bcrypt hashe (pgcrypto, cost factor 10) — pôvodné heslo neukladáme nikde.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">10. Zmeny týchto zásad</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pri podstatnej zmene zásad ti zobrazíme nový cookie banner so žiadosťou o nový súhlas
              (zvýšením verzie záznamu). Drobné jazykové úpravy zverejňujeme bez upozornenia.
              Aktuálna verzia má vždy uvedený dátum pri názve dokumentu.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">11. Súvisiace dokumenty</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Detailný zoznam cookies a úložiska je v{" "}
              <Link to={ROUTES.cookies} className="underline underline-offset-2">
                zásadách používania cookies
              </Link>
              .
            </p>
          </section>
        </article>

        <Footer />
      </main>
    </div>
  );
}
