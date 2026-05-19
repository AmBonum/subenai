// Slovak-aware heading slugifier shared by BlogPostBody (h2/h3 id
// attributes) and BlogTableOfContents (in-article anchor list). Both
// sides MUST use the same function so the TOC links resolve.
//
// Approach: NFD-decompose the string so combining diacritic marks
// separate from base letters, drop the combining-mark range, then
// dasherize remaining alphanumerics. Falls back to "section" if the
// input has no Latin-letter content (defensive — would only fire on a
// pure-emoji heading).
export function slugifyHeading(text: string): string {
  const stripped = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stripped || "section";
}
