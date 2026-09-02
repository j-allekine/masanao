import { describe, expect, it } from "vitest";

import {
  formatParticipantCount,
  formatParticipantCountInput,
} from "@/features/activity-planning/components/forms/participant-count-formatting";

describe("participant count formatting", () => {
  it.each([
    ["", ""],
    ["0", "0"],
    ["123", "123"],
    ["1234", "1,234"],
    [",234", "234"],
    ["1221121", "1,221,121"],
    ["0001234", "0,001,234"],
    ["-1234", "-1,234"],
    ["-1", "-1"],
    ["12.5", "12.5"],
    ["1e4", "1e4"],
    ["not a number", "not a number"],
  ])("formats %j as %j", (value, expected) => {
    expect(formatParticipantCount(value)).toBe(expected);
  });

  it.each([
    ["1234", 4, 4, "1,234", 5, 5],
    [",234", 4, 4, "234", 3, 3],
    ["12345", 2, 2, "12,345", 2, 2],
    ["12345", 3, 4, "12,345", 4, 5],
    ["-1234", 2, 2, "-1,234", 2, 2],
    ["1234", 1, 3, "1,234", 1, 4],
  ])(
    "keeps the logical selection when formatting %j",
    (value, start, end, expectedValue, expectedStart, expectedEnd) => {
      expect(formatParticipantCountInput(value, start, end)).toEqual({
        value: expectedValue,
        selectionStart: expectedStart,
        selectionEnd: expectedEnd,
      });
    },
  );

  it("preserves a null selection for an unfocused input", () => {
    expect(formatParticipantCountInput("1234", null, null)).toEqual({
      value: "1,234",
      selectionStart: null,
      selectionEnd: null,
    });
  });
});
