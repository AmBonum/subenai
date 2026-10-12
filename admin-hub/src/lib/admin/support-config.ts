// Mock store for the "Podpora" (Stripe donations) admin page.
// Field names are picked to map 1:1 onto future DB tables:
//   support_config       (single-row settings)
//   support_amounts      (preset amount tiles)
//   support_sponsors     (public sponsor list shown on /sponzori)

export type DonationFrequency = "one_time" | "monthly" | "both";
export type StripeMode = "test" | "live";

export interface AmountPreset {
  id: string;
  amount: number; // EUR
  label?: string;
  highlighted?: boolean;
}

export interface SupportConfig {
  // Stripe
  stripe_mode: StripeMode;
  stripe_publishable_key: string;
  stripe_secret_key_masked: string; // never the real value in client
  stripe_webhook_secret_masked: string;
  stripe_account_country: string;
  currency: string;
  // Donation form
  frequency: DonationFrequency;
  default_frequency: "one_time" | "monthly";
  allow_custom_amount: boolean;
  min_amount: number;
  max_amount: number;
  require_dic: boolean;
  // Public sponsor opt-in
  public_sponsor_optin_enabled: boolean;
  sponsors_page_path: string;
  // Texts
  page_title: string;
  page_subtitle: string;
  consent_invoice_text: string;
  consent_privacy_text: string;
  footer_disclaimer: string;
  cta_label: string;
  success_url: string;
  cancel_url: string;
  updated_at: string;
}

export interface Sponsor {
  id: string;
  display_name: string;
  amount_total: number;
  frequency: DonationFrequency;
  first_donation_at: string;
  public: boolean;
}

export const defaultSupportConfig: SupportConfig = {
  stripe_mode: "test",
  stripe_publishable_key: "pk_test_••••••••••••••••",
  stripe_secret_key_masked: "sk_test_••••••••••••••••",
  stripe_webhook_secret_masked: "whsec_••••••••••••",
  stripe_account_country: "SK",
  currency: "EUR",
  frequency: "both",
  default_frequency: "one_time",
  allow_custom_amount: true,
  min_amount: 1,
  max_amount: 5000,
  require_dic: false,
  public_sponsor_optin_enabled: true,
  sponsors_page_path: "/sponzori",
  page_title: "Podpor SubenAI",
  page_subtitle:
    "Pomáhaš nám učiť ľudí rozoznávať podvody. Ďakujeme za každý príspevok.",
  consent_invoice_text:
    "Súhlasím so začatím poskytovania okamžite a beriem na vedomie stratu práva na odstúpenie (zákon č. 108/2024 Z. z. o ochrane spotrebiteľa).",
  consent_privacy_text:
    "Beriem na vedomie spracovanie mojich osobných údajov per Zásady ochrany súkromia.",
  footer_disclaimer:
    "Platbu spracúva Stripe Payments Europe, Ltd. (Írsko). Kartové údaje nikdy neukladáme. Faktúru pošleme e-mailom (PDF). Mesačný odber je možné kedykoľvek zrušiť cez Stripe Customer Portal.",
  cta_label: "Pokračovať na platbu",
  success_url: "/podpora/dakujeme",
  cancel_url: "/podpora",
  updated_at: new Date().toISOString(),
};

export const defaultAmounts: AmountPreset[] = [
  { id: "amt_5", amount: 5 },
  { id: "amt_10", amount: 10, highlighted: true, label: "Najčastejšie" },
  { id: "amt_25", amount: 25 },
  { id: "amt_50", amount: 50 },
  { id: "amt_100", amount: 100 },
];

export const mockSponsors: Sponsor[] = [
  {
    id: "sp_001",
    display_name: "Anonymný darca",
    amount_total: 250,
    frequency: "monthly",
    first_donation_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    public: false,
  },
  {
    id: "sp_002",
    display_name: "ACME s.r.o.",
    amount_total: 500,
    frequency: "one_time",
    first_donation_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    public: true,
  },
  {
    id: "sp_003",
    display_name: "Peter K.",
    amount_total: 60,
    frequency: "monthly",
    first_donation_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    public: true,
  },
];

// In-memory mutable singletons — trivial to replace with fetch() to your API.
export const supportStore = {
  config: { ...defaultSupportConfig },
  amounts: [...defaultAmounts],
  sponsors: [...mockSponsors],
};
