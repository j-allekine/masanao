import { describe, expect, it } from "vitest";

import {
  formatCentavosAsPesoInput,
  formatCentavosAsPesos,
} from "@/features/activity-planning/domain/planned-budget";

describe("planned budget formatting", () => {
  it("formats exact centavos for peso input and staff display", () => {
    expect(formatCentavosAsPesoInput("1234567")).toBe("12345.67");
    expect(formatCentavosAsPesos("1234567")).toBe("₱12,345.67");
  });
});
