// Shared fixtures for blog integration tests. Keeps slugs aligned with
// PILLAR_SLUGS + CATEGORY_VISUALS so pillar-detection / category-color
// pathways are exercised with real values rather than synthetic stubs.

import type {
  BlogAuthor,
  BlogCategory,
  BlogPostDetail,
  BlogPostListItem,
} from "@/lib/blog/queries";

export const SUBENAI_EDITORIAL: BlogAuthor = {
  id: "author-1",
  slug: "subenai-editorial",
  display_name: "subenai editorial",
  bio: "redakcia subenai.sk — píšeme o internetových podvodoch a digitálnej bezpečnosti.",
  avatar_url: null,
};

export const CAT_PHISHING: BlogCategory = {
  id: "cat-phishing",
  slug: "phishing-a-emaily",
  name: "phishing a podvodné emaily",
  description: "ako rozpoznať phishingový email skôr, než klikneš.",
  sort_order: 1,
  seo_title: null,
  seo_description: null,
};

export const CAT_SMS: BlogCategory = {
  id: "cat-sms",
  slug: "sms-a-telefon",
  name: "scam sms a telefonické podvody",
  description: "podvodné sms a hovory — ako ich spoznať.",
  sort_order: 2,
  seo_title: null,
  seo_description: null,
};

export const CAT_AI: BlogCategory = {
  id: "cat-ai",
  slug: "ai-scamy",
  name: "ai a moderné podvody",
  description: null,
  sort_order: 3,
  seo_title: null,
  seo_description: null,
};

function makeListItem(overrides: Partial<BlogPostListItem>): BlogPostListItem {
  return {
    id: overrides.slug ?? "post-id",
    slug: "default-slug",
    title: "default title",
    excerpt: "default excerpt",
    hero_image_url: null,
    reading_minutes: 5,
    published_at: "2026-05-15T10:00:00.000Z",
    category: { slug: CAT_PHISHING.slug, name: CAT_PHISHING.name },
    author: { slug: SUBENAI_EDITORIAL.slug, display_name: SUBENAI_EDITORIAL.display_name },
    ...overrides,
  } as BlogPostListItem;
}

// 3 pillars — slugs MUST match PILLAR_SLUGS
export const PILLAR_PHISHING: BlogPostListItem = makeListItem({
  slug: "phishing-kompletny-sprievodca",
  title: "phishing — kompletný sprievodca",
  excerpt: "ako rozpoznať phishingový útok v každej forme.",
  reading_minutes: 12,
});

export const PILLAR_SMS: BlogPostListItem = makeListItem({
  slug: "scam-sms-a-podvodne-hovory",
  title: "scam sms a podvodné hovory — ako ich rozpoznať a čo robiť",
  excerpt: "scam sms a podvodné hovory sú najčastejšími...",
  reading_minutes: 11,
  category: { slug: CAT_SMS.slug, name: CAT_SMS.name },
});

export const PILLAR_AI: BlogPostListItem = makeListItem({
  slug: "ai-a-moderne-podvody-deepfake-voice-cloning",
  title: "ai a moderné podvody — deepfake, voice cloning a ai phishing",
  excerpt: "ai naklonuje hlas tvojej dcéry z trochu...",
  reading_minutes: 14,
  category: { slug: CAT_AI.slug, name: CAT_AI.name },
});

// 4 clusters in phishing-a-emaily
export const CLUSTER_PHISHING_1: BlogPostListItem = makeListItem({
  slug: "ako-rozpoznat-phishingovy-email-za-10-sekund",
  title: "ako rozpoznať phishingový email za 10 sekúnd",
  excerpt: "10-sekundový postup, ktorý zachráni tvoj účet.",
  reading_minutes: 6,
});

export const CLUSTER_PHISHING_2: BlogPostListItem = makeListItem({
  slug: "phishing-na-balikovu-zasielku",
  title: "phishing na balíkovú zásielku",
  excerpt: "podvody s balíkovými zásielkami sú teraz veľmi časté.",
  reading_minutes: 5,
});

// 2 clusters in sms-a-telefon
export const CLUSTER_SMS_1: BlogPostListItem = makeListItem({
  slug: "12-najcastejsich-podvodnych-sms-2026",
  title: "12 najčastejších podvodných sms v 2026",
  excerpt: "katalóg podvodných sms, ktoré k tebe môžu prísť.",
  reading_minutes: 8,
  category: { slug: CAT_SMS.slug, name: CAT_SMS.name },
});

export const CLUSTER_SMS_2: BlogPostListItem = makeListItem({
  slug: "ako-blokovat-spam-volania-android-iphone",
  title: "ako blokovať spam volania (android, iphone)",
  excerpt: "kompletný návod na blokovanie spam hovorov.",
  reading_minutes: 4,
  category: { slug: CAT_SMS.slug, name: CAT_SMS.name },
});

// Detail fixture — full body with callouts + headings for TOC + sources
export const PILLAR_PHISHING_DETAIL: BlogPostDetail = {
  ...PILLAR_PHISHING,
  subtitle: "ochrana sa začína pri rozpoznaní",
  body_mdx: [
    "## čo je phishing",
    "",
    "phishing je útok, pri ktorom sa útočník vydáva za dôveryhodný subjekt.",
    "",
    "**detekčný znak:** doména s diakritikou alebo neobvyklými znakmi.",
    "",
    "## ako sa brániť",
    "",
    "**plus:** moderné prehliadače blokujú väčšinu phishingu.",
    "",
    "**mínus:** sofistikovaný phishing prejde aj cez tieto filtre.",
    "",
    "### konkrétne kroky",
    "",
    "zapni si dvojstupňové overenie všade, kde sa dá.",
  ].join("\n"),
  seo_title: null,
  seo_description: null,
  og_image_url: null,
  canonical_url: null,
  pillar_post_id: null,
  primary_keyword: "phishing",
  faq_jsonb: null,
  sources: [
    {
      label: "SK-CERT: Phishing a sociálne inžinierstvo",
      url: "https://www.sk-cert.sk/sk/phishing",
      publisher: "SK-CERT",
      accessed_at: "2026-05-15",
    },
    {
      label: "NBS: Bezpečnosť internetbankingu",
      url: "https://www.nbs.sk/sk/dohlad-nad-financnym-trhom/bezpecnost",
      publisher: "Národná banka Slovenska",
    },
  ],
};

// Cluster fixture with NO sources + reading_minutes=null + no subtitle
export const CLUSTER_PHISHING_DETAIL: BlogPostDetail = {
  ...CLUSTER_PHISHING_1,
  subtitle: null,
  reading_minutes: null,
  body_mdx: "krátky obsah bez nadpisov a bez callout vzorov.",
  seo_title: null,
  seo_description: null,
  og_image_url: null,
  canonical_url: null,
  pillar_post_id: null,
  primary_keyword: null,
  faq_jsonb: null,
  sources: [],
};
