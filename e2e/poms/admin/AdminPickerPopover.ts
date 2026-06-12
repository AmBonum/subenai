import type { Locator } from "@playwright/test";

import { BasePage } from "../BasePage";

/**
 * AdminPicker popover — floats above detail pages when adding assignees.
 * The popover is rendered in a portal (not inside the detail page root).
 * Compose this POM into fixture-based tests that interact with the picker.
 */
export class AdminPickerPopover extends BasePage {
  get root(): Locator {
    return this.page.getByTestId("admin-ticket-assignment-popover");
  }

  get searchInput(): Locator {
    return this.page.getByTestId("admin-ticket-assignment-search");
  }

  adminOption(adminId: string): Locator {
    return this.page.getByTestId(`admin-ticket-assignment-option-${adminId}`);
  }

  get emptyState(): Locator {
    return this.page.getByTestId("admin-ticket-assignment-empty");
  }
}
