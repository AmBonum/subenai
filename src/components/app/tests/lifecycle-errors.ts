// E50 review fix (9) — localized Slovak messages for test-lifecycle
// failures instead of raw `err.message` Supabase strings. Known error
// sentinels come from the publish_test / replace_test_questions /
// duplicate_test RPCs (RAISE EXCEPTION '<sentinel>').

import { tFor } from "@/i18n/tests";

const t = tFor("errors");

const KNOWN = [
  "unauthenticated",
  "not_owner",
  "test_not_found",
  "test_archived",
  "duplicate_question_ids",
] as const;

export function lifecycleErrorMessage(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof (err as { message?: unknown })?.message === "string"
        ? ((err as { message: string }).message ?? "")
        : "";
  const known = KNOWN.find((k) => msg.includes(k));
  return known ? t(`err_${known}`) : t("err_generic");
}
