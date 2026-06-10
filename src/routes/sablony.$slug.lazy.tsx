import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicTemplateBySlug } from "@/lib/platform/queries";
import { buildTemplateCreativeWorkJsonLd } from "@/lib/seo/templates-jsonld";
import { jsonLdString } from "@/lib/seo/json-ld";

export const Route = createLazyFileRoute("/sablony/$slug")({
  component: SablonyDetailPage,
});

const AGE_RATING_LABEL: Record<"all" | "thirteen_plus" | "sixteen_plus" | "eighteen_plus", string> =
  {
    all: "Pre všetkých",
    thirteen_plus: "13+",
    sixteen_plus: "16+",
    eighteen_plus: "18+",
  };

function SablonyDetailPage() {
  const { slug } = useParams({ from: "/sablony/$slug" });
  const { data, isLoading, isError } = usePublicTemplateBySlug(slug);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12" data-testid="sablony-detail-not-found">
        <Card>
          <CardContent className="py-12 text-center">
            <h1 className="mb-2 text-2xl font-semibold">Šablóna nenájdená</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Šablóna s týmto odkazom buď neexistuje alebo nie je verejne dostupná. Pozri sa do
              knižnice ostatných šablón.
            </p>
            <Button asChild>
              <Link to="/sablony">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Späť na knižnicu šablón
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const t = data;
  const jsonLd = buildTemplateCreativeWorkJsonLd({
    slug: t.slug ?? slug,
    title: t.title,
    description: t.description,
    publishedAt: t.published_at,
    updatedAt: t.updated_at,
    authorDisplayName: t.author_display_name,
    ageRating: t.age_rating,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:py-16" data-testid="sablony-detail-root">
      <script
        type="application/ld+json"
        data-testid="sablony-detail-jsonld"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />

      <nav className="mb-6 text-sm" data-testid="sablony-detail-breadcrumb">
        <Link
          to="/sablony"
          className="inline-flex items-center text-muted-foreground hover:underline"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Šablóny
        </Link>
      </nav>

      <header className="mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" data-testid="sablony-detail-age">
            {AGE_RATING_LABEL[t.age_rating]}
          </Badge>
          <Badge variant="outline" data-testid="sablony-detail-license">
            CC BY 4.0
          </Badge>
          <Badge variant="outline">
            <BookOpen className="mr-1 h-3 w-3" />
            {t.question_ids.length} otázok
          </Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight" data-testid="sablony-detail-h1">
          {t.title}
        </h1>
        {t.description ? (
          <p
            className="text-lg leading-relaxed text-muted-foreground"
            data-testid="sablony-detail-description"
          >
            {t.description}
          </p>
        ) : null}
      </header>

      <Card className="mb-8 border-primary/50 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">Pustiť tento test svojim ľuďom</p>
            <p className="text-sm text-muted-foreground">
              Otvorí sa v buildri — pridáš si vlastnú prahovú hodnotu a zdieľaš link.
            </p>
          </div>
          <Button asChild size="lg" data-testid="sablony-detail-cta-use">
            <a href={`/test/builder?templateId=${t.id}`}>
              Použiť šablónu
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <section className="mb-10 space-y-2" data-testid="sablony-detail-author">
        <h2 className="text-xl font-semibold">Autor a licencia</h2>
        <p className="text-sm text-muted-foreground">
          Autor: <strong>{t.author_display_name ?? "subenai"}</strong>
          {t.published_at ? (
            <>
              {" · Publikované "}
              <time dateTime={t.published_at}>
                {new Date(t.published_at).toLocaleDateString("sk-SK")}
              </time>
            </>
          ) : null}
          {" · Licencia "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            CC BY 4.0
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          Šablónu môžeš zdieľať a upravovať, stačí ponechať uvedenie autora. Komunitné šablóny
          prechádzajú manuálnym schvaľovaním.
        </p>
      </section>

      <aside className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
        Chceš si šablónu prispôsobiť?{" "}
        <Link to="/app/templates" className="underline" search={{}}>
          Duplikuj ju do svojej knižnice
        </Link>{" "}
        a uprav otázky aj prahovú hodnotu pre svojich ľudí.
      </aside>
    </main>
  );
}
