import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
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

// ---------------------------------------------------------------------------
// Admin user fixtures
// ---------------------------------------------------------------------------

export interface AdminFixture {
  userId: string;
  email: string;
  displayName: string;
}

export async function seedAdminUsers(workerIndex: number): Promise<AdminFixture[]> {
  const { client, url } = getClient();
  guardProduction(url);

  const fixtures: AdminFixture[] = [];

  for (let i = 1; i <= 5; i++) {
    const email = `seed-admin-${i}-W${workerIndex}@e2e.test`;
    const displayName =
      i === 1 ? `<script>window.__pwn=1</script>` : `Seed Admin ${i} W${workerIndex}`;

    const { data: authData, error: authError } = await client.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (authError) {
      throw new Error(`E48 seed: createUser failed for ${email} — ${authError.message}`);
    }

    const userId = authData.user.id;

    const { error: roleError } = await client
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) {
      throw new Error(`E48 seed: insert user_roles failed for ${email} — ${roleError.message}`);
    }

    fixtures.push({ userId, email, displayName });
  }

  return fixtures;
}

export async function cleanupSeedAdminUsers(workerIndex: number): Promise<{ deleted: number }> {
  const { client, url } = getClient();
  guardProduction(url);

  const { data, error } = await client.auth.admin.listUsers();
  if (error) {
    throw new Error(`E48 seed: listUsers failed — ${error.message}`);
  }

  const pattern = `seed-admin-`;
  const suffix = `-W${workerIndex}@e2e.test`;
  const targets = (data?.users ?? []).filter(
    (u) => u.email?.startsWith(pattern) && u.email?.endsWith(suffix),
  );

  let deleted = 0;
  for (const user of targets) {
    const { error: delError } = await client.auth.admin.deleteUser(user.id);
    if (delError) {
      throw new Error(`E48 seed: deleteUser failed for ${user.id} — ${delError.message}`);
    }
    deleted++;
  }

  return { deleted };
}

export async function cleanupAllSeedAdminUsers(): Promise<{ deleted: number }> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !key) {
    console.log("[E48 seed cleanup] Skipping admin cleanup — env vars not set");
    return { deleted: 0 };
  }

  const { client } = getClient();
  guardProduction(url);

  const { data, error } = await client.auth.admin.listUsers();
  if (error) {
    throw new Error(`E48 seed: listUsers failed — ${error.message}`);
  }

  const targets = (data?.users ?? []).filter(
    (u) => /@e2e\.test$/.test(u.email ?? "") && u.email?.startsWith("seed-admin-"),
  );

  let deleted = 0;
  for (const user of targets) {
    const { error: delError } = await client.auth.admin.deleteUser(user.id);
    if (delError) {
      throw new Error(`E48 seed: deleteUser failed for ${user.id} — ${delError.message}`);
    }
    deleted++;
  }

  return { deleted };
}

// ---------------------------------------------------------------------------
// Ticket assignment fixtures
// ---------------------------------------------------------------------------

