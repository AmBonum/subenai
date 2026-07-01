import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScamAudioEmbed } from "@/components/academy/ScamAudioEmbed";
import type { AudioEmbed } from "@/lib/academy/audio-shortcode";

const youtubeEmbed: AudioEmbed = {
  provider: "youtube",
  url: "https://www.youtube.com/watch?v=SbZz2Q2t-aU",
  title: "Podvod na telefóne",
  sourceName: "Tatra banka",
  sourceUrl: "https://www.youtube.com/watch?v=SbZz2Q2t-aU",
};

const externalEmbed: AudioEmbed = {
  provider: "external",
  url: "https://www.nbu.gov.sk/vishing",
  title: "Vishing varovanie",
  sourceName: "NBÚ",
};

describe("ScamAudioEmbed (E61)", () => {
  it("shows title + source attribution", () => {
    render(<ScamAudioEmbed embed={youtubeEmbed} />);
    expect(screen.getByTestId("scam-audio-embed-title")).toHaveTextContent("Podvod na telefóne");
    expect(screen.getByTestId("scam-audio-embed-source")).toHaveTextContent("Tatra banka");
  });

  it("is privacy-first: no YouTube iframe until the reader clicks play", () => {
    render(<ScamAudioEmbed embed={youtubeEmbed} />);
    expect(screen.queryByTestId("scam-audio-embed-iframe")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("scam-audio-embed-play"));
    const iframe = screen.getByTestId("scam-audio-embed-iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("src")).toContain("youtube-nocookie.com/embed/SbZz2Q2t-aU");
  });

  it("renders a link-out (no iframe) for an external source", () => {
    render(<ScamAudioEmbed embed={externalEmbed} />);
    expect(screen.queryByTestId("scam-audio-embed-play")).not.toBeInTheDocument();
    const open = screen.getByTestId("scam-audio-embed-open");
    expect(open).toHaveAttribute("href", "https://www.nbu.gov.sk/vishing");
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
