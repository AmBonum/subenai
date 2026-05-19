import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

const SCRIPT = join(process.cwd(), "scripts", "check-bundle-no-secrets.mjs");

type ExecResult = { code: number; stdout: string; stderr: string };

async function runScript(root: string): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync("node", [SCRIPT, root]);
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

describe("check-bundle-no-secrets", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "secret-scan-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("exits 1 and reports the leaked pattern when service_role appears", async () => {
    const dir = join(tmp, "client");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "bundle.js"),
      'const k="SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiJ9.role:service_role";',
    );

    const { code, stderr } = await runScript(dir);
    expect(code).toBe(1);
    expect(stderr).toMatch(/SUPABASE_SERVICE_ROLE_KEY|service_role/);
  });

  it("exits 0 on a bundle that only contains the public anon key", async () => {
    const dir = join(tmp, "client");
    mkdirSync(dir, { recursive: true });
    // VITE_SUPABASE_ANON_KEY shape — a public JWT, intentionally allowlisted.
    writeFileSync(
      join(dir, "bundle.js"),
      'const anon="eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.signature";',
    );

    const { code } = await runScript(dir);
    expect(code).toBe(0);
  });

  it("exits 0 with a warning when the scan root does not exist", async () => {
    const missing = join(tmp, "does-not-exist");
    const { code, stderr } = await runScript(missing);
    expect(code).toBe(0);
    expect(stderr).toMatch(/SKIP|does not exist/);
  });
});
