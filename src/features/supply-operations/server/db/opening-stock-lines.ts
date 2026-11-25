import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import type { OpeningStockLineInput, OpeningStockResult } from "../../opening-stock-types";
import { openingStockProduct } from "../../domain/opening-stock";
import { compareRational, decimalRational } from "@/features/issuance/domain/rational";

// Callers supply their transaction rejection so this module does not import either workflow.
type Reject = (kind: Extract<OpeningStockResult<never>, { ok: false }>["kind"], message: string, fields?: Record<string, string>) => never;
type SavedLine = Prisma.OpeningStockLineGetPayload<object>;
type LineSnapshot = Pick<SavedLine, "itemName" | "baseUnitId" | "selectedUnitId" | "conversionId" | "selectedUnitName" | "selectedUnitAbbreviation" | "baseUnitName" | "baseUnitAbbreviation" | "conversionFactor">;

export async function readOpeningLineSelection(database: Prisma.TransactionClient, line: OpeningStockLineInput, position: number, reject: Reject, unavailableUnit: (itemName: string) => string) {
  const item = await database.item.findFirst({ where: { id: line.itemId, isActive: true }, include: { baseUnit: true, unitConversions: { include: { alternateUnit: true } } } });
  if (!item?.baseUnit.active) reject("reference", `Line ${position + 1}: select an active Item and Base Unit.`);
  const conversion = line.conversionId ? item.unitConversions.find(entry => entry.id === line.conversionId && entry.alternateUnitId === line.selectedUnitId && entry.alternateUnit.active) : null;
  if (!(line.conversionId === null && line.selectedUnitId === item.baseUnitId) && !conversion) reject("reference", unavailableUnit(item.name));
  return { item, conversion };
}

// Retain the reviewed labels and factor until the selected unit changes.
export function openingLineSnapshot(line: OpeningStockLineInput, previous: LineSnapshot | undefined, { item, conversion }: Awaited<ReturnType<typeof readOpeningLineSelection>>) {
  const unchanged = previous && previous.selectedUnitId === line.selectedUnitId && previous.conversionId === line.conversionId;
  const selected = conversion?.alternateUnit ?? item.baseUnit;
  const conversionFactor = unchanged ? previous.conversionFactor : conversion?.baseUnitQuantity ?? "1";
  return { itemName: unchanged ? previous.itemName : item.name,
    selectedUnitName: unchanged ? previous.selectedUnitName : selected.name, selectedUnitAbbreviation: unchanged ? previous.selectedUnitAbbreviation : selected.abbreviation,
    baseUnitId: item.baseUnitId, baseUnitName: unchanged ? previous.baseUnitName : item.baseUnit.name, baseUnitAbbreviation: unchanged ? previous.baseUnitAbbreviation : item.baseUnit.abbreviation,
    conversionFactor, calculatedBaseUnitQuantity: openingStockProduct(line.quantity, conversionFactor), lineAmount: line.openingUnitCost === "" ? null : openingStockProduct(line.quantity, line.openingUnitCost) };
}

const postingMessages = {
  count: { quantity: "Enter a positive counted quantity.", cost: "Enter an explicit opening unit cost of zero or more.", acknowledgment: "Acknowledge the zero-cost lines in review.", validation: "Complete the highlighted count fields before posting." },
  omitted: { quantity: "Enter a positive quantity.", cost: "Enter an explicit cost of zero or more.", acknowledgment: "Acknowledge zero-cost lines in review.", validation: "Complete the correction fields before posting." },
};
export async function validateOpeningLineForPosting(database: Prisma.TransactionClient, line: Pick<SavedLine, "itemId" | "itemName" | "selectedUnitId" | "baseUnitId" | "conversionId" | "conversionFactor" | "quantity" | "openingUnitCost" | "zeroCostReason" | "calculatedBaseUnitQuantity" | "lineAmount">, index: number, zeroCostAcknowledged: boolean, kind: keyof typeof postingMessages, reject: Reject) {
  const messages = postingMessages[kind];
  const fields: Record<string, string> = {};
  let quantityValid = false; let costValid = false;
  try { quantityValid = decimalRational(line.quantity).numerator > BigInt(0); } catch {}
  try { costValid = line.openingUnitCost !== "" && decimalRational(line.openingUnitCost).numerator >= BigInt(0); } catch {}
  if (!quantityValid) fields[`lines.${index}.quantity`] = messages.quantity;
  if (!costValid) fields[`lines.${index}.openingUnitCost`] = messages.cost;
  if (costValid && decimalRational(line.openingUnitCost).numerator === BigInt(0)) {
    if (!line.zeroCostReason.trim()) fields[`lines.${index}.zeroCostReason`] = "Explain the assigned zero cost.";
    if (!zeroCostAcknowledged) fields.zeroCostAcknowledged = messages.acknowledgment;
  }
  if (Object.keys(fields).length) reject("validation", messages.validation, fields);
  const item = await database.item.findFirst({ where: { id: line.itemId, isActive: true }, include: { baseUnit: true } });
  const selected = await database.unit.findFirst({ where: { id: line.selectedUnitId, active: true } });
  if (kind === "count" && (!item?.baseUnit.active || !selected || item.baseUnitId !== line.baseUnitId)) reject("reference", `${line.itemName}: Item or units changed. Reselect and review this line.`);
  const conversion = line.conversionId ? await database.itemUnitConversion.findFirst({ where: { id: line.conversionId, itemId: line.itemId, alternateUnitId: line.selectedUnitId } }) : null;
  // Keep the initial count's separate conversion error and omitted stock's exact Base Unit factor check.
  if (kind === "count") {
    const base = !line.conversionId && line.selectedUnitId === item!.baseUnitId;
    if ((!base && !conversion) || (conversion && compareRational(decimalRational(conversion.baseUnitQuantity), decimalRational(line.conversionFactor)) !== 0)) reject("reference", `${line.itemName}: its conversion changed. Remove and reselect the Item, then review its count.`);
  } else if (!item?.baseUnit.active || !selected || item.baseUnitId !== line.baseUnitId || (line.conversionId ? !conversion || compareRational(decimalRational(conversion.baseUnitQuantity), decimalRational(line.conversionFactor)) !== 0 : line.selectedUnitId !== item.baseUnitId || line.conversionFactor !== "1")) reject("reference", `${line.itemName}: Item or conversion changed. Remove and reselect the line, then review.`);
  const quantity = openingStockProduct(line.quantity, line.conversionFactor);
  const amount = openingStockProduct(line.quantity, line.openingUnitCost);
  if (!quantity || amount === null || (kind === "count" && decimalRational(quantity).numerator <= BigInt(0)) || quantity !== line.calculatedBaseUnitQuantity || amount !== line.lineAmount) reject("reference", kind === "count" ? `${line.itemName}: count evidence is incomplete. Save and review the line again.` : "Correction quantity or value evidence is incomplete. Save and review again.");
  return { item: item!, selected: selected!, quantity, amount };
}
