// AH-11.6 carve-out — wraps `adminRepo` so the /app/sets/$setId user-side
// viewer can read the same answer-set state mutated by admin. AH-14 lifts
// the viewer onto Supabase-backed `useAnswerSets` / `useAnswers` hooks in
// `@/lib/admin/queries.ts`; at that point this whole file (and the parent
// `mock-store` + `mock-data`) is deletable. The `mock-` prefix in the
// filename is the contract `scripts/check-bundle-no-mocks.mjs` relies on
// to catch accidental leakage of these symbols into the production bundle.
import { adminRepo, useAdminState } from "@/lib/admin/mock-store";
import type { AdminAnswer, AdminAnswerSet } from "@/lib/admin/mock-data";

// ---- AdminAnswerSet ----

export function createSet(input: {
  name: string;
  description: string;
  categories: string[];
}): AdminAnswerSet {
  return adminRepo.answerSets.create(input);
}

export function updateSet(
  id: string,
  patch: Partial<Pick<AdminAnswerSet, "name" | "description" | "categories">>,
) {
  adminRepo.answerSets.update(id, patch);
}

export function deleteSet(id: string) {
  adminRepo.answerSets.remove(id);
}

export function getById(id: string): AdminAnswerSet | undefined {
  return adminRepo.answerSets.get(id);
}

export function duplicateSet(id: string): AdminAnswerSet | null {
  const src = adminRepo.answerSets.get(id);
  if (!src) return null;
  const copy = adminRepo.answerSets.create({
    name: `${src.name} (kópia)`,
    description: src.description,
    categories: [...src.categories],
  });
  const children = adminRepo.answers.list(id);
  for (const a of children) {
    adminRepo.answers.create({
      set_id: copy.id,
      text: a.text,
      is_correct: a.is_correct,
      explanation: a.explanation,
    });
  }
  return copy;
}

// Back-compat aliases retained for any caller still using the legacy names.
// The AH-4.4 story is the canonical surface; the new names are preferred.
export const createAnswerSet = createSet;
export const updateAnswerSet = updateSet;
export const deleteAnswerSet = deleteSet;
export const duplicateAnswerSet = duplicateSet;

// ---- AdminAnswer (child rows) ----

export function createAnswer(input: {
  set_id: string;
  text: string;
  is_correct: boolean;
  explanation?: string;
}): AdminAnswer {
  return adminRepo.answers.create(input);
}

export function updateAnswer(
  id: string,
  patch: Partial<Pick<AdminAnswer, "text" | "is_correct" | "explanation">>,
) {
  adminRepo.answers.update(id, patch);
}

export function deleteAnswer(id: string) {
  adminRepo.answers.remove(id);
}

// ---- Reactive hooks ----

export function useAnswerSets() {
  return useAdminState((s) => s.answerSets);
}

export function useAnswers() {
  return useAdminState((s) => s.answers);
}
