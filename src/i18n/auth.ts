// Lightweight i18n helper for AH-13 auth routes (/signup, /auth/callback,
// /forgot-password, /auth/reset-password). Mirrors `app-shell.ts` so the
// swap to react-i18next is a single-file change later.
import skAuth from "./locales/sk/auth.json";

type Json = string | { [k: string]: Json };

const root: Json = skAuth as Json;

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
