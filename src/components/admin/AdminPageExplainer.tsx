import { useEffect, useState } from "react";

import { PageExplainer } from "@/components/shared/PageExplainer";
import { tFor } from "@/i18n/admin";

// E47 — collapsed-by-default info panel that ships on every /admin/*
// route. Renders directly under <PageHeader>. Content is read entirely
// from the `explainers.<pageKey>.*` subtree of the admin i18n namespace
// — see src/i18n/locales/{sk,en,cs}/admin.json. The route passes only
// the pageKey; the component owns the rest of the contract.
//
// Persistence: open/closed state is stored per pageKey in localStorage
// under the `admin-explainer-<pageKey>` key, so an admin who expanded
// the panel on one page keeps it expanded across reloads, but pages
// stay independent.
//
// E48 — JSX, a11y, and Radix wiring extracted to <PageExplainer>; this
// file is now the admin-shell wrapper that owns the i18n namespace and
// the localStorage key. Keeping the named ADMIN_EXPLAINER_STORAGE_PREFIX
// in THIS file (not the shared component) lets the storage-allowlist
// scanner attribute every write to a clearly-named owner.

export interface AdminPageExplainerProps {
  /**
   * Matches the nav key from AdminSidebar (dashboard | tests |
   * quick_test | share_card | questions | answer_sets | trainings |
   * users | categories | reports | support | blog | pages | navigation
   * | header | footer | dsr | dpa_requests | settings | security).
   */
  pageKey: string;
}

// E47 — declared on /cookies under the `prefs` category (E40 row).
// E48 ultrareview — renamed from EXPLAINER_STORAGE_PREFIX for symmetry
// with the app variant's APP_EXPLAINER_STORAGE_PREFIX.
const ADMIN_EXPLAINER_STORAGE_PREFIX = "admin-explainer-";

function readPersisted(pageKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ADMIN_EXPLAINER_STORAGE_PREFIX + pageKey) === "1";
  } catch {
    return false;
  }
}

function writePersisted(pageKey: string, open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_EXPLAINER_STORAGE_PREFIX + pageKey, open ? "1" : "0");
  } catch {
    // Quota exceeded / disabled storage — silently degrade.
  }
}

// Lazy-initialised on first render so reduced-motion users never see a
// pre-effect frame with motion enabled. SSR-safe via the window guard.
function readReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function AdminPageExplainer({ pageKey }: AdminPageExplainerProps) {
  const t = tFor("explainers");
  const tObj = tFor.object("explainers");

  const [open, setOpen] = useState<boolean>(() => readPersisted(pageKey));
  const [reducedMotion] = useState<boolean>(() => readReducedMotion());

  // E48 ultrareview — reset `open` when pageKey prop changes. Today every
  // call site passes a literal but a future shared layout that reuses the
  // same component instance across routes (e.g. tabbed admin shell) would
  // otherwise display a stale state from the original pageKey.
  useEffect(() => {
    setOpen(readPersisted(pageKey));
  }, [pageKey]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    writePersisted(pageKey, next);
  };

  return (
    <PageExplainer
      pageKey={pageKey}
      t={t}
      tObj={tObj}
      testIdPrefix="admin-explainer"
      open={open}
      onOpenChange={handleOpenChange}
      reducedMotion={reducedMotion}
      // Admin shell has a sticky 56-px header; clear it on deep-link / focus.
      scrollMarginTop={20}
    />
  );
}
