import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicTemplates } from "@/lib/platform/queries";
import { buildSablonyCollectionAndListJsonLd } from "@/lib/seo/templates-jsonld";
import { jsonLdString } from "@/lib/seo/json-ld";
import type { Template } from "@/lib/platform/types";

export const Route = createLazyFileRoute("/sablony/")({
  component: SablonyIndexPage,
});

const AGE_RATING_BADGE: Record<Template["age_rating"], string> = {
  all: "Pre všetkých",
  thirteen_plus: "13+",
  sixteen_plus: "16+",
  eighteen_plus: "18+",
};

function SablonyIndexPage() {
  const { data, isLoading, isError } = usePublicTemplates();
  const templates = data ?? [];

  // Emit ItemList JSON-LD client-side once we have the slugs. The
  // CollectionPage JSON-LD lives in head() and ships with the SSR
  // shell; this second blob is appended via a hidden <script> when
  // the data lands. Googlebot waits for hydration in 2026; smaller
  // crawlers see just CollectionPage which is enough for indexing.
  const jsonLd = buildSablonyCollectionAndListJsonLd(
    templates
      .filter((t): t is Template & { slug: string } => Boolean(t.slug))
      .map((t) => ({ slug: t.slug as string, title: t.title })),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:py-16" data-testid="sablony-root">
      <script
        type="application/ld+json"
        data-testid="sablony-jsonld"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />

      <header className="mb-10 space-y-4">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl" data-testid="sablony-h1">
          Test šablóny: bezplatné kvízy o online podvodoch
        </h1>
        <p
          className="max-w-3xl text-lg leading-relaxed text-muted-foreground"
          data-testid="sablony-intro"
        >
          Hľadáš pripravený kvíz, ktorý môžeš pustiť kolegom v práci, žiakom v triede alebo rodičom
          doma — bez toho, aby si musel písať otázky od nuly? Sme tu pre teba. V tejto verejnej
          knižnici nájdeš desiatky šablón testov o phishingu, falošných e-shopoch, podvodoch na
          sociálnych sieťach, AI deepfake hovoroch a ďalších témach modernej digitálnej bezpečnosti.
          Každú šablónu si môžeš pozrieť, použiť priamo alebo si ju duplikovať do svojej knižnice a
          upraviť pre svoju cieľovku. Všetky šablóny sú v slovenčine, zadarmo a pod licenciou
          Creative Commons BY 4.0 — môžeš ich teda zdieľať aj upravovať, stačí ponechať uvedenie
          autora. Komunitné šablóny prechádzajú manuálnym schvaľovaním, aby sa v knižnici neobjavili
          zavádzajúce alebo necitlivé otázky. Pozri si{" "}
          <Link to="/tests" className="underline">
            všetky testy v balíčku
          </Link>{" "}
          alebo si vyber šablónu nižšie.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive" data-testid="sablony-error">
            Šablóny sa momentálne nepodarilo načítať. Skús to o chvíľu znova.
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent
            className="py-16 text-center text-muted-foreground"
            data-testid="sablony-empty"
          >
            Knižnica je momentálne prázdna. Sleduj nás — onedlho pridáme prvé šablóny.
          </CardContent>
        </Card>
      ) : (
        <section aria-labelledby="sablony-list-heading" data-testid="sablony-list">
          <h2 id="sablony-list-heading" className="sr-only">
            Zoznam šablón
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <SablonyCard key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}

      <aside className="mt-16 rounded-lg border border-dashed bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground" data-testid="sablony-cta-tail">
          Chýba tu šablóna, ktorú potrebuješ?{" "}
          <Link to="/app/templates" className="underline" search={{}}>
            Vytvor svoju a odošli ju do verejnej knižnice.
          </Link>
        </p>
      </aside>
    </main>
  );
}

function SablonyCard({ template }: { template: Template }) {
  const href = template.slug ? `/sablony/${template.slug}` : null;
  return (
    <Card data-testid={`sablony-card-${template.id}`} className="flex h-full flex-col">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" data-testid={`sablony-card-${template.id}-age`}>
            {AGE_RATING_BADGE[template.age_rating]}
          </Badge>
          <Badge variant="outline" data-testid={`sablony-card-${template.id}-license`}>
            CC BY 4.0
          </Badge>
          <Badge variant="outline">
            <BookOpen className="mr-1 h-3 w-3" />
            {template.question_ids.length} otázok
          </Badge>
        </div>
        <CardTitle className="line-clamp-2 text-lg">
          {href ? (
            <Link to={href} data-testid={`sablony-card-${template.id}-title-link`}>
              {template.title}
            </Link>
          ) : (
            template.title
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {template.description ? (
          <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">{template.description}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>{template.author_display_name ?? "subenai"}</span>
          {href ? (
            <Button asChild variant="ghost" size="sm">
              <Link to={href}>
                Detail <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <a href={`/test/builder?templateId=${template.id}`}>
                Použiť <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
