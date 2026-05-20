import type {
  AuditLogEntry,
  BehavioralEvent,
  DSRRequest,
  Notification,
  Question,
  Respondent,
  Session,
  Team,
  TeamMember,
  Template,
  Test,
  TestVersion,
  User,
} from "./types";

const daysAgo = (n: number, h = 0) =>
  new Date(Date.now() - n * 86400000 - h * 3600000).toISOString();
const rand = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};
const pick = <T>(arr: T[], seed: number) => arr[Math.floor(rand(seed) * arr.length)];

export const SEED_USERS: User[] = [
  { id: "usr_me", email: "jana@example.sk", display_name: "Jana Nováková", avatar_initials: "JN" },
  {
    id: "usr_002",
    email: "michal@example.sk",
    display_name: "Michal Horváth",
    avatar_initials: "MH",
  },
  { id: "usr_003", email: "lucia@example.sk", display_name: "Lucia Krátka", avatar_initials: "LK" },
  { id: "usr_004", email: "peter@firma.sk", display_name: "Peter Dobrý", avatar_initials: "PD" },
  { id: "usr_005", email: "eva@example.sk", display_name: "Eva Múdra", avatar_initials: "EM" },
  { id: "usr_006", email: "tomas@firma.sk", display_name: "Tomáš Veľký", avatar_initials: "TV" },
  { id: "usr_007", email: "klara@firma.sk", display_name: "Klára Účtovná", avatar_initials: "KU" },
  {
    id: "usr_008",
    email: "admin@subenai.sk",
    display_name: "Platform Admin",
    avatar_initials: "PA",
  },
];

export const CURRENT_USER_ID = "usr_me";

export const SEED_TEAMS: Team[] = [
  { id: "team_001", name: "SubenAI HQ", owner_id: "usr_me", created_at: daysAgo(120) },
  { id: "team_002", name: "Firma Krátka s.r.o.", owner_id: "usr_003", created_at: daysAgo(80) },
  { id: "team_003", name: "Účtovníci 2025", owner_id: "usr_007", created_at: daysAgo(40) },
];

export const SEED_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tm_01",
    team_id: "team_001",
    user_id: "usr_me",
    email: "jana@example.sk",
    display_name: "Jana Nováková",
    role: "owner",
    joined_at: daysAgo(120),
  },
  {
    id: "tm_02",
    team_id: "team_001",
    user_id: "usr_002",
    email: "michal@example.sk",
    display_name: "Michal Horváth",
    role: "editor",
    joined_at: daysAgo(95),
  },
  {
    id: "tm_03",
    team_id: "team_001",
    user_id: "usr_005",
    email: "eva@example.sk",
    display_name: "Eva Múdra",
    role: "viewer",
    joined_at: daysAgo(40),
  },
  {
    id: "tm_04",
    team_id: "team_002",
    user_id: "usr_003",
    email: "lucia@example.sk",
    display_name: "Lucia Krátka",
    role: "owner",
    joined_at: daysAgo(80),
  },
  {
    id: "tm_05",
    team_id: "team_002",
    user_id: "usr_004",
    email: "peter@firma.sk",
    display_name: "Peter Dobrý",
    role: "editor",
    joined_at: daysAgo(70),
  },
  {
    id: "tm_06",
    team_id: "team_003",
    user_id: "usr_007",
    email: "klara@firma.sk",
    display_name: "Klára Účtovná",
    role: "owner",
    joined_at: daysAgo(40),
  },
  {
    id: "tm_07",
    team_id: "team_003",
    user_id: "usr_006",
    email: "tomas@firma.sk",
    display_name: "Tomáš Veľký",
    role: "editor",
    joined_at: daysAgo(30),
  },
  {
    id: "tm_08",
    team_id: "team_003",
    user_id: "usr_me",
    email: "jana@example.sk",
    display_name: "Jana Nováková",
    role: "viewer",
    joined_at: daysAgo(15),
  },
];

// ---------- Questions covering all 15 types ----------
const QTYPES = [
  "single",
  "multi",
  "scale_1_5",
  "scale_1_10",
  "nps",
  "matrix",
  "ranking",
  "slider",
  "short_text",
  "long_text",
  "date",
  "time",
  "file_upload",
  "image_choice",
  "yes_no",
] as const;
const CATS = [
  "phishing",
  "eshop",
  "seniori",
  "ucto",
  "sms",
  "autoservis",
  "verejne-sluzby",
  "banky",
  "heslá",
  "socialne-siete",
];

