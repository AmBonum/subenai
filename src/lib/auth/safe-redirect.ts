const APP_PATH = /^\/app(?:[/?#]|$)/;

/**
 * Post-login deep link for regular users. Only same-origin /app paths pass:
 * a protocol-relative "//host", a backslash (browsers treat it as "/") or any
 * scheme would turn the login page into an open redirect.
 */
export function safeAppRedirect(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 512) return null;
  if (!APP_PATH.test(raw) || raw.includes("//") || raw.includes("\\")) return null;
  return raw;
}
