import type { CourseSection } from "@/content/courses";
import { VisualBlock } from "@/components/quiz/flow/VisualBlock";
import { Check, X, AlertTriangle } from "lucide-react";
import { tFor } from "@/i18n/quiz";

function SectionFrame({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-10">
      <h2 id={`${id}-h`} className="text-2xl font-bold sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function slugify(text: string, idx: number): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `s-${idx}-${base || "section"}`;
}

export function CourseSectionView({ section, idx }: { section: CourseSection; idx: number }) {
  const t = tFor("courses_misc");
  const id = slugify(section.heading, idx);
  switch (section.kind) {
    case "intro":
      return (
        <SectionFrame id={id} heading={section.heading}>
          <p className="text-base leading-relaxed text-foreground/90 sm:text-lg">{section.body}</p>
        </SectionFrame>
      );
    case "example":
      return (
        <SectionFrame id={id} heading={section.heading}>
          <div className="space-y-4">
            <VisualBlock visual={section.visual} />
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {section.commentary}
            </p>
          </div>
        </SectionFrame>
      );
    case "checklist":
      return (
        <SectionFrame id={id} heading={section.heading}>
          <ul className="space-y-2" role="list">
            {section.items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3"
              >
                {item.good ? (
                  <Check
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-success"
                    aria-label={t("checklist_ok_aria")}
                  />
                ) : (
                  <X
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive"
                    aria-label={t("checklist_bad_aria")}
                  />
                )}
                <span className="text-sm text-foreground/90 sm:text-base">{item.text}</span>
              </li>
            ))}
          </ul>
        </SectionFrame>
      );
    case "redflags":
      return (
        <SectionFrame id={id} heading={section.heading}>
          <ul className="space-y-2" role="list">
            {section.flags.map((flag, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
              >
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <span className="text-sm text-foreground/90 sm:text-base">{flag}</span>
              </li>
            ))}
          </ul>
        </SectionFrame>
      );
    case "do_dont":
      return (
        <SectionFrame id={id} heading={section.heading}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-success/40 bg-success/10 p-4">
              <p className="mb-2 text-sm font-semibold text-success">{t("do_dont_yes")}</p>
              <ul className="space-y-1.5 text-sm text-foreground/90 sm:text-base" role="list">
                {section.do.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <p className="mb-2 text-sm font-semibold text-destructive">{t("do_dont_no")}</p>
              <ul className="space-y-1.5 text-sm text-foreground/90 sm:text-base" role="list">
                {section.dont.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <X
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SectionFrame>
      );
    case "scenario":
      return (
        <SectionFrame id={id} heading={section.heading}>
          <div className="space-y-4">
            <p className="text-base leading-relaxed text-foreground/90 sm:text-lg">
              {section.story}
            </p>
            <div className="rounded-lg border border-success/40 bg-success/10 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-success">
                {t("section_correct_reaction")}
              </p>
              <p className="text-sm text-foreground/90 sm:text-base">{section.right_action}</p>
            </div>
          </div>
        </SectionFrame>
      );
  }
}
