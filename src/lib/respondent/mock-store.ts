// AH-11.6 carve-out — public respondent flow reads. Thin re-export wrapper
// around the platform mock-store so the respondent flow only touches a
// single narrow surface. AH-11.4 swapped the write path (createSession /
// completeSession) to the SECURITY DEFINER RPCs in
// `@/lib/respondent/queries`. AH-14 ships a `get_test_by_share_id(share_id)`
// RPC + question lookup so this wrapper can be retired together with
// `@/lib/platform/mock-store`.
import { getTestByShareId, getQuestion } from "@/lib/platform/mock-store";

export { getTestByShareId, getQuestion };
