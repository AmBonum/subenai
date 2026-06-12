#!/usr/bin/env node
// Aggregates the raw perf/stress metrics dropped under reports/.perf/ by the
// test suites into a single COMPACT, gzip-COMPRESSED report, then deletes
// every non-compressed report artifact (the raw jsonl, the bulky Playwright
// HTML report + test-results, the prior plain report). The kept output is:
//
//   reports/perf-latest.json.gz   — machine-readable
//   reports/perf-latest.md.gz     — human-readable
//
// Run standalone (`node scripts/perf-report.mjs`) or via `npm run perf`
// which runs the suites first. Stamp comes from the runtime (process arg or
// now) since the test files cannot use Date.now().

import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const REPORTS = join(ROOT, "reports");
const RAW = join(REPORTS, ".perf");

function readRawMetrics() {
  if (!existsSync(RAW)) return [];
  const out = [];
  for (const file of readdirSync(RAW)) {
    if (!file.endsWith(".jsonl")) continue;
    const text = readFileSync(join(RAW, file), "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        out.push(JSON.parse(t));
      } catch {
        // skip a torn line
      }
    }
  }
  return out;
}

function pct(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function summarize(metrics) {
  // Group by suite → name → metric, collapsing repeated samples to stats.
  const bySuite = new Map();
  for (const m of metrics) {
    const suite = bySuite.get(m.suite) ?? new Map();
    const key = `${m.name} · ${m.metric}`;
    const rec = suite.get(key) ?? {
      name: m.name,
      metric: m.metric,
      unit: m.unit,
      budget: m.budget ?? null,
      samples: [],
      pass: true,
    };
    rec.samples.push(m.value);
    if (m.pass === false) rec.pass = false;
    suite.set(key, rec);
    bySuite.set(m.suite, suite);
  }

  const suites = [];
  let total = 0;
  let passing = 0;
  for (const [suiteName, recs] of [...bySuite.entries()].sort()) {
    const rows = [];
    for (const rec of [...recs.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      const v = rec.samples;
      const min = Math.min(...v);
      const max = Math.max(...v);
      const mean = Math.round(v.reduce((s, x) => s + x, 0) / v.length);
      const p95 = pct(v, 95);
      const headroom =
        rec.budget != null && rec.budget > 0 ? Math.round((1 - max / rec.budget) * 100) : null;
      rows.push({
        name: rec.name,
        metric: rec.metric,
        unit: rec.unit,
        samples: v.length,
        min,
        mean,
        max,
        p95,
        budget: rec.budget,
        headroomPct: headroom,
        pass: rec.pass,
      });
      total += 1;
      if (rec.pass) passing += 1;
    }
    suites.push({ suite: suiteName, rows });
  }
  return { suites, total, passing };
}

function renderMarkdown(summary, stampIso) {
  const lines = [];
  lines.push(`# Perf + stress report`);
  lines.push("");
  lines.push(`- Generated: ${stampIso}`);
  lines.push(`- Metrics: **${summary.passing}/${summary.total}** within budget`);
  lines.push("");
  if (summary.total === 0) {
    lines.push("_No metrics captured. Run `npm run perf` to populate._");
    return lines.join("\n") + "\n";
  }
  for (const s of summary.suites) {
    lines.push(`## ${s.suite}`);
    lines.push("");
    lines.push("| metric | n | min | mean | max | p95 | budget | headroom | ok |");
    lines.push("|---|--:|--:|--:|--:|--:|--:|--:|:--:|");
    for (const r of s.rows) {
      const u = r.unit;
      const b = r.budget != null ? `${r.budget} ${u}` : "—";
      const h = r.headroomPct != null ? `${r.headroomPct}%` : "—";
      lines.push(
        `| ${r.name} · ${r.metric} | ${r.samples} | ${r.min} | ${r.mean} | ${r.max} | ${r.p95} ${u} | ${b} | ${h} | ${r.pass ? "✅" : "❌"} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

function deleteNonCompressedReports() {
  const deleted = [];
  const targets = [
    RAW,
    join(ROOT, "playwright-report"),
    join(ROOT, "test-results"),
    join(ROOT, "blob-report"),
    join(REPORTS, "perf-latest.json"),
    join(REPORTS, "perf-latest.md"),
  ];
  for (const t of targets) {
    if (existsSync(t)) {
      rmSync(t, { recursive: true, force: true });
      deleted.push(t.replace(ROOT + "/", ""));
    }
  }
  return deleted;
}

function main() {
  mkdirSync(REPORTS, { recursive: true });
  const stampArg = process.argv.find((a) => a.startsWith("--stamp="));
  const stampIso = stampArg ? stampArg.slice("--stamp=".length) : new Date().toISOString();

  const metrics = readRawMetrics();
  const summary = summarize(metrics);
  const json = JSON.stringify({ generated: stampIso, ...summary }, null, 2);
  const md = renderMarkdown(summary, stampIso);

  // Write compressed artifacts only.
  writeFileSync(join(REPORTS, "perf-latest.json.gz"), gzipSync(Buffer.from(json)));
  writeFileSync(join(REPORTS, "perf-latest.md.gz"), gzipSync(Buffer.from(md)));

  const deleted = deleteNonCompressedReports();

  // Console digest so the user sees the numbers immediately after a run.
  process.stdout.write(md);
  process.stdout.write(
    `\nWrote reports/perf-latest.md.gz + reports/perf-latest.json.gz` +
      `\nDeleted ${deleted.length} non-compressed report artifact(s):` +
      (deleted.length ? "\n  - " + deleted.join("\n  - ") : " none") +
      "\n",
  );
}

main();
