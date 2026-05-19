import { test, expect } from "../../fixtures/base";

// Minimal smoke test — verifies the local stack is reachable and the
// app shell renders. The agents (planner, generator, healer) will write
// the real coverage; this one keeps the pipeline alive.
test("home page renders the hero heading", async ({ page, home }) => {
  await page.goto("/");
  await expect(home.heroHeading).toBeVisible();
});
