import { Link } from "@tanstack/react-router";

import { listPublicDocs } from "@/content/docs";
import { useAuth } from "@/hooks/useAuth";

// E54.4 — public documentation hub at /docs. Lists the public sections for
// everyone; signed-in users additionally get a link into the in-product
// app docs (/docs/app/*), which anonymous visitors never see.

function groupByCategory(docs: ReturnType<typeof listPublicDocs>) {
  const groups = new Map<string, ReturnType<typeof listPublicDocs>[number][]>();
  for (const d of docs) {
    const list = groups.get(d.category) ?? [];
    list.push(d);
    groups.set(d.category, list);
  }
  return [...groups.entries()];
}

export function DocsIndex() {
  const { isAuthenticated } = useAuth();
  const groups = groupByCategory(listPublicDocs());

  return (
    <div data-testid="docs-index-root" className="mx-auto max-w-4xl space-y-10 px-4 py-12 md:py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Dokumentácia
        </h1>
        <p className="text-lg text-muted-foreground">
          Kde čo nájdeš a ako to funguje — testy, kurzy, účet a ďalšie.
        </p>
      </header>

      {groups.map(([category, docs]) => (
        <section key={category} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {docs.map((doc) => (
              <li key={doc.slug}>
                <Link
                  to="/docs/$slug"
                  params={{ slug: doc.slug }}
                  data-testid="docs-index-section-link"
                  className="block h-full rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:bg-card"
                >
                  <span className="block font-semibold text-foreground">{doc.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {doc.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {isAuthenticated ? (
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="font-semibold text-foreground">Dokumentácia aplikácie</h2>
          <p className="mt-1 text-sm text-muted-foreground">Podrobný popis sekcií v tvojom účte.</p>
          <Link
            to="/docs/app/$slug"
            params={{ slug: "dashboard" }}
            data-testid="docs-index-app-link"
            className="mt-3 inline-flex text-sm font-semibold text-foreground hover:opacity-80"
          >
            Otvoriť dokumentáciu aplikácie →
          </Link>
        </section>
      ) : null}
    </div>
  );
}
