// Static branch + training topic reference data used across admin UI. Extracted
// from mock-data.ts in AH-11.1a so the constants survive the AH-11.6 deletion
// of mock-data.ts. Mock data re-exports for backwards compatibility.

export interface BranchRef {
  name: string;
  slug: string;
  color: string;
  description: string;
}

export const BRANCHES: BranchRef[] = [
  {
    name: "E-shop",
    slug: "eshop",
    color: "#8b5cf6",
    description: "Otázky pre majiteľov a zamestnancov e-shopov.",
  },
  {
    name: "Gastro",
    slug: "gastro",
    color: "#f97316",
    description: "Otázky pre prevádzky reštaurácií, kaviarní a hotelov.",
  },
  {
    name: "Autoservis",
    slug: "autoservis",
    color: "#0ea5e9",
    description: "Otázky pre mechanikov a majiteľov autoservisov.",
  },
  {
    name: "IT / Softvérový vývoj",
    slug: "it-software",
    color: "#06b6d4",
    description: "Otázky pre vývojárov a IT špecialistov.",
  },
  {
    name: "Verejné služby",
    slug: "verejne-sluzby",
    color: "#10b981",
    description: "Otázky pre úrady a zamestnancov verejnej správy.",
  },
  {
    name: "Žiaci (do 16 rokov)",
    slug: "ziaci",
    color: "#ec4899",
    description: "Otázky prispôsobené žiakom základných škôl.",
  },
  {
    name: "Študenti (16+)",
    slug: "studenti",
    color: "#a855f7",
    description: "Otázky pre stredoškolákov a vysokoškolákov.",
  },
  {
    name: "Seniori (55+)",
    slug: "seniori",
    color: "#eab308",
    description: "Otázky pre starších používateľov internetu.",
  },
  {
    name: "Všeobecný test",
    slug: "vseobecny",
    color: "#64748b",
    description: "Univerzálny test pre širokú verejnosť.",
  },
];

export const TRAINING_TOPICS: BranchRef[] = [
  {
    name: "SMS",
    slug: "sms",
    color: "#f59e0b",
    description: "Podvodné SMS správy, smishing, falošné doručovacie linky.",
  },
  {
    name: "Email",
    slug: "email",
    color: "#3b82f6",
    description: "Phishingové emaily, falošné faktúry, prílohy s malvérom.",
  },
  {
    name: "Telefón",
    slug: "telefon",
    color: "#22c55e",
    description: "Vishing, falošní bankári a technická podpora.",
  },
  {
    name: "Marketplace",
    slug: "marketplace",
    color: "#a855f7",
    description: "Podvody na Bazoši, Vinted a Facebook Marketplace.",
  },
  {
    name: "Data hygiene",
    slug: "data-hygiene",
    color: "#06b6d4",
    description: "Silné heslá, 2FA, manažment osobných údajov.",
  },
  {
    name: "Investície",
    slug: "investicie",
    color: "#ef4444",
    description: "Falošné investičné platformy a kryptopodvody.",
  },
  {
    name: "Vzťahy",
    slug: "vztahy",
    color: "#ec4899",
    description: "Romance scams, sextortion, manipulácia cez sociálne siete.",
  },
  {
    name: "Všeobecné",
    slug: "vseobecne",
    color: "#64748b",
    description: "Základné princípy bezpečnosti na internete.",
  },
];

export const branchLabel = (slug: string) => BRANCHES.find((b) => b.slug === slug)?.name ?? slug;
export const topicLabel = (slug: string) =>
  TRAINING_TOPICS.find((t) => t.slug === slug)?.name ?? slug;
