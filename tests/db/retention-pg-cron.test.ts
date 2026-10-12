// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { RPCS } from "../../scripts/run-retention.mjs";

const MIGRATIONS = join(__dirname, "../../supabase/migrations");
const allMigrations = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(MIGRATIONS, f), "utf8"))
  .join("\n");
const bootstrap = readFileSync(join(__dirname, "../../DEPLOY_SETUP.sql"), "utf8");

describe("retention RPCs are scheduled in pg_cron", () => {
  it.each(RPCS.map((r) => r.name))(
    "%s has a cron.schedule in migrations and DEPLOY_SETUP.sql",
    (name: string) => {
      const call = `SELECT public.${name}();`;
      expect(allMigrations).toContain(call);
      expect(bootstrap).toContain(call);
    },
  );
});
