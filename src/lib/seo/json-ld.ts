// Serializes JSON-LD for injection via dangerouslySetInnerHTML. The
// "<" escape prevents a "</script>" inside any data field from closing
// the script tag early and turning the rest of the payload into HTML.
export function jsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
