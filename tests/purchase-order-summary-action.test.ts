import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), read: vi.fn() }));
vi.mock("@/features/supply-operations/server/actions/current-actor", () => ({ getCurrentSupplyOperationsActor: mocks.actor }));
vi.mock("@/features/supply-operations/server/queries/purchase-order-delivery-summaries", () => ({ readPurchaseOrderDeliverySummaries: mocks.read }));

import { readPurchaseOrderDeliverySummariesAction } from "@/features/supply-operations/actions";

describe("bounded Purchase Order amount reads", () => {
  beforeEach(() => {
    mocks.actor.mockReset().mockResolvedValue({ id: "staff", name: "Staff", username: "staff" });
    mocks.read.mockReset().mockResolvedValue([]);
  });

  it("requires authentication before reading receipt lines", async () => {
    mocks.actor.mockResolvedValue(null);
    await expect(readPurchaseOrderDeliverySummariesAction(["order"])).resolves.toEqual({ ok: false });
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("rejects more than one page and malformed IDs before querying", async () => {
    await expect(readPurchaseOrderDeliverySummariesAction(Array.from({ length: 11 }, (_, i) => String(i)))).resolves.toEqual({ ok: false });
    await expect(readPurchaseOrderDeliverySummariesAction([""])).resolves.toEqual({ ok: false });
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("reads only requested distinct visible IDs and handles read failure", async () => {
    const ids = Array.from({ length: 10 }, (_, i) => String(i));
    await expect(readPurchaseOrderDeliverySummariesAction(ids)).resolves.toEqual({ ok: true, summaries: [] });
    expect(mocks.read).toHaveBeenLastCalledWith(ids);
    await readPurchaseOrderDeliverySummariesAction(["visible", "visible"]);
    expect(mocks.read).toHaveBeenLastCalledWith(["visible"]);
    mocks.read.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(readPurchaseOrderDeliverySummariesAction(["visible"])).resolves.toEqual({ ok: false });
  });
});
