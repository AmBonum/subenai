// Playwright-side metric sink — mirrors tests/perf/record-metric.ts but
// runs in the Playwright worker process. Same contract: never throws,
// appends to reports/.perf/, aggregated by scripts/perf-report.mjs.

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
    const file = join(DIR, `playwright-${process.pid}.jsonl`);
    appendFileSync(file, JSON.stringify({ ...m, runner: "playwright" }) + "\n");
  } catch {
    // Never let telemetry break a test.
  }
}
