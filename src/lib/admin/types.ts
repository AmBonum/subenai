// Admin domain TypeScript types. Extracted from mock-data.ts in AH-11.1a so
// the type surface survives the AH-11.6 deletion of mock-data.ts. Mock data
// re-exports these for backwards compatibility while consumers migrate.

export type UserRole = "admin" | "moderator" | "user";
export type UserStatus = "active" | "suspended" | "pending";

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  questions_count: number;
  created_at: string;
  last_active_at: string;
}

export type QuestionStatus = "published" | "pending" | "flagged" | "archived";

export interface AdminQuestion {
  id: string;
  title: string;
  excerpt: string;
  body?: string;
  author_id: string;
  author_name: string;
  categories: string[];
  status: QuestionStatus;
  answers_count: number;
  votes: number;
  reports_count: number;
  created_at: string;
  answer_set_id?: string;
  correct_answer_ids: string[];
  incorrect_answer_ids: string[];
  // AH-15.7 trilingual scam-scenario fields. `body` is the sk
  // source-of-truth (maps to questions.prompt); _en/_cs map to
  // questions.prompt_en/_cs. Options/visual mirror the same pattern but
  // are jsonb-as-string in the editor — admins paste/copy raw JSON.
  body_en?: string;
  body_cs?: string;
  options_en?: string;
  options_cs?: string;
  visual_en?: string;
  visual_cs?: string;
}

export interface AdminAnswer {
  id: string;
  set_id: string;
  text: string;
  is_correct: boolean;
  explanation?: string;
  created_at: string;
}

export interface AdminAnswerSet {
  id: string;
  name: string;
  description: string;
  categories: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  questions_count: number;
}

export type TrainingStatus = "published" | "draft" | "archived";

export interface AdminTraining {
  id: string;
  title: string;
  topic: string;
  description: string;
  duration_min: number;
  status: TrainingStatus;
  views: number;
  updated_at: string;
}

export interface AdminTopic {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  trainings_count: number;
}

export type ReportReason = "spam" | "inappropriate" | "harassment" | "misinformation" | "other";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface AdminReport {
  id: string;
  target_type: "question" | "user" | "answer" | "training";
  target_id: string;
  target_label: string;
  reason: ReportReason;
  status: ReportStatus;
  reporter_name: string;
  created_at: string;
}

export type TestStatus = "published" | "draft" | "archived";
export type TestDifficulty = "easy" | "medium" | "hard";

export interface AdminTest {
  id: string;
  title: string;
  slug: string;
  description: string;
  categories: string[];
  difficulty: TestDifficulty;
  status: TestStatus;
  time_limit_min: number;
  pass_score: number;
  is_quick: boolean;
  question_ids: string[];
  attempts: number;
  updated_at: string;
}

export interface AdminActivityEvent {
  id: string;
  type: "question_created" | "test_published" | "report_filed" | "user_signup";
  actor: string;
  summary: string;
  created_at: string;
}

export interface AdminDashboardStats {
  total_users: number;
  active_users_7d: number;
  total_questions: number;
  pending_review: number;
  total_answers: number;
  open_reports: number;
  total_trainings: number;
  training_views: number;
  total_tests: number;
  total_sessions: number;
  pending_dsr: number;
  pending_dpa: number;
}

export interface ShareRatingTier {
  id: string;
  min_score: number;
  label: string;
  emoji: string;
  color: string;
}

export interface ShareCardConfig {
  enabled: boolean;
  title_template: string;
  subtitle_template: string;
  footer_text: string;
  background_from: string;
  background_to: string;
  text_color: string;
  accent_color: string;
  show_logo: boolean;
  show_score_ring: boolean;
  share_text: string;
  hashtags: string;
  tiers: ShareRatingTier[];
}
