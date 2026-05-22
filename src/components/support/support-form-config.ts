import { z } from "zod";

// E48.3 — types + zod schema + Slovak category labels for the support
// contact form. Lives in a sibling file so the component file
// (SupportContactForm.tsx) only exports a component — keeps HMR
// + Vite fast-refresh happy.

export const SUPPORT_TICKET_CATEGORIES = [
  { value: "bug", label: "Chyba alebo problém" },
  { value: "question", label: "Otázka" },
  { value: "feature_request", label: "Návrh na vylepšenie" },
  { value: "abuse_report", label: "Nahlásenie nevhodného obsahu" },
  { value: "billing", label: "Platby / sponzorstvo" },
  { value: "gdpr", label: "Žiadosť o údaje (GDPR)" },
  { value: "other", label: "Iné" },
] as const;

const CATEGORY_VALUES = SUPPORT_TICKET_CATEGORIES.map((c) => c.value) as [
  (typeof SUPPORT_TICKET_CATEGORIES)[number]["value"],
  ...(typeof SUPPORT_TICKET_CATEGORIES)[number]["value"][],
];

export const supportContactSchema = z.object({
  subject: z
    .string()
    .min(5, "Téma musí mať aspoň 5 znakov.")
    .max(200, "Téma môže mať najviac 200 znakov."),
  category: z.enum(CATEGORY_VALUES, { message: "Vyberte kategóriu." }),
  body: z
    .string()
    .min(20, "Správa musí mať aspoň 20 znakov.")
    .max(5000, "Správa môže mať najviac 5000 znakov."),
  email: z
    .string()
    .min(5, "E-mail je povinný.")
    .max(254, "E-mail je príliš dlhý.")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Zadajte platný e-mail."),
  name: z.string().max(100, "Meno môže mať najviac 100 znakov.").optional().or(z.literal("")),
  // Honeypot — must remain empty. Server-side enforcement in the CF
  // function rejects non-empty submissions. The field has aria-hidden
  // + tabindex=-1 + off-screen positioning so real users never see it.
  _h_addr: z.string().max(0, "Vyplnené spam-pole.").optional().or(z.literal("")),
});

export type SupportContactFormData = z.infer<typeof supportContactSchema>;

export interface SupportContactSubmitResult {
  ticketId: string;
  // Only returned for anonymous submissions; carries the plain view token
  // that the user uses to open the read-only thread page.
  viewToken?: string;
}

export const SUPPORT_BODY_MAX = 5000;
