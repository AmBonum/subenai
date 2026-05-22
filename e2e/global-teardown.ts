import { cleanupAllSeeds } from "../tests/fixtures/seed-tickets";

export default async function globalTeardown() {
  if (process.env.CI_SKIP_SEED_CLEANUP === "1") return;
  try {
    const result = await cleanupAllSeeds();
    console.log(`[E48 seed cleanup] deleted ${result.deleted} ticket(s)`);
  } catch (err) {
    console.warn("[E48 seed cleanup] failed", err);
  }
}
