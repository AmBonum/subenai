// E47.1 / E48.1 / E54.2 — manifest of every valid /docs/app/* and
// /docs/admin/* slug. Slugs are derived from the `docs.links[].href` in the
// explainer i18n bundles (src/i18n/locales/sk/admin.json and
// app-explainers.json `explainers.*`). The static test at
// tests/i18n/docs-manifest.test.ts fails closed if a linked slug is missing.
//
// E54.2 gives DocEntry a discriminant so the route can render real content:
//   - { kind: "stub" }      → the shared "coming soon" page
//   - { kind: "explainer" } → DocsExplainerPage, reading explainers.<key>
//     from app-explainers.json (content already authored for inline panels)
// App slugs whose name maps 1:1 to an explainer key are upgraded to
// "explainer"; granular sub-slugs (audiences-tags, tests-create, …) stay
// stubs until dedicated content lands.

export type DocEntry = { kind: "stub" } | { kind: "explainer"; explainerKey: string };

const STUB: DocEntry = { kind: "stub" };
const explainer = (explainerKey: string): DocEntry => ({ kind: "explainer", explainerKey });

export const ADMIN_DOCS: Record<string, DocEntry> = {
  aal2: STUB,
  "ai-generator": STUB,
  "answer-sets": STUB,
  "answer-sets-versioning": STUB,
  audit: STUB,
  blog: STUB,
  branding: STUB,
  categories: STUB,
  "categories-slugs": STUB,
  dashboard: STUB,
  "dpa-anonymisation": STUB,
  "dpa-requests": STUB,
  dsr: STUB,
  "dsr-runbook": STUB,
  footer: STUB,
  header: STUB,
  legal: STUB,
  navigation: STUB,
  pages: STUB,
  "pages-slugs": STUB,
  publishing: STUB,
  questions: STUB,
  "quick-test": STUB,
  reports: STUB,
  "reports-escalation": STUB,
  retention: STUB,
  security: STUB,
  "security-backup-codes": STUB,
  settings: STUB,
  "share-card": STUB,
  "share-card-cache": STUB,
  subprocessors: STUB,
  support: STUB,
  "support-escalation": STUB,
  "templates-license": STUB,
  "templates-precheck": STUB,
  tests: STUB,
  trainings: STUB,
  users: STUB,
};

export const APP_DOCS: Record<string, DocEntry> = {
  audiences: explainer("audiences"),
  "audiences-tags": STUB,
  dashboard: explainer("dashboard"),
  digest: STUB,
  "edu-tests": explainer("edu_tests"),
  "edu-tests-claim": STUB,
  help: explainer("help"),
  "help-support": STUB,
  history: explainer("history"),
  "history-events": STUB,
  insights: explainer("insights"),
  library: explainer("library"),
  "library-insert": STUB,
  notifications: explainer("notifications"),
  "notifications-email": STUB,
  profile: explainer("profile"),
  "profile-gdpr": STUB,
  "profile-security": STUB,
  teams: explainer("teams"),
  "teams-rls": STUB,
  templates: explainer("templates"),
  "templates-gdpr": STUB,
  "tests-create": explainer("tests"),
  "tests-sharing": STUB,
};

export function lookupDoc(area: "admin" | "app", slug: string): DocEntry | null {
  const map = area === "admin" ? ADMIN_DOCS : APP_DOCS;
  return map[slug] ?? null;
}
