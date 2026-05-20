// AH-11.6 carve-out — admin seed/type re-export module, retained for
// `mock-store` and Vitest fixtures. Canonical types live in `./types.ts`
// and reference constants in `./branches.ts`. Production reads go through
// `@/lib/admin/queries.ts` + Supabase. AH-14 deletes this together with
// `mock-store` once the answer-sets viewer migrates off the repo.
//
// Mock data for SubenAI admin. Replace with Supabase queries when wiring up.
// Schema mirrors expected production tables: users, questions, categories,
// reports, trainings, training_topics.
//
// Types live in ./types.ts and static reference data lives in ./branches.ts —
// re-exported here so existing consumers keep working until AH-11.1b swaps them
// over.

import { BRANCHES, TRAINING_TOPICS } from "./branches";
import type {
  AdminUser,
  AdminQuestion,
  AdminAnswer,
  AdminAnswerSet,
  AdminCategory,
  AdminTraining,
  AdminTopic,
  AdminReport,
  AdminTest,
  AdminActivityEvent,
  ShareCardConfig,
  TestDifficulty,
} from "./types";

export type {
  UserRole,
  UserStatus,
  AdminUser,
  QuestionStatus,
  AdminQuestion,
  AdminAnswer,
  AdminAnswerSet,
  AdminCategory,
  TrainingStatus,
  AdminTraining,
  AdminTopic,
  ReportReason,
  ReportStatus,
  AdminReport,
  TestStatus,
  TestDifficulty,
  AdminTest,
  AdminActivityEvent,
  AdminDashboardStats,
  ShareRatingTier,
  ShareCardConfig,
} from "./types";

export { BRANCHES, TRAINING_TOPICS, branchLabel, topicLabel } from "./branches";

const NAMES = [
  "Jana Horváthová",
  "Marek Novák",
  "Petra Kováčová",
  "Tomáš Baláž",
  "Eva Sedláková",
  "Martin Tóth",
  "Lucia Krajčíová",
  "Peter Varga",
  "Ivana Polláková",
  "Adam Dudáš",
  "Zuzana Halászová",
  "Filip Urban",
  "Katarína Šimková",
  "Pavol Mihálik",
  "Daniela Bartošová",
];

const QUESTION_TITLES = [
  "Prišla mi SMS o zadržanej zásielke — je to podvod?",
  "Falošný email z banky o zablokovanom účte",
  "Volal mi „bankár“ a chce overiť platbu, čo robiť?",
  "Kupujúci na Bazoši chce zaplatiť cez podozrivý link",
  "Ako rozoznať falošný e-shop s extra zľavami?",
  "Prevádzka v reštaurácii — falošná objednávka cez email",
  "Autoservis dostal podozrivú faktúru za reklamu",
  "Phishing útok na firemný účet — prvé kroky",
  "Úradníčka dostala výzvu na „aktualizáciu certifikátu“",
  "Dieťa kliklo na podvodný link v hre — čo teraz?",
  "Študent — falošná ponuka brigády cez Telegram",
  "Babka prišla o peniaze cez falošnú investíciu",
  "Romance scam — ako pomôcť blízkej osobe?",
  "Sextortion email s vyhrážkou zverejnenia",
  "Falošná kryptoinvestícia s tvárou známej osobnosti",
];

const seed = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const slugifyEmail = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s/g, ".")
    .replace(/[áä]/g, "a")
    .replace(/[éě]/g, "e")
    .replace(/[íi]/g, "i")
    .replace(/[óô]/g, "o")
    .replace(/[úů]/g, "u")
    .replace(/[ýỳ]/g, "y")
    .replace(/[čć]/g, "c")
    .replace(/[šś]/g, "s")
    .replace(/[žź]/g, "z")
    .replace(/[ňń]/g, "n")
    .replace(/[ľĺ]/g, "l")
    .replace(/[ťt]/g, "t")
    .replace(/[ďd]/g, "d")
    .replace(/[řŕ]/g, "r");

export const mockUsers: AdminUser[] = NAMES.map((name, i) => ({
  id: `usr_${(i + 1).toString().padStart(4, "0")}`,
  email: slugifyEmail(name) + "@subenai.sk",
  display_name: name,
  role: i === 0 ? "admin" : i < 3 ? "moderator" : "user",
  status: i === 4 ? "suspended" : i === 7 ? "pending" : "active",
  questions_count: Math.floor(seed(i) * 40),
  created_at: daysAgo(Math.floor(seed(i + 1) * 365)),
  last_active_at: daysAgo(Math.floor(seed(i + 2) * 30)),
}));

