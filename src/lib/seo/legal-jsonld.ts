// E21 — schema.org builders for legal-doc pages.
//
// /privacy emits PrivacyPolicy + BreadcrumbList.
// /cookies emits WebPage (referencing the privacy policy as
//   isPartOf) + BreadcrumbList.
//
// We deliberately do NOT emit FAQPage on these pages — the content is
// long-form prose, not Q&A, and Google's FAQPage rich-result eligibility
// excludes legal text per their structured-data guidelines.

export interface PrivacyPolicyInput {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  publisherName: string;
  publisherUrl: string;
  // ISO-8601. The "last updated" string shown in the page header.
  dateModified?: string;
}

export function buildPrivacyPolicyJsonLd(input: PrivacyPolicyInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "PrivacyPolicy",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.inLanguage,
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      url: input.publisherUrl,
    },
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

export interface CookiesPolicyInput {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  privacyPolicyUrl: string;
  publisherName: string;
  publisherUrl: string;
  dateModified?: string;
}

export function buildCookiesPolicyJsonLd(input: CookiesPolicyInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.inLanguage,
    // Tie the cookies page to the privacy policy as the canonical
    // parent resource — both Google and screen-reader index this as
    // a sub-document relationship.
    isPartOf: { "@type": "PrivacyPolicy", url: input.privacyPolicyUrl },
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      url: input.publisherUrl,
    },
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}
