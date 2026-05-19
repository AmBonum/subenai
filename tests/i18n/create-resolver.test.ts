// Regression test: 2026-05-19 production bug — `tFor("account.profile")`
// returned raw keys because `pickSection` did a single-level lookup
// (`"account.profile" in root` instead of walking the dotted path). The
// resolver now treats dotted sections the same way it treats dotted keys.
import { describe, it, expect } from "vitest";
import { createResolver } from "@/i18n/_create-resolver";

const sk = {
  flat: { hello: "Ahoj" },
  account: {
    profile: {
      card_personal_title: "Osobné údaje",
      label_display_name: "Zobrazované meno",
    },
    security: {
      card_password_title: "Zmena hesla",
    },
  },
  greetings: {
    en: {
      morning: "Good morning",
    },
  },
} as const;

describe("createResolver", () => {
  const tFor = createResolver({ sk: sk as never, loaders: {} });

  it("resolves a flat section + key", () => {
    expect(tFor("flat")("hello")).toBe("Ahoj");
  });

  it("resolves a dotted section + flat key (the regression case)", () => {
    const t = tFor("account.profile");
    expect(t("card_personal_title")).toBe("Osobné údaje");
    expect(t("label_display_name")).toBe("Zobrazované meno");
  });

  it("resolves a second dotted-section namespace under the same root", () => {
    expect(tFor("account.security")("card_password_title")).toBe("Zmena hesla");
  });

  it("resolves a deeper (3-segment) dotted section", () => {
    expect(tFor("greetings.en")("morning")).toBe("Good morning");
  });

  it("returns the raw key when the section path doesn't resolve to a subtree", () => {
    expect(tFor("account.missing")("anything")).toBe("anything");
  });

  it("returns the raw key when the leaf key is missing inside a valid section", () => {
    expect(tFor("account.profile")("not_a_real_key")).toBe("not_a_real_key");
  });

  it("interpolates {var} placeholders", () => {
    const tFor2 = createResolver({
      sk: { greeting: { hi: "Ahoj, {name}!" } } as never,
      loaders: {},
    });
    expect(tFor2("greeting")("hi", { name: "Ľubo" })).toBe("Ahoj, Ľubo!");
  });
});
