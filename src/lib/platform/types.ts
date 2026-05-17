// Platform types — kompatibilné s budúcim Supabase schémou.
// Field naming pripravené na 1:1 prevod (snake_case, *_id, ISO dates).

export type Role = "owner" | "editor" | "viewer";
export type TestStatus = "draft" | "published" | "archived";
export type GdprPurpose =
  | "marketing"
  | "research"
  | "recruitment"
  | "education"
  | "internal_training";

export type QuestionType =
  | "single"
  | "multi"
  | "scale_1_5"
  | "scale_1_10"
  | "nps"
  | "matrix"
  | "ranking"
  | "slider"
  | "short_text"
  | "long_text"
  | "date"
  | "time"
  | "file_upload"
  | "image_choice"
  | "yes_no";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_initials: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: Role;
  joined_at: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // pre single/multi/ranking/image_choice
  matrix_rows?: string[];
  matrix_cols?: string[];
  correct?: number[] | string; // index(y) alebo text
  category: string;
  difficulty: "easy" | "medium" | "hard";
  author_id: string;
  status: "draft" | "approved" | "deprecated";
  created_at: string;
}

export type IntakeFieldType =
  | "text"
  | "email"
  | "phone"
  | "select"
  | "checkbox"
  | "date"
  | "number";

export interface IntakeField {
  id: string;
  label: string;
  type: IntakeFieldType;
  required: boolean;
  options?: string[];
  pii: boolean;
}

export interface NotifConfig {
  new_respondent: { enabled: boolean; channel: "email" | "in_app" | "both" };
  milestone: { enabled: boolean; every_n: number };
  anomaly: { enabled: boolean };
  expiry: { enabled: boolean; days_before: number };
  daily_summary: { enabled: boolean };
}

export interface ConditionalBranch {
  if_question_id: string;
  if_answer: string; // mock: textová zhoda
  jump_to_question_id: string;
}

export interface Test {
  id: string;
  slug: string;
  share_id: string; // /t/$shareId
  owner_id: string;
  team_id: string | null;
  title: string;
  description: string;
  status: TestStatus;
  version: number;
  password: string | null; // mock; v reále hash (Argon2id)
  segmentation: string[]; // free tags
  gdpr_purpose: GdprPurpose;
  intake_fields: IntakeField[];
  question_ids: string[];
  use_predefined_set: boolean;
  predefined_set_id?: string;
  branches: ConditionalBranch[];
  notif_config: NotifConfig;
  anonymize_after_days: number | null;
  allow_behavioral_tracking: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface TestVersion {
  id: string;
  test_id: string;
  version: number;
  snapshot_title: string;
  snapshot_questions: number;
  published_at: string;
  published_by: string;
  changelog: string;
}

export interface Respondent {
  id: string;
  email: string | null;
  display_name: string | null;
  anonymized_at: string | null;
  created_at: string;
}

export interface SessionAnswer {
  question_id: string;
  value: string;
  is_correct: boolean | null;
  time_ms: number;
}

export interface Session {
  id: string;
  test_id: string;
  version: number;
  respondent_id: string;
  intake_data: Record<string, string>;
  consent_given: boolean;
  answers: SessionAnswer[];
  started_at: string;
  finished_at: string | null;
  score: number | null; // 0–100
  status: "in_progress" | "completed" | "abandoned";
  segment: string | null;
  ip_hash: string;
}

export type BehavioralEventType =
  | "question_view"
  | "question_answer"
  | "drop_off"
  | "focus_loss"
  | "resume";

export interface BehavioralEvent {
  id: string;
  session_id: string;
  type: BehavioralEventType;
  payload: Record<string, string | number>;
  at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  event_type: "new_respondent" | "milestone" | "anomaly" | "expiry" | "daily_summary";
  test_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string; // "test.publish", "respondent.pii_access" ...
  target_type: "test" | "session" | "respondent" | "question" | "team" | "user" | "dsr";
  target_id: string;
  pii_access: boolean;
  details: string;
  at: string;
}

export type DSRType =
  | "access"
  | "rectification"
  | "erase"
  | "restriction"
  | "portability"
  | "objection";

export interface DSRRequest {
  id: string;
  requester_email: string;
  type: DSRType;
  status: "open" | "in_progress" | "completed" | "rejected";
  note: string;
  created_at: string;
  sla_due_at: string;
  resolved_at: string | null;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  question_ids: string[];
  gdpr_purpose: GdprPurpose;
}

// ---------- Respondent groups (audiences) ----------
export interface RespondentGroup {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  member_emails: string[]; // email addresses (deduped)
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface GroupAssignment {
  id: string;
  test_id: string;
  group_id: string;
  assigned_by: string;
  assigned_at: string;
  invited_count: number; // mock: počet odoslaných pozvánok
}
