import { getRecipeListUrl } from "./recipe-list-state";

/** Accept feature-owned destinations only; never navigate an arbitrary return URL. */
export function recipeCatalogReturn(value: string | null | undefined): string {
  if (!value || /%(?![0-9a-f]{2})/i.test(value) || !value.startsWith("/recipes") || /[\\#\r\n]/.test(value)) return "/recipes";
  try {
    const url = new URL(value, "https://recipe.local");
    if (url.origin !== "https://recipe.local" || url.pathname !== "/recipes") return "/recipes";
    if ([...url.searchParams.keys()].some(key => !["recipesSearch", "recipesPage"].includes(key))) return "/recipes";
    if ([...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length !== 1)) return "/recipes";
    const page = url.searchParams.get("recipesPage");
    if (page !== null && !/^[1-9]\d*$/.test(page)) return "/recipes";
    if (page !== null && !Number.isSafeInteger(Number(page))) return "/recipes";
    return getRecipeListUrl("/recipes", "", { search: url.searchParams.get("recipesSearch") ?? "", page: Number(page ?? 1) });
  } catch { return "/recipes"; }
}

export function recipeRecordHref(id: string, catalog: string) {
  const path = `/recipes/${encodeURIComponent(id)}`;
  return catalog === "/recipes" ? path : `${path}?${new URLSearchParams({ returnTo: catalog })}`;
}

export function recipeEditorReturn(value: string | null | undefined, id?: string) {
  if (id && value?.startsWith("/recipes/") && !/%(?![0-9a-f]{2})/i.test(value)) {
    try {
      const url = new URL(value, "https://recipe.local");
      if (url.origin === "https://recipe.local" && url.pathname === `/recipes/${encodeURIComponent(id)}` && !url.hash && !/[\\\r\n]/.test(value) && [...url.searchParams.keys()].every(key => key === "returnTo") && url.searchParams.getAll("returnTo").length <= 1) {
        return recipeRecordHref(id, recipeCatalogReturn(url.searchParams.get("returnTo")));
      }
    } catch { /* Fall back to the catalog. */ }
  }
  return recipeCatalogReturn(value);
}

export function recipeEditorHref(id: string | null, returnTo: string) {
  const path = id ? `/recipes/${encodeURIComponent(id)}/edit` : "/recipes/new";
  return returnTo === "/recipes" ? path : `${path}?${new URLSearchParams({ returnTo })}`;
}

export function recipeSaveHref(id: string, returnTo: string) {
  const url = new URL(returnTo, "https://recipe.local");
  return recipeRecordHref(id, url.pathname === "/recipes" ? recipeCatalogReturn(returnTo) : recipeCatalogReturn(url.searchParams.get("returnTo")));
}
