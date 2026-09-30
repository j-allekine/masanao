"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { buttonVariants } from "@/components/ui/button";
import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";
import CatalogPagination from "@/components/workspace/catalog-pagination";
import ListEmptyState from "@/components/workspace/list-empty-state";
import WorkspaceLifecycleBadge from "@/components/workspace/lifecycle-badge";
import { Badge } from "@/components/ui/badge";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

import { getRecipePreviewAction } from "../actions";
import type { RecipeCatalogItem } from "../types";
import { filterRecipes, hasRecipeListFilters } from "./recipe-filters";
import { getRecipeListState, getRecipeListUrl } from "./recipe-list-state";
import RecipePreviewDialog, { type RecipePreviewState } from "./recipe-preview-dialog";
import RecipeCatalogActions from "./recipe-catalog-actions";

const PAGE_SIZE = 10;
const SEARCH_NAVIGATION_DELAY_MS = 250;

export default function RecipesContent({
  recipes,
  canManageRecipes,
}: {
  recipes: RecipeCatalogItem[];
  canManageRecipes: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const currentQuery = useSearchParams().toString();
  const [searchInput, setSearchInput] = useState(
    () => getRecipeListState(new URLSearchParams(currentQuery)).search,
  );
  const latestQueryRef = useRef(currentQuery);
  const searchNavigationTimeoutRef = useRef<number | null>(null);
  const previewRequestRef = useRef(0);
  const [recipePreview, setRecipePreview] = useState<RecipePreviewState>({
    status: "closed",
  });
  const listState = useMemo(
    () => getRecipeListState(new URLSearchParams(currentQuery)),
    [currentQuery],
  );
  const filters = useMemo(
    () => ({ search: searchInput }),
    [searchInput],
  );
  const filteredRecipes = useMemo(
    () => filterRecipes(recipes, filters),
    [filters, recipes],
  );
  const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE));
  const currentPage = Math.min(listState.page, pageCount);
  const firstRecipeIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedRecipes = useMemo(
    () => filteredRecipes.slice(firstRecipeIndex, firstRecipeIndex + PAGE_SIZE),
    [filteredRecipes, firstRecipeIndex],
  );
  const resultStart = paginatedRecipes.length === 0 ? 0 : firstRecipeIndex + 1;
  const resultEnd = firstRecipeIndex + paginatedRecipes.length;
  const filtersAreActive = hasRecipeListFilters(filters);

  useEffect(() => {
    const syncSearchInputTimeout = window.setTimeout(() => {
      setSearchInput(getRecipeListState(new URLSearchParams(currentQuery)).search);
      latestQueryRef.current = currentQuery;
    }, 0);

    return () => window.clearTimeout(syncSearchInputTimeout);
  }, [currentQuery]);

  useEffect(() => () => {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (searchNavigationTimeoutRef.current !== null) return;
    if (listState.page <= pageCount) return;

    const clampedUrl = getRecipeListUrl(pathname, currentQuery, {
      page: pageCount,
    });
    latestQueryRef.current = clampedUrl.split("?", 2)[1] ?? "";
    router.replace(clampedUrl, { scroll: false });
  }, [currentQuery, listState.page, pageCount, pathname, router]);

  function navigateList(
    updates: { search?: string; page?: number },
    navigation: "push" | "replace" = "push",
  ) {
    const nextUrl = getRecipeListUrl(pathname, latestQueryRef.current, updates);
    latestQueryRef.current = nextUrl.split("?", 2)[1] ?? "";
    router[navigation](nextUrl, { scroll: false });
  }

  function updateSearch(search: string) {
    setSearchInput(search);
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
    }
    searchNavigationTimeoutRef.current = window.setTimeout(() => {
      navigateList({ search, page: 1 }, "replace");
      searchNavigationTimeoutRef.current = null;
    }, SEARCH_NAVIGATION_DELAY_MS);
  }

  function clearSearch() {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
      searchNavigationTimeoutRef.current = null;
    }
    setSearchInput("");
    navigateList({ search: "", page: 1 });
  }

  function changePage(nextPage: number) {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
      searchNavigationTimeoutRef.current = null;
    }
    navigateList({
      search: searchInput,
      page: Math.min(Math.max(nextPage, 1), pageCount),
    });
  }

  function closeRecipePreview() {
    previewRequestRef.current += 1;
    setRecipePreview({ status: "closed" });
  }

  async function openRecipePreview(recipeId: string) {
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setRecipePreview({ status: "loading" });

    try {
      const result = await getRecipePreviewAction(recipeId);
      if (previewRequestRef.current !== requestId) return;
      setRecipePreview(
        result.status === "success"
          ? { status: "ready", recipe: result.recipe }
          : { status: "error", error: result.error },
      );
    } catch {
      if (previewRequestRef.current === requestId) {
        setRecipePreview({
          status: "error",
          error: "Could not load this Recipe. Please try again.",
        });
      }
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-card">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-8" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-heading-3 font-semibold">Recipes</p>
            <p className="truncate text-body-sm text-muted-foreground">
              Browse reusable food templates for the municipal kitchen.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-heading-1 font-semibold">Recipes</h1>
            <p className="text-body text-muted-foreground">
              Reusable food templates and their usual ingredients.
            </p>
          </div>
          {canManageRecipes ? (
            <Link id="new-recipe" href="/recipes/new" className={buttonVariants({ size: "sm" })}>
              Create Recipe
            </Link>
          ) : null}
        </div>

        {recipes.length === 0 ? (
          <ListEmptyState
            icon={<BookOpen aria-hidden="true" />}
            hasFilters={false}
            filteredState={{ title: "", description: "" }}
            emptyState={{
              title: "No Recipes yet.",
              description:
                "Recipes will appear here once the kitchen recipe library is configured.",
            }}
          />
        ) : <>
          <WorkspaceCatalogToolbar
            ariaLabel="Recipe catalog search"
            searchId="recipe-search"
            searchLabel="Search Recipes"
            searchPlaceholder="Search recipes by name..."
            search={searchInput}
            onSearchChange={updateSearch}
          />
          {paginatedRecipes.length === 0 ? (
            <ListEmptyState
              icon={<BookOpen aria-hidden="true" />}
              hasFilters={filtersAreActive}
              filteredState={{
                title: "No Recipes match your search.",
                description: `Clear the search to see the complete ${canManageRecipes ? "Recipe" : "active Recipe"} catalog.`,
                action: {
                  label: "Clear search",
                  variant: "outline",
                  onClick: clearSearch,
                },
              }}
              emptyState={{
                title: "No Recipes yet.",
                description:
                  "Recipes will appear here once the kitchen recipe library is configured.",
              }}
            />
          ) : (
            <WorkspaceTableFrame caption={canManageRecipes ? "Recipes" : "Active Recipes"} className="min-w-[32rem]">
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead scope="col">Recipe</TableHead>
                  <TableHead scope="col" className="text-right">Ingredients</TableHead>
                  <TableHead scope="col" className="text-center">Status</TableHead>
                  <TableHead scope="col" className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecipes.map((recipe) => (
                  <TableRow key={recipe.id} data-recipe-id={recipe.id}>
                    <TableCell className="max-w-[40rem] whitespace-normal">
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="block break-words font-medium underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {recipe.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {recipe.ingredientCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap justify-center gap-1"><WorkspaceLifecycleBadge isActive={recipe.isActive} />{recipe.needsAttention ? <Badge variant="destructive">Needs attention</Badge> : null}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <RecipeCatalogActions
                        recipe={recipe}
                        canManageRecipes={canManageRecipes}
                        onView={() => void openRecipePreview(recipe.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </WorkspaceTableFrame>
          )}
          <CatalogPagination
            page={currentPage}
            pageCount={pageCount}
            start={resultStart}
            end={resultEnd}
            total={filteredRecipes.length}
            onPageChange={changePage}
          />
        </>}
        <RecipePreviewDialog preview={recipePreview} onClose={closeRecipePreview} />
      </main>
    </div>
  );
}
