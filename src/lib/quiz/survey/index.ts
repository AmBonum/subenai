// Single source of truth for the growth-survey enum values used in (a) the UI
// option lists, (b) the DB CHECK constraints, and (c) the Supabase Insert
// types. Drift between any of these would cause runtime CHECK violations or
// silent UI bugs — the DB schema test in `tests/db/attempts-schema.test.ts`
// asserts the lists match what's in `DEPLOY_SETUP.sql`.

export interface SurveyOption {
  /** Persisted value (matches DB CHECK constraint enum). */
  id: string;
  /** Slovak label rendered in the chip. */
  label: string;
}

export const TOP_FEAR_VALUES = [
  "phishing",
  "scam_money",
  "scam_identity",
  "hate",
  "doxxing",
  "nothing",
] as const;

export const HAS_BEEN_SCAMMED_VALUES = [
  "yes_money",
  "yes_data",
  "yes_account",
  "no",
  "prefer_not_to_say",
] as const;

export const REFERRAL_SOURCE_VALUES = [
  "tiktok",
  "instagram",
  "facebook",
  "friend",
  "google",
  "other",
] as const;

export type TopFear = (typeof TOP_FEAR_VALUES)[number];
export type HasBeenScammed = (typeof HAS_BEEN_SCAMMED_VALUES)[number];
export type ReferralSource = (typeof REFERRAL_SOURCE_VALUES)[number];

/** Cap on how many `interests` (multi-select course tém) we accept per attempt
 *  — matches the DB CHECK constraint and the UI's checkbox count. */
export const MAX_INTERESTS = 10;

/** Slovak labels for UI rendering. Keyed by enum value so adding a new option
 *  is a one-line change in the const + a one-line label below; the rest is
 *  type-driven. */
export const TOP_FEAR_LABELS: Record<TopFear, string> = {
  phishing: "Phishing / podvodné správy",
  scam_money: "Strata peňazí podvodom",
  scam_identity: "Krádež identity",
  hate: "Hejt a obťažovanie",
  doxxing: "Únik osobných údajov",
  nothing: "Nič ma vážne neznepokojuje",
};

export const HAS_BEEN_SCAMMED_LABELS: Record<HasBeenScammed, string> = {
  yes_money: "Áno, prišiel som o peniaze",
  yes_data: "Áno, ukradli mi údaje",
  yes_account: "Áno, ukradli mi účet",
  no: "Nie, nestalo sa",
  prefer_not_to_say: "Nechcem odpovedať",
};

export const REFERRAL_SOURCE_LABELS: Record<ReferralSource, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  friend: "Od kamoša / cez správu",
  google: "Google / vyhľadávanie",
  other: "Iné",
};

// Course interest tags. **Kept in sync** with `CourseCategory` in
// `src/content/courses/_schema.ts` (E5.1) — drift means a user picks a topic
// here that no course addresses, so reaching the next epic must update this
// list and the schema together.
export const INTEREST_VALUES = [
  "sms",
  "email",
  "voice",
  "marketplace",
  "investicie",
  "vztahy",
  "data",
  "obecne",
  "ai",
] as const;

export type Interest = (typeof INTEREST_VALUES)[number];

export const INTEREST_LABELS: Record<Interest, string> = {
  sms: "SMS / smishing",
  email: "Email phishing",
  voice: "Telefonické podvody",
  marketplace: "Bazoš / Marketplace",
  investicie: "Investičné podvody",
  vztahy: "Romance scams / vzťahy",
  data: "Bezpečnosť osobných údajov",
  obecne: "Všeobecná digitálna hygiena",
  ai: "AI nástroje a chatboty",
};