export async function seedTicketAssignments(
  workerIndex: number,
  ticketIds: string[],
  adminIds: string[],
): Promise<void> {
  const { client, url } = getClient();
  guardProduction(url);

  const rows: { ticket_id: string; assignee_id: string }[] = [];

  for (let idx = 0; idx < ticketIds.length; idx++) {
    const ticketId = ticketIds[idx];
    let assigneeCount: number;

    if (idx === 0) assigneeCount = 0;
    else if (idx === 1) assigneeCount = 1;
    else if (idx === 2) assigneeCount = 2;
    else if (idx === 3) assigneeCount = 3;
    else if (idx === 4) assigneeCount = 5;
    else assigneeCount = (workerIndex + idx) % 4; // 0-3

    for (let a = 0; a < Math.min(assigneeCount, adminIds.length); a++) {
      rows.push({ ticket_id: ticketId, assignee_id: adminIds[a] });
    }
  }

  if (rows.length === 0) return;

  const { error } = await client.from("support_ticket_assignees").insert(rows);
  if (error) {
    throw new Error(`E48 seed: insert support_ticket_assignees failed — ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Attachment fixtures
// ---------------------------------------------------------------------------

export interface AttachmentFixture {
  attachmentId: string;
  ticketId: string;
  path: string;
  mimeType: string;
  filename: string;
}

const ATTACHMENT_FILES = [
  { filename: "small-image.png", mimeType: "image/png" },
  { filename: "medium-image.jpg", mimeType: "image/jpeg" },
  { filename: "document.pdf", mimeType: "application/pdf" },
  { filename: "text-document.pdf", mimeType: "application/pdf" },
] as const;

function resolveAttachmentPath(filename: string): string {
  try {
    return fileURLToPath(new URL(`./attachments/${filename}`, import.meta.url));
  } catch {
    return path.join(path.dirname(new URL(import.meta.url).pathname), "attachments", filename);
  }
}

export async function seedAttachmentFiles(
  workerIndex: number,
  ticketIds: string[],
): Promise<AttachmentFixture[]> {
  const { client, url } = getClient();
  guardProduction(url);

  const fixtures: AttachmentFixture[] = [];

  for (const ticketId of ticketIds) {
    for (const { filename, mimeType } of ATTACHMENT_FILES) {
      const storagePath = `e2e/W${workerIndex}/${ticketId}/${filename}`;
      const localPath = resolveAttachmentPath(filename);
      const fileBuffer = readFileSync(localPath);

      const { error: uploadError } = await client.storage
        .from("support-attachments")
        .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });

      if (uploadError) {
        throw new Error(
          `E48 seed: storage upload failed for ${storagePath} — ${uploadError.message}`,
        );
      }

      const { data: insertData, error: insertError } = await client
        .from("support_ticket_attachments")
        .insert({
          ticket_id: ticketId,
          storage_path: storagePath,
          mime_type: mimeType,
          filename,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(
          `E48 seed: insert support_ticket_attachments failed for ${storagePath} — ${insertError.message}`,
        );
      }

      fixtures.push({
        attachmentId: (insertData as { id: string }).id,
        ticketId,
        path: storagePath,
        mimeType,
        filename,
      });
    }
  }

  return fixtures;
}

export async function cleanupSeedAttachmentFiles(
  workerIndex: number,
): Promise<{ deleted: number }> {
  const { client, url } = getClient();
  guardProduction(url);

  const prefix = `e2e/W${workerIndex}/`;

  const { data: objects, error: listError } = await client.storage
    .from("support-attachments")
    .list(`e2e/W${workerIndex}`, { limit: 1000 });

  if (listError) {
    throw new Error(`E48 seed: storage list failed — ${listError.message}`);
  }

  if (objects && objects.length > 0) {
    const paths = objects.map((o) => `e2e/W${workerIndex}/${o.name}`);
    const { error: removeError } = await client.storage.from("support-attachments").remove(paths);

    if (removeError) {
      throw new Error(`E48 seed: storage remove failed — ${removeError.message}`);
    }
  }

  const { data: dbRows, error: dbError } = await client
    .from("support_ticket_attachments")
    .delete()
    .like("storage_path", `${prefix}%`)
    .select("id");

  if (dbError) {
    throw new Error(`E48 seed: delete support_ticket_attachments failed — ${dbError.message}`);
  }

  return { deleted: (dbRows ?? []).length };
}

// ---------------------------------------------------------------------------
// Wave 4 seed helpers
// ---------------------------------------------------------------------------

export interface MessageSeedRow {
  id: string;
  ticket_id: string;
  author_kind: "admin" | "submitter";
  body: string;
  created_at: string;
  is_internal: boolean;
}

export interface AttachmentMeta {
  filename: string;
  mimeType: string;
  scanStatus: "pending" | "clean" | "infected" | "error";
}

/**
 * Seed one parent ticket plus `messageCount` message rows for it.
 * Returns the ticket id and message ids for cleanup tracking.
 */
export async function seedTicketWithMessages(
  workerIndex: number,
  messageCount: number,
): Promise<{ ticketId: string; messageIds: string[] }> {
  const { client, url } = getClient();
  guardProduction(url);

  const pfx = `${SEED_PREFIX}${workerIndex}]`;
  const ticketRow: SeedRow = {
    subject: `${pfx} with-messages seed`,
    status: "in_progress",
    category: "question",
    requester_name: `Seed W${workerIndex} messages`,
    requester_email: `seed-msg-w${workerIndex}@example.test`,
    body: `Parent ticket seeded by seedTicketWithMessages for worker ${workerIndex}.`,
    created_at: daysAgo(1),
  };

  const { data: ticketData, error: ticketError } = await client
    .from("support_tickets")
    .insert(ticketRow)
    .select("id")
    .single();

  if (ticketError || !ticketData) {
    throw new Error(`E48 seed: seedTicketWithMessages insert failed — ${ticketError?.message}`);
  }

  const ticketId = (ticketData as { id: string }).id;
  const messageRows = Array.from({ length: messageCount }, (_, i) => ({
    ticket_id: ticketId,
    author_kind: i % 2 === 0 ? "admin" : "submitter",
    body: `Seeded message ${i + 1} for worker ${workerIndex} ticket ${ticketId}.`,
    created_at: daysAgo(1),
    is_internal: false,
  }));

  const { data: msgData, error: msgError } = await client
    .from("support_ticket_messages")
    .insert(messageRows)
    .select("id");

  if (msgError) {
    throw new Error(
      `E48 seed: seedTicketWithMessages messages insert failed — ${msgError.message}`,
    );
  }

  const messageIds = (msgData ?? []).map((r: { id: string }) => r.id);
  return { ticketId, messageIds };
}

/**
 * Seed one parent ticket plus attachment rows with the given metadata.
 * Does NOT upload real Storage objects — only inserts DB rows. For specs
 * that need real Storage objects, use `seedAttachmentFiles` instead.
 * Returns the ticket id and attachment ids.
 */
export async function seedTicketWithAttachments(
  workerIndex: number,
  attachmentMeta: AttachmentMeta[],
): Promise<{ ticketId: string; attachmentIds: string[] }> {
  const { client, url } = getClient();
  guardProduction(url);

  const pfx = `${SEED_PREFIX}${workerIndex}]`;
  const ticketRow: SeedRow = {
    subject: `${pfx} with-attachments seed`,
    status: "new",
    category: "question",
    requester_name: `Seed W${workerIndex} attachments`,
    requester_email: `seed-att-w${workerIndex}@example.test`,
    body: `Parent ticket seeded by seedTicketWithAttachments for worker ${workerIndex}.`,
    created_at: daysAgo(1),
  };

  const { data: ticketData, error: ticketError } = await client
    .from("support_tickets")
    .insert(ticketRow)
    .select("id")
    .single();

  if (ticketError || !ticketData) {
    throw new Error(
      `E48 seed: seedTicketWithAttachments ticket insert failed — ${ticketError?.message}`,
    );
  }

  const ticketId = (ticketData as { id: string }).id;
  const attachmentRows = attachmentMeta.map((meta) => ({
    ticket_id: ticketId,
    filename: meta.filename,
    mime_type: meta.mimeType,
    scan_status: meta.scanStatus,
    storage_path: `e2e/W${workerIndex}/${ticketId}/${meta.filename}`,
    created_at: daysAgo(1),
  }));

  const { data: attData, error: attError } = await client
    .from("support_ticket_attachments")
    .insert(attachmentRows)
    .select("id");

  if (attError) {
    throw new Error(
      `E48 seed: seedTicketWithAttachments attachments insert failed — ${attError.message}`,
    );
  }

  const attachmentIds = (attData ?? []).map((r: { id: string }) => r.id);
  return { ticketId, attachmentIds };
}

/**
 * Bulk-seed `count` tickets all sharing the same `status` for pagination
 * and performance tests.
 * Returns the seeded ticket ids.
 */
export async function seedTicketsForQueue(
  workerIndex: number,
  count: number,
  status: TicketStatus,
): Promise<string[]> {
  const { client, url } = getClient();
  guardProduction(url);

  const pfx = `${SEED_PREFIX}${workerIndex}]`;
  const categories: TicketCategory[] = [
    "bug",
    "question",
    "feature_request",
    "billing",
    "gdpr",
    "other",
  ];

  const rows: SeedRow[] = Array.from({ length: count }, (_, i) => ({
    subject: `${pfx} queue-perf ${i + 1} — ${status}`,
    status,
    category: categories[i % categories.length],
    requester_name: `Queue Perf User ${i}`,
    requester_email: `seed-queue-w${workerIndex}-${i}@example.test`,
    body: `Bulk-seeded queue performance ticket #${i + 1} for worker ${workerIndex}.`,
    created_at: daysAgo((i % 90) + 1),
  }));

  const { data, error } = await client.from("support_tickets").insert(rows).select("id");

  if (error) {
    throw new Error(`E48 seed: seedTicketsForQueue insert failed — ${error.message}`);
  }

  return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Delete audit_log rows associated with seeded ticket ids for the given
 * worker index. Reads back the seeded ticket ids first to build the filter.
 */
