import { describe, expect, it } from "vitest";
import { getNativeHistoryState } from "../src/lib/native-history-state";

describe("native history state", () => {
  it("removes only Next integration markers and preserves other owners without mutation", () => {
    const tree = ["", { children: ["recipes", {}] }];
    const state = { __NA: true, _N: true, __PRIVATE_NEXTJS_INTERNALS_TREE: tree, masanaoGuard: { index: 3 }, unrelated: "kept" };
    expect(getNativeHistoryState(state)).toEqual({ __PRIVATE_NEXTJS_INTERNALS_TREE: tree, masanaoGuard: { index: 3 }, unrelated: "kept" });
    expect(state.__NA).toBe(true);
    expect(getNativeHistoryState(state).__PRIVATE_NEXTJS_INTERNALS_TREE).toBe(tree);
  });
  it("accepts an empty initial browser history entry", () => {
    expect(getNativeHistoryState(null)).toEqual({});
  });
});
