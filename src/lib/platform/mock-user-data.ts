// AH-11 deletes this file. Production reads via React Query + Supabase queries
// (`src/lib/admin/queries.ts`, `src/lib/platform/queries.ts`). Mock data only —
// never seeded into production.
//
// User-side mock data for the "my test sets" experience.
// Mirrors the admin data layer so it's trivial to swap for Lovable Cloud later:
//   - userTestSets    -> table `user_test_sets`     (owner_id, title, slug, ...)
//   - userTestShares  -> table `user_test_shares`   (set_id, kind, target, ...)
//   - userTestInvites -> table `user_test_invites`  (set_id, email, status, token)
//
// Keep field names aligned with the future schema so the repo swap is mechanical.

export type SharedAccess = "view" | "play" | "edit";
export type InviteStatus = "pending" | "accepted" | "expired" | "bounced";

export interface UserTestSet {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  description: string;
  slug: string; // public URL slug
  categories: string[]; // branch slugs
  question_ids: string[]; // references admin/user questions
  visibility: "private" | "unlisted" | "public";
  /** Voliteľné heslo, ktoré respondent musí zadať pred spustením testu. null = bez hesla */
  password: string | null;
  attempts: number;
  shared_with_count: number;
  created_at: string;
  updated_at: string;
}

export interface AttemptAnswer {
  question_id: string;
  is_correct: boolean;
  /** Čas v ms, ktorý respondent strávil na otázke */
  time_ms: number;
}

export interface UserTestAttempt {
  id: string;
  set_id: string;
  respondent_name: string;
  respondent_email: string;
  started_at: string;
  finished_at: string;
  /** Celkové skóre v percentách (0-100) */
  score: number;
  /** Suma času v ms */
  duration_ms: number;
  answers: AttemptAnswer[];
}

export interface UserTestShare {
  id: string;
  set_id: string;
  kind: "link" | "email";
  target: string; // email address or generated link token
  access: SharedAccess;
  created_at: string;
}

