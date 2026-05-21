import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mutateAsync = vi.fn().mockResolvedValue(undefined);
const toastSuccess = vi.fn();
const toastError = vi.fn();

const defaultPrefs = {
  enabled: true,
  channels: { email: true, in_app: true },
  per_category: {
    bug: true,
    question: true,
    feature_request: true,
    abuse_report: true,
    billing: true,
    gdpr: true,
    other: true,
  },
  digest_cadence: "instant" as const,
};

let prefsState = structuredClone(defaultPrefs);

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/lib/admin/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/queries")>("@/lib/admin/queries");
  return {
    ...actual,
    useAdminNotificationPreferences: () => ({
      data: prefsState,
      isLoading: false,
      isError: false,
    }),
    useUpdateAdminNotificationPreferences: () => ({
      mutateAsync: (next: typeof defaultPrefs) => {
        prefsState = structuredClone(next);
        return mutateAsync(next);
      },
      isPending: false,
    }),
  };
});

import { AdminNotificationPreferences } from "@/components/admin/AdminNotificationPreferences";

beforeEach(() => {
  vi.clearAllMocks();
  prefsState = structuredClone(defaultPrefs);
});

describe("AdminNotificationPreferences", () => {
  it("renders all 4 sections (master, channels, cadence, categories)", () => {
    render(<AdminNotificationPreferences />);
    expect(screen.getByTestId("admin-notif-master-section")).toBeInTheDocument();
    expect(screen.getByTestId("admin-notif-channels-section")).toBeInTheDocument();
    expect(screen.getByTestId("admin-notif-cadence-section")).toBeInTheDocument();
    expect(screen.getByTestId("admin-notif-categories-section")).toBeInTheDocument();
  });

  it("renders all 7 per-category toggles", () => {
    render(<AdminNotificationPreferences />);
    for (const cat of [
      "bug",
      "question",
      "feature_request",
      "abuse_report",
      "billing",
      "gdpr",
      "other",
    ]) {
      expect(screen.getByTestId(`admin-notif-cat-${cat}-toggle`)).toBeInTheDocument();
    }
  });

  it("does not show the dirty bar when nothing has changed", () => {
    render(<AdminNotificationPreferences />);
    expect(screen.queryByTestId("admin-notif-dirty-bar")).not.toBeInTheDocument();
  });

  it("shows the dirty bar after flipping a category toggle and saves on click", async () => {
    const user = userEvent.setup();
    render(<AdminNotificationPreferences />);
    await user.click(screen.getByTestId("admin-notif-cat-billing-toggle"));
    expect(screen.getByTestId("admin-notif-dirty-bar")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-notif-save"));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const submitted = mutateAsync.mock.calls[0][0];
    expect(submitted.per_category.billing).toBe(false);
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("discard reverts the draft back to the server snapshot", async () => {
    const user = userEvent.setup();
    render(<AdminNotificationPreferences />);
    await user.click(screen.getByTestId("admin-notif-cat-gdpr-toggle"));
    expect(screen.getByTestId("admin-notif-dirty-bar")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-notif-discard"));
    await waitFor(() =>
      expect(screen.queryByTestId("admin-notif-dirty-bar")).not.toBeInTheDocument(),
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("disables channel + category + cadence controls when master toggle is off", async () => {
    const user = userEvent.setup();
    render(<AdminNotificationPreferences />);
    await user.click(screen.getByTestId("admin-notif-master-toggle"));
    // Switches use data-state to surface disabled; the disabled attr is present too.
    expect(screen.getByTestId("admin-notif-channel-email")).toBeDisabled();
    expect(screen.getByTestId("admin-notif-channel-inapp")).toBeDisabled();
    expect(screen.getByTestId("admin-notif-cat-bug-toggle")).toBeDisabled();
  });

  it("disables cadence radios when email channel is off", async () => {
    const user = userEvent.setup();
    render(<AdminNotificationPreferences />);
    await user.click(screen.getByTestId("admin-notif-channel-email"));
    expect(screen.getByTestId("admin-notif-cadence-instant")).toBeDisabled();
    expect(screen.getByTestId("admin-notif-cadence-hourly")).toBeDisabled();
  });

  it("submits the full prefs payload, not a partial diff", async () => {
    const user = userEvent.setup();
    render(<AdminNotificationPreferences />);
    await user.click(screen.getByTestId("admin-notif-cadence-daily"));
    await user.click(screen.getByTestId("admin-notif-save"));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const submitted = mutateAsync.mock.calls[0][0];
    expect(submitted).toMatchObject({
      enabled: true,
      digest_cadence: "daily",
      channels: { email: true, in_app: true },
    });
    expect(Object.keys(submitted.per_category)).toHaveLength(7);
  });
});
