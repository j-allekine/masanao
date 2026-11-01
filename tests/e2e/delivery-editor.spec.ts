import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function openEditor(page: Page, role = "staff") {
  const id = `delivery-editor-${randomUUID()}`;
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try { db.prepare('INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').run(id,id,id,"e2e-vendor-acme"); } finally { db.close(); }
  expect((await page.request.post("/api/auth/sign-in/username", {data:{username: role === "admin" ? "municipal.admin" : "kitchen.staff",password:role === "admin" ? "administrator-password" : "correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  await page.goto(`/purchase-orders/${id}`);
  await page.getByRole("link",{name:"Record delivery",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/${id}/record-delivery`),{timeout:60_000});
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible({timeout:30_000});
  return id;
}
async function selectRice(page: Page, index: number) {
  await page.getByRole("combobox",{name:"Item",exact:true}).nth(index).fill("Rice");
  await page.getByRole("option",{name:"Rice",exact:true}).click();
}
for (const role of ["staff","admin"]) test(`delivery ${role}: twelve lines, exact conversion, responsive focus and atomic post`, async ({page},info) => {
  test.setTimeout(150_000);
  const id = await openEditor(page,role);
  await expect(page.getByRole("textbox",{name:"Receipt number",exact:true})).toBeFocused();
  await page.setViewportSize({width:320,height:480});
  await page.getByRole("textbox",{name:"Receipt number",exact:true}).fill(`DR-${id}`);
  for (let index=0;index<12;index++) {
    if(index) await page.getByRole("button",{name:"Add line",exact:true}).click();
    await selectRice(page,index);
    if(index === 1) {
      await page.getByRole("combobox",{name:"Unit",exact:true}).nth(index).click();
      await page.getByRole("option",{name:/Gram/}).click();
    }
    await page.getByRole("textbox",{name:"Quantity",exact:true}).nth(index).fill(index===1 ? "1000.5" : "0.1");
    await page.getByRole("textbox",{name:"Unit price",exact:true}).nth(index).fill("0.125");
  }
  await page.getByRole("textbox",{name:"Quantity",exact:true}).nth(11).fill(".");
  await page.getByRole("button",{name:"Post delivery",exact:true}).click();
  await expect(page.getByText("Could not post Delivery Receipt",{exact:true})).toBeVisible();
  await expect(page.getByRole("textbox",{name:"Quantity",exact:true}).nth(11)).toHaveAttribute("aria-invalid","true");
  await page.getByRole("textbox",{name:"Quantity",exact:true}).nth(11).fill("0.1");
  await page.getByRole("button",{name:"Add line",exact:true}).click();
  await page.getByRole("button",{name:"Remove delivery line 13",exact:true}).click();
  await expect(page.getByRole("combobox",{name:"Item",exact:true}).nth(11)).toBeFocused();
  await expect(page.locator("tfoot")).toContainText("₱ 125.20");
  await page.getByRole("textbox",{name:"Quantity",exact:true}).nth(11).focus();
  const focused = await page.locator(":focus").getAttribute("id");
  for (const width of [1280,1024,320]) {
    await page.setViewportSize({width,height:480});
    expect(await page.locator(":focus").getAttribute("id")).toBe(focused);
    await expect.poll(async () => page.locator(":focus").evaluate(el => {
      const field=el.getBoundingClientRect(); const body=document.querySelector("[data-delivery-entry-body]")!.getBoundingClientRect();
      return field.top >= body.top && field.bottom <= body.bottom;
    })).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.getByRole("dialog",{name:"Record delivery",exact:true}).evaluate(el=>{
      const rect=el.getBoundingClientRect(); return rect.left>=16 && rect.right<=innerWidth-16;
    })).toBe(true);
    const body = page.locator("[data-delivery-entry-body]");
    expect(await body.evaluate(el=>el.clientHeight)).toBeGreaterThan(100);
    expect(await body.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`delivery-${role}-${width}.png`),fullPage:true,animations:"disabled"});
  }
  await page.getByRole("button",{name:"Post delivery",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/purchase-orders/${id}.*#delivery-receipt-`),{timeout:30_000});
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    const receipt = db.prepare('SELECT id FROM delivery_receipt WHERE purchaseOrderId=?').get(id) as {id:string};
    await expect(page.locator(`#inspect-receipt-${receipt.id}`)).toBeFocused();
    expect(db.prepare('SELECT COUNT(*) as count FROM delivery_receipt_line WHERE deliveryReceiptId=?').get(receipt.id)).toEqual({count:12});
    expect(db.prepare('SELECT COUNT(*) as count FROM inventory_ledger_movement WHERE deliveryReceiptLineId IN (SELECT id FROM delivery_receipt_line WHERE deliveryReceiptId=?)').get(receipt.id)).toEqual({count:12});
    expect(db.prepare('SELECT calculatedBaseUnitQuantity FROM delivery_receipt_line WHERE deliveryReceiptId=? AND enteredQuantity=?').get(receipt.id,"1000.5")).toEqual({calculatedBaseUnitQuantity:"1.0005"});
  } finally {db.close();}
});

test("delivery stale Item retains long entry and exact decimals for a successful retry",async({page})=>{
  test.setTimeout(90_000);
  const itemId = `delivery-item-${randomUUID()}`;
  const itemName = `Delivery ingredient ${randomUUID()} for the municipal kitchen`;
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,isActive,reorderLevel,issuanceQuantityPolicy,createdAt,updatedAt) VALUES (?,?,?,'default-category-staples-dry-goods','default-unit-kilogram',1,0,'allow-decimals',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(itemId,itemName,itemName.toLowerCase());
    const id = await openEditor(page);
    await page.setViewportSize({width:320,height:480});
    await page.getByRole("textbox",{name:"Receipt number",exact:true}).fill(`Retry-${id}`);
    await page.getByRole("combobox",{name:"Item",exact:true}).fill(itemName);
    await page.getByRole("option",{name:itemName,exact:true}).click();
    await page.getByRole("textbox",{name:"Quantity",exact:true}).fill("0.0005");
    await page.getByRole("textbox",{name:"Unit price",exact:true}).fill("12.3456");
    db.prepare("UPDATE item SET isActive=0 WHERE id=?").run(itemId);
    await page.getByRole("button",{name:"Post delivery",exact:true}).click();
    await expect(page.getByText("Could not post Delivery Receipt",{exact:true})).toBeVisible();
    await expect(page.getByRole("combobox",{name:"Item",exact:true})).toHaveAttribute("aria-invalid","true");
    await expect(page.getByRole("textbox",{name:"Quantity",exact:true})).toHaveValue("0.0005");
    expect(db.prepare("SELECT COUNT(*) AS count FROM delivery_receipt WHERE purchaseOrderId=?").get(id)).toEqual({count:0});
    db.prepare("UPDATE item SET isActive=1 WHERE id=?").run(itemId);
    await page.getByRole("button",{name:"Post delivery",exact:true}).click();
    await expect(page).toHaveURL(new RegExp(`/purchase-orders/${id}.*#delivery-receipt-`));
    expect(db.prepare("SELECT calculatedBaseUnitQuantity,unitPrice,lineAmount FROM delivery_receipt_line WHERE itemId=?").get(itemId)).toEqual({calculatedBaseUnitQuantity:"0.0005",unitPrice:"12.3456",lineAmount:"0.0061728"});
  } finally { db.close(); }
});

test("delivery unsaved exits, reversible values, indexed history and failed posting",async({page})=>{
  test.setTimeout(120_000);
  const id=await openEditor(page);
  const receipt = page.getByRole("textbox",{name:"Receipt number",exact:true});
  await receipt.fill("unsaved");
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button",{name:"Keep editing",exact:true}).click();
  await expect(receipt).toHaveValue("unsaved");
  await page.keyboard.press("Escape");
  await page.getByRole("button",{name:"Keep editing",exact:true}).click();
  await page.goBack();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button",{name:"Keep editing",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/${id}/record-delivery`));
  await page.getByRole("button",{name:"Post delivery",exact:true}).click();
  await expect(page.getByText("Could not post Delivery Receipt",{exact:true})).toBeVisible();
  await expect(receipt).toHaveValue("unsaved");
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await page.getByRole("button",{name:"Keep editing",exact:true}).click();
  await expect(page.getByText("Could not post Delivery Receipt",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await page.getByRole("button",{name:"Discard changes",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/purchase-orders/${id}$`));
  await page.getByRole("link",{name:"Record delivery",exact:true}).click();
  await receipt.fill("reverted"); await receipt.fill("");
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/purchase-orders/${id}$`));
});

test("delivery pending prevents repeated submit and app exits, then recovers",async({page})=>{
  test.setTimeout(90_000);
  const id = await openEditor(page);
  await page.getByRole("textbox",{name:"Receipt number",exact:true}).fill("pending receipt");
  let release!: () => void;
  const held = new Promise<void>(resolve => {release=resolve;});
  await page.route("**/record-delivery",async route => {
    if(route.request().method() === "POST") await held;
    await route.continue();
  });
  await page.getByRole("button",{name:"Post delivery",exact:true}).click();
  await expect(page.getByRole("form",{name:"Record delivery"})).toHaveAttribute("aria-busy","true");
  await expect(page.getByRole("button",{name:"Posting...",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Cancel",exact:true})).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog",{name:"Record delivery",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Close",exact:true}).click();
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/${id}/record-delivery`));
  release();
  await expect(page.getByText("Could not post Delivery Receipt",{exact:true})).toBeVisible({timeout:30_000});
  await expect(page.getByRole("textbox",{name:"Receipt number",exact:true})).toHaveValue("pending receipt");
  await expect(page.getByRole("button",{name:"Post delivery",exact:true})).toBeEnabled();
  await expect(page.getByRole("button",{name:"Cancel",exact:true})).toBeEnabled();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/${id}/record-delivery`));
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button",{name:"Keep editing",exact:true}).click();
});

test("delivery indexed discard, Forward and reload keep a fresh editor guarded",async({page})=>{
  const id = await openEditor(page);
  const receipt = page.getByRole("textbox",{name:"Receipt number",exact:true});
  await receipt.fill("discard through history");
  await page.goBack();
  await page.getByRole("button",{name:"Discard changes",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/purchase-orders/${id}$`));
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/${id}/record-delivery`));
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await expect(receipt).toHaveValue("");
  await page.reload();
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await receipt.fill("after reload");
  await page.goBack();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button",{name:"Keep editing",exact:true}).click();
  await expect(receipt).toHaveValue("after reload");
  await expect(page).toHaveURL(new RegExp(`/${id}/record-delivery`));
});

test("delivery short enlarged text, native unload, new-tab and sidebar exits",async({page},info)=>{
  test.setTimeout(90_000);
  const id=await openEditor(page);
  await page.setViewportSize({width:320,height:480});
  await page.addStyleTag({content:"html { font-size:200% } nextjs-portal { display:none!important }"});
  const body=page.locator("[data-delivery-entry-body]");
  await page.screenshot({path:info.outputPath("delivery-200-text-settled.png"),fullPage:true,animations:"disabled"});
  expect(await body.evaluate(el=>el.clientHeight)).toBeGreaterThan(90);
  expect(await page.getByRole("dialog",{name:"Record delivery",exact:true}).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  expect(await body.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  expect(await page.getByRole("dialog",{name:"Record delivery",exact:true}).evaluate(el=>[...el.querySelectorAll("*")].filter(child=>["auto","scroll"].includes(getComputedStyle(child).overflowY) && child.scrollHeight>child.clientHeight).length)).toBe(1);
  await page.getByRole("textbox",{name:"Receipt number",exact:true}).fill("native changes");
  await expect.poll(async()=>page.getByRole("textbox",{name:"Receipt number",exact:true}).evaluate(el=>{
    const field=el.getBoundingClientRect(), body=document.querySelector("[data-delivery-entry-body]")!.getBoundingClientRect();
    return field.left>=body.left && field.right<=body.right && field.top>=body.top && field.bottom<=body.bottom;
  })).toBe(true);
  await page.screenshot({path:info.outputPath("delivery-200-text-320x480.png"),animations:"disabled"});
  const nativeDialog=page.waitForEvent("dialog");
  const reload=page.reload({timeout:3000}).catch(()=>null);
  const dialog=await nativeDialog;
  expect(dialog.type()).toBe("beforeunload"); await dialog.dismiss(); await reload;
  await expect(page.getByRole("textbox",{name:"Receipt number",exact:true})).toHaveValue("native changes");
  await page.evaluate(()=>{const a=document.createElement("a");a.href="/inventory";a.target="_blank";a.textContent="Test new tab";a.id="delivery-new-tab";document.querySelector("form")!.append(a);});
  const popupPromise=page.waitForEvent("popup");
  await page.locator("#delivery-new-tab").click({force:true});
  await (await popupPromise).close();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.evaluate(()=>{const a=document.createElement("a");a.href="/inventory";a.textContent="Inventory exit";a.id="delivery-sidebar-exit";document.querySelector("form")!.append(a);});
  await page.locator("#delivery-sidebar-exit").click({force:true});
  const discard = page.getByRole("alertdialog");
  await expect(discard).toBeVisible();
  await expect(discard.getByRole("heading",{name:"Discard this delivery?",exact:true})).toBeInViewport();
  expect(await discard.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  for (const name of ["Keep editing","Discard changes"]) {
    const action=discard.getByRole("button",{name,exact:true});
    await action.focus();
    expect(await action.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
    expect(await action.evaluate(el=>{
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()) {
        const text=walker.currentNode;
        for(const word of text.textContent!.matchAll(/\S+/g)) {
          const range=document.createRange();
          range.setStart(text,word.index!); range.setEnd(text,word.index!+word[0].length);
          if(range.getClientRects().length>1) return false;
        }
      }
      return true;
    })).toBe(true);
    await expect.poll(async()=>action.evaluate(el=>{
      const action=el.getBoundingClientRect(), popup=el.closest('[role="alertdialog"]')!.getBoundingClientRect();
      return action.top>=popup.top && action.bottom<=popup.bottom && action.left>=popup.left && action.right<=popup.right;
    })).toBe(true);
  }
  await page.screenshot({path:info.outputPath("delivery-discard-200-text-320x480.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Keep editing",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/${id}/record-delivery`));
});
