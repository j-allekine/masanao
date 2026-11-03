import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const fixture = `return-focus-${randomUUID()}`;
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    for (let i=0;i<24;i++) {
      const name=`${fixture}-${String(i).padStart(2,"0")}`;
      db.prepare("INSERT INTO recipe (id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES (?,?,?,50,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`recipe-${name}`,name,name);
      db.prepare("INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,'e2e-vendor-acme',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`po-${name}`,name,name);
    }
    for(let i=0;i<12;i++) {
      const id=`focus-ingredient-${fixture}-${i}`, name=`${fixture} ingredient ${i} ${"municipal kitchen ".repeat(4)}`.slice(0,100);
      db.prepare("INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,isActive,reorderLevel,createdAt,updatedAt) VALUES (?,?,?,'default-category-staples-dry-goods','default-unit-kilogram',1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id,name,name.toLowerCase());
      db.prepare("INSERT INTO recipe_ingredient (id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES (?,?,?,'0.125',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id,`recipe-${fixture}-00`,id);
    }
  } finally { db.close(); }
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    // These twelve Items must not change another file's unfiltered Inventory page.
    db.prepare("DELETE FROM recipe_ingredient WHERE recipeId LIKE ?").run(`recipe-${fixture}-%`);
    db.prepare("DELETE FROM recipe WHERE id LIKE ?").run(`recipe-${fixture}-%`);
    db.prepare("DELETE FROM purchase_order WHERE id LIKE ?").run(`po-${fixture}-%`);
    db.prepare("DELETE FROM item WHERE id LIKE ?").run(`focus-ingredient-${fixture}-%`);
  } finally { db.close(); }
});

