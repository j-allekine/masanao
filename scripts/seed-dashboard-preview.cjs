// Fictional review data only. This script cannot target DATABASE_URL or another database.
const path = require("node:path");
const Database = require("better-sqlite3");

if (process.argv.length !== 3 || process.argv[2] !== "--preview-only") {
  throw Error("Run from the repository root with --preview-only. Only the isolated Dashboard preview is supported.");
}
const previewPath = path.resolve(__dirname, "..", ".next-e2e-dashboard-preview.db");
if (previewPath !== path.join(process.cwd(), ".next-e2e-dashboard-preview.db")) throw Error("Run from this repository root.");
const db = new Database(previewPath, { fileMustExist: true });
db.pragma("foreign_keys = ON");
const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const month = today.slice(0, 7);
const prefix = `dashboard-sample-${month}`;
const id = (name) => `${prefix}-${name}`;
let sampleUnit = `samplekg-${month}`;
const receiptDay = `${month}-01T00:00:00.000Z`;
const created = new Date(`${month}-01T00:00:00+08:00`).toISOString();
const scenarios = [
  { key: "feeding", name: "Community feeding", office: "Social Welfare", budget: 50000, meals: [["Breakfast", 10000], ["Lunch", 20000], ["Dinner", 12000]] },
  { key: "response", name: "Disaster response training", office: "Disaster Risk Reduction", budget: 30000, meals: [["Breakfast", 11000], ["Lunch", 22000]] },
  { key: "workshop", name: "Youth leadership workshop", office: "Youth Development", budget: 20000, meals: [["Lunch", 15000], ["Afternoon snack", 5000]] },
  { key: "outreach", name: "Health outreach", office: "Municipal Health", budget: 18000, meals: [["Lunch", null]] },
  { key: "staff", name: "Staff development", office: "Human Resources", budget: 15000, meals: [["Lunch", 9000], ["Dinner", "draft"]] },
  { key: "seniors", name: "Senior citizens assembly", office: "Social Welfare", budget: 25000, meals: [["Lunch", 18000], ["Afternoon snack", 3000]] },
  { key: "farmers", name: "Farmers consultation", office: "Municipal Agriculture", budget: 12000, meals: [["Breakfast", 4000], ["Lunch", 9500]] },
  { key: "nutrition", name: "Nutrition planning", office: "Municipal Health", budget: 18000, meals: [["Lunch", 18000]] },
  { key: "barangay", name: "Barangay coordination", office: "Mayor’s Office", budget: 14000, meals: [["Lunch", 8000], ["Dinner", "draft"]] },
  { key: "women", name: "Women’s livelihood forum", office: "Gender and Development", budget: 22000, meals: [["Lunch", 15000], ["Afternoon snack", null]] },
  { key: "volunteers", name: "Volunteer orientation", office: "Disaster Risk Reduction", budget: null, meals: [["Lunch", 4500]] },
  { key: "emergency", name: "Emergency response briefing", office: "Disaster Risk Reduction", budget: 0, meals: [["Lunch", 2800]] },
  { key: "scholars", name: "Scholars recognition", office: "Youth Development", budget: 30000, meals: [["Lunch", 19000], ["Afternoon snack", 6000]] },
  { key: "sanitation", name: "Sanitation workshop", office: "Municipal Health", budget: 10000, meals: [["Lunch", "draft"]] },
  { key: "tourism", name: "Tourism stakeholders meeting", office: "Tourism Office", budget: 16000, meals: [] },
  { key: "coastal", name: "Coastal cleanup volunteers", office: "Environment Office", budget: 20000, meals: [["Breakfast", 5000], ["Lunch", 11000]] },
  { key: "procurement", name: "Procurement planning", office: "General Services", budget: 18000, meals: [["Lunch", 14500]] },
  { key: "sports", name: "Youth sports coordination", office: "Youth Development", budget: 24000, meals: [["Lunch", 18000], ["Dinner", 9000]] },
  { key: "livelihood", name: "Livelihood assessment", office: "Social Welfare", budget: 12500, meals: [["Lunch", 10000], ["Afternoon snack", 2500]] },
  { key: "planning", name: "Local development planning", office: "Planning Office", budget: 35000, meals: [["Breakfast", 10000], ["Lunch", 20000], ["Dinner", "draft"]] },
];

