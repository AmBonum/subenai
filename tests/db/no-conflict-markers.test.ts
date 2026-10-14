import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SQL_FILES = [
  "DEPLOY_SETUP.sql",
  ...readdirSync(join(ROOT, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => `supabase/migrations/${f}`),
];

// A leftover "=======" from a resolved merge is valid text to git but a syntax
// error to Postgres, and DEPLOY_SETUP.sql is pasted whole into the SQL editor.
describe("SQL files carry no merge-conflict markers", () => {
  it.each(SQL_FILES)("%s", (file) => {
    const markers = readFileSync(join(ROOT, file), "utf8")
      .split("\n")
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => /^(<{7}( |$)|={7}$|>{7}( |$))/.test(line));
    expect(markers).toEqual([]);
  });
});
