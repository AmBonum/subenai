/**
 * E49 Phase 1c-2 — global setup for the `e2e-live-supabase` playwright
 * project.
 *
 * Boots a local Supabase stack (if missing), seeds the deterministic
 * E49 user + data fixtures, rebuilds the bundle when the baked-in URL
 * differs from local, and starts a vite preview + wrangler pages dev
 * pair so:
 *   - port 8080 → vite preview (UI specs)
 *   - port 8788 → wrangler pages dev (CF Function specs)
 *
 * Idempotent at every stage. Exits early with a clear message if the
 * `supabase` CLI is missing; the project then skips specs that need a
 * live backend (the test suites use `test.skip(!SUPABASE_URL,...)` to
 * stay green in environments without Docker).
 *
 * Environment knobs:
 *   E49_SKIP_SUPABASE_START=1   assume the stack is already running
 *   E49_SKIP_BUILD=1            never rebuild even if URLs differ
 *   E49_PREVIEW_PORT=NNNN       override 8080
 *   E49_WRANGLER_PORT=NNNN      override 8788
 *   E49_EXPORTS_PER_AUTHOR_PER_DAY / _IP_PER_HOUR — forwarded into the
 *                               wrangler child so the CSV rate-limit
 *                               TCs can hit the cap in a handful of
 *                               requests instead of 50+.
 */

import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { FullConfig } from "@playwright/test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const LIVE_STATE_DIR = path.join(REPO_ROOT, ".e2e-live-supabase");
const LIVE_STATE_FILE = path.join(LIVE_STATE_DIR, "state.json");

const DEFAULT_LOCAL_URL = "http://127.0.0.1:54321";
const DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const PREVIEW_PORT = Number.parseInt(process.env.E49_PREVIEW_PORT ?? "8080", 10);
const WRANGLER_PORT = Number.parseInt(process.env.E49_WRANGLER_PORT ?? "8788", 10);

const TEST_RATE_LIMIT_AUTHOR = process.env.E49_EXPORTS_PER_AUTHOR_PER_DAY ?? "3";
const TEST_RATE_LIMIT_IP = process.env.E49_EXPORTS_PER_IP_PER_HOUR ?? "3";

interface LiveState {
  previewPid?: number;
  wranglerPid?: number;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  projectRef: string;
  cfApiBaseUrl: string;
  previewBaseUrl: string;
  rateLimitAuthor: string;
  rateLimitIp: string;
}