export const SEED_QUESTIONS: Question[] = Array.from({ length: 120 }, (_, i) => {
  const type = QTYPES[i % QTYPES.length];
  const base: Question = {
    id: `qp_${String(i + 1).padStart(4, "0")}`,
    type,
    prompt: `Otázka #${i + 1}: ${type === "nps" ? "Ako pravdepodobne odporučíš SubenAI kolegovi?" : type === "scale_1_5" ? "Ohodnoť úroveň rizika tohto e-mailu" : type === "yes_no" ? "Je tento link bezpečný?" : `Vyber správnu odpoveď k scenáru ${i + 1}`}`,
    options: ["single", "multi", "ranking", "image_choice"].includes(type)
      ? ["Možnosť A", "Možnosť B", "Možnosť C", "Možnosť D"]
      : undefined,
    matrix_rows: type === "matrix" ? ["E-mail", "SMS", "Telefonát"] : undefined,
    matrix_cols: type === "matrix" ? ["Bezpečné", "Podozrivé", "Nebezpečné"] : undefined,
    correct: ["single", "yes_no", "image_choice"].includes(type) ? [0] : undefined,
    category: CATS[i % CATS.length],
    difficulty: (["easy", "medium", "hard"] as const)[i % 3],
    author_id: i % 4 === 0 ? "usr_008" : "usr_me",
    status: i % 9 === 0 ? "draft" : i % 13 === 0 ? "deprecated" : "approved",
    created_at: daysAgo(150 - i),
  };
  return base;
});

// ---------- Tests ----------
const TEST_TITLES = [
  "Bezpečné nakupovanie na Vianoce",
  "Phishing pre účtáreň",
  "Senior — základ",
  "Doručovacie SMS podvody",
  "Falošné bankové výzvy",
  "Romance scam detection",
  "Onboarding kolegov 2025",
  "Krížový test pre HR",
  "Autoservis — fake faktúry",
  "Verejná správa — phishing",
  "E-shop test pre rodičov",
  "Mladá generácia — TikTok scam",
  "Konferencia 2025 — quiz",
  "Týždenný drill: phishing",
  "Mesačný drill: SMS",
  "Krátky test pre nováčikov",
  "Pokročilý test pre IT",
  "Compliance Q4",
  "GDPR awareness",
  "Sociálne siete — bezpečnosť",
  "Heslá a 2FA",
  "Cloud služby — riziká",
  "Práca z domu — riziká",
  "Verejné WiFi",
  "Cestovanie a podvody",
  "Nákupy v zahraničí",
  "Doručenie balíkov",
  "Kryptomeny — scam",
  "Investičné podvody",
  "Romance scam — pokročilý",
];

const baseNotif = () => ({
  new_respondent: { enabled: true, channel: "email" as const },
  milestone: { enabled: true, every_n: 25 },
  anomaly: { enabled: true },
  expiry: { enabled: true, days_before: 7 },
  daily_summary: { enabled: false },
});

