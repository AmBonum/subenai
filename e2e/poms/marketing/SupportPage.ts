import { PodporaPage } from "../sponsorship/PodporaPage";

/**
 * Marketing-area alias for the /support donation page POM.
 *
 * All locators and helpers live on `PodporaPage` (which the sponsorship
 * spec-suite also uses). This class extends it so the marketing spec can
 * import from the canonical `e2e/poms/marketing/` tree while sharing the
 * single source of truth for every data-testid getter.
 */
export class SupportPage extends PodporaPage {
  static readonly PATH = "/support" as const;
}
