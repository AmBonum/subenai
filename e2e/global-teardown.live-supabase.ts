/**
 * E49 Phase 1c-2 — global teardown for the `e2e-live-supabase` project.
 *
 * Stops the preview + wrangler children, runs seed cleanup + optional
 * verify. Honors:
 *   CI_SKIP_SEED_CLEANUP=1     skip data delete (keep state for post-mortem)
 *   E49_TEARDOWN_VERIFY=1      after cleanup, count rows; non-zero → exit 1
 *   E49_KEEP_LIVE_STACK=1      leave preview + wrangler running (useful for
 *                              local dev when iterating on specs)
 */

import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const LIVE_STATE_FILE = path.join(REPO_ROOT, ".e2e-live-supabase", "state.json");

interface LiveState {
  previewPid?: number;
  wranglerPid?: number;
  supabaseUrl: string;
  serviceRoleKey: string;
}

function readState(): LiveState | null {
  if (!existsSync(LIVE_STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(LIVE_STATE_FILE, "utf8")) as LiveState;
  } catch {
    return null;
  }
}

function killSafe(pid: number | undefined, tag: string): void {
  if (!pid) return;
  try {
    process.kill(pid, "SIGTERM");
    console.log(`[E49 live-supabase teardown] sent SIGTERM to ${tag} (pid ${pid})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[E49 live-supabase teardown] kill ${tag} (${pid}) failed: ${msg}`);
  }
}

export default async function globalTeardown(): Promise<void> {
  const state = readState();

  if (state && process.env.E49_KEEP_LIVE_STACK !== "1") {
    killSafe(state.previewPid, "preview");
    killSafe(state.wranglerPid, "wrangler");
  }

  if (process.env.CI_SKIP_SEED_CLEANUP === "1") {
    console.log("[E49 live-supabase teardown] CI_SKIP_SEED_CLEANUP=1 — leaving fixtures in place");
    return;
  }

  if (!state || !state.supabaseUrl || !state.serviceRoleKey) {
    console.log(
      "[E49 live-supabase teardown] no live state recorded — skipping seed cleanup (specs likely skipped)",
    );
    return;
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SUPABASE_URL: state.supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: state.serviceRoleKey,
  };

  try {
    execFileSync("npx", ["tsx", "e2e/scripts/seed-e49-data.ts", "--cleanup"], {
      cwd: REPO_ROOT,
      env,
      stdio: "inherit",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[E49 live-supabase teardown] cleanup failed: ${msg}`);
  }

  if (process.env.E49_TEARDOWN_VERIFY === "1") {
    try {
      execFileSync("npx", ["tsx", "e2e/scripts/seed-e49-data.ts", "--verify"], {
        cwd: REPO_ROOT,
        env,
        stdio: "inherit",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[E49 live-supabase teardown] VERIFY FAILED: ${msg}`);
      process.exit(1);
    }
  }

  if (state && process.env.E49_KEEP_LIVE_STACK !== "1" && existsSync(LIVE_STATE_FILE)) {
    try {
      unlinkSync(LIVE_STATE_FILE);
    } catch {
      /* non-fatal */
    }
  }
}
