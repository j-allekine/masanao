import { describe, expect, it } from "vitest";

import {
  formatCentavosAsPesoInput,
  formatCentavosAsPesos,
  parsePesoStringToCentavos,
} from "@/features/activity-planning/domain/planned-budget";

describe("planned budget formatting", () => {
  it("formats exact centavos for peso input and staff display", () => {
    expect(formatCentavosAsPesoInput("1234567")).toBe("12345.67");
    expect(formatCentavosAsPesos("1234567")).toBe("₱12,345.67");
  });

  it("rejects overlong significant peso values before BigInt conversion", () => {
    expect(parsePesoStringToCentavos("1".padEnd(100_001, "0"))).toEqual({
      ok: false,
      reason: "too-large",
    });
  });
});
