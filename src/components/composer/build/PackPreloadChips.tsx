import type { TestPack } from "@/content/test-packs";
import { tFor } from "@/i18n/quiz";

interface Props {
  packs: TestPack[];
  selectedSlugs: ReadonlySet<string>;
  onToggle: (slug: string) => void;
}

export function PackPreloadChips({ packs, selectedSlugs, onToggle }: Props) {
  const t = tFor("pack_chips");
  if (packs.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2" role="group" aria-label={t("group_aria")}>
      {packs.map((p) => {
        const active = selectedSlugs.has(p.slug);
        return (
          <li key={p.slug}>
            <button
              type="button"
              data-testid={`composer-pack-chip-${p.slug}`}
              onClick={() => onToggle(p.slug)}
              aria-pressed={active}
              title={t("button_title", { n: p.questionIds.length, title: p.title })}
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span aria-hidden="true">{p.industryEmoji}</span>
              <span>{p.title}</span>
              <span className="text-xs font-normal text-muted-foreground">
                +{p.questionIds.length}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
