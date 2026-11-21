import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/client";
import { beginOpeningStock, deleteItem, getKitchenDashboard, getOpeningStockWorkspace, listInventory, listItems, postDeliveryReceipt, postOpeningStock, saveOpeningStockDraft, setItemActive, updateItem } from "@/features/supply-operations/server";
import { getIssuanceWorkspace, postIssuance, saveIssuanceDraft } from "@/features/issuance/server";
import { postIssuanceRecord } from "@/features/issuance/server/db/post";
import { postOpeningStockCorrectionRecord } from "@/features/supply-operations/server/db/opening-stock-corrections";
import { beginOpeningStockCorrection, saveOpeningStockCorrection, postOpeningStockCorrection, discardOpeningStockCorrection, createItemWithConversions } from "@/features/supply-operations/server";
import { openingStockToday } from "@/features/supply-operations/domain/opening-stock";
import type { OpeningStockResult } from "@/features/supply-operations/opening-stock-types";

function value<T>(result: OpeningStockResult<T>) { if (!result.ok) throw Error(result.error); return result.value; }
async function fixture() {
  const key = crypto.randomUUID();
  const admin = { id: `admin-${key}`, name: "Opening administrator", username: `admin-${key}` };
  const staff = { id: `staff-${key}`, name: "Kitchen staff", username: `staff-${key}` };
  await prisma.user.createMany({ data: [admin, staff].map((actor) => ({ ...actor, email: `${actor.id}@test.local`, role: actor === admin ? "admin" : "staff" })) });
  const item = await prisma.item.create({ data: { id: `rice-${key}`, name: `Rice ${key}`, normalizedName: `rice ${key}`, categoryId: "default-category-staples-dry-goods", baseUnitId: "default-unit-kilogram", reorderLevel: "10" } });
  const line = { id: crypto.randomUUID(), itemId: item.id, selectedUnitId: item.baseUnitId, conversionId: null, quantity: "75", openingUnitCost: "50", zeroCostReason: "" };
  const today = openingStockToday();
  const yesterday = new Date(`${today}T00:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const countDate = yesterday.toISOString().slice(0, 10);
  const attemptId = crypto.randomUUID();
  const begun = value(await beginOpeningStock(admin, { attemptId, revision: 0 }));
  const save = async (patch = {}) => value(await saveOpeningStockDraft(admin, { attemptId, revision: begun.revision, countDate, note: "Physical count sheet", lines: [line], ...patch }));
  const context = { activityDesignId: `design-${key}`, activityId: `activity-${key}`, mealScheduleId: `meal-${key}` };
  await prisma.activityDesign.create({ data: { id: context.activityDesignId, activityDesignNo: `AD-${key}`, title: "Opening stock event", fiscalYear: Number(today.slice(0, 4)) } });
  await prisma.activity.create({ data: { id: context.activityId, activityDesignId: context.activityDesignId, name: `Opening meal ${key}`, officeName: "Kitchen", scheduledDate: new Date(`${today}T00:00:00Z`), plannedBudgetCentavos: BigInt(1000000) } });
  await prisma.mealSchedule.create({ data: { id: context.mealScheduleId, activityId: context.activityId, label: "Lunch", mealTime: "12:00" } });
  const vendor = await prisma.vendor.create({ data: { id: `vendor-${key}`, name: `Vendor ${key}`, normalizedName: `vendor ${key}` } });
  const po = await prisma.purchaseOrder.create({ data: { id: `po-${key}`, purchaseOrderNo: `PO-${key}`, normalizedPurchaseOrderNo: `po-${key}`, vendorId: vendor.id } });
  const receipt = { purchaseOrderId: po.id, receiptNo: `DR-${key}`, receiptDate: today, lines: [{ itemId: item.id, selectedUnitId: item.baseUnitId, quantity: "25", unitPrice: "60" }] };
  const issue = async (quantity: string, meal = context) => {
    const draft = await saveIssuanceDraft(staff, meal, { revision: 0, mealPax: 1, recipes: [], stockItems: [{ itemId: item.id, conversionId: null, enteredQuantity: quantity }] });
    if (!draft.ok) throw Error(draft.error);
    return postIssuance(staff, meal, { revision: draft.value.draft.revision });
  };
  const report = async () => {
    const result = await getKitchenDashboard(staff, { start: countDate, end: today }, new Date(Date.now() + 1000));
    if (!result.ok) throw Error(result.error);
    return result.report.budgets.rows.find((row) => row.id === context.activityId)!;
  };
  return { admin, staff, item, line, attemptId, begun, save, context, receipt, issue, report, countDate };
}

beforeEach(async () => {
 await prisma.openingStockWithdrawal.deleteMany(); await prisma.inventoryLedgerMovement.deleteMany(); await prisma.openingStockSource.deleteMany(); await prisma.openingStockCorrectionLine.deleteMany(); await prisma.openingStockCorrection.deleteMany(); await prisma.openingStockLine.deleteMany(); await prisma.openingStockDiscard.deleteMany(); await prisma.openingStockSetup.deleteMany();
});
async function correction(f: Awaited<ReturnType<typeof fixture>>, patch = {}) {
 const id = crypto.randomUUID(); const begun = value(await beginOpeningStockCorrection(f.admin, { id }));
 const input = { id, revision: begun.revision, reason: "Counted store room omitted", note: "Discovery last week; chronology remains posting time", lines: [{ ...f.line, id: crypto.randomUUID(), quantity: "5", openingUnitCost: "60" }], ...patch };
 const saved = value(await saveOpeningStockCorrection(f.admin, input)); return { id, input, saved, post: { id, revision: saved.revision, zeroCostAcknowledged:false } };
}
async function postedFixture() { const f = await fixture(); const saved = await f.save(); value(await postOpeningStock(f.admin, { attemptId:f.attemptId, revision:saved.revision, zeroCostAcknowledged:false })); return f; }
describe("Omitted Opening Stock corrections", () => {
 it("preserves original opening and issued costs, posts once and consumes traceable correction sources before receipts", async () => {
  const f = await postedFixture(); const original = value(await getOpeningStockWorkspace(f.staff)).lines;
  const issued = await f.issue("70"); if(!issued.ok) throw Error(issued.error);
  const oldReport = await f.report(); const c = await correction(f);
  expect(c.saved.correction.lines[0]).toMatchObject({ beforeQuantity:"5", beforeValueCentavos:"25000", afterQuantity:"10", afterValueCentavos:"55000" });
  expect(value(await getOpeningStockWorkspace(f.staff)).corrections).toEqual([]);
  expect(value(await getOpeningStockWorkspace(f.admin)).corrections).toMatchObject([{ id:c.id, status:"draft" }]);
  expect(await postDeliveryReceipt(f.staff, f.receipt)).toMatchObject({ok:true});
  const before = Date.now(); const posted = value(await postOpeningStockCorrection(f.admin,c.post));
  expect(await postOpeningStockCorrection(f.admin,c.post)).toEqual({ok:true,value:posted});
  const history = value(await getOpeningStockWorkspace(f.staff));
  expect(history.lines).toEqual(original); expect(history.corrections).toMatchObject([{ reference:"OS-0001-C0001", status:"posted", postedByName:f.admin.name, reason:c.input.reason }]);
  expect(Date.parse(history.corrections![0].postedAt!)).toBeGreaterThanOrEqual(before);
  const sources = await prisma.openingStockSource.findMany({orderBy:{position:"asc"}});
  expect(sources.map(s=>[s.position,s.reference,s.quantity])).toEqual([[0,"OS-0001","75"],[1,"OS-0001-C0001","5"]]);
  expect(sources[1].correctionLineId).toBe(c.input.lines[0].id);
  expect(await getIssuanceWorkspace(f.staff,f.context)).toEqual(issued); expect(await f.report()).toEqual(oldReport);
  const mealId=crypto.randomUUID(); await prisma.mealSchedule.create({data:{id:mealId,activityId:f.context.activityId,label:"Second",mealTime:"13:00"}});
  const next=await f.issue("12",{...f.context,mealScheduleId:mealId}); if(!next.ok) throw Error(next.error);
  expect(next.value.review[0]).toMatchObject({openingAllocations:[{quantity:"5",reference:"OS-0001",costCentavos:"25000"},{quantity:"5",reference:"OS-0001-C0001",costCentavos:"30000"}],receiptAllocations:[{quantity:"2"}]});
  const inventory=await listInventory(f.staff);if(!inventory.ok) throw Error(inventory.error);expect(inventory.rows.find(r=>r.id===f.item.id)?.balance).toEqual({kind:"valid",quantity:"23"});
  expect(await discardOpeningStockCorrection(f.admin,{id:c.id,revision:posted.revision})).toMatchObject({ok:false,kind:"conflict"});
 });
 it("retains incomplete drafts and rejects blank costs, missing reasons, zero acknowledgment and client dates",async()=>{
  const f=await postedFixture();let c=await correction(f,{reason:"",lines:[{...f.line,id:crypto.randomUUID(),quantity:"",openingUnitCost:""}]});
  expect(await postOpeningStockCorrection(f.admin,c.post)).toMatchObject({ok:false,kind:"validation"});
  let saved=value(await saveOpeningStockCorrection(f.admin,{...c.input,revision:c.saved.revision,reason:"Omitted",lines:[{...c.input.lines[0],quantity:"0.123456789123456789",openingUnitCost:""}]}));
  expect(await postOpeningStockCorrection(f.admin,{...c.post,revision:saved.revision})).toMatchObject({ok:false,kind:"validation"});
  const zero={...c.input.lines[0],quantity:"0.123456789123456789",openingUnitCost:"0",zeroCostReason:"Assigned deliberate zero"};
  saved=value(await saveOpeningStockCorrection(f.admin,{...c.input,revision:saved.revision,reason:"Omitted",lines:[zero]}));
  expect(await postOpeningStockCorrection(f.admin,{...c.post,revision:saved.revision})).toMatchObject({ok:false,kind:"validation"});
  for(const date of ["2000-01-01","2999-01-01"]) expect(await postOpeningStockCorrection(f.admin,{...c.post,revision:saved.revision,zeroCostAcknowledged:true,effectiveDate:date})).toMatchObject({ok:false,kind:"validation"});
  value(await postOpeningStockCorrection(f.admin,{...c.post,revision:saved.revision,zeroCostAcknowledged:true}));
  expect(value(await getOpeningStockWorkspace(f.staff)).sources).toMatchObject([{quantity:"75"},{quantity:zero.quantity,remainingValueCentavos:"0"}]);
 });
 it("discards idempotently without deleting inline catalog data and checks persisted actors",async()=>{
  const f=await postedFixture(); const created=await createItemWithConversions(f.admin,{item:{name:`Omitted ${crypto.randomUUID()}`,categoryId:"default-category-staples-dry-goods",baseUnitId:"default-unit-kilogram",reorderLevel:"1",reorderLevelBaseUnitId:"default-unit-kilogram",note:""},conversions:[]}); if(!created.ok) throw Error(created.error);
  const c=await correction(f,{lines:[{...f.line,id:crypto.randomUUID(),itemId:created.item.id,quantity:"2",openingUnitCost:"1"}]});
  expect(await beginOpeningStockCorrection(f.staff,{id:crypto.randomUUID()})).toMatchObject({ok:false,kind:"forbidden"});
  expect(await saveOpeningStockCorrection(f.staff,{...c.input,revision:c.saved.revision})).toMatchObject({ok:false,kind:"forbidden"});
  expect(await postOpeningStockCorrection(f.staff,c.post)).toMatchObject({ok:false,kind:"forbidden"});
  expect(await discardOpeningStockCorrection(f.staff,{id:c.id,revision:c.saved.revision})).toMatchObject({ok:false,kind:"forbidden"});
  await prisma.user.update({where:{id:f.admin.id},data:{disabled:true}}); expect(await postOpeningStockCorrection(f.admin,c.post)).toMatchObject({ok:false,kind:"forbidden"}); await prisma.user.update({where:{id:f.admin.id},data:{disabled:false}});
  const result=await discardOpeningStockCorrection(f.admin,{id:c.id,revision:c.saved.revision});expect(result).toMatchObject({ok:true}); expect(await discardOpeningStockCorrection(f.admin,{id:c.id,revision:c.saved.revision})).toEqual(result);
  expect((await listItems()).find(i=>i.id===created.item.id)).toBeTruthy(); expect(value(await getOpeningStockWorkspace(f.admin)).corrections).toEqual([]); expect(await postOpeningStockCorrection(f.admin,c.post)).toMatchObject({ok:false,kind:"conflict"});expect(await prisma.inventoryLedgerMovement.count()).toBe(1);
 });
 it("rejects stale revisions and intervening source use, rolls back failures and posts new Items with alternate-unit costs",async()=>{
  const f=await postedFixture(); const c=await correction(f);
  expect(await saveOpeningStockCorrection(f.admin,{...c.input,revision:0})).toMatchObject({ok:false,kind:"conflict"});
  await f.issue("1"); expect(await postOpeningStockCorrection(f.admin,c.post)).toMatchObject({ok:false,kind:"conflict"});
  const saved=value(await saveOpeningStockCorrection(f.admin,{...c.input,revision:c.saved.revision}));
  await expect(postOpeningStockCorrectionRecord(f.admin,{...c.post,revision:saved.revision},{afterFirstMovement:()=>{throw Error("Rollback correction");}})).rejects.toThrow("Rollback correction");
  expect(await prisma.openingStockSource.count()).toBe(1);expect(value(await getOpeningStockWorkspace(f.admin)).corrections![0]).toMatchObject({status:"draft",revision:saved.revision});
  expect(await postOpeningStockCorrection(f.admin,{...c.post,revision:saved.revision})).toMatchObject({ok:true});
  const created=await createItemWithConversions(f.admin,{item:{name:`Omitted new ${crypto.randomUUID()}`,categoryId:"default-category-staples-dry-goods",baseUnitId:"default-unit-kilogram",reorderLevel:"1",reorderLevelBaseUnitId:"default-unit-kilogram",note:""},conversions:[{alternateUnitId:"default-unit-piece",baseUnitQuantity:"2.5"}]});if(!created.ok)throw Error(created.error);
  const unit=created.item.unitConversions![0];const next=await correction(f,{lines:[{...f.line,id:crypto.randomUUID(),itemId:created.item.id,quantity:"2",selectedUnitId:unit.alternateUnit.id,conversionId:unit.id,openingUnitCost:"3.33"}]});
  expect(await postOpeningStockCorrection(f.admin,next.post)).toMatchObject({ok:true});expect(value(await getOpeningStockWorkspace(f.staff)).sources).toMatchObject([{quantity:"75"},{quantity:"5"},{quantity:"5",remainingValueCentavos:"666"}]);
 });
 it("rejects changed conversions and inconsistent source evidence without partial additions",async()=>{
  const f=await postedFixture();
  const unit=await prisma.itemUnitConversion.create({data:{id:crypto.randomUUID(),itemId:f.item.id,alternateUnitId:"default-unit-piece",baseUnitQuantity:"2.5"}});
  const c=await correction(f,{lines:[{...f.line,id:crypto.randomUUID(),quantity:"2",openingUnitCost:"1",selectedUnitId:"default-unit-piece",conversionId:unit.id}]});
  await prisma.itemUnitConversion.update({where:{id:unit.id},data:{baseUnitQuantity:"3"}});
  expect(await postOpeningStockCorrection(f.admin,c.post)).toMatchObject({ok:false,kind:"reference"});
  expect(await prisma.inventoryLedgerMovement.count()).toBe(1);
  const source=await prisma.openingStockSource.findFirstOrThrow();
  await prisma.inventoryLedgerMovement.update({where:{openingStockSourceId:source.id},data:{quantity:"74"}});
  expect(await saveOpeningStockCorrection(f.admin,{...c.input,revision:c.saved.revision})).toMatchObject({ok:false,kind:"reference"});
  expect(await prisma.openingStockSource.count()).toBe(1);
 });
 it("records separate same-Item additions at distinct costs and stable positions",async()=>{
  const f=await postedFixture();
  const c=await correction(f,{lines:[{...f.line,id:crypto.randomUUID(),quantity:"2",openingUnitCost:"1"},{...f.line,id:crypto.randomUUID(),quantity:"3",openingUnitCost:"2"}]});
  expect(c.saved.correction.lines).toMatchObject([{beforeQuantity:"75",afterQuantity:"77",beforeValueCentavos:"375000",afterValueCentavos:"375200"},{beforeQuantity:"77",afterQuantity:"80",beforeValueCentavos:"375200",afterValueCentavos:"375800"}]);
  value(await postOpeningStockCorrection(f.admin,c.post));
  expect(value(await getOpeningStockWorkspace(f.staff)).sources).toMatchObject([{position:0,quantity:"75"},{position:1,quantity:"2",remainingValueCentavos:"200"},{position:2,quantity:"3",remainingValueCentavos:"600"}]);
 });

});
