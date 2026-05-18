// AH-8.1 — public respondent flow. Thin re-export wrapper around the platform
// mock-store so the respondent flow only touches a single, narrow surface.
// AH-11.4 swapped the write path (createSession / completeSession) to the
// SECURITY DEFINER RPCs in @/lib/respondent/queries. Reads (test resolution
// + question lookup) still come from mock-store pending a follow-up story.
import { getTestByShareId, getQuestion } from "@/lib/platform/mock-store";

export { getTestByShareId, getQuestion };
