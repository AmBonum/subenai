/**
 * E40.3 — Client-side DPA PDF renderer.
 *
 * Lazy-imports @react-pdf/renderer + the DpaTemplate component so the
 * ~250 KB gz chunk only lands when a school actually submits the form.
 * Matches the pattern used by the E38 results-PDF export.
 *
 * The optional `draftWatermarkOverride` lets E40.6 turn the
 * "DRAFT — NEZAVÄZUJÚCA UKÁŽKA" diagonal stamp off after legal sign-off
 * without bumping the template version. Default is the current build's
 * VITE_DPA_TEMPLATE_DRAFT_WATERMARK env var (true unless explicitly
 * set to "false").
 */

import type { DpaTemplateProps } from "./dpa-template";
import { IS_DPA_DRAFT_WATERMARK_ENABLED } from "./feature-flag";

const DRAFT_WATERMARK_DEFAULT = IS_DPA_DRAFT_WATERMARK_ENABLED;

export interface RenderDpaArgs {
  schoolName: string;
  contactName: string;
  contactEmail: string;
  requestId: string;
  version: string;
  generatedAt?: Date;
  draftWatermarkOverride?: boolean;
}

export async function renderDpaPdfBlob(args: RenderDpaArgs): Promise<Blob> {
  const [{ pdf }, { DpaTemplate }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./dpa-template"),
  ]);

  const props: DpaTemplateProps = {
    schoolName: args.schoolName,
    contactName: args.contactName,
    contactEmail: args.contactEmail,
    requestId: args.requestId,
    generatedAt: args.generatedAt ?? new Date(),
    version: args.version,
    isDraft: args.draftWatermarkOverride ?? DRAFT_WATERMARK_DEFAULT,
  };

  return pdf(DpaTemplate(props)).toBlob();
}
