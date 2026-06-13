// E53.3 — chat widget: verbatim notice, message round-trip, refusal /
// quota / degraded states, no-terminal-storage invariant, no native modals.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { ScamChatPanel } from "@/components/scam-chat/ScamChatPanel";
import { useScamChat } from "@/components/scam-chat/useScamChat";

const sendChatMessage = vi.fn();
const uploadPhoto = vi.fn();
vi.mock("@/lib/scam-chat/client", () => ({
  sendChatMessage: (...a: unknown[]) => sendChatMessage(...a),
  uploadPhoto: (...a: unknown[]) => uploadPhoto(...a),
  MAX_CLIENT_HISTORY_TURNS: 12,
}));

// TanStack <Link> needs a router context; stub to a plain anchor.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

function Harness() {
  const chat = useScamChat(() => "ts-token");
  return <ScamChatPanel chat={chat} />;
}

beforeEach(() => {
  sendChatMessage.mockReset();
  uploadPhoto.mockReset();
});

describe("ScamChatPanel", () => {
  it("renders the verbatim privacy notice", () => {
    render(<Harness />);
    expect(screen.getByTestId("scam-chat-notice")).toHaveTextContent(
      "Tento rozhovor spracúva AI. Neukladáme ho — zatvorením karty sa zmaže. Nepíšte sem rodné číslo ani heslá.",
    );
  });

  it("never writes the conversation to local/sessionStorage", async () => {
    localStorage.clear();
    sessionStorage.clear();
    const localSpy = vi.spyOn(Storage.prototype, "setItem");
    sendChatMessage.mockResolvedValue({
      kind: "ok",
      data: { reply: "Toto je phishing.", citations: [], refusal: null, degraded: false },
    });
    render(<Harness />);
    fireEvent.change(screen.getByTestId("scam-chat-input"), {
      target: { value: "Je toto podvod?" },
    });
    fireEvent.click(screen.getByTestId("scam-chat-send"));
    await screen.findByText("Toto je phishing.");
    // No persisted key carries the message or the assistant reply.
    expect(localStorage.getItem("scam-chat")).toBeNull();
    for (const [key, value] of localSpy.mock.calls as Array<[string, string]>) {
      expect(key).not.toContain("scam");
      expect(value).not.toContain("Je toto podvod?");
      expect(value).not.toContain("Toto je phishing.");
    }
    localSpy.mockRestore();
  });

  it("renders a user message then the assistant reply", async () => {
    sendChatMessage.mockResolvedValue({
      kind: "ok",
      data: { reply: "Áno, je to podvod.", citations: ["/blog/x"], refusal: null, degraded: false },
    });
    render(<Harness />);
    fireEvent.change(screen.getByTestId("scam-chat-input"), { target: { value: "Pomoc" } });
    fireEvent.click(screen.getByTestId("scam-chat-send"));
    expect(await screen.findByTestId("scam-chat-message-user")).toHaveTextContent("Pomoc");
    expect(await screen.findByTestId("scam-chat-message-assistant")).toHaveTextContent(
      "Áno, je to podvod.",
    );
  });

  it("shows the off-topic refusal reply as a normal assistant bubble", async () => {
    sendChatMessage.mockResolvedValue({
      kind: "ok",
      data: {
        reply:
          "Som asistent zameraný výlučne na ochranu pred podvodmi. S inou témou vám, žiaľ, neporadím.",
        citations: [],
        refusal: "off_topic",
        degraded: false,
      },
    });
    render(<Harness />);
    fireEvent.change(screen.getByTestId("scam-chat-input"), { target: { value: "básnička" } });
    fireEvent.click(screen.getByTestId("scam-chat-send"));
    expect(await screen.findByTestId("scam-chat-message-assistant")).toHaveTextContent(
      "Som asistent zameraný výlučne na ochranu pred podvodmi.",
    );
  });

  it("renders the verbatim fail-closed string on a 429 quota response", async () => {
    sendChatMessage.mockResolvedValue({ kind: "quota" });
    render(<Harness />);
    fireEvent.change(screen.getByTestId("scam-chat-input"), { target: { value: "ahoj" } });
    fireEvent.click(screen.getByTestId("scam-chat-send"));
    expect(await screen.findByTestId("scam-chat-quota-message")).toHaveTextContent(
      "Asistent má dnes plno. Skúste to, prosím, zajtra — alebo si zatiaľ pozrite naše kurzy o podvodoch.",
    );
  });

  it("shows the degraded-model notice when degraded:true", async () => {
    sendChatMessage.mockResolvedValue({
      kind: "ok",
      data: { reply: "ok", citations: [], refusal: null, degraded: true },
    });
    render(<Harness />);
    fireEvent.change(screen.getByTestId("scam-chat-input"), { target: { value: "ahoj" } });
    fireEvent.click(screen.getByTestId("scam-chat-send"));
    await waitFor(() =>
      expect(screen.getByTestId("scam-chat-degraded-notice")).toBeInTheDocument(),
    );
  });

  it("renders a triage assessment with a PDF button on high risk", async () => {
    sendChatMessage.mockResolvedValue({
      kind: "ok",
      data: {
        reply: "Vyzerá to vážne.",
        citations: [],
        refusal: null,
        degraded: false,
        triage: {
          risk: "high",
          indicators: ["platba vopred"],
          timeline: ["10:00 SMS"],
          evidence: ["SMS"],
          next_steps: ["volajte 158"],
        },
      },
    });
    render(<Harness />);
    fireEvent.change(screen.getByTestId("scam-chat-input"), { target: { value: "podviedli ma" } });
    fireEvent.click(screen.getByTestId("scam-chat-triage"));
    expect(await screen.findByTestId("scam-chat-triage-result")).toBeInTheDocument();
    expect(screen.getByTestId("scam-chat-triage-risk")).toHaveTextContent("Vysoké riziko");
    expect(screen.getByTestId("scam-chat-download-pdf")).toBeInTheDocument();
  });

  it("uses no native browser modals", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const alertSpy = vi.spyOn(window, "alert");
    const promptSpy = vi.spyOn(window, "prompt");
    render(<Harness />);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(promptSpy).not.toHaveBeenCalled();
  });
});
