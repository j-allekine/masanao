import { describe, expect, it } from "vitest";

import { sortItemUnitConversions } from "@/features/supply-operations/domain/item-unit-conversion";

describe("Item Unit Conversion ordering", () => {
  it("sorts exact decimal quantities numerically within an alternate Unit", () => {
    const sorted = sortItemUnitConversions([
      {
        id: "ten",
        alternateUnit: { id: "sack", name: "Sack", abbreviation: "sack", active: true },
        baseUnitQuantity: "10",
        label: "Sack (10 kg)",
      },
      {
        id: "two",
        alternateUnit: { id: "sack", name: "Sack", abbreviation: "sack", active: true },
        baseUnitQuantity: "2",
        label: "Sack (2 kg)",
      },
      {
        id: "fraction",
        alternateUnit: { id: "sack", name: "Sack", abbreviation: "sack", active: true },
        baseUnitQuantity: "2.5",
        label: "Sack (2.5 kg)",
      },
    ]);

    expect(sorted.map((conversion) => conversion.baseUnitQuantity)).toEqual([
      "2",
      "2.5",
      "10",
    ]);
  });

  it("uses the same Unit-first order when a newly saved conversion is inserted", () => {
    const sorted = sortItemUnitConversions([
      {
        id: "zebra",
        alternateUnit: { id: "zebra", name: "Zebra", abbreviation: "z", active: true },
        baseUnitQuantity: "1",
        label: "Zebra (1 kg)",
      },
      {
        id: "apple",
        alternateUnit: { id: "apple", name: "Apple", abbreviation: "a", active: true },
        baseUnitQuantity: "1",
        label: "Apple (1 kg)",
      },
    ]);

    expect(sorted.map((conversion) => conversion.alternateUnit.name)).toEqual([
      "Apple",
      "Zebra",
    ]);
  });
});
