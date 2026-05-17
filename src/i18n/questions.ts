// Lightweight i18n helper for the AH-4 questions library + answer sets.
//
// Same shape as `src/i18n/app-shell.ts`. When the i18next pipeline lands the
// resolver below can be swapped for `useTranslation("questions")` without
// touching call sites.
//
// All Slovak strings live in `src/i18n/locales/sk/questions.json`.
import skQuestions from "./locales/sk/questions.json";

type Json = string | { [k: string]: Json };

const root: Json = skQuestions as Json;

function resolve(node: Json, path: string): string {
  const parts = path.split(".");
  let cur: Json = node;
  for (const p of parts) {
    if (typeof cur === "string") return cur;
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function tFor(section: string) {
  const sectionNode =
    typeof root === "object" && section in (root as Record<string, Json>)
      ? (root as Record<string, Json>)[section]
      : root;
  return (key: string, vars?: Record<string, string | number>) =>
    interpolate(resolve(sectionNode, key), vars);
}