function hasBin(bin: string): boolean {
  try {
    execFileSync("which", [bin], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function shellOut(cmd: string, args: readonly string[], opts: { cwd?: string } = {}): string {
  return execFileSync(cmd, [...args], {
    cwd: opts.cwd ?? REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

interface SupabaseStatus {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  projectRef: string;
}

function parseSupabaseStatus(raw: string): SupabaseStatus | null {
  const lines = raw.split(/\r?\n/);
  let apiUrl = "";
  let anonKey = "";
  let serviceRoleKey = "";
  for (const line of lines) {
    const apiMatch = line.match(/API URL:\s*(\S+)/i);
    if (apiMatch) apiUrl = apiMatch[1];
    const anonMatch = line.match(/^\s*anon key:\s*(\S+)/i);
    if (anonMatch) anonKey = anonMatch[1];
    const srMatch = line.match(/^\s*service_role key:\s*(\S+)/i);
    if (srMatch) serviceRoleKey = srMatch[1];
  }
  if (!apiUrl || !anonKey || !serviceRoleKey) return null;
  let projectRef = "local";
  try {
    projectRef = new URL(apiUrl).hostname.replace(/\./g, "-");
  } catch {
    /* keep "local" */
  }
  return { apiUrl, anonKey, serviceRoleKey, projectRef };
}

function trySupabaseStatus(): SupabaseStatus | null {
  try {
    const out = shellOut("supabase", ["status"]);
    return parseSupabaseStatus(out);
  } catch {
    return null;
  }
}

function ensureSupabaseRunning(): SupabaseStatus | null {
  if (!hasBin("supabase")) {
    console.warn(
      "[E49 live-supabase setup] `supabase` CLI not found in PATH. Skipping local stack boot — " +
        "specs that need it will skip themselves via `test.skip(!SUPABASE_URL, ...)`.",
    );
    return null;
  }
  let status = trySupabaseStatus();
  if (status) return status;
  if (process.env.E49_SKIP_SUPABASE_START === "1") {
    console.warn(
      "[E49 live-supabase setup] E49_SKIP_SUPABASE_START=1 but no running stack detected.",
    );
    return null;
  }
  console.log("[E49 live-supabase setup] booting `supabase start` (cold start may take 30-60s)...");
  try {
    execFileSync("supabase", ["start"], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      timeout: 180_000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[E49 live-supabase setup] supabase start failed: ${msg}`);
    return null;
  }
  status = trySupabaseStatus();
  return status;
}

function applySeed(status: SupabaseStatus): void {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SUPABASE_URL: status.apiUrl,
    SUPABASE_SERVICE_ROLE_KEY: status.serviceRoleKey,
    DATABASE_URL: process.env.DATABASE_URL ?? DEFAULT_LOCAL_DB_URL,
    PGPASSWORD: process.env.PGPASSWORD ?? "postgres",
  };
  console.log("[E49 live-supabase setup] applying user seed (seed-e49-e2e-users.sql)...");
  try {
    execFileSync(
      "psql",
      [
        env.DATABASE_URL!,
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-f",
        path.join(REPO_ROOT, "supabase/scripts/seed-e49-e2e-users.sql"),
      ],
      {
        env,
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[E49 live-supabase setup] user seed failed: ${msg} (continuing — may already exist)`,
    );
  }
  console.log("[E49 live-supabase setup] applying data seed via runner...");
  execFileSync("npx", ["tsx", "e2e/scripts/seed-e49-data.ts", "--apply"], {
    cwd: REPO_ROOT,
    env,
    stdio: "inherit",
  });
}

function bundleNeedsRebuild(status: SupabaseStatus): boolean {
  if (process.env.E49_SKIP_BUILD === "1") return false;
  const distClient = path.join(REPO_ROOT, "dist/client");
  if (!existsSync(distClient)) return true;
  try {
    const grep = execFileSync("grep", ["-r", "-l", status.apiUrl, distClient], {
      encoding: "utf8",
    });
    return grep.trim().length === 0;
  } catch {
    return true;
  }
}

function writeEnvLocal(status: SupabaseStatus): void {
  const envPath = path.join(REPO_ROOT, ".env.local");
  const projectId = (() => {
    try {
      return new URL(status.apiUrl).hostname.replace(/\./g, "-");
    } catch {
      return "local";
    }
  })();
  const body =
    `VITE_SUPABASE_URL=${status.apiUrl}\n` +
    `VITE_SUPABASE_PUBLISHABLE_KEY=${status.anonKey}\n` +
    `VITE_SUPABASE_PROJECT_ID=${projectId}\n`;
  writeFileSync(envPath, body, "utf8");
}

function buildBundle(): void {
  console.log("[E49 live-supabase setup] rebuilding bundle against local Supabase...");
  execFileSync("npm", ["run", "build"], { cwd: REPO_ROOT, stdio: "inherit" });
}

async function waitForHttp200(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: string | null = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status >= 200 && res.status < 500) return;
      lastErr = `status ${res.status}`;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url} (last: ${lastErr})`);
}

function startChild(
  cmd: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  logTag: string,
): ChildProcess {
  const child = spawn(cmd, [...args], {
    cwd: REPO_ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });
  child.stdout?.on("data", (b: Buffer) => process.stdout.write(`[${logTag}] ${b.toString()}`));
  child.stderr?.on("data", (b: Buffer) => process.stderr.write(`[${logTag}] ${b.toString()}`));
  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.warn(`[${logTag}] exited with code ${code}`);
    }
  });
  return child;
}

function persistState(state: LiveState): void {
  if (!existsSync(LIVE_STATE_DIR)) mkdirSync(LIVE_STATE_DIR, { recursive: true });
  writeFileSync(LIVE_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const status = ensureSupabaseRunning();
  if (!status) {
    console.warn(
      "[E49 live-supabase setup] no live Supabase available; specs in this project will skip.",
    );
    persistState({
      supabaseUrl: "",
      anonKey: "",
      serviceRoleKey: "",
      projectRef: "local",
      cfApiBaseUrl: `http://localhost:${WRANGLER_PORT}`,
      previewBaseUrl: `http://localhost:${PREVIEW_PORT}`,
      rateLimitAuthor: TEST_RATE_LIMIT_AUTHOR,
      rateLimitIp: TEST_RATE_LIMIT_IP,
    });
    return;
  }

  process.env.SUPABASE_URL = status.apiUrl;
  process.env.VITE_SUPABASE_URL = status.apiUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = status.serviceRoleKey;
  process.env.SUPABASE_SERVICE_ROLE_TEST_KEY = status.serviceRoleKey;
  process.env.SUPABASE_ANON_KEY = status.anonKey;
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = status.anonKey;

  writeEnvLocal(status);
  applySeed(status);

  if (bundleNeedsRebuild(status)) {
    buildBundle();
  } else {
    console.log(
      "[E49 live-supabase setup] bundle already baked against local Supabase — skip build",
    );
  }

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    SUPABASE_URL: status.apiUrl,
    SUPABASE_SERVICE_ROLE_KEY: status.serviceRoleKey,
    SUPABASE_ANON_KEY: status.anonKey,
    VITE_SUPABASE_URL: status.apiUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: status.anonKey,
    E49_EXPORTS_PER_AUTHOR_PER_DAY: TEST_RATE_LIMIT_AUTHOR,
    E49_EXPORTS_PER_IP_PER_HOUR: TEST_RATE_LIMIT_IP,
  };

  const preview = startChild(
    "npm",
    ["run", "preview", "--", "--port", String(PREVIEW_PORT)],
    childEnv,
    "preview",
  );
  const wrangler = startChild(
    "npx",
    [
      "wrangler",
      "pages",
      "dev",
      "dist/client",
      "--compatibility-date=2024-09-01",
      `--port=${WRANGLER_PORT}`,
      "--ip=127.0.0.1",
      `--binding=SUPABASE_URL=${status.apiUrl}`,
      `--binding=SUPABASE_SERVICE_ROLE_KEY=${status.serviceRoleKey}`,
      `--binding=SUPABASE_ANON_KEY=${status.anonKey}`,
      `--binding=E49_EXPORTS_PER_AUTHOR_PER_DAY=${TEST_RATE_LIMIT_AUTHOR}`,
      `--binding=E49_EXPORTS_PER_IP_PER_HOUR=${TEST_RATE_LIMIT_IP}`,
    ],
    childEnv,
    "wrangler",
  );

  await waitForHttp200(`http://localhost:${PREVIEW_PORT}`, 60_000);
  await waitForHttp200(`http://localhost:${WRANGLER_PORT}`, 60_000);

  persistState({
    previewPid: preview.pid,
    wranglerPid: wrangler.pid,
    supabaseUrl: status.apiUrl,
    anonKey: status.anonKey,
    serviceRoleKey: status.serviceRoleKey,
    projectRef: status.projectRef,
    cfApiBaseUrl: `http://localhost:${WRANGLER_PORT}`,
    previewBaseUrl: `http://localhost:${PREVIEW_PORT}`,
    rateLimitAuthor: TEST_RATE_LIMIT_AUTHOR,
    rateLimitIp: TEST_RATE_LIMIT_IP,
  });

  console.log(
    `[E49 live-supabase setup] ready — preview=${PREVIEW_PORT} wrangler=${WRANGLER_PORT} supabase=${status.apiUrl}`,
  );
}

export function readLiveState(): LiveState | null {
  if (!existsSync(LIVE_STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(LIVE_STATE_FILE, "utf8")) as LiveState;
  } catch {
    return null;
  }
}
