import type { JSX } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: (_path: string) => (config: unknown) => {
      return {
        ...(config as object),
        useLoaderData: () => ({ setId: "as_001" }),
        useParams: () => ({ setId: "as_001" }),
      } as unknown as { component: () => JSX.Element };
    },
    notFound: () => new Error("not-found"),
    useRouter: () => ({ navigate: () => {} }),
    Link: ({
      to,
      params,
      children,
      ...rest
    }: {
      to: string;
      params?: Record<string, string>;
      children: React.ReactNode;
    } & React.HTMLAttributes<HTMLAnchorElement>) => (
      <a href={params ? to.replace(/\$(\w+)/g, (_, k) => params[k] ?? "") : to} {...rest}>
        {children}
      </a>
    ),
  };
});

import { AnswerSetEditor } from "@/components/admin/AnswerSetEditor";
import { adminRepo } from "@/lib/admin/mock-store";

describe("/admin/answer-sets/$setId — AnswerSetEditor dialog", () => {
  it("renders the title input + save button for a seeded set", () => {
    const seeded = adminRepo.answerSets.list()[0];
    render(<AnswerSetEditor open onOpenChange={() => {}} set={seeded} />);
    expect(screen.getByTestId("answer-set-editor-title-input")).toBeInTheDocument();
    expect(screen.getByTestId("answer-set-editor-save-button")).toBeInTheDocument();
  });

  it("surfaces an inline error when saving with empty title", () => {
    render(<AnswerSetEditor open onOpenChange={() => {}} set={null} />);
    const titleInput = screen.getByTestId("answer-set-editor-title-input") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "" } });
    // bypass `required` attribute by submitting via form
    const saveBtn = screen.getByTestId("answer-set-editor-save-button");
    // Required HTML5 validation prevents submit; simulate handler directly via
    // the form's submit event without the browser's required check.
    const form = saveBtn.closest("form");
    expect(form).toBeTruthy();
    if (form) {
      // remove required so jsdom lets the submit proceed and the component path runs
      titleInput.removeAttribute("required");
      fireEvent.submit(form);
    }
    expect(screen.getByTestId("answer-set-editor-error")).toBeInTheDocument();
  });
});