// ---- Answer sets & answers ----------------------------------------------
const ANSWER_SET_SEEDS: {
  name: string;
  category: string;
  description: string;
  correct: string[];
  incorrect: string[];
}[] = [
  {
    name: "SMS podvody — základná sada",
    category: "vseobecny",
    description: "Univerzálne otázky o podvodných SMS o doručení balíka, banke a výhrach.",
    correct: [
      "Nekliknem na odkaz a SMS vymažem.",
      "Overím si stav zásielky priamo na webe dopravcu (manuálne zadaný URL).",
      "Nahlásim SMS operátorovi na číslo 7726.",
      "Skontrolujem, či doménu v odkaze poznám.",
    ],
    incorrect: [
      "Kliknem na odkaz, aby som zistil/a viac.",
      "Zadám tam údaje z karty pre overenie.",
      "Odpoviem na SMS s mojím menom.",
      "Pošlem SMS ďalej priateľom.",
      "Zaplatím malý poplatok za doručenie.",
      "Nainštalujem aplikáciu z odkazu.",
    ],
  },
  {
    name: "Phishing email — banka",
    category: "vseobecny",
    description: "Odpovede k podvodným emailom predstierajúcim banku.",
    correct: [
      "Skontrolujem adresu odosielateľa a doménu v odkaze.",
      "Prihlásim sa do internet bankingu len cez vlastný bookmark/app.",
      "Email nahlásim banke a vymažem.",
      "Aktivujem si 2FA a notifikácie o prihlásení.",
    ],
    incorrect: [
      'Kliknem na „Overiť účet" v emaily.',
      "Zadám prihlasovacie údaje cez odkaz.",
      "Odpoviem s číslom účtu a IBANom.",
      "Otvorím prílohu .zip pre detail.",
      "Zavolám na číslo uvedené v emaily.",
    ],
  },
  {
    name: "Marketplace — Bazoš/Vinted",
    category: "eshop",
    description: "Odpovede k podvodným kupujúcim a predávajúcim na marketplace platformách.",
    correct: [
      "Trvám na osobnom odovzdaní alebo overenom systéme platformy.",
      'Neklikám na žiadne externé „doručovacie" linky.',
      "Overím profil — vek, hodnotenia, históriu.",
      "Pri podozrení nahlásim profil prevádzkovateľovi.",
    ],
    incorrect: [
      'Pošlem údaje z karty pre „overenie doručenia".',
      "Otvorím link mimo platformy a prihlásim sa.",
      "Pošlem tovar pred prijatím platby.",
      'Súhlasím s platbou cez „bezpečnostnú službu".',
      "Pošlem fotku občianskeho.",
    ],
  },
  {
    name: "Falošná technická podpora",
    category: "it-software",
    description: "Vishing volania v mene Microsoftu, antivírusu či ISP.",
    correct: [
      "Položím a zavolám oficiálnu podporu cez ich web.",
      "Nepovolím vzdialený prístup neznámej osobe.",
      "Skontrolujem zariadenie vlastným antivírusom.",
      "Zmením heslá z dôveryhodného zariadenia.",
    ],
    incorrect: [
      "Nainštalujem AnyDesk podľa pokynov volajúceho.",
      'Zadám číslo karty pre „vrátenie peňazí".',
      "Poviem im jednorazový SMS kód.",
      "Otvorím link, ktorý mi nadiktujú.",
    ],
  },
  {
    name: "Romance scam — vzťahy online",
    category: "seniori",
    description: "Sada k manipulatívnym vzťahom a žiadostiam o peniaze online.",
    correct: [
      "Nikdy neposielam peniaze osobe, ktorú som naživo nestretol/a.",
      "Skontrolujem fotky cez reverse image search.",
      "Poradím sa s blízkou osobou alebo políciou.",
      "Ukončím komunikáciu pri prvej žiadosti o financie.",
    ],
    incorrect: [
      'Pošlem peniaze na „lekársky zákrok" v zahraničí.',
      "Pošlem fotky občianskeho na overenie identity.",
      "Investujem do kryptoplatformy, ktorú mi odporučili.",
      "Pošlem im prihlasovacie údaje k účtu.",
    ],
  },
];

