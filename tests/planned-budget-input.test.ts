import { describe, expect, it } from "vitest";

import {
  formatPesoInputChange,
  formatPesoInputOnBlur,
  formatCentavosAsPesos,
  normalizePesoInput,
  parsePesoStringToCentavos,
} from "@/features/activity-planning/domain/planned-budget";
import {
  activitySchema,
  normalizeActivityFormInput,
} from "@/features/activity-planning/schemas/activity";

describe("planned budget input presentation", () => {
  it.each([
    ["", ""],
    ["0", "0.00"],
    ["1212121", "1,212,121.00"],
    ["1212121.5", "1,212,121.50"],
    ["1212121.50", "1,212,121.50"],
    ["1,000", "1,000.00"],
  ])("settles %j as %j on blur", (value, expected) => {
    expect(formatPesoInputOnBlur(value)).toBe(expected);
  });

  it.each([
    ["1234", "1,234"],
    [",234", "234"],
    ["1234.", "1,234."],
    ["1234.5", "1,234.5"],
    ["1234.567", "1234.567"],
    ["-1234", "-1234"],
    ["not a budget", "not a budget"],
  ])("keeps editable input %j as %j", (value, expected) => {
    expect(formatPesoInputChange(value, value.length)).toMatchObject({
      value: expected,
    });
  });

  it("keeps the logical caret position when grouping whole pesos", () => {
    expect(formatPesoInputChange("1234", 4, 4)).toEqual({
      value: "1,234",
      selectionStart: 5,
      selectionEnd: 5,
    });
  });

  it("keeps the logical caret position after the leading digit is deleted", () => {
    expect(formatPesoInputChange(",234", 4, 4)).toEqual({
      value: "234",
      selectionStart: 3,
      selectionEnd: 3,
    });
  });

  it.each([
    ["₱1,212,121.50", "1212121.50"],
    ["1,212,121.50", "1212121.50"],
    ["", ""],
    ["-1,000.00", "-1000.00"],
    ["1,234.567", "1234.567"],
  ])("normalizes %j as %j at submission", (value, expected) => {
    expect(normalizePesoInput(value)).toBe(expected);
  });

  it("keeps exact centavo persistence independent of presentation", () => {
    const normalized = normalizePesoInput("₱1,212,121.50");
    const result = parsePesoStringToCentavos(normalized);

    expect(result).toEqual({ ok: true, centavos: BigInt("121212150") });
    expect(result.ok && formatCentavosAsPesos(result.centavos)).toBe(
      "₱1,212,121.50",
    );
  });

  it("canonicalizes grouped values before the existing schema validation", () => {
    const normalized = normalizeActivityFormInput({
      plannedParticipantCount: "1,221,121",
      plannedBudgetPesos: "₱1,212,121.50",
    });
    const result = activitySchema.safeParse({
      name: "Community feeding",
      officeName: "Municipal kitchen",
      scheduledDate: "2026-09-03",
      ...normalized,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.plannedParticipantCount).toBe(1_221_121);
    expect(result.data.plannedBudgetPesos).toBe(BigInt("121212150"));
  });
});
