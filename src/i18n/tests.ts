// Lightweight i18n helper for AH-5 tests/audiences/templates/history routes.
// All Slovak strings live in `src/i18n/locales/sk/tests.json`. Mirrors the
// `tFor("section")("key.path")` shape used elsewhere so the future i18next
// swap stays a one-line change at the call site.
import skTests from "./locales/sk/tests.json";

type Json = string | { [k: string]: Json };

const root = skTests as Json;

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
    typeof root === "object" && section in root ? (root as Record<string, Json>)[section] : root;
  return (key: string, vars?: Record<string, string | number>) =>
    interpolate(resolve(sectionNode, key), vars);
}
