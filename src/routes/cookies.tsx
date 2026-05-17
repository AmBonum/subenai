import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { useConsent } from "@/hooks/useConsent";
import { CONSENT_VERSION } from "@/lib/consent";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Zásady používania cookies — subenai" },
      {
        name: "description",
        content:
          "Aké úložisko a cookies používa subenai, na čo slúžia, ako dlho zostávajú a ako ich môžeš spravovať.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  const { openPreferences, record } = useConsent();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Späť na domov
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Zásady používania cookies
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verzia {CONSENT_VERSION} · Posledná aktualizácia: 18. mája 2026
          </p>
        </header>

        <article className="prose prose-sm max-w-none space-y-6 text-foreground prose-headings:text-foreground prose-a:text-primary">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">1. Čo sú cookies a podobné technológie</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pod pojmom „cookies" v týchto zásadách rozumieme akékoľvek uloženie informácií na
              tvojom zariadení alebo prístup k nim — vrátane HTTP cookies, <code>localStorage</code>
              , <code>sessionStorage</code> a IndexedDB. Tento rozsah definuje smernica o súkromí v
              elektronických komunikáciách 2002/58/ES (čl. 5 ods. 3), v slovenskom práve § 109
              zákona č. 452/2021 Z.z. o elektronických komunikáciách.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">2. Kategórie a právne základy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Úložisko delíme do štyroch kategórií. Súhlas si vyžadujú len kategórie 2.2–2.4.
              Kategória 2.1 funguje na základe oprávneného záujmu (čl. 6 ods. 1 písm. f GDPR) a
              tvojej zmluvnej požiadavky test absolvovať.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-semibold">Kategória</th>
                    <th className="py-2 pr-4 text-left font-semibold">Názov / kľúč</th>
                    <th className="py-2 pr-4 text-left font-semibold">Účel</th>
                    <th className="py-2 text-left font-semibold">Trvanie</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Nevyhnutné</td>
                    <td className="py-2 pr-4">
                      <code>iiq_consent</code>
                    </td>
                    <td className="py-2 pr-4">
                      Záznam tvojho súhlasu (verzia + výber kategórií + časová pečiatka)
                    </td>
                    <td className="py-2">12 mesiacov / do zmeny</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Nevyhnutné</td>
                    <td className="py-2 pr-4">
                      <code>sb-*-auth-token</code>
                    </td>
                    <td className="py-2 pr-4">
                      Anonymná Supabase relácia — bez nej sa nedá uložiť tvoj výsledok testu cez Row
                      Level Security
                    </td>
                    <td className="py-2">~1 hodina (auto-refresh)</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Predvoľby</td>
                    <td className="py-2 pr-4">budúce</td>
                    <td className="py-2 pr-4">Zapamätanie jazyka / témy</td>
                    <td className="py-2">12 mesiacov</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Analytika</td>
                    <td className="py-2 pr-4">budúce (PostHog)</td>
                    <td className="py-2 pr-4">Anonymizované meranie miery dokončenia, A/B testy</td>
                    <td className="py-2">do 13 mesiacov</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">Marketing</td>
                    <td className="py-2 pr-4">aktuálne žiadne</td>
                    <td className="py-2 pr-4">
                      Personalizovaná reklama, retargeting (zatiaľ nepoužívame)
                    </td>
                    <td className="py-2">—</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4" rowSpan={4}>
                      Nevyhnutné pre platbu (iba na <code>/podpora</code>)
                    </td>
                    <td className="py-2 pr-4">
                      <code>__stripe_mid</code>
                    </td>
                    <td className="py-2 pr-4">
                      Stripe machine ID — fraud prevention, identifikácia zariadenia
                    </td>
                    <td className="py-2">1 rok</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      <code>__stripe_sid</code>
                    </td>
                    <td className="py-2 pr-4">Stripe session ID — udržanie platobnej relácie</td>
                    <td className="py-2">30 minút</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      <code>m</code>
                    </td>
                    <td className="py-2 pr-4">Stripe Checkout — ochrana proti CSRF</td>
                    <td className="py-2">relácia</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      <code>cookie-test</code>
                    </td>
                    <td className="py-2 pr-4">
                      Stripe test podpory cookies v prehliadači (žiadne osobné údaje)
                    </td>
                    <td className="py-2">relácia</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">3. Tretie strany (sprostredkovatelia)</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>Supabase (Supabase Inc., USA — EU región Frankfurt):</strong> hosting
                databázy a anonymná autentifikácia. Spracúva sa podľa SCC (štandardných zmluvných
                doložiek).
              </li>
              <li>
                <strong>Stripe (Stripe Payments Europe, Ltd., Írsko + Stripe, Inc., USA):</strong>{" "}
                platobný sprostredkovateľ. Cookies (<code>__stripe_mid</code>,{" "}
                <code>__stripe_sid</code>, <code>m</code>, <code>cookie-test</code>) sa nastavujú
                výhradne keď navštíviš <code>/podpora</code> alebo Stripe Checkout. Sú nutné pre
                fungovanie platby a fraud prevention. SCC pripojenie pre transfer do USA.
              </li>
              <li>
                <strong>Cloudflare (Cloudflare Inc., USA):</strong> hosting statickej časti
                aplikácie a CDN. EU dátové centrá, GDPR Data Processing Addendum.
              </li>
              <li>
                <strong>
                  Aktuálne neintegrujeme žiadne reklamné siete, sociálne pluginy ani externú
                  analytiku (napr. Google Analytics).
                </strong>{" "}
                Ak by sme niekedy pridali analytický alebo marketingový nástroj (napr. pre meranie
                návštevnosti, A/B testy alebo reklamné kampane), aktivuje sa <strong>iba</strong> s
                tvojím opt-in súhlasom v kategórii „analytika" alebo „marketing". Pri pridaní nového
                sprostredkovateľa zvýšime verziu týchto zásad — banner sa znova zobrazí a vyžiadame
                od teba nový súhlas.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">4. Ako spravovať súhlas</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tvoj výber môžeš kedykoľvek zmeniť kliknutím na tlačidlo nižšie alebo na odkaz
              „Nastavenia cookies" v päte stránky. Odvolanie súhlasu nemá vplyv na zákonnosť
              spracúvania uskutočneného pred odvolaním.
            </p>
            <div className="pt-2">
              <Button onClick={openPreferences}>Otvoriť nastavenia cookies</Button>
            </div>
            {record ? (
              <p className="pt-2 text-xs text-muted-foreground">
                Tvoj posledný súhlas: {new Date(record.timestamp).toLocaleString("sk-SK")} (verzia{" "}
                {record.version})
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">5. Vypnutie cez prehliadač</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cookies aj <code>localStorage</code> môžeš zakázať priamo v nastaveniach prehliadača.
              Bez nevyhnutnej kategórie sa ti však výsledok testu neuloží a stránka bude pri každom
              načítaní žiadať súhlas znova.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">6. Zmeny týchto zásad</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pri každej podstatnej zmene zvýšime <code>CONSENT_VERSION</code> a banner sa znova
              zobrazí, aby si mohol/mohla potvrdiť aktuálnu verziu. Drobné štylistické opravy
              nevyžadujú nový súhlas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">7. Súvisiace dokumenty</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Plný rozsah spracúvania osobných údajov, právne základy a tvoje práva nájdeš v{" "}
              <Link to="/privacy" className="underline underline-offset-2">
                zásadách ochrany súkromia
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
