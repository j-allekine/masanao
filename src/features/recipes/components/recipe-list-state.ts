type RecipeListStateKeys = {
  search: string;
  page: string;
};

export const recipeListStateKeys: RecipeListStateKeys = {
  search: "recipesSearch",
  page: "recipesPage",
};

export function parseRecipePage(value: string | null) {
  if (!value) return 1;

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getRecipeListState(searchParams: Pick<URLSearchParams, "get">) {
  return {
    search: searchParams.get(recipeListStateKeys.search) ?? "",
    page: parseRecipePage(searchParams.get(recipeListStateKeys.page)),
  };
}

export function getRecipeListQuery(
  currentQuery: string,
  updates: { search?: string; page?: number },
) {
  const params = new URLSearchParams(currentQuery);

  if (updates.search !== undefined) {
    if (updates.search === "") {
      params.delete(recipeListStateKeys.search);
    } else {
      params.set(recipeListStateKeys.search, updates.search);
    }
  }

  if (updates.page !== undefined) {
    if (updates.page <= 1) {
      params.delete(recipeListStateKeys.page);
    } else {
      params.set(recipeListStateKeys.page, String(updates.page));
    }
  }

  return params.toString();
}

export function getRecipeListUrl(
  pathname: string,
  currentQuery: string,
  updates: Parameters<typeof getRecipeListQuery>[1],
) {
  const query = getRecipeListQuery(currentQuery, updates);
  return `${pathname}${query ? `?${query}` : ""}`;
}
