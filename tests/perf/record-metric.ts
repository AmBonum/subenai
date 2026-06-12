// Observational metric sink for the perf/stress suites. Tests still ASSERT
// their budgets (that's the gate); recordMetric is a side channel that
// appends the measured value to a per-process JSONL file under
// reports/.perf/, which scripts/perf-report.mjs aggregates into the
// compact post-run report. It must never throw — a metric write failure
// can't be allowed to fail a test.

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface PerfMetric {
  suite: string;
  name: string;
  metric: string;
  value: number;
  unit: string;
  budget?: number;
  pass?: boolean;
}

const DIR = join(process.cwd(), "reports", ".perf");
let prepared = false;

function ensureDir(): boolean {
  if (prepared) return true;
  try {
    mkdirSync(DIR, { recursive: true });
    prepared = true;
    return true;
  } catch {
    return false;
  }
}

export function recordMetric(m: PerfMetric): void {
  if (!ensureDir()) return;
  try {
    const file = join(DIR, `vitest-${process.pid}.jsonl`);
    appendFileSync(file, JSON.stringify({ ...m, runner: "vitest" }) + "\n");
  } catch {
    // Never let telemetry break a test.
  }
}
