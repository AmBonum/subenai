import { createClient } from "@supabase/supabase-js";

const SEED_PREFIX = "[E2E-SEED-W";

function getClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url) {
    throw new Error("E48 seed: SUPABASE_URL (or VITE_SUPABASE_URL) is not set.");
  }
  if (!key) {
    throw new Error(
      "E48 seed: SUPABASE_SERVICE_ROLE_KEY is not set. The seed helper requires service-role access.",
    );
  }

  return { client: createClient(url, key), url };
}

function guardProduction(url: string): void {
  const isProdLike = url.includes("supabase.co") && !process.env.E2E_ALLOW_NONLOCAL_SEED;
  if (isProdLike) {
    throw new Error(
      `E48 seed: refused — looks like production (${url}). Set E2E_ALLOW_NONLOCAL_SEED=1 to override.`,
    );
  }
}

type TicketStatus = "new" | "in_progress" | "waiting_user" | "resolved" | "reopened" | "archived";

type TicketCategory = "bug" | "question" | "feature_request" | "billing" | "gdpr" | "other";

interface SeedRow {
  subject: string;
  status: TicketStatus;
  category: TicketCategory;
  requester_name: string | null;
  requester_email: string;
  body: string;
  created_at: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function buildRows(workerIndex: number): SeedRow[] {
  const pfx = `${SEED_PREFIX}${workerIndex}]`;

  const statuses: { status: TicketStatus; count: number }[] = [
    { status: "new", count: 5 },
    { status: "in_progress", count: 5 },
    { status: "waiting_user", count: 3 },
    { status: "resolved", count: 4 },
    { status: "reopened", count: 2 },
    { status: "archived", count: 1 },
  ];

  const categories: TicketCategory[] = [
    "bug",
    "question",
    "feature_request",
    "billing",
    "gdpr",
    "other",
  ];

  const rows: SeedRow[] = [];
  let seq = 0;

  for (const { status, count } of statuses) {
    for (let i = 0; i < count; i++) {
      const category = categories[seq % categories.length];
      const hasName = seq % 3 !== 0;
      rows.push({
        subject: `${pfx} ${status} ${i + 1} — ${category}`,
        status,
        category,
        requester_name: hasName ? `Test User ${seq}` : null,
        requester_email: `seed-w${workerIndex}-${seq}@example.test`,
        body: `Automated seed ticket #${seq} for worker ${workerIndex}. Status: ${status}.`,
        created_at: daysAgo((seq % 90) + 1),
      });
      seq++;
    }
  }

  return rows;
}

export async function seedTickets(workerIndex: number): Promise<string[]> {
  const { client, url } = getClient();
  guardProduction(url);

  const rows = buildRows(workerIndex);

  const { data, error } = await client.from("support_tickets").insert(rows).select("id");

  if (error) {
    throw new Error(`E48 seed: insert failed — ${error.message}`);
  }

  return (data ?? []).map((r: { id: string }) => r.id);
}

export async function cleanupSeeds(workerIndex: number): Promise<{ deleted: number }> {
  const { client, url } = getClient();
  guardProduction(url);

  const prefix = `${SEED_PREFIX}${workerIndex}]%`;
  const { data, error } = await client
    .from("support_tickets")
    .delete()
    .like("subject", prefix)
    .select("id");

  if (error) {
    throw new Error(`E48 seed: cleanup failed — ${error.message}`);
  }

  return { deleted: (data ?? []).length };
}

export async function cleanupAllSeeds(): Promise<{ deleted: number }> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !key) {
    console.log("[E48 seed cleanup] Skipping — env vars not set (expected in CI without Supabase)");
    return { deleted: 0 };
  }

  const { client } = getClient();
  guardProduction(url);

  const prefix = `${SEED_PREFIX}%]%`;
  const { data, error } = await client
    .from("support_tickets")
    .delete()
    .like("subject", prefix)
    .select("id");

  if (error) {
    throw new Error(`E48 seed: cleanupAll failed — ${error.message}`);
  }

  return { deleted: (data ?? []).length };
}
