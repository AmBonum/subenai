// AH-12 — i18n resolver for the security namespace (2FA enroll / verify flows
// + the /app/account/security 2FA section).
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/security.json";
import en from "./locales/en/security.json";
import cs from "./locales/cs/security.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
