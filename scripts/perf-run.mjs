#!/usr/bin/env node
// One-command perf+stress run with a compressed report at the end.
//
//   npm run perf
//
// Steps: (1) run the Vitest perf/stress suites (API rate-limit + payload
// stress, UI render-budget) — no server needed; (2) ensure a vite dev
// server is up on :8080 (reuse an existing one, else boot a throwaway and
// tear it down); (3) run the Playwright UI interaction-perf spec; (4)
// aggregate every metric into reports/perf-latest.{md,json}.gz and delete
// the non-compressed report artifacts.
//
// The suites are run best-effort: a failing assertion still produces the
// report (you want the numbers even on a regression), but the process exits
// non-zero so CI / the shell sees the failure.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { rmSync } from "node:fs";
import { join } from "node:path";

const VITE_URL = "http://localhost:8080";
const VITEST_FILES = [
  "tests/functions/rate-limit-stress.test.ts",
  "tests/functions/payload-limits-stress.test.ts",
  "tests/components/perf/render-budget.test.tsx",
];
const PERF_SPEC = "e2e/specs/cross-cutting/performance.spec.ts";

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: false, ...opts });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function isUp(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok || res.status === 404; // server is answering
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

async function main() {
  const stamp = new Date().toISOString();
  let failed = false;

  // Start clean — a prior `npm test` also drops raw metric files here, and
  // we don't want this run's report to merge stale samples.
  rmSync(join(process.cwd(), "reports", ".perf"), { recursive: true, force: true });

  console.log("\n▶ Vitest perf/stress suites\n");
  if ((await run("npx", ["vitest", "run", ...VITEST_FILES])) !== 0) failed = true;

  let viteProc = null;
  const alreadyUp = await isUp(VITE_URL);
  if (!alreadyUp) {
    console.log("\n▶ Booting throwaway vite on :8080 …\n");
    viteProc = spawn("npm", ["run", "dev", "--", "--port", "8080", "--strictPort"], {
      stdio: "ignore",
      detached: true,
    });
    if (!(await waitUp(VITE_URL, 60_000))) {
      console.error("✗ vite did not come up on :8080 — skipping the e2e perf spec");
    }
  } else {
    console.log("\n▶ Reusing the vite server already on :8080\n");
  }

  if (await isUp(VITE_URL)) {
    console.log("\n▶ Playwright UI interaction-perf spec\n");
    if (
      (await run("npx", [
        "playwright",
        "test",
        PERF_SPEC,
        "--project=e2e-chromium",
        "--reporter=line",
      ])) !== 0
    )
      failed = true;
  }

  if (viteProc) {
    try {
      process.kill(-viteProc.pid); // kill the detached process group
    } catch {
      // already gone
    }
  }

  console.log("\n▶ Compressed report\n");
  await run("node", ["scripts/perf-report.mjs", `--stamp=${stamp}`]);

  process.exit(failed ? 1 : 0);
}

main();
