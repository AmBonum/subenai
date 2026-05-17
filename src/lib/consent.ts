/**
 * Cookie / storage consent state — GDPR + ePrivacy + zákon č. 452/2021 Z.z.
 *
 * "Cookies" in legal context = any storage of information on the user's
 * terminal equipment, including localStorage / sessionStorage / IndexedDB
 * (ePrivacy Directive 2002/58/EC, Article 5(3)). This module manages all
 * of them through a single consent record.
 *
 * Bump CONSENT_VERSION whenever the categories, processing purposes,
 * or third-party recipients listed in /cookies and /privacy change in a
 * way that affects the user's previous decision. The banner re-appears.
 */

export const CONSENT_VERSION = "1.4.0";
export const CONSENT_STORAGE_KEY = "iiq_consent";

export type ConsentCategory = "necessary" | "preferences" | "analytics" | "marketing";

export type ConsentCategories = Record<ConsentCategory, boolean>;

export interface ConsentRecord {
  version: string;
  timestamp: string; // ISO 8601 UTC
  categories: ConsentCategories;
}

/** Defaults applied before the user has chosen — only `necessary` is allowed. */
export const DEFAULT_CATEGORIES: ConsentCategories = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

export const ALL_ACCEPTED: ConsentCategories = {
  necessary: true,
  preferences: true,
  analytics: true,
  marketing: true,
};

export const ALL_REJECTED: ConsentCategories = { ...DEFAULT_CATEGORIES };

/**
 * Read the persisted consent record. Returns `null` if:
 *   - we are on the server (no localStorage),
 *   - no record has ever been written,
 *   - the record is malformed,
 *   - the version stored differs from the current one (forces re-consent).
 */
export function loadConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (!parsed.timestamp || !parsed.categories) return null;
    // Defensive: ensure all known keys exist with boolean values.
    const categories: ConsentCategories = {
      necessary: true, // always on — non-negotiable
      preferences: !!parsed.categories.preferences,
      analytics: !!parsed.categories.analytics,
      marketing: !!parsed.categories.marketing,
    };
    return { version: parsed.version, timestamp: parsed.timestamp, categories };
  } catch {
    return null;
  }
}

export function saveConsent(categories: ConsentCategories): ConsentRecord {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    categories: { ...categories, necessary: true },
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // storage quota / disabled — silently degrade; banner will reappear next visit
    }
  }
  return record;
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasConsent(record: ConsentRecord | null, category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  if (!record) return false;
  return record.categories[category] === true;
}