export const mockAnswerSets: AdminAnswerSet[] = ANSWER_SET_SEEDS.map((s, i) => ({
  id: `as_${(i + 1).toString().padStart(3, "0")}`,
  name: s.name,
  description: s.description,
  categories: i % 3 === 0 ? [s.category, BRANCHES[(i + 2) % BRANCHES.length].slug] : [s.category],
  created_at: daysAgo(60 - i * 7),
  updated_at: daysAgo(Math.floor(seed(i + 11) * 14)),
}));

export const mockAnswers: AdminAnswer[] = ANSWER_SET_SEEDS.flatMap((s, i) => {
  const setId = mockAnswerSets[i].id;
  const correct = s.correct.map((text, j) => ({
    id: `ans_${setId}_c${j + 1}`,
    set_id: setId,
    text,
    is_correct: true,
    explanation: "Toto je odporúčaný postup podľa subenai.sk.",
    created_at: daysAgo(60 - i * 7),
  }));
  const incorrect = s.incorrect.map((text, j) => ({
    id: `ans_${setId}_w${j + 1}`,
    set_id: setId,
    text,
    is_correct: false,
    explanation: "Typická chyba, ktorá vedie ku škode.",
    created_at: daysAgo(60 - i * 7),
  }));
  return [...correct, ...incorrect];
});

export const mockQuestions: AdminQuestion[] = QUESTION_TITLES.map((title, i) => {
  const branch = BRANCHES[i % BRANCHES.length];
  const extra = BRANCHES[(i + 3) % BRANCHES.length];
  const set = mockAnswerSets[i % mockAnswerSets.length];
  const setAnswers = mockAnswers.filter((a) => a.set_id === set.id);
  const correct = setAnswers.filter((a) => a.is_correct);
  const incorrect = setAnswers.filter((a) => !a.is_correct);
  return {
    id: `q_${(i + 1).toString().padStart(4, "0")}`,
    title,
    excerpt:
      "Používateľ popisuje situáciu a hľadá overený postup, ako podvod rozoznať a čo robiť ďalej.",
    body: "Plný text otázky vrátane kontextu, odkazov a screenshotov...",
    author_id: mockUsers[i % mockUsers.length].id,
    author_name: mockUsers[i % mockUsers.length].display_name,
    categories:
      i % 4 === 0 && extra.slug !== branch.slug ? [branch.slug, extra.slug] : [branch.slug],
    status:
      i % 7 === 0 ? "flagged" : i % 5 === 0 ? "pending" : i % 11 === 0 ? "archived" : "published",
    answers_count: Math.floor(seed(i + 3) * 25),
    votes: Math.floor(seed(i + 4) * 200) - 20,
    reports_count: i % 7 === 0 ? Math.floor(seed(i) * 5) + 1 : 0,
    created_at: daysAgo(Math.floor(seed(i + 5) * 60)),
    answer_set_id: set.id,
    correct_answer_ids: correct.slice(0, 2).map((a) => a.id),
    incorrect_answer_ids: incorrect.slice(0, 3).map((a) => a.id),
  };
});

// Helpers for answer linkage
export const answersForSet = (setId: string) => mockAnswers.filter((a) => a.set_id === setId);
export const questionsUsingAnswer = (answerId: string) =>
  mockQuestions.filter(
    (q) => q.correct_answer_ids.includes(answerId) || q.incorrect_answer_ids.includes(answerId),
  );
export const questionsUsingSet = (setId: string) =>
  mockQuestions.filter((q) => q.answer_set_id === setId);

export const mockCategories: AdminCategory[] = BRANCHES.map((b, i) => ({
  id: `cat_${i + 1}`,
  name: b.name,
  slug: b.slug,
  description: b.description,
  color: b.color,
  questions_count: mockQuestions.filter((q) => q.categories.includes(b.slug)).length * 11 + 7,
}));

const TRAINING_TITLES = [
  "Ako rozoznať podvodnú SMS o doručení balíka",
  "Falošné SMS od banky — 6 znakov, ktorým neveriť",
  "Phishingový email v 60 sekundách",
  "Bezpečné prílohy a falošné faktúry",
  "Volá vám „bankár“ — ako zavesiť bez paniky",
  "Falošná technická podpora cez telefón",
  "Predaj na Bazoši bez podvodu",
  "Vinted: na čo si dať pozor pri platbe",
  "Silné heslá a správca hesiel za 10 minút",
  "Dvojfaktorové overenie (2FA) krok za krokom",
  "Ako spoznať falošnú investičnú platformu",
  "Kryptopodvody s tvárou celebrity",
  "Romance scam — varovné signály",
  "Sextortion: čo robiť, keď príde vyhrážka",
  "Bezpečnosť na internete pre seniorov",
];

