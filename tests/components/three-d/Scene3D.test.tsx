import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  CampaignFlow3D,
  EvidenceReport3D,
  SCENES_3D,
  ScamPhone3D,
  ShieldStack3D,
} from "@/components/three-d";
import { SCENE3D_NAMES } from "@/lib/docs/doc-body";

function mockMatchMedia(matching: (query: string) => boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: matching(query),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("reduce-motion");
});

const SCENES = [
  ["scene3d-scam-phone", ScamPhone3D, "scene3d-scam-phone-flagged"],
  ["scene3d-evidence-report", EvidenceReport3D, "scene3d-evidence-report-seal"],
  ["scene3d-campaign-flow", CampaignFlow3D, "scene3d-campaign-flow-step-3"],
  ["scene3d-shield-stack", ShieldStack3D, "scene3d-shield-stack-check"],
] as const;

describe("3D scenes", () => {
  it.each(SCENES)(
    "%s renders its key element inside an aria-hidden stage",
    (rootId, Scene, keyId) => {
      render(<Scene />);
      const root = screen.getByTestId(rootId);
      const key = screen.getByTestId(keyId);
      expect(root).toContainElement(key);
      expect(key.closest("[aria-hidden='true']")).not.toBeNull();
    },
  );

  it("registry exposes a scene for every docs shortcode name", () => {
    expect(Object.keys(SCENES_3D).sort()).toEqual([...SCENE3D_NAMES].sort());
  });

  it("renders a visually hidden caption only when one is given", () => {
    const { rerender } = render(<ShieldStack3D />);
    expect(screen.queryByTestId("scene3d-shield-stack-caption")).toBeNull();

    rerender(<ShieldStack3D caption="Vrstvený štít" />);
    const caption = screen.getByTestId("scene3d-shield-stack-caption");
    expect(caption).toHaveTextContent("Vrstvený štít");
    expect(caption).toHaveClass("sr-only");
    expect(caption.closest("[aria-hidden='true']")).toBeNull();
  });

  it("animates layers when motion is allowed", () => {
    mockMatchMedia(() => false);
    const { container } = render(<CampaignFlow3D />);
    expect(screen.getByTestId("scene3d-campaign-flow")).toHaveAttribute("data-motion", "on");
    expect(container.querySelectorAll(".s3d-float").length).toBeGreaterThan(0);
    expect(container.querySelector(".s3d-rig-animated")).not.toBeNull();
  });

  it.each(SCENES)("%s renders a static pose for prefers-reduced-motion", (rootId, Scene) => {
    mockMatchMedia((q) => q.includes("prefers-reduced-motion"));
    const { container } = render(<Scene />);
    expect(screen.getByTestId(rootId)).toHaveAttribute("data-motion", "off");
    expect(container.querySelector(".s3d-float")).toBeNull();
    expect(container.querySelector(".s3d-rig-animated")).toBeNull();
  });

  it("honours the in-app reduce-motion setting", () => {
    mockMatchMedia(() => false);
    document.documentElement.classList.add("reduce-motion");
    const { container } = render(<ScamPhone3D />);
    expect(screen.getByTestId("scene3d-scam-phone")).toHaveAttribute("data-motion", "off");
    expect(container.querySelector(".s3d-float")).toBeNull();
  });
});
