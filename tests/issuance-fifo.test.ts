import { describe, expect, it } from "vitest";
import { allocateFifo, type FifoReceipt } from "@/features/issuance/domain/fifo";

const layer = (id: string, quantity: string, receiptDate: string, postedAt = "2026-10-15T00:00:00.000Z", receiptId = id): FifoReceipt => ({ id, quantity, receiptDate, postedAt, receiptId });
describe("FIFO receipt allocation", () => {
  it("uses oldest actual receipt date even if recorded later, splitting only as needed", () => {
    expect(allocateFifo([layer("new", "20", "2026-10-02"), layer("old", "10", "2026-10-01", "2026-10-16")], "12.5")).toEqual([{ receiptLineId: "old", quantity: "10" }, { receiptLineId: "new", quantity: "2.5" }]);
  });
  it("uses posting time then receipt and line identity to break same-date ties", () => {
    const rows = [layer("d", "1", "2026-10-01", "2026-10-16", "b"), layer("c", "1", "2026-10-01", "2026-10-16", "a"), layer("b", "1", "2026-10-01", "2026-10-16", "a"), layer("a", "1", "2026-10-01", "2026-10-15", "z")];
    expect(allocateFifo(rows, "4")?.map((entry) => entry.receiptLineId)).toEqual(["a", "b", "c", "d"]);
  });
  it("keeps explicit decimal precision and skips exhausted receipts", () => {
    expect(allocateFifo([layer("empty", "0", "2026-09-01"), layer("old", "0.000000000000000001", "2026-10-01"), layer("new", "2", "2026-10-02")], "1.000000000000000002")).toEqual([{ receiptLineId: "old", quantity: "0.000000000000000001" }, { receiptLineId: "new", quantity: "1.000000000000000001" }]);
  });
  it("returns no partial plan when receipts cannot cover the quantity", () => {
    expect(allocateFifo([layer("only", "1.25", "2026-10-01")], "1.250000000000000001")).toBeNull();
  });
});
