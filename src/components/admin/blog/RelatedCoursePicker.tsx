import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { COURSES } from "@/content/courses";

// E17.5 — admin UI picker for blog_posts.related_course_slug.
//
// Drives the article → course cross-link card on /blog/<slug>
// (ContinueWithCourseCard) and indirectly the reverse course → article
// card on /courses/<slug> (RelatedAcademyArticleCard) — both consume
// blog_posts.related_course_slug as the join.
//
// Source of truth for the options: the in-memory COURSES registry from
// src/content/courses (TS modules). Courses live as code, not DB rows,
// so this dropdown is regenerated at build time — no admin can pick a
// slug that doesn't resolve.
//
// "Žiadne" sentinel maps to null on save (matching the column's NULL
// semantics: no cross-link card rendered).

const NONE_VALUE = "__none__";

interface Props {
  value: string;
  onChange: (next: string) => void;
}

export function RelatedCoursePicker({ value, onChange }: Props) {
  // Empty form-state string ("") and the explicit NONE sentinel both
  // mean "no related course". Radix Select rejects empty string as a
  // SelectItem value, so we map to a sentinel internally and back out
  // to "" on the way to the parent.
  const internalValue = value === "" ? NONE_VALUE : value;

  const handleChange = (next: string) => {
    onChange(next === NONE_VALUE ? "" : next);
  };

  // Stable alphabetical order — slug-based so the dropdown doesn't
  // shuffle on every render of the editor. Courses live in TS modules
  // so the array order in COURSES is whatever the file imports happen
  // to declare; we don't want that bleeding into the admin UX.
  const sortedCourses = [...COURSES].sort((a, b) => a.slug.localeCompare(b.slug));

  return (
    <div>
      <Label htmlFor="related_course_slug">Súvisiace školenie (article → course cross-link)</Label>
      <Select value={internalValue} onValueChange={handleChange}>
        <SelectTrigger id="related_course_slug" data-testid="admin-blog-editor-related-course">
          <SelectValue placeholder="Žiadne" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE} data-testid="admin-blog-editor-related-course-option-none">
            — Žiadne (žiadny cross-link) —
          </SelectItem>
          {sortedCourses.map((c) => (
            <SelectItem
              key={c.slug}
              value={c.slug}
              data-testid={`admin-blog-editor-related-course-option-${c.slug}`}
            >
              {c.title} <span className="text-muted-foreground">({c.slug})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1 text-xs text-muted-foreground">
        Keď je nastavené, čitateľ uvidí pod článkom „Chceš si to precvičiť? → otvor školenie".
      </p>
    </div>
  );
}
