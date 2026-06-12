#!/usr/bin/env node
// Local HTTP load test — autocannon against the PRODUCTION build served by
// `vite preview` on :8080. Measures how the serving layer holds up under
// concurrent virtual users: p50/p90/p99 latency, requests/sec, throughput,
// and the error/non-2xx/timeout counts.
//
//   npm run load
//
// Technology choice (deliberate): autocannon, not k6. It runs on the same
// Node runtime as the rest of the suite (zero infra — no binary, no Docker,
// no host-networking gymnastics on macOS), is purpose-built for HTTP load
// from Node, and plugs straight into our compressed perf-report pipeline.
// k6 is the escalation path if we ever need multi-scenario VU ramping,
// checks, or distributed load — overkill for hammering a handful of local
// routes.
//
// SAFETY: this is LOCAL ONLY. The target host must be localhost/127.0.0.1
// or the run aborts (mirrors the prod seed-guard). We only hit public,
// read-only SPA routes — the server just returns index.html + assets, so
// no Supabase / Stripe / prod side effects are possible.
//
// Best practices applied: a discarded warmup phase, a steady-state measured
// phase at fixed concurrency, per-route thresholds (p99 ceiling, zero
// errors, min RPS floor) that exit non-zero on breach (CI gate), and the
// production artifact under test rather than the dev/HMR server.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { rmSync, mkdirSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import autocannon from "autocannon";

const HOST = "localhost";
const PORT = 8080;
const ORIGIN = `http://${HOST}:${PORT}`;
const RAW = join(process.cwd(), "reports", ".perf");

// Guard: refuse anything that isn't loopback. A load test must never be
// pointed at a deployed environment by accident.
function assertLocal(origin) {
  const { hostname } = new URL(origin);
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (!local) {
    console.error(`✗ Refusing to load-test a non-local host: ${hostname}. LOCAL ONLY.`);
    process.exit(2);
  }
}

// Public, read-only SPA routes — the preview server returns index.html for
// each (client-side routing), so these exercise the serving layer with no
// backend mutation. Thresholds are loose enough to survive a loaded CI
// runner but tight enough to catch a real regression (p99 → seconds, or
// any error/non-2xx appearing).
const SCENARIOS = [
  { path: "/", label: "home", connections: 50, duration: 10 },
  { path: "/test", label: "quick-test", connections: 50, duration: 8 },
  { path: "/cookies", label: "cookies", connections: 30, duration: 6 },
  { path: "/privacy", label: "privacy", connections: 30, duration: 6 },
];

const THRESHOLDS = {
  p99Ms: 400, // p99 latency ceiling (local static serving is normally <50ms)
  minRps: 50, // throughput floor — generous for slow runners
};

function recordMetric(m) {
  try {
    mkdirSync(RAW, { recursive: true });
    appendFileSync(
      join(RAW, `load-${process.pid}.jsonl`),
      JSON.stringify({ ...m, runner: "load" }) + "\n",
    );
  } catch {
    // never let telemetry break the run
  }
}

async function isUp(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function waitUp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp(url)) return true;
    await sleep(500);
  }
  return false;
}

function runAutocannon(opts) {
  return new Promise((resolve, reject) => {
    autocannon(opts, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

async function main() {
  assertLocal(ORIGIN);
  rmSync(RAW, { recursive: true, force: true });

  if (!existsSync(join(process.cwd(), "dist", "client"))) {
    console.error("✗ dist/client missing — run `npm run build` first.");
    process.exit(2);
  }

  let preview = null;
  const alreadyUp = await isUp(ORIGIN);
  if (!alreadyUp) {
    console.log("▶ Booting vite preview (production build) on :8080 …");
    preview = spawn("npm", ["run", "preview"], { stdio: "ignore", detached: true });
    if (!(await waitUp(ORIGIN, 30_000))) {
      console.error("✗ preview did not come up on :8080");
      if (preview) {
        try {
          process.kill(-preview.pid);
        } catch {
          /* gone */
        }
      }
      process.exit(2);
    }
  } else {
    console.log("▶ Reusing the server already on :8080");
  }

  let breached = false;
  const summary = [];
  for (const sc of SCENARIOS) {
    const url = ORIGIN + sc.path;
    // Warmup — discarded. Primes JIT, file caches, keep-alive pools.
    await runAutocannon({ url, connections: 10, duration: 3, pipelining: 1 });
    // Measured run.
    const r = await runAutocannon({
      url,
      connections: sc.connections,
      duration: sc.duration,
      pipelining: 1,
    });

    const p99 = r.latency.p99;
    const rps = Math.round(r.requests.average);
    const errors = (r.errors ?? 0) + (r.timeouts ?? 0) + (r.non2xx ?? 0);
    const ok = p99 <= THRESHOLDS.p99Ms && rps >= THRESHOLDS.minRps && errors === 0;
    if (!ok) breached = true;

    summary.push({
      label: sc.label,
      path: sc.path,
      conns: sc.connections,
      rps,
      p50: r.latency.p50,
      p90: r.latency.p90,
      p99,
      errors,
      ok,
    });

    recordMetric({
      suite: "load",
      name: `${sc.label} (${sc.connections} conns) · p99 latency`,
      metric: "p99",
      value: p99,
      unit: "ms",
      budget: THRESHOLDS.p99Ms,
      pass: p99 <= THRESHOLDS.p99Ms,
    });
    recordMetric({
      suite: "load",
      name: `${sc.label} (${sc.connections} conns) · throughput`,
      metric: "rps",
      value: rps,
      unit: "req/s",
      budget: THRESHOLDS.minRps,
      dir: "min",
      pass: rps >= THRESHOLDS.minRps,
    });
    recordMetric({
      suite: "load",
      name: `${sc.label} (${sc.connections} conns) · errors`,
      metric: "errors",
      value: errors,
      unit: "count",
      budget: 0,
      pass: errors === 0,
    });
  }

  if (preview) {
    try {
      process.kill(-preview.pid);
    } catch {
      /* gone */
    }
  }

  // Console digest.
  console.log("\nLoad test — " + ORIGIN + " (production build, local only)\n");
  console.log("| route | conns | req/s | p50 | p90 | p99 | errors | ok |");
  console.log("|---|--:|--:|--:|--:|--:|--:|:--:|");
  for (const s of summary) {
    console.log(
      `| ${s.label} ${s.path} | ${s.conns} | ${s.rps} | ${s.p50}ms | ${s.p90}ms | ${s.p99}ms | ${s.errors} | ${s.ok ? "✅" : "❌"} |`,
    );
  }
  console.log(
    `\nThresholds: p99 ≤ ${THRESHOLDS.p99Ms}ms · RPS ≥ ${THRESHOLDS.minRps} · errors = 0`,
  );

  // Fold into the compressed report (also deletes the raw + bulky reports).
  await new Promise((resolve) => {
    const child = spawn(
      "node",
      ["scripts/perf-report.mjs", `--stamp=${new Date().toISOString()}`],
      {
        stdio: "inherit",
      },
    );
    child.on("exit", resolve);
    child.on("error", resolve);
  });

  process.exit(breached ? 1 : 0);
}

main();
