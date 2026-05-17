// Lightweight i18n helper for the /app shell + AH-3 routes.
//
// We do not yet have the full i18next pipeline wired (feature/i18n-prep
// branch is mid-flight); this module gives AH-3 stories the same call
// shape (`tFor("namespace")("key.path")`) so the swap to react-i18next
// in a follow-up is a single-file change: replace the resolver below
// with `useTranslation("app-shell")` and keep call sites untouched.
//
// All Slovak strings live in `src/i18n/locales/sk/app-shell.json`. No
// English fallback file yet — Slovak is the only supported locale.
import skAppShell from "./locales/sk/app-shell.json";

type Json = string | { [k: string]: Json };

const resources: Record<string, Json> = {
  "app-shell": skAppShell as Json,
};

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
  const root = resources["app-shell"];
  const sectionNode = typeof root === "object" && section in root ? root[section] : root;
  return (key: string, vars?: Record<string, string | number>) =>
    interpolate(resolve(sectionNode, key), vars);
}
