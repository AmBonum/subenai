// AH-12 — i18n resolver for the security namespace (2FA enroll / verify
// flows + the /app/account/security 2FA section). Mirrors
// src/i18n/admin.ts: pure synchronous resolver against Slovak JSON.
import skSecurity from "./locales/sk/security.json";

type Json = string | { [k: string]: Json };

const root = skSecurity as Json;

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
