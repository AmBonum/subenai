// Admin-managed support contact channels (AH-10.4).
//
// Pure data + validation lib for the /admin/support page. The
// channels surface on public contact / support pages once AH-11 wires
// real persistence; in the mock-first phase the values live in an
// in-memory store so the form is interactive.
//
// NOTE: this is the contact-channel config, distinct from the
// donation/Stripe `support-config` originally in admin-hub. The
// donation flow already has its own surface under /support — this
// file scopes to support-desk contact details (email, phone, hours).

export interface SupportChannelConfig {
  email: string;
  phone: string;
  hours: string;
  updated_at: string;
}

export const defaultSupportChannelConfig: SupportChannelConfig = {
  email: "subenai.podpora@gmail.com",
  phone: "+421 900 123 456",
  hours: "Pondelok–Piatok 9:00–17:00",
  updated_at: new Date().toISOString(),
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Permissive E.164-ish: optional +, 7–15 digits, allows spaces between groups.
const PHONE_RE = /^\+?\d[\d\s]{6,15}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value.trim());
}

export function validateSupportChannelConfig(input: Partial<SupportChannelConfig>): {
  ok: boolean;
  errors: { email?: string; phone?: string; hours?: string };
} {
  const errors: { email?: string; phone?: string; hours?: string } = {};
  if (input.email !== undefined && !isValidEmail(input.email)) {
    errors.email = "invalid_email";
  }
  if (input.phone !== undefined && !isValidPhone(input.phone)) {
    errors.phone = "invalid_phone";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

// Mock store — replaced by Supabase reads in AH-11.
let current: SupportChannelConfig = { ...defaultSupportChannelConfig };

export function readSupportChannelConfig(): SupportChannelConfig {
  return current;
}

export function updateSupportChannelConfig(
  patch: Partial<SupportChannelConfig>,
): SupportChannelConfig {
  current = { ...current, ...patch, updated_at: new Date().toISOString() };
  return current;
}

export function resetSupportChannelConfig(): SupportChannelConfig {
  current = { ...defaultSupportChannelConfig };
  return current;
}
