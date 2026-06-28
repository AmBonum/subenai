import { expect } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";

// jest-axe ships a jest-style matcher; vitest's `expect` is jest-compatible,
// so `expect.extend` accepts it directly. Registered once on import; the
// module augmentation below makes the matcher type-check in spec files.
expect.extend(toHaveNoViolations);

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- must mirror vitest's own `Assertion<T = any>` or TS rejects the declaration merge.
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}

type AxeOptions = Parameters<typeof axe>[1];

// jsdom has no layout engine, so axe auto-skips geometry rules
// (color-contrast, target-size). Those are asserted in the Playwright
// visual-regression / e2e layer, not here. This helper enforces the
// structural WCAG 2.1 A + AA rules that DO run headless: roles, names,
// labels, ARIA validity, landmark + list structure.
const DEFAULT_OPTIONS: AxeOptions = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
};

export async function expectNoA11yViolations(
  container: Element,
  options: AxeOptions = DEFAULT_OPTIONS,
): Promise<void> {
  const results = await axe(container, options);
  expect(results).toHaveNoViolations();
}
