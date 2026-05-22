import {
  cleanupAllSeeds,
  cleanupAllSeedAdminUsers,
  cleanupAllSeedAttachmentFiles,
} from "../tests/fixtures/seed-tickets";

export default async function globalTeardown() {
  if (process.env.CI_SKIP_SEED_CLEANUP === "1") return;
  try {
    const result = await cleanupAllSeeds();
    console.log(`[E48 seed cleanup] deleted ${result.deleted} ticket(s)`);
  } catch (err) {
    console.warn("[E48 seed cleanup] failed", err);
  }
  await cleanupAllSeedAdminUsers().catch((err) => {
    console.warn("[E48 seed cleanup] admin users failed", err);
  });
  await cleanupAllSeedAttachmentFiles().catch((err) => {
    console.warn("[E48 seed cleanup] attachment files failed", err);
  });
}
