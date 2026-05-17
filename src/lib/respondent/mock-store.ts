// AH-8.1 — public respondent flow. Thin re-export wrapper around the platform
// mock-store so the respondent flow only touches a single, narrow surface.
// AH-11 replaces this file with a queries module that calls supabaseAdmin
// with explicit safe-column projection (see take-test.functions.ts).
import {
  getTestByShareId,
  getQuestion,
  createSession,
  completeSession,
} from "@/lib/platform/mock-store";

export { getTestByShareId, getQuestion, createSession, completeSession };
