import { describe, expect, it } from "vitest";
import { recipeCatalogReturn, recipeEditorReturn, recipeRecordHref, recipeSaveHref } from "@/features/recipes/components/recipe-return-context";

describe("Recipe return destinations", () => {
  it.each(["https://evil.test/recipes", "//evil.test/recipes", "/recipes/other", "/recipes?other=x", "/recipes#x", "/recipes?recipesPage=0", "/recipes?recipesPage=2&recipesPage=3", "/recipes?recipesSearch=%ZZ", "/recipes\\evil"])("rejects %s", value => expect(recipeCatalogReturn(value)).toBe("/recipes"));
  it("carries only known catalog fields through record/edit/save", () => {
    const catalog = "/recipes?recipesSearch=Rice&recipesPage=2";
    const record = recipeRecordHref("rice", catalog);
    expect(recipeEditorReturn(record, "rice")).toBe(record);
    expect(recipeEditorReturn(record, "other")).toBe("/recipes");
    expect(recipeEditorReturn("https://recipe.local/recipes/rice", "rice")).toBe("/recipes");
    expect(recipeSaveHref("rice", record)).toBe(record);
    expect(recipeSaveHref("new", catalog)).toBe(recipeRecordHref("new", catalog));
  });
});