type Feature = "recipes" | "purchase-orders";
async function signIn(page: Page, role: "admin" | "staff" = "admin") {
  expect((await page.request.post("/api/auth/sign-in/username",{data:{username:role==="admin" ? "municipal.admin" : "kitchen.staff",password:role==="admin" ? "administrator-password" : "correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
}
async function ready(page: Page) {
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible({timeout:30_000});
}
function settings(feature: Feature) {
  const recipe=feature==="recipes";
  return { recipe, searchLabel:recipe ? "Search Recipes" : "Search Purchase Orders", parentLabel:recipe ? "Recipes" : "Purchase Orders", rowAttribute:recipe ? "data-recipe-id" : "data-purchase-order-id", prefix:recipe ? "recipe-row-" : "purchase-order-row-", searchKey:recipe ? "recipesSearch" : "purchaseOrdersSearch", pageKey:recipe ? "recipesPage" : "purchaseOrdersPage" };
}
function catalogUrl(feature: Feature,page=2,search=fixture) {
  const {searchKey,pageKey}=settings(feature);
  return `/${feature}?${new URLSearchParams({[searchKey]:search,...(page>1 ? {[pageKey]:String(page)} : {})})}`;
}
for(const feature of ["recipes","purchase-orders"] as const) for(const role of ["admin","staff"] as const) test(`${feature} ${role}: explicit page-two return, native links, reload and history focus`,async({page},info)=>{
  test.setTimeout(120_000);
  await signIn(page,role);
  await page.setViewportSize({width:role==="staff" ? 320 : 1280,height:480});
  const {recipe,rowAttribute,prefix,searchLabel,parentLabel,searchKey,pageKey}=settings(feature);
  const catalog=catalogUrl(feature);
  const rowSelector=`[${rowAttribute}]`;
  await page.goto(catalog);
  await ready(page);
  await expect(page.locator(rowSelector)).toHaveCount(10,{timeout:30_000});
  const row=page.locator(rowSelector).nth(4);
  const id=(await row.getAttribute(rowAttribute))!;
  const recordLink=row.getByRole("link").first();
  const name=(await recordLink.innerText()).trim();
  await recordLink.click();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible({timeout:60_000});
  const parent=page.getByRole("navigation",{name:"breadcrumb"}).getByRole("link",{name:parentLabel,exact:true});
  const returnHref=`${catalog}#${prefix}${encodeURIComponent(id)}`;
  await expect(parent).toHaveAttribute("href",returnHref);
  const popupPromise=page.context().waitForEvent("page",{timeout:5_000});
  await parent.click({modifiers:["Control"]});
  const popup=await popupPromise;
  await popup.bringToFront();
  await expect(popup.locator(`[id="${prefix}${id}"]`)).toBeFocused({timeout:30_000});
  await popup.close();
  await page.bringToFront();
  await parent.click();
  const search=page.getByRole("searchbox",{name:searchLabel,exact:true});
  await expect(search).toHaveValue(fixture);
  const returned=page.locator(`${rowSelector.slice(0,-1)}="${id}"]`).getByRole("link").first();
  await expect(returned).toBeFocused();
  await expect(returned).toBeInViewport();
  expect(await returned.evaluate(el=>{const rect=el.getBoundingClientRect();return rect.top>=64 && rect.bottom<=innerHeight;})).toBe(true);
  await page.screenshot({path:info.outputPath(`${feature}-${role}-return-focus.png`)});
  await page.reload();
  await ready(page);
  await expect(search).toBeEnabled();
  await expect(returned).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  await page.goForward();
  await expect(returned).toBeFocused();
  await page.getByRole("button",{name:"Next page",exact:true}).filter({visible:true}).click();
  await expect.poll(()=>page.evaluate(()=>location.hash)).toBe("");
  await expect.poll(()=>new URL(page.url()).searchParams.get(pageKey)).toBe("3");
  await expect(page.locator(rowSelector)).toHaveCount(4);
  await page.reload();
  await ready(page);
  await expect(search).toBeEnabled();
  await expect(page.locator(rowSelector)).toHaveCount(4);
  await page.goBack();
  if(recipe) await expect(returned).toBeFocused();
  else await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  await page.goForward();
  await expect(page.locator(rowSelector)).toHaveCount(4);
  await expect.poll(()=>new URL(page.url()).searchParams.get(pageKey)).toBe("3");
  await page.goto(`${catalogUrl(feature,2,` ${fixture} `).replaceAll("+","%20")}#${prefix}${encodeURIComponent(id)}`);
  await ready(page);
  await expect(returned).toBeFocused();
  await page.goto(`${catalog}#catalog-notes`);
  await ready(page);
  await search.fill(`${fixture}-1`);
  await expect.poll(()=>new URL(page.url()).searchParams.get(searchKey)).toBe(`${fixture}-1`);
  expect(new URL(page.url()).hash).toBe("#catalog-notes");
  await page.goto(returnHref);
  await ready(page);
  await expect(returned).toBeFocused();
  const typed=`${fixture}-1`;
  await search.fill(typed);
  await expect(returned).toHaveAttribute("href",new RegExp(encodeURIComponent(typed)));
  await returned.click();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  await parent.click();
  await expect(search).toHaveValue(typed);
  await expect(returned).toBeFocused();
  const missing=`${fixture}-no-match`;
  await search.fill(missing);
  await expect.poll(()=>new URL(page.url()).searchParams.get(searchKey)).toBe(missing);
  await expect(page.locator(rowSelector)).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe("");
  await page.reload();
  await ready(page);
  await expect(search).toBeEnabled();
  await expect(search).toHaveValue(missing);
  await expect(page.locator(rowSelector)).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  await page.goForward();
  await expect(search).toHaveValue(missing);
  await expect(page.locator(rowSelector)).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe("");
});

for(const feature of ["recipes","purchase-orders"] as const) test(`${feature}: renamed, unknown and deleted return rows safely focus search after page clamp`,async({page},info)=>{
  test.setTimeout(120_000);
  await signIn(page);
  const {recipe,rowAttribute,prefix,parentLabel,searchLabel,pageKey}=settings(feature);
  const rows=page.locator(`[${rowAttribute}]`);
  const search=page.getByRole("searchbox",{name:searchLabel,exact:true});
  const parent=page.getByRole("navigation",{name:"breadcrumb"}).getByRole("link",{name:parentLabel,exact:true});
  await page.goto(catalogUrl(feature));
  await expect(rows).toHaveCount(10,{timeout:30_000});
  const row=rows.nth(4), id=(await row.getAttribute(rowAttribute))!;
  const name=(await row.getByRole("link").first().innerText()).trim();
  await row.getByRole("link").first().click();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible({timeout:30_000});
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  const table=recipe ? "recipe" : "purchase_order", nameColumn=recipe ? "name" : "purchaseOrderNo", normalizedColumn=recipe ? "normalizedName" : "normalizedPurchaseOrderNo";
  try {
    db.prepare(`UPDATE ${table} SET ${nameColumn}=?,${normalizedColumn}=? WHERE id=?`).run(`Renamed ${id}`,`renamed ${id}`,id);
    await parent.click();
    await expect(search).toBeFocused();
    await expect(page.locator(`[id="${prefix}${id}"]`)).toHaveCount(0);
    db.prepare(`UPDATE ${table} SET ${nameColumn}=?,${normalizedColumn}=? WHERE id=?`).run(name,name,id);
    await page.goto(`${catalogUrl(feature)}#${prefix}unknown`);
    await expect(search).toBeFocused();
    await page.goto(`${catalogUrl(feature)}#${prefix}%FF`);
    await expect(search).toBeFocused();
    await page.goto(catalogUrl(feature,3));
    await expect(rows).toHaveCount(4);
    const ids=await rows.evaluateAll((elements,attribute)=>elements.map(el=>el.getAttribute(attribute)!),rowAttribute);
    const deletedName=(await rows.first().getByRole("link").first().innerText()).trim();
    await rows.first().getByRole("link").first().click();
    await expect(page.getByRole("heading",{name:deletedName,exact:true})).toBeVisible();
    for(const deleted of ids) db.prepare(`DELETE FROM ${table} WHERE id=?`).run(deleted);
    await parent.click();
    await expect(search).toBeFocused();
    await expect.poll(()=>new URL(page.url()).searchParams.get(pageKey)).toBe("2");
    await expect(rows).toHaveCount(10);
    await page.screenshot({path:info.outputPath(`${feature}-deleted-fallback.png`)});
    if(recipe) {
      await page.request.post("/api/auth/sign-out",{headers:{origin:process.env.BETTER_AUTH_URL!}});
      await signIn(page,"staff");
      await page.goto(`/recipes/${id}?${new URLSearchParams({returnTo:catalogUrl(feature)})}`);
      await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
      db.prepare("UPDATE recipe SET isActive=0 WHERE id=?").run(id);
      await parent.click();
      await expect(search).toBeFocused();
      await expect(page.locator(`[id="${prefix}${id}"]`)).toHaveCount(0);
      db.prepare("UPDATE recipe SET isActive=1 WHERE id=?").run(id);
    }
  } finally {db.close();}
});

test("Recipe create/edit title follows exact 639/640 inner widths and enlarged text",async({page},info)=>{
  test.setTimeout(90_000);
  await signIn(page);
  for(const path of ["/recipes/new",`/recipes/recipe-${fixture}-00/edit`]) {
    await page.goto(path);
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible({timeout:30_000});
    const heading=page.getByRole("heading",{name:path==="/recipes/new" ? "New Recipe" : "Edit Recipe",exact:true});
    const content=page.locator(".workspace-content");
    for(const scale of [1,2]) {
      await page.addStyleTag({content:`html {font-size:${scale*100}%} nextjs-portal {display:none!important}`});
      for(const inner of [639,640]) {
        await page.setViewportSize({width:1280,height:800});
        await page.locator(".workspace-pane").evaluate((el,width)=>{(el as HTMLElement).style.width=`${width+48}px`;},inner);
        await expect.poll(()=>content.evaluate(el=>el.clientWidth-parseFloat(getComputedStyle(el).paddingLeft)-parseFloat(getComputedStyle(el).paddingRight))).toBe(inner);
        await expect(heading).toHaveCSS("font-size",`${(inner===639 ? 24 : 32)*scale}px`);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        await page.screenshot({path:info.outputPath(`recipe-title-${path==="/recipes/new" ? "new" : "edit"}-${inner}-${scale}.png`)});
      }
    }
  }
});

test("Recipe keeps the twelfth raw-decimal field visible after settled enlarged-text reflow",async({page},info)=>{
  test.setTimeout(90_000);
  await signIn(page);
  await page.setViewportSize({width:320,height:480});
  await page.goto(`/recipes/recipe-${fixture}-00/edit`);
  await expect(page.getByLabel("Ingredient 12 quantity",{exact:true})).toHaveValue("0.125");
  const field=page.getByLabel("Ingredient 12 quantity",{exact:true});
  await field.fill("0.");
  await page.addStyleTag({content:"html {font-size:200%} nextjs-portal {display:none!important}"});
  await page.screenshot({path:info.outputPath("recipe-focus-200-settled.png"),animations:"disabled"});
  await expect.poll(()=>field.evaluate(el=>{
    const field=el.getBoundingClientRect(), body=document.querySelector("[data-recipe-editor-body]")!.getBoundingClientRect();
    const actions=document.querySelector("[data-recipe-editor-actions]")!.getBoundingClientRect();
    return {focused:document.activeElement===el,visible:field.top>=body.top && field.bottom<=body.bottom && field.bottom<=innerHeight && actions.bottom<=innerHeight};
  })).toMatchObject({focused:true,visible:true});
  await page.screenshot({path:info.outputPath("recipe-focus-200-after-settled.png"),animations:"disabled"});
  await expect(field).toHaveValue("0.");
  for(const width of [900,320]) {
    await page.setViewportSize({width,height:480});
    await expect.poll(()=>field.evaluate(el=>{
      const field=el.getBoundingClientRect(),body=document.querySelector("[data-recipe-editor-body]")!.getBoundingClientRect();
      const actions=document.querySelector("[data-recipe-editor-actions]")!.getBoundingClientRect();
      return field.top>=body.top && field.bottom<=body.bottom && field.bottom<=innerHeight && actions.bottom<=innerHeight && document.activeElement===el;
    })).toBe(true);
    await expect(field).toHaveValue("0.");
  }
  await page.addStyleTag({content:"html {font-size:100%}"});
  await page.setViewportSize({width:320,height:180});
  await expect.poll(()=>field.evaluate(el=>{
    const field=el.getBoundingClientRect(),body=document.querySelector("[data-recipe-editor-body]")!.getBoundingClientRect();
    return {visible:field.top>=body.top && field.bottom<=body.bottom,bodyHeight:body.height,fieldHeight:field.height};
  })).toMatchObject({visible:true});
  for(const label of ["Cancel","Save Recipe"]) {
    const action=page.getByRole("button",{name:label,exact:true});
    expect(await action.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
    await expect(action).toBeInViewport();
    expect(await action.evaluate(el=>{const rect=el.getBoundingClientRect();return rect.top>=0 && rect.bottom<=innerHeight;})).toBe(true);
  }
  await expect(field).toHaveValue("0.");
  await page.screenshot({path:info.outputPath("recipe-focus-320x180-supplementary.png"),animations:"disabled"});
});

for(const feature of ["recipes","purchase-orders"] as const) test(`${feature}: fragment-free history restores record after settled search reload`,async({page})=>{
  test.setTimeout(90_000);
  await signIn(page);
  const {rowAttribute,parentLabel,searchLabel,searchKey}=settings(feature);
  const rows=page.locator(`[${rowAttribute}]`);
  await page.goto(catalogUrl(feature));
  await ready(page);
  const link=rows.nth(4).getByRole("link").first(), name=(await link.innerText()).trim();
  await link.click();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible({timeout:30_000});
  const parent=page.getByRole("navigation",{name:"breadcrumb"}).getByRole("link",{name:parentLabel,exact:true});
  await parent.evaluate(el=>{(el as HTMLAnchorElement).hash="";});
  await parent.click();
  const search=page.getByRole("searchbox",{name:searchLabel,exact:true});
  await search.fill(`${fixture}-no-match`);
  await expect.poll(()=>new URL(page.url()).searchParams.get(searchKey)).toBe(`${fixture}-no-match`);
  await expect(rows).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(search).toBeEnabled();
  await expect(rows).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible({timeout:30_000});
  await page.goForward();
  await expect(search).toHaveValue(`${fixture}-no-match`);
  await expect(rows).toHaveCount(0);
});