export const mockTrainings: AdminTraining[] = TRAINING_TITLES.map((title, i) => {
  const topic = TRAINING_TOPICS[i % TRAINING_TOPICS.length];
  return {
    id: `tr_${(i + 1).toString().padStart(4, "0")}`,
    title,
    topic: topic.slug,
    description: "Krátke školenie zamerané na praktické rozpoznanie podvodu a okamžitú reakciu.",
    duration_min: 5 + Math.floor(seed(i) * 15),
    status: i % 6 === 0 ? "draft" : i % 13 === 0 ? "archived" : "published",
    views: Math.floor(seed(i + 7) * 4000) + 120,
    updated_at: daysAgo(Math.floor(seed(i + 9) * 90)),
  };
});

export const mockTopics: AdminTopic[] = TRAINING_TOPICS.map((t, i) => ({
  id: `top_${i + 1}`,
  name: t.name,
  slug: t.slug,
  description: t.description,
  color: t.color,
  trainings_count: mockTrainings.filter((tr) => tr.topic === t.slug).length * 3 + 2,
}));

export const mockReports: AdminReport[] = mockQuestions
  .filter((q) => q.reports_count > 0)
  .flatMap((q) =>
    Array.from({ length: q.reports_count }, (_, i) => ({
      id: `rep_${q.id}_${i}`,
      target_type: "question" as const,
      target_id: q.id,
      target_label: q.title,
      reason: (["spam", "inappropriate", "misinformation", "harassment", "other"] as const)[i % 5],
      status: (["open", "reviewing", "resolved", "dismissed"] as const)[i % 4],
      reporter_name: mockUsers[(i + 3) % mockUsers.length].display_name,
      created_at: daysAgo(i + 1),
    })),
  );

export const dashboardStats = {
  total_users: mockUsers.length * 87,
  active_users_7d: Math.floor(mockUsers.length * 87 * 0.42),
  total_questions: mockQuestions.length * 23,
  pending_review:
    mockQuestions.filter((q) => q.status === "pending" || q.status === "flagged").length * 4,
  total_answers: mockQuestions.length * 23 * 3,
  open_reports: mockReports.filter((r) => r.status === "open").length,
  total_trainings: mockTrainings.length,
  training_views: mockTrainings.reduce((acc, t) => acc + t.views, 0),
  // AH-10.2 dashboard tiles
  total_tests: 42,
  total_sessions: 1284,
  pending_dsr: 3,
  pending_dpa: 2,
};

export const mockAdminActivity: AdminActivityEvent[] = [
  {
    id: "act-1",
    type: "question_created",
    actor: "Jana H.",
    summary: "Pridala novú otázku: Phishing v e-shope",
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: "act-2",
    type: "test_published",
    actor: "Peter S.",
    summary: "Publikoval test: Bezpečnosť pre seniorov",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: "act-3",
    type: "report_filed",
    actor: "Anonym",
    summary: "Nahlásil otázku ako duplikát",
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
  {
    id: "act-4",
    type: "user_signup",
    actor: "noemi.kr@example.sk",
    summary: "Nový používateľ sa zaregistroval",
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
];

export const activityData = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
  }),
  questions: Math.floor(seed(i) * 40) + 20,
  answers: Math.floor(seed(i + 5) * 80) + 40,
  users: Math.floor(seed(i + 10) * 30) + 10,
}));

export const categoryDistribution = mockCategories.map((c) => ({
  name: c.name,
  value: c.questions_count,
  color: c.color,
}));

// ---- Tests (https://subenai.sk/tests) -----------------------------------

