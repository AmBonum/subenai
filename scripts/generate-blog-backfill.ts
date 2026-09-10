#!/usr/bin/env tsx
// E65 — write the idempotent SQL backfill for the safe-AI section articles.
// Deterministic (fixed stagger timestamps): re-running with unchanged MDX
// produces a byte-identical file, which tests/content/ai-safety-section.test.ts
// asserts in memory. Per CLAUDE.md the owner runs the output against prod
// Supabase after merge.
//
//   npm run blog:backfill
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { AI_SAFETY_BACKFILL_PATH, buildAiSafetyBackfillSql } from "@/lib/blog/ai-safety-backfill";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, AI_SAFETY_BACKFILL_PATH);

writeFileSync(OUT, buildAiSafetyBackfillSql(ROOT));
console.log(`Wrote ${OUT}`);
