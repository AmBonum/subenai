// E55.4 — canonical Slovak glosses for the English security terms that appear
// across the academy. The editorial rule (per the E55 spec): the first time an
// English term shows up in a lesson's prose it must be followed by a Slovak
// explanation in parentheses, e.g. "phishing (podvodné vylákanie údajov)".
// This map is the single source of truth the copyediting pass uses so every
// lesson glosses a term the same way. Keys are lowercase.

export const GLOSSARY: Record<string, string> = {
  phishing: "podvodné vylákanie prihlasovacích či platobných údajov",
  scam: "podvod",
  smishing: "phishing cez SMS",
  vishing: "phishing cez telefonát",
  spoofing: "podvrhnutie identity odosielateľa",
  malware: "škodlivý softvér",
  malvertising: "škodlivá reklama šíriaca malware",
  ransomware: "vydieračský softvér, ktorý zašifruje súbory",
  "pig butchering": "dlhodobý investičný podvod budovaný cez vzťah",
  "romance scam": "podvod cez predstieraný ľúbostný vzťah",
  bec: "podvod cez kompromitovaný firemný e-mail (Business Email Compromise)",
  "business email compromise": "podvod cez kompromitovaný firemný e-mail",
  quishing: "phishing cez QR kód",
  "fake e-shop": "podvodný internetový obchod",
  deepfake: "umelo vygenerované falošné video či hlas",
  "two-factor authentication": "dvojfaktorové overenie",
  "2fa": "dvojfaktorové overenie",
  passkey: "bezheslové prihlásenie viazané na zariadenie",
  otp: "jednorazový overovací kód",
  "data breach": "únik údajov",
  cta: "výzva na akciu (tlačidlo či odkaz)",
};

// Format a term with its canonical gloss: "phishing (podvodné vylákanie …)".
// Returns the bare term when no gloss is registered so callers never emit
// an empty "()".
export function glossTerm(term: string): string {
  const gloss = GLOSSARY[term.toLowerCase()];
  return gloss ? `${term} (${gloss})` : term;
}