const TEST_SEEDS: {
  title: string;
  slug: string;
  categories: string[];
  difficulty: TestDifficulty;
  description: string;
}[] = [
  {
    title: "Test pre e-shopy — základ",
    slug: "eshop-zaklad",
    categories: ["eshop"],
    difficulty: "easy",
    description: "Základné podvody, ktoré ohrozujú prevádzku e-shopu.",
  },
  {
    title: "Gastro: ochrana objednávkového systému",
    slug: "gastro-objednavky",
    categories: ["gastro"],
    difficulty: "medium",
    description: "Falošné objednávky, podvodné rezervácie a phishing.",
  },
  {
    title: "Autoservis a falošné faktúry",
    slug: "autoservis-faktury",
    categories: ["autoservis", "eshop"],
    difficulty: "medium",
    description: "Podvodné faktúry za reklamu, doménu a inzerciu.",
  },
  {
    title: "IT bezpečnosť pre vývojárov",
    slug: "it-developers",
    categories: ["it-software"],
    difficulty: "hard",
    description: "Sociálne inžinierstvo cielené na devov a admin účty.",
  },
  {
    title: "Verejné služby a podvodné výzvy",
    slug: "verejne-vyzvy",
    categories: ["verejne-sluzby"],
    difficulty: "medium",
    description: "Falošné certifikáty, podvodné platby a daňové výzvy.",
  },
  {
    title: "Bezpečný internet pre žiakov",
    slug: "ziaci-test",
    categories: ["ziaci", "studenti"],
    difficulty: "easy",
    description: "Hra, sociálne siete a cudzí ľudia online.",
  },
  {
    title: "Študenti — brigády a peniaze online",
    slug: "studenti-test",
    categories: ["studenti"],
    difficulty: "easy",
    description: "Falošné brigády, mule účty a kryptopodvody.",
  },
  {
    title: "Seniori — všetko, čo musíte vedieť",
    slug: "seniori-test",
    categories: ["seniori"],
    difficulty: "easy",
    description: "Falošní bankári, romance scam a podvodné linky.",
  },
  {
    title: "Všeobecný test bezpečnosti",
    slug: "vseobecny-test",
    categories: ["vseobecny", "eshop", "gastro"],
    difficulty: "medium",
    description: "Univerzálny prierezový test pre širokú verejnosť.",
  },
];

export const mockTests: AdminTest[] = TEST_SEEDS.map((t, i) => {
  // pick 4-6 questions matching any of the test's branches (fall back to any)
  const matching = mockQuestions.filter((q) => q.categories.some((c) => t.categories.includes(c)));
  const picks = (matching.length >= 4 ? matching : mockQuestions).slice(0, 4 + (i % 3));
  return {
    id: `test_${(i + 1).toString().padStart(3, "0")}`,
    title: t.title,
    slug: t.slug,
    description: t.description,
    categories: t.categories,
    difficulty: t.difficulty,
    status: i % 8 === 0 ? "draft" : "published",
    time_limit_min: 5 + (i % 4) * 3,
    pass_score: 60 + (i % 3) * 10,
    is_quick: false,
    question_ids: picks.map((q) => q.id),
    attempts: Math.floor(seed(i + 20) * 8000) + 200,
    updated_at: daysAgo(Math.floor(seed(i + 21) * 45)),
  };
});

// Quick test is a special single record
export const mockQuickTest: AdminTest = {
  id: "test_quick",
  title: "Rýchly test bezpečnosti",
  slug: "rychly",
  description: "5-otázkový rýchly test, ktorý zvládneš za 2 minúty.",
  categories: ["vseobecny"],
  difficulty: "easy",
  status: "published",
  time_limit_min: 2,
  pass_score: 60,
  is_quick: true,
  question_ids: mockQuestions.slice(0, 5).map((q) => q.id),
  attempts: 18420,
  updated_at: daysAgo(3),
};

// ---- Share Card config (OG image after finishing a test) ----------------
export const defaultShareCard: ShareCardConfig = {
  enabled: true,
  title_template: "Som {label} {emoji}",
  subtitle_template: "Skóre: {score}/{total} ({percent}%)",
  footer_text: "Otestuj sa aj ty na subenai.sk/tests",
  background_from: "#0f172a",
  background_to: "#6366f1",
  text_color: "#ffffff",
  accent_color: "#facc15",
  show_logo: true,
  show_score_ring: true,
  share_text: "Práve som spravil test bezpečnosti na SubenAI a som {label}! Skús to aj ty.",
  hashtags: "#subenai #kyberbezpecnost #podvody",
  tiers: [
    { id: "t1", min_score: 0, label: "Začiatočník v ohrození", emoji: "🫣", color: "#ef4444" },
    { id: "t2", min_score: 40, label: "Opatrný surfista", emoji: "🛟", color: "#f97316" },
    { id: "t3", min_score: 60, label: "Bdelý občan", emoji: "🧐", color: "#eab308" },
    { id: "t4", min_score: 80, label: "Lovec podvodníkov", emoji: "🥷", color: "#22c55e" },
    { id: "t5", min_score: 95, label: "Kyber-ninja", emoji: "🧠", color: "#06b6d4" },
  ],
};