export interface UserTestInvite {
  id: string;
  set_id: string;
  email: string;
  access: SharedAccess;
  status: InviteStatus;
  sent_at: string;
  token: string;
  message?: string;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const currentUser = {
  id: "usr_me",
  display_name: "Jana Nováková",
  email: "jana@example.sk",
  avatar_initials: "JN",
};

export const mockUserSets: UserTestSet[] = [
  {
    id: "uts_001",
    owner_id: currentUser.id,
    owner_name: currentUser.display_name,
    title: "Bezpečné nakupovanie na Vianoce",
    description: "Sada otázok pre rodinu — phishing, falošné e-shopy a doručovacie SMS.",
    slug: "vianoce-2025",
    categories: ["eshop", "vseobecny"],
    question_ids: ["q_0001", "q_0002", "q_0005", "q_0008", "q_0011"],
    visibility: "unlisted",
    password: "vianoce123",
    attempts: 42,
    shared_with_count: 8,
    created_at: daysAgo(14),
    updated_at: daysAgo(2),
  },
  {
    id: "uts_002",
    owner_id: currentUser.id,
    owner_name: currentUser.display_name,
    title: "Pre kolegov v účtárni",
    description: "Falošné faktúry, SEPA podvody a phishing emaily zo zahraničia.",
    slug: "uctaren-q4",
    categories: ["autoservis", "verejne-sluzby"],
    question_ids: ["q_0003", "q_0007", "q_0009", "q_0012"],
    visibility: "private",
    password: null,
    attempts: 7,
    shared_with_count: 3,
    created_at: daysAgo(30),
    updated_at: daysAgo(9),
  },
  {
    id: "uts_003",
    owner_id: currentUser.id,
    owner_name: currentUser.display_name,
    title: "Babka & deda — základ",
    description: "Falošní bankári, romance scam a podvodné linky cez SMS.",
    slug: "seniori-rodina",
    categories: ["seniori"],
    question_ids: ["q_0004", "q_0006", "q_0010"],
    visibility: "public",
    password: null,
    attempts: 213,
    shared_with_count: 27,
    created_at: daysAgo(60),
    updated_at: daysAgo(20),
  },
];

export const mockUserShares: UserTestShare[] = [
  {
    id: "shr_001",
    set_id: "uts_001",
    kind: "link",
    target: "k7f9-pa28-9w12",
    access: "play",
    created_at: daysAgo(10),
  },
  {
    id: "shr_002",
    set_id: "uts_003",
    kind: "link",
    target: "babka-deda-2025",
    access: "play",
    created_at: daysAgo(45),
  },
];

export const mockUserInvites: UserTestInvite[] = [
  {
    id: "inv_001",
    set_id: "uts_001",
    email: "michal@example.sk",
    access: "play",
    status: "accepted",
    sent_at: daysAgo(9),
    token: "tok_001",
  },
  {
    id: "inv_002",
    set_id: "uts_001",
    email: "lucia@example.sk",
    access: "play",
    status: "pending",
    sent_at: daysAgo(3),
    token: "tok_002",
    message: "Skús to s nami, je to fakt rýchle :)",
  },
  {
    id: "inv_003",
    set_id: "uts_002",
    email: "uctovnictvo@firma.sk",
    access: "view",
    status: "pending",
    sent_at: daysAgo(1),
    token: "tok_003",
  },
];

// ---------- Respondent attempts (per-test dashboard) ----------
const SET1_QS = ["q_0001", "q_0002", "q_0005", "q_0008", "q_0011"];
const SET2_QS = ["q_0003", "q_0007", "q_0009", "q_0012"];
const SET3_QS = ["q_0004", "q_0006", "q_0010"];

const buildAnswers = (qs: string[], correctMask: number[], times: number[]): AttemptAnswer[] =>
  qs.map((q, i) => ({
    question_id: q,
    is_correct: correctMask[i] === 1,
    time_ms: times[i],
  }));

const finish = (start: string, duration_ms: number) =>
  new Date(new Date(start).getTime() + duration_ms).toISOString();

export const mockUserAttempts: UserTestAttempt[] = [
  // ---- uts_001 ----
  (() => {
    const answers = buildAnswers(SET1_QS, [1, 1, 1, 0, 1], [12_400, 8_900, 21_300, 31_200, 9_800]);
    const duration_ms = answers.reduce((a, x) => a + x.time_ms, 0);
    const started_at = daysAgo(8);
    return {
      id: "att_001",
      set_id: "uts_001",
      respondent_name: "Michal Horváth",
      respondent_email: "michal@example.sk",
      started_at,
      finished_at: finish(started_at, duration_ms),
      score: 80,
      duration_ms,
      answers,
    };
  })(),
  (() => {
    const answers = buildAnswers(SET1_QS, [1, 0, 1, 1, 1], [9_100, 18_400, 14_500, 11_900, 7_200]);
    const duration_ms = answers.reduce((a, x) => a + x.time_ms, 0);
    const started_at = daysAgo(5);
    return {
      id: "att_002",
      set_id: "uts_001",
      respondent_name: "Lucia Krátka",
      respondent_email: "lucia@example.sk",
      started_at,
      finished_at: finish(started_at, duration_ms),
      score: 80,
      duration_ms,
      answers,
    };
  })(),
  (() => {
    const answers = buildAnswers(
      SET1_QS,
      [0, 0, 1, 1, 0],
      [27_300, 45_100, 12_800, 19_200, 33_900],
    );
    const duration_ms = answers.reduce((a, x) => a + x.time_ms, 0);
    const started_at = daysAgo(3);
    return {
      id: "att_003",
      set_id: "uts_001",
      respondent_name: "Peter Dobrý",
      respondent_email: "peter.dobry@firma.sk",
      started_at,
      finished_at: finish(started_at, duration_ms),
      score: 40,
      duration_ms,
      answers,
    };
  })(),
  (() => {
    const answers = buildAnswers(SET1_QS, [1, 1, 1, 1, 1], [6_200, 5_900, 8_400, 7_100, 4_800]);
    const duration_ms = answers.reduce((a, x) => a + x.time_ms, 0);
    const started_at = daysAgo(1);
    return {
      id: "att_004",
      set_id: "uts_001",
      respondent_name: "Eva Múdra",
      respondent_email: "eva.mudra@example.sk",
      started_at,
      finished_at: finish(started_at, duration_ms),
      score: 100,
      duration_ms,
      answers,
    };
  })(),
  // ---- uts_002 ----
  (() => {
    const answers = buildAnswers(SET2_QS, [1, 1, 0, 1], [14_500, 12_200, 28_700, 9_300]);
    const duration_ms = answers.reduce((a, x) => a + x.time_ms, 0);
    const started_at = daysAgo(6);
    return {
      id: "att_005",
      set_id: "uts_002",
      respondent_name: "Účtáreň – Klára",
      respondent_email: "uctovnictvo@firma.sk",
      started_at,
      finished_at: finish(started_at, duration_ms),
      score: 75,
      duration_ms,
      answers,
    };
  })(),
  // ---- uts_003 ----
  (() => {
    const answers = buildAnswers(SET3_QS, [1, 0, 0], [42_100, 51_300, 38_900]);
    const duration_ms = answers.reduce((a, x) => a + x.time_ms, 0);
    const started_at = daysAgo(2);
    return {
      id: "att_006",
      set_id: "uts_003",
      respondent_name: "Babka Anna",
      respondent_email: "anna.k@example.sk",
      started_at,
      finished_at: finish(started_at, duration_ms),
      score: 33,
      duration_ms,
      answers,
    };
  })(),
  (() => {
    const answers = buildAnswers(SET3_QS, [1, 1, 1], [29_400, 33_200, 26_700]);
    const duration_ms = answers.reduce((a, x) => a + x.time_ms, 0);
    const started_at = daysAgo(4);
    return {
      id: "att_007",
      set_id: "uts_003",
      respondent_name: "Deduško Ján",
      respondent_email: "jan.dedko@example.sk",
      started_at,
      finished_at: finish(started_at, duration_ms),
      score: 100,
      duration_ms,
      answers,
    };
  })(),
];

export const attemptsForSet = (setId: string) => mockUserAttempts.filter((a) => a.set_id === setId);
