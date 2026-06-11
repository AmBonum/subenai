import type { BrowserContext, Page } from "@playwright/test";

import { primeConsent } from "../../fixtures/consent";
import { mockSupabase } from "../../mocks/supabase";
import { resetSeedCounters } from "../../seed";
import type { BlogPostRow } from "../../seed";

export async function setupPublicBlog(
  context: BrowserContext,
  page: Page,
  posts: BlogPostRow[],
): Promise<void> {
  resetSeedCounters();
  await primeConsent(context, "all");
  await mockSupabase(page, { tables: { blog_posts: posts } });
}
