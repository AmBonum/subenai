import { describe, it, expect } from "vitest";
import { GLOSSARY, glossTerm } from "@/content/academy/glossary";

describe("academy glossary", () => {
  it("covers the core English terms the spec calls out", () => {
    for (const term of ["phishing", "scam", "smishing", "vishing", "spoofing"]) {
      expect(GLOSSARY[term], term).toBeTruthy();
    }
  });

  it("formats a known term with its Slovak gloss in parentheses", () => {
    expect(glossTerm("phishing")).toBe(
      "phishing (podvodné vylákanie prihlasovacích či platobných údajov)",
    );
    expect(glossTerm("Scam")).toBe("Scam (podvod)");
  });

  it("returns the bare term (no empty parentheses) when unknown", () => {
    expect(glossTerm("widget")).toBe("widget");
  });
});
