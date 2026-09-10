import { describe, it, expect } from "vitest";
import { difficultyLabel } from "@/lib/academy/difficulty";

describe("difficultyLabel", () => {
  it("maps lesson difficulty to Slovak", () => {
    expect(difficultyLabel("lesson", "beginner")).toBe("začiatočník");
    expect(difficultyLabel("lesson", "advanced")).toBe("pokročilý");
  });

  it("maps article lane to the audience label", () => {
    expect(difficultyLabel("article", "beginner")).toBe("pre každého");
    expect(difficultyLabel("article", "advanced")).toBe("pre odborníkov");
  });

  it("returns null for missing or unknown values", () => {
    expect(difficultyLabel("article", null)).toBeNull();
    expect(difficultyLabel("article", undefined)).toBeNull();
    expect(difficultyLabel("lesson", "expert")).toBeNull();
  });
});
