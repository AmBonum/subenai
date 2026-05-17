import { describe, it, expect } from "vitest";

import { createSet, duplicateSet, deleteSet, getById } from "@/lib/admin/answer-sets-mock-store";

describe("answer-sets-mock-store", () => {
  it("createSet returns a record with a fresh id and the given fields", () => {
    const created = createSet({
      name: "Test sada",
      description: "popis",
      categories: ["vseobecny"],
    });
    expect(created.id).toMatch(/^as_/);
    expect(created.name).toBe("Test sada");
    expect(getById(created.id)).toEqual(created);
  });

  it("duplicateSet copies the name with a (kópia) suffix and a new id", () => {
    const src = createSet({
      name: "Sada na duplikáciu",
      description: "x",
      categories: ["vseobecny"],
    });
    const copy = duplicateSet(src.id);
    expect(copy).not.toBeNull();
    expect(copy!.id).not.toBe(src.id);
    expect(copy!.name).toBe("Sada na duplikáciu (kópia)");
  });

  it("duplicateSet returns null for unknown id", () => {
    expect(duplicateSet("nope_does_not_exist")).toBeNull();
  });

  it("deleteSet removes the set so getById returns undefined", () => {
    const s = createSet({
      name: "Smietka",
      description: "",
      categories: ["vseobecny"],
    });
    deleteSet(s.id);
    expect(getById(s.id)).toBeUndefined();
  });
});
