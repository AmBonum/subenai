// Lightweight i18n helper for the /admin shell + AH-6 / AH-10 routes.
//
// Mirrors `src/i18n/app-shell.ts`: pure synchronous resolver against the
// per-namespace Slovak JSON. Swap to react-i18next is a single-file change
// when the broader pipeline lands.
import skAdmin from "./locales/sk/admin.json";

type Json = string | { [k: string]: Json };

const root = skAdmin as Json;

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
  const sectionNode = typeof root === "object" && section in root ? root[section] : root;
  return (key: string, vars?: Record<string, string | number>) =>
    interpolate(resolve(sectionNode, key), vars);
}
