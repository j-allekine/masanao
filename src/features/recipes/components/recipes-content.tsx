"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkspaceContent, WorkspaceCatalogHeader } from "@/components/workspace/workspace-content";
import WorkspaceHeader from "@/components/workspace/workspace-header";
import {
  WorkspaceCatalogToolbar,
  WorkspacePrimaryLink,
} from "@/components/workspace/catalog-controls";
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
      <WorkspaceHeader title="Supply Operations" />

      <WorkspaceContent>
        <WorkspaceCatalogHeader title="Recipes" description="Reusable food templates and their usual ingredients." action={
          canManageRecipes ? (
            <WorkspacePrimaryLink
              id="new-recipe"
              href="/recipes/new"
              fullWidth
              icon={<Plus data-icon="inline-start" />}
            >
              Create Recipe
            </WorkspacePrimaryLink>
          ) : null}/> 

        <WorkspaceCatalogToolbar
          ariaLabel="Recipe catalog search"
          searchId="recipe-search"
          searchLabel="Search Recipes"
          searchPlaceholder="Search recipes by name..."
          search={searchInput}
          onSearchChange={updateSearch}
        />
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
            <WorkspaceTableFrame caption={canManageRecipes ? "Recipes" : "Active Recipes"} responsive>
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
                    <TableCell data-primary>
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="workspace-record-link"
                      >
                        {recipe.name}
                      </Link>
                    </TableCell>
                    <TableCell data-label="Ingredients" className="text-right tabular-nums">
                      {recipe.ingredientCount}
                    </TableCell>
                    <TableCell data-label="Status" className="text-center">
                      <div className="flex flex-wrap justify-center gap-1"><WorkspaceLifecycleBadge isActive={recipe.isActive} />{recipe.needsAttention ? <Badge variant="destructive">Needs attention</Badge> : null}</div>
                    </TableCell>
                    <TableCell data-actions className="text-right">
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
      </WorkspaceContent>
    </div>
  );
}