try {
  let added = 0;
  db.transaction(() => {
    if (!db.prepare("SELECT id FROM activity_design WHERE id=?").get(id("design"))) {
    db.prepare("INSERT INTO unit (id,name,abbreviation,normalizedName,normalizedAbbreviation,active,createdAt,updatedAt) VALUES (?,?,?,?,?,1,?,?)").run(id("unit"), "Sample · Kilogram", sampleUnit, id("unit"), sampleUnit, created, created);
    db.prepare("INSERT INTO category (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES (?,?,?,1,?,?)").run(id("category"), "Sample · Supplies", id("category"), created, created);
    db.prepare("INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES (?,?,?,1,?,?)").run(id("vendor"), "Sample · Kitchen supplier", id("vendor"), created, created);
    db.prepare("INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,?,?,?)").run(id("po"), `SAMPLE-PO-${month}`, `sample-po-${month}`, id("vendor"), created, created);
    db.prepare("INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,'0',1,?,?)").run(id("item"), "Sample · Rice", id("item"), id("category"), id("unit"), created, created);
    db.prepare("INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES (?,?,?,?,?,?)").run(id("design"), `SAMPLE-AD-${month}`, Number(today.slice(0, 4)), "Sample · Budget accounting examples", created, created);
    }
    sampleUnit = db.prepare("SELECT abbreviation FROM unit WHERE id=?").get(id("unit")).abbreviation;
    for (const [index, scenario] of scenarios.entries()) {
      const activityId = id(scenario.key);
      if (db.prepare("SELECT id FROM activity WHERE id=?").get(activityId)) continue;
      added++;
      const day = `${month}-${String(Math.max(1, Number(today.slice(8)) - 1 - index)).padStart(2, "0")}`;
      const postedAt = new Date(`${day}T00:00:00+08:00`).toISOString();
      const priced = scenario.meals.every(([, amount]) => amount !== null);
      const amount = scenario.meals.reduce((sum, [, value]) => sum + (typeof value === "number" ? value : 0), 0);
      const received = String(amount / 100 + scenario.meals.filter(([, value]) => value === null).length * 100);
      const receiptId = id(`receipt-${scenario.key}`);
      const lineId = id(`line-${scenario.key}`);
      const receiptNo = `SAMPLE-DR-${month}-${index + 1}`;
      const hasPostedMeals = scenario.meals.some(([, value]) => value !== "draft");
      if (hasPostedMeals) {
      db.prepare("INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt,note) VALUES (?,?,?,?,?,?,?,?,?,?)").run(receiptId, id("po"), id("vendor"), "Sample · Kitchen supplier", `SAMPLE-PO-${month}`, receiptNo, receiptNo.toLowerCase(), receiptDay, created, "Fictional preview data. Not a real purchase.");
      db.prepare("INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity,unitPrice,lineAmount) VALUES (?,?,?,?,?,'Sample · Rice','Sample · Kilogram','Sample · Kilogram',?,'1',?,?,?)").run(lineId, receiptId, id("item"), id("unit"), id("unit"), received, received, priced ? "100" : null, priced ? String(amount) : null);
      db.prepare("INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,?,?,?,'stock-in',?)").run(id(`in-${scenario.key}`), lineId, id("item"), id("unit"), received, receiptDay);
      }
      db.prepare("INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedBudgetCentavos,plannedParticipantCount,createdAt,updatedAt) VALUES (?,?,?,?,?,?,100,?,?)").run(activityId, id("design"), `Sample · ${scenario.name}`, scenario.office, `${day}T00:00:00.000Z`, scenario.budget === null ? null : scenario.budget * 100, created, created);
      for (const [mealIndex, [label, cost]] of scenario.meals.entries()) {
        const mealId = id(`${scenario.key}-meal-${mealIndex}`);
        const recordId = `${mealId}-issue`;
        const totalId = `${mealId}-total`;
        const time = label === "Breakfast" ? "08:00" : label === "Dinner" ? "18:00" : label === "Afternoon snack" ? "15:00" : "12:00";
        db.prepare("INSERT INTO meal_schedule (id,activityId,label,mealTime,plannedServings,createdAt,updatedAt) VALUES (?,?,?,?,100,?,?)").run(mealId, activityId, label, time, created, created);
        if (cost === "draft") {
          db.prepare("INSERT INTO issuance_record (id,mealScheduleId,mealPax,revision,status,createdAt,updatedAt) VALUES (?,?,100,1,'draft',?,?)").run(recordId, mealId, created, created);
          continue;
        }
        const quantity = cost === null ? "100" : String(cost / 100);
        const stock = { id: `${mealId}-stock`, itemId: id("item"), itemName: "Sample · Rice", enteredQuantity: quantity, conversionId: null, conversionFactor: "1", selectedUnitId: id("unit"), selectedUnitName: "Sample · Kilogram", selectedUnitAbbreviation: sampleUnit, baseUnitId: id("unit"), baseUnitName: "Sample · Kilogram", baseUnitAbbreviation: sampleUnit };
        const total = { itemId: id("item"), calculatedNumerator: quantity, calculatedDenominator: "1", finalQuantity: quantity, adjusted: false };
        const evidence = { context: { activityDesignId: id("design"), activityId, mealScheduleId: mealId, activityDesignNo: `SAMPLE-AD-${month}`, activityDesignTitle: "Sample · Budget accounting examples", activityName: `Sample · ${scenario.name}`, mealLabel: label, mealTime: time, plannedPax: 100 },
          draft: { id: recordId, revision: 1, status: "posted", mealPax: 100, recipes: [], stockItems: [stock], itemTotals: [total] },
          review: [{ ...total, itemName: stock.itemName, baseUnitId: stock.baseUnitId, baseUnitName: stock.baseUnitName, baseUnitAbbreviation: stock.baseUnitAbbreviation, calculatedQuantity: quantity, calculatedApproximate: false, automaticQuantity: quantity, policy: "allow-decimals", warning: null, availableQuantity: received, shortage: false,
            receiptAllocations: [{ receiptLineId: lineId, quantity, receiptNo, purchaseOrderNo: `SAMPLE-PO-${month}`, receiptDate: receiptDay, basis: "fifo" }] }], reviewPending: false, reviewReferences: [],
          posted: { postedAt, actorId: "sample-preview", actorName: "Sample preview", actorUsername: "sample.preview" } };
        db.prepare("INSERT INTO issuance_record (id,mealScheduleId,mealPax,revision,status,postedAt,postingEvidence,createdAt,updatedAt) VALUES (?,?,100,1,'posted',?,?,?,?)").run(recordId, mealId, postedAt, JSON.stringify(evidence), created, created);
        db.prepare("INSERT INTO issuance_stock_item (id,issuanceRecordId,itemId,itemName,enteredQuantity,conversionFactor,selectedUnitId,selectedUnitName,selectedUnitAbbreviation,baseUnitId,baseUnitName,baseUnitAbbreviation) VALUES (?,?,?,?,?,'1',?,?,?,?,?,?)").run(stock.id, recordId, stock.itemId, stock.itemName, quantity, stock.selectedUnitId, stock.selectedUnitName, stock.selectedUnitAbbreviation, stock.baseUnitId, stock.baseUnitName, stock.baseUnitAbbreviation);
        db.prepare("INSERT INTO issuance_item_total (id,issuanceRecordId,itemId,calculatedNumerator,calculatedDenominator,finalQuantity,adjusted) VALUES (?,?,?,?,'1',?,0)").run(totalId, recordId, stock.itemId, quantity, quantity);
        db.prepare("INSERT INTO issuance_receipt_allocation (id,issuanceItemTotalId,deliveryReceiptLineId,quantity,basis,receiptNo,purchaseOrderNo,receiptDate) VALUES (?,?,?,?,'fifo',?,?,?)").run(`${mealId}-allocation`, totalId, lineId, quantity, receiptNo, `SAMPLE-PO-${month}`, receiptDay);
        db.prepare("INSERT INTO inventory_ledger_movement (id,issuanceItemTotalId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,?,?,?,'stock-out',?)").run(`${mealId}-out`, totalId, stock.itemId, stock.baseUnitId, quantity, postedAt);
      }
    }
    if (db.pragma("foreign_key_check").length) throw Error("Preview seed failed its reference checks.");
    console.log(`Added ${added} fictional Activities for ${month}. ${scenarios.length} sample scenarios available in the isolated preview only.`);
  })();
} finally { db.close(); }