const baseIntake = () => [
  { id: "if_email", label: "E-mail", type: "email" as const, required: true, pii: true },
  { id: "if_name", label: "Meno", type: "text" as const, required: false, pii: true },
  {
    id: "if_dept",
    label: "Oddelenie",
    type: "select" as const,
    required: false,
    options: ["HR", "IT", "Účto", "Predaj"],
    pii: false,
  },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const shareId = (i: number) => {
  let s = "";
  for (let j = 0; j < 8; j++)
    s += "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(rand(i * 7 + j) * 31)];
  return s;
};

export const SEED_TESTS: Test[] = TEST_TITLES.map((title, i) => {
  const status = (["published", "published", "published", "draft", "archived"] as const)[i % 5];
  const teamId = i % 3 === 0 ? "team_001" : i % 3 === 1 ? "team_002" : "team_003";
  const qIds = SEED_QUESTIONS.slice((i * 5) % 100, ((i * 5) % 100) + 5 + (i % 8)).map((q) => q.id);
  return {
    id: `tst_${String(i + 1).padStart(3, "0")}`,
    slug: slugify(title) + "-" + (i + 1),
    share_id: shareId(i),
    owner_id: i % 7 === 0 ? "usr_003" : "usr_me",
    team_id: teamId,
    title,
    description: `Mock popis pre test "${title}". Sada otázok pripravená pre cieľovú skupinu.`,
    status,
    version: 1 + (i % 4),
    password: i % 4 === 0 ? "test" + (1000 + i) : null,
    segmentation: i % 2 === 0 ? ["HR", "prvý ročník"] : ["IT", "seniori"],
    gdpr_purpose: (
      ["research", "education", "internal_training", "marketing", "recruitment"] as const
    )[i % 5],
    intake_fields: baseIntake(),
    question_ids: qIds,
    use_predefined_set: i % 3 === 0,
    predefined_set_id: i % 3 === 0 ? "uts_001" : undefined,
    branches: [],
    notif_config: baseNotif(),
    anonymize_after_days: i % 2 === 0 ? 90 : null,
    allow_behavioral_tracking: i % 3 !== 0,
    expires_at: i % 5 === 0 ? daysAgo(-30) : null,
    created_at: daysAgo(90 - i),
    updated_at: daysAgo(Math.max(1, 30 - i)),
    published_at: status === "published" ? daysAgo(40 - i) : null,
  };
});

export const SEED_TEST_VERSIONS: TestVersion[] = SEED_TESTS.flatMap((t) =>
  Array.from({ length: t.version }, (_, v) => ({
    id: `tv_${t.id}_${v + 1}`,
    test_id: t.id,
    version: v + 1,
    snapshot_title: t.title,
    snapshot_questions: t.question_ids.length - (t.version - v - 1),
    published_at: daysAgo(40 - v * 7),
    published_by: t.owner_id,
    changelog: v === 0 ? "Prvá verzia" : `Úprava otázok v${v + 1}: rozšírenie sady`,
  })),
);

// ---------- Respondents ----------
const FIRST = [
  "Anna",
  "Mária",
  "Eva",
  "Lucia",
  "Petra",
  "Klára",
  "Ivan",
  "Peter",
  "Michal",
  "Jakub",
  "Tomáš",
  "Ján",
  "Karol",
  "Soňa",
  "Adam",
  "Veronika",
  "Boris",
  "Iveta",
  "Slavo",
  "Zuzana",
];
const LAST = [
  "Kováč",
  "Novák",
  "Horváth",
  "Krátka",
  "Dobrý",
  "Múdra",
  "Veľký",
  "Účtovná",
  "Mlynár",
  "Sloboda",
  "Bystrý",
  "Polák",
  "Suchý",
  "Hlávka",
  "Kučera",
  "Štefan",
  "Vargová",
  "Repka",
  "Drahoš",
  "Bezák",
];

export const SEED_RESPONDENTS: Respondent[] = Array.from({ length: 50 }, (_, i) => {
  const f = FIRST[i % FIRST.length];
  const l = LAST[(i * 3) % LAST.length];
  return {
    id: `rsp_${String(i + 1).padStart(3, "0")}`,
    email:
      i % 7 === 0
        ? null
        : `${f.toLowerCase()}.${l.toLowerCase().replace("á", "a").replace("é", "e").replace("ý", "y").replace("č", "c").replace("š", "s")}@example.sk`,
    display_name: i % 9 === 0 ? null : `${f} ${l}`,
    anonymized_at: i % 11 === 0 ? daysAgo(5) : null,
    created_at: daysAgo(80 - i),
  };
});

// ---------- Sessions ----------
export const SEED_SESSIONS: Session[] = [];
SEED_TESTS.forEach((t, ti) => {
  if (t.status !== "published") return;
  const count = 8 + Math.floor(rand(ti + 1) * 18);
  for (let i = 0; i < count; i++) {
    const r = SEED_RESPONDENTS[(ti * 7 + i) % SEED_RESPONDENTS.length];
    const startedDays = (i * 0.7 + ti) % 30;
    const answers = t.question_ids.map((qid, qi) => {
      const correctP = 0.55 + rand(ti * 100 + i * 10 + qi) * 0.4;
      const isCorrect = rand(ti * 100 + i * 10 + qi + 1) < correctP;
      return {
        question_id: qid,
        value: isCorrect ? "Možnosť A" : "Možnosť B",
        is_correct: isCorrect,
        time_ms: Math.floor(4000 + rand(ti + i + qi) * 35000),
      };
    });
    const completed = i % 6 !== 0;
    const duration = answers.reduce((a, x) => a + x.time_ms, 0);
    const score = completed
      ? Math.round((answers.filter((a) => a.is_correct).length / answers.length) * 100)
      : null;
    SEED_SESSIONS.push({
      id: `ses_${t.id}_${i}`,
      test_id: t.id,
      version: t.version,
      respondent_id: r.id,
      intake_data: {
        if_email: r.email ?? "anonym@example.sk",
        if_name: r.display_name ?? "Anonym",
        if_dept: pick(["HR", "IT", "Účto", "Predaj"], ti + i),
      },
      consent_given: i % 8 !== 0,
      answers: completed ? answers : answers.slice(0, Math.floor(answers.length / 2)),
      started_at: daysAgo(startedDays, 2),
      finished_at: completed ? daysAgo(startedDays - 0.01, 1) : null,
      score,
      status: completed ? "completed" : i % 12 === 0 ? "in_progress" : "abandoned",
      segment: t.segmentation[i % t.segmentation.length] ?? null,
      ip_hash: `h_${Math.floor(rand(i) * 9999)}`,
    });
  }
});

export const SEED_BEHAVIORAL_EVENTS: BehavioralEvent[] = SEED_SESSIONS.slice(0, 50).flatMap(
  (s, si) => {
    const evs: BehavioralEvent[] = s.answers.map((a, ai) => ({
      id: `bev_${s.id}_${ai}`,
      session_id: s.id,
      type: "question_answer",
      payload: { question_id: a.question_id, time_ms: a.time_ms },
      at: new Date(new Date(s.started_at).getTime() + ai * 12000).toISOString(),
    }));
    if (si % 4 === 0) {
      evs.push({
        id: `bev_${s.id}_drop`,
        session_id: s.id,
        type: "drop_off",
        payload: { question_index: Math.floor(s.answers.length / 2) },
        at: s.started_at,
      });
    }
    return evs;
  },
);

// ---------- Notifications ----------
export const SEED_NOTIFICATIONS: Notification[] = Array.from({ length: 25 }, (_, i) => {
  const t = SEED_TESTS[i % SEED_TESTS.length];
  const type = (["new_respondent", "milestone", "anomaly", "expiry", "daily_summary"] as const)[
    i % 5
  ];
  const titles = {
    new_respondent: "Nový respondent",
    milestone: "Míľnik dosiahnutý",
    anomaly: "Anomália v odpovediach",
    expiry: "Test čoskoro expiruje",
    daily_summary: "Denný sumár",
  };
  const bodies = {
    new_respondent: `Niekto dokončil test "${t.title}".`,
    milestone: `Test "${t.title}" prekročil 25 dokončení.`,
    anomaly: `Drop-off rate testu "${t.title}" stúpol na 35 %.`,
    expiry: `Test "${t.title}" exspiruje o 7 dní.`,
    daily_summary: `Včera dokončilo testy 12 respondentov.`,
  };
  return {
    id: `ntf_${String(i + 1).padStart(3, "0")}`,
    user_id: CURRENT_USER_ID,
    event_type: type,
    test_id: t.id,
    title: titles[type],
    body: bodies[type],
    read_at: i % 3 === 0 ? daysAgo(i * 0.2) : null,
    created_at: daysAgo(i * 0.4),
  };
});

// ---------- Audit log ----------
const ACTIONS = [
  "test.create",
  "test.publish",
  "test.archive",
  "test.update",
  "respondent.pii_access",
  "question.update",
  "team.invite",
  "session.export",
  "dsr.open",
  "dsr.complete",
];
export const SEED_AUDIT: AuditLogEntry[] = Array.from({ length: 60 }, (_, i) => {
  const action = ACTIONS[i % ACTIONS.length];
  const actor = SEED_USERS[i % SEED_USERS.length];
  const t = SEED_TESTS[i % SEED_TESTS.length];
  return {
    id: `aud_${String(i + 1).padStart(3, "0")}`,
    actor_id: actor.id,
    actor_name: actor.display_name,
    action,
    target_type: action.startsWith("test")
      ? "test"
      : action.startsWith("respondent")
        ? "respondent"
        : action.startsWith("question")
          ? "question"
          : action.startsWith("team")
            ? "team"
            : action.startsWith("session")
              ? "session"
              : "dsr",
    target_id: action.startsWith("test")
      ? t.id
      : action.startsWith("respondent")
        ? SEED_RESPONDENTS[i % 50].id
        : t.id,
    pii_access: action === "respondent.pii_access",
    details: `Akcia "${action}" bola vykonaná na cieľi ${t.title}.`,
    at: daysAgo(i * 0.3),
  };
});

// ---------- DSR ----------
export const SEED_DSR: DSRRequest[] = [
  {
    id: "dsr_001",
    requester_email: "anna.k@example.sk",
    type: "access",
    status: "open",
    note: "Žiadosť o prístup k mojim odpovediam.",
    created_at: daysAgo(3),
    sla_due_at: daysAgo(-27),
    resolved_at: null,
  },
  {
    id: "dsr_002",
    requester_email: "michal@example.sk",
    type: "erase",
    status: "in_progress",
    note: "Vymažte všetky moje údaje.",
    created_at: daysAgo(8),
    sla_due_at: daysAgo(-22),
    resolved_at: null,
  },
  {
    id: "dsr_003",
    requester_email: "peter.dobry@firma.sk",
    type: "portability",
    status: "open",
    note: "Pošlite mi všetky moje dáta v JSON.",
    created_at: daysAgo(12),
    sla_due_at: daysAgo(-18),
    resolved_at: null,
  },
  {
    id: "dsr_004",
    requester_email: "old@example.sk",
    type: "erase",
    status: "completed",
    note: "Vymazané.",
    created_at: daysAgo(40),
    sla_due_at: daysAgo(10),
    resolved_at: daysAgo(25),
  },
];

// ---------- Templates ----------
const seedDefault = (
  id: string,
  title: string,
  description: string,
  questions: string[],
  gdpr_purpose: Template["gdpr_purpose"],
  slug: string,
): Template => ({
  id,
  title,
  description,
  question_ids: questions,
  gdpr_purpose,
  owner_id: null,
  visibility: "public",
  fork_of: null,
  status: "published",
  license: "cc-by-4.0",
  author_display_name: null,
  age_rating: "all",
  slug,
  published_at: daysAgo(30),
  updated_at: daysAgo(30),
  created_at: daysAgo(30),
});

export const SEED_TEMPLATES: Template[] = [
  seedDefault(
    "tpl_001",
    "Onboarding kolegov",
    "Základná bezpečnostná hygiena pre nový tím",
    SEED_QUESTIONS.slice(0, 8).map((q) => q.id),
    "internal_training",
    "onboarding-kolegov",
  ),
  seedDefault(
    "tpl_002",
    "Phishing 101",
    "Najčastejšie útoky e-mailom",
    SEED_QUESTIONS.slice(8, 16).map((q) => q.id),
    "education",
    "phishing-101",
  ),
  seedDefault(
    "tpl_003",
    "SMS podvody",
    "Smishing scenáre pre širokú verejnosť",
    SEED_QUESTIONS.slice(16, 22).map((q) => q.id),
    "education",
    "sms-podvody",
  ),
  seedDefault(
    "tpl_004",
    "Senior — základ",
    "Pre rodičov a starých rodičov",
    SEED_QUESTIONS.slice(22, 28).map((q) => q.id),
    "education",
    "senior-zaklad",
  ),
  seedDefault(
    "tpl_005",
    "HR recruitment screen",
    "Posúdenie security awareness uchádzača",
    SEED_QUESTIONS.slice(28, 38).map((q) => q.id),
    "recruitment",
    "hr-recruitment-screen",
  ),
];

// ---------- Respondent groups ----------
import type { RespondentGroup, GroupAssignment } from "./types";

const _emails = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${prefix}${i + 1}@example.sk`);

export const SEED_GROUPS: RespondentGroup[] = [
  {
    id: "grp_001",
    name: "HR oddelenie",
    description: "Všetci kolegovia z HR",
    owner_id: CURRENT_USER_ID,
    tags: ["HR", "interní"],
    member_emails: [..._emails("hr.kolega", 12), "anna.k@example.sk", "michal@example.sk"],
    created_at: daysAgo(40),
    updated_at: daysAgo(5),
  },
  {
    id: "grp_002",
    name: "IT tím",
    description: "Vývojári + ops",
    owner_id: CURRENT_USER_ID,
    tags: ["IT"],
    member_emails: _emails("it.dev", 18),
    created_at: daysAgo(35),
    updated_at: daysAgo(2),
  },
  {
    id: "grp_003",
    name: "Klient — Firma Krátka",
    description: "Účtovníci klienta",
    owner_id: CURRENT_USER_ID,
    tags: ["klient", "účto"],
    member_emails: [..._emails("ucto.klara", 9), "klara@firma.sk"],
    created_at: daysAgo(20),
    updated_at: daysAgo(1),
  },
  {
    id: "grp_004",
    name: "Seniori — pilot",
    description: "Pilotná skupina pre seniorov",
    owner_id: CURRENT_USER_ID,
    tags: ["seniori", "pilot"],
    member_emails: _emails("senior", 25),
    created_at: daysAgo(12),
    updated_at: daysAgo(12),
  },
];

export const SEED_ASSIGNMENTS: GroupAssignment[] = [
  {
    id: "ga_001",
    test_id: "tst_001",
    group_id: "grp_001",
    assigned_by: CURRENT_USER_ID,
    assigned_at: daysAgo(8),
    invited_count: 14,
  },
  {
    id: "ga_002",
    test_id: "tst_002",
    group_id: "grp_002",
    assigned_by: CURRENT_USER_ID,
    assigned_at: daysAgo(6),
    invited_count: 18,
  },
  {
    id: "ga_003",
    test_id: "tst_001",
    group_id: "grp_003",
    assigned_by: CURRENT_USER_ID,
    assigned_at: daysAgo(3),
    invited_count: 10,
  },
];
