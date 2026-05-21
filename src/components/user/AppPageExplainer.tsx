import { useEffect, useState } from "react";

import { PageExplainer } from "@/components/shared/PageExplainer";
import { tFor } from "@/i18n/app-explainers";

// E48 — collapsed-by-default info panel that ships on every /app/*
// menu route. Renders directly under <PageHeader>. Content is read
// from the `explainers.<pageKey>.*` subtree of the dedicated
// app-explainers i18n namespace (separate from app-shell.json so
// each namespace stays single-purpose).
//
// Persistence: open/closed state is stored per pageKey in localStorage
// under the `app-explainer-<pageKey>` key — symmetric with admin's
// `admin-explainer-<pageKey>` so a logged-in user/admin pair never
// share state by accident even on identical pageKey values (e.g.
// "tests" exists in both shells).

export interface AppPageExplainerProps {
  /**
   * Matches the nav key from AppShell (dashboard | tests | edu_tests |
   * templates | library | audiences | history | notifications | teams |
   * profile | help).
   */
  pageKey: string;
}

// E48 — declared on /cookies under the `prefs` category. Named
// constant so the storage-allowlist scanner attributes every write to
// this owner.
const APP_EXPLAINER_STORAGE_PREFIX = "app-explainer-";

function readPersisted(pageKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(APP_EXPLAINER_STORAGE_PREFIX + pageKey) === "1";
  } catch {
    return false;
  }
}

function writePersisted(pageKey: string, open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APP_EXPLAINER_STORAGE_PREFIX + pageKey, open ? "1" : "0");
  } catch {
    // Quota exceeded / disabled storage — silently degrade.
  }
}

function readReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function AppPageExplainer({ pageKey }: AppPageExplainerProps) {
  const t = tFor("explainers");
  const tObj = tFor.object("explainers");

  const [open, setOpen] = useState<boolean>(() => readPersisted(pageKey));
  const [reducedMotion] = useState<boolean>(() => readReducedMotion());

  // E48 ultrareview — reset on pageKey change. See AdminPageExplainer for
  // the full rationale.
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
      testIdPrefix="app-explainer"
      open={open}
      onOpenChange={handleOpenChange}
      reducedMotion={reducedMotion}
      // App shell has no sticky header — leave scroll position alone.
      scrollMarginTop={0}
    />
  );
}