export async function cleanupAuditRows(workerIndex: number): Promise<{ deleted: number }> {
  const { client, url } = getClient();
  guardProduction(url);

  const prefix = `${SEED_PREFIX}${workerIndex}]%`;
  const { data: tickets, error: readError } = await client
    .from("support_tickets")
    .select("id")
    .like("subject", prefix);

  if (readError) {
    throw new Error(`E48 seed: cleanupAuditRows read tickets failed — ${readError.message}`);
  }

  const ticketIds = (tickets ?? []).map((t: { id: string }) => t.id);
  if (ticketIds.length === 0) return { deleted: 0 };

  // Build a filter: metadata->>'ticket_id' IN (id1, id2, ...)
  // Supabase PostgREST does not natively support jsonb -> in; use a raw delete
  // via service-role client with a JS-side filter over a full scan (acceptable
  // for the small seed volumes in tests).
  const { data: allAudit, error: auditReadError } = await client
    .from("audit_log")
    .select("id, metadata");

  if (auditReadError) {
    // audit_log table may not exist in all environments — fail silently.
    console.warn(`E48 seed: cleanupAuditRows audit_log read failed — ${auditReadError.message}`);
    return { deleted: 0 };
  }

  const ticketIdSet = new Set(ticketIds);
  const toDelete = (allAudit ?? []).filter((row: { id: string; metadata: unknown }) => {
    const meta = row.metadata as Record<string, unknown> | null;
    return meta && ticketIdSet.has(meta["ticket_id"] as string);
  });

  let deleted = 0;
  for (const row of toDelete) {
    const { error: delError } = await client.from("audit_log").delete().eq("id", row.id);
    if (!delError) deleted++;
  }

  return { deleted };
}

