import type { TestPack } from "./_schema";

export const studentiPack: TestPack = {
  slug: "studenti",
  title: "Študenti (16+) — podvody, na ktoré naletia pri štúdiu",
  tagline:
    "Fake prenájmy izby pred zápisom, phishing univerzitných portálov AIS2, falošné Erasmus+ štipendiá, Discord Nitro a job scam-y. 13 otázok.",
  industry: "studenti",
  industryEmoji: "🎓",
  targetPersona:
    "Stredoškolák alebo vysokoškolák hľadajúci bývanie, brigádu alebo štipendium — pod časovým tlakom zápisového termínu alebo letného sťahovania.",
  questionIds: [
    // Nové — špecifické pre študentský life
    "f-student-accom-1",
    "p-email-uni-1",
    "f-scholarship-fake-1",
    "f-discord-nitro-1",
    // Existujúce — job/influencer/investment scam-y
    "p-email-job-1",
    "f-jobscam-1",
    "f-ig-influencer-1",
    "h-instagram-hack-1",
    "s-wifi-1",
    "f-investment-2",
    "u-https-1",
    "p-email-netflix-1",
    "s-quishing-1",
  ],
  passingThreshold: 70,
  publishedAt: "2026-05-01",
  updatedAt: "2026-05-01",
  sources: [
    { label: "SK-CERT — phishing a sociálne inžinierstvo", url: "https://www.sk-cert.sk/" },
    { label: "Europol — Erasmus fraud report 2024", url: "https://www.europol.europa.eu/" },
    { label: "PZ SR — prenájom a advance fee podvody", url: "https://www.minv.sk/" },
  ],
};
