export type PlanId = "start" | "firma" | "firma_plus";

export interface Plan {
  id: PlanId;
  name: string;
  priceEur: number;
  /** Distinct respondents that may appear in evidence reports per billing year. */
  respondentCap: number;
  tagline: string;
  recommended?: boolean;
}

export const PLANS: readonly Plan[] = [
  {
    id: "start",
    name: "Štart",
    priceEur: 149,
    respondentCap: 25,
    tagline: "Malá firma, kancelária, ambulancia",
  },
  {
    id: "firma",
    name: "Firma",
    priceEur: 390,
    respondentCap: 100,
    tagline: "Stredná firma alebo viac pobočiek",
    recommended: true,
  },
  {
    id: "firma_plus",
    name: "Firma+",
    priceEur: 790,
    respondentCap: 250,
    tagline: "Väčšia organizácia a dodávatelia",
  },
];

export const EVIDENCE_PASS_SCORE = 70;

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export interface OrgSubscription {
  plan: string;
  status: string;
  respondent_cap: number;
  current_period_start: string;
  current_period_end: string;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function isActiveSubscription(sub: OrgSubscription | null, now: Date): boolean {
  if (!sub || !ACTIVE_STATUSES.has(sub.status)) return false;
  return Date.parse(sub.current_period_end) > now.getTime();
}

export type EvidenceAccess =
  | { allowed: true; cap: number; used: number; remaining: number }
  | { allowed: false; reason: "no_plan" }
  | { allowed: false; reason: "cap_exceeded"; cap: number; used: number; requested: number };

/**
 * `used` = distinct respondents already counted in this billing period;
 * `requested` = respondents in this report that are not counted yet, so
 * regenerating a report never consumes the allowance twice.
 */
export function evaluateEvidenceAccess(
  sub: OrgSubscription | null,
  used: number,
  requested: number,
  now: Date,
): EvidenceAccess {
  if (!sub || !isActiveSubscription(sub, now)) return { allowed: false, reason: "no_plan" };
  const cap = sub.respondent_cap;
  if (used + requested > cap) {
    return { allowed: false, reason: "cap_exceeded", cap, used, requested };
  }
  return { allowed: true, cap, used, remaining: cap - used - requested };
}