/**
 * Delete Storage objects (not DB rows) for the given ticket ids.
 * The DB rows cascade-delete with the parent support_ticket; this helper
 * cleans up the Storage bucket objects which do NOT cascade.
 */
export async function cleanupAttachmentObjects(ticketIds: string[]): Promise<{ deleted: number }> {
  const { client, url } = getClient();
  guardProduction(url);

  let deleted = 0;

  for (const ticketId of ticketIds) {
    const prefix = `${ticketId}/`;

    const { data: objects, error: listError } = await client.storage
      .from("support-attachments")
      .list(ticketId, { limit: 1000 });

    if (listError) {
      console.warn(
        `E48 seed: cleanupAttachmentObjects list failed for ${ticketId} — ${listError.message}`,
      );
      continue;
    }

    if (!objects || objects.length === 0) continue;

    const paths = objects.map((o) => `${prefix}${o.name}`);
    const { error: removeError } = await client.storage.from("support-attachments").remove(paths);

    if (removeError) {
      console.warn(
        `E48 seed: cleanupAttachmentObjects remove failed for ${ticketId} — ${removeError.message}`,
      );
    } else {
      deleted += paths.length;
    }
  }

  return { deleted };
}

export async function cleanupAllSeedAttachmentFiles(): Promise<{ deleted: number }> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !key) {
    console.log("[E48 seed cleanup] Skipping attachment cleanup — env vars not set");
    return { deleted: 0 };
  }

  const { client } = getClient();
  guardProduction(url);

  const { data: dbRows, error: dbError } = await client
    .from("support_ticket_attachments")
    .delete()
    .like("storage_path", "e2e/%")
    .select("id");

  if (dbError) {
    throw new Error(`E48 seed: cleanupAll attachments failed — ${dbError.message}`);
  }

  return { deleted: (dbRows ?? []).length };
}
