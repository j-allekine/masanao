# Recipe baseline and serving yield

Researched: 2026-10-10. Scope: whether an ingredient template must represent one serving or may represent a batch.

## Finding

A recipe is not inherently one serving. Professional foodservice systems commonly store ingredient quantities for a known recipe yield (number of servings). A one-serving template is valid: it is simply a recipe with a yield of 1. The sources below support this pattern, not a universal legal requirement that every system expose a yield field.

Automatic scaling needs an unambiguous denominator: how many servings the saved ingredient quantities represent. This can be an explicit positive baseline value, or a documented system-wide rule that all templates are per serving. Existing quantities must not be assumed to be per person without confirmation.

## Primary-source evidence

- [MealSuite: Creating a New Recipe](https://support.mealsuite.com/hc/en-us/articles/4405412103827-Creating-a-New-Recipe), sections “Setting the Recipe Portion Size” and “Scaling Recipe by Yield”: staff enter the number of servings produced by the original recipe; scaling yield adjusts ingredient amounts. It distinguishes portion size from recipe yield. It also warns that merely changing the yield field on an existing recipe does not automatically change its ingredients.
- [Oracle: Recipe Details](https://docs.oracle.com/en/industries/food-beverage/restaurants-netsuite/resim/c_recipe_header.htm): recipe yield divided by portion size determines portions. Its example is a recipe producing 20 steaks, demonstrating a batch rather than a one-person template.
- [Institute of Child Nutrition: School Meal Recipe Workshop training manual](https://theicn.org/resources/2596/school-meal-recipe-workshop-from-concept-to-standardization/127996/school-meal-recipe-workshop-from-concept-to-standardization-training-manual.pdf), page 120: the factor method divides desired serving yield by current serving yield, then multiplies ingredient quantities by that factor. Example: 100 servings scaled to 250. Direct PDF retrieval timed out in this research pass; the official-domain indexed extract provided these steps and example.
- [Institute of Child Nutrition: USDA Recipe Standardization Guide](https://theicn.org/cicn/resources/131/usda-recipe-standardization-guide-for-school-nutrition-programs/109523/usda-recipe-standardization-guide-for-school-nutrition-programs.pdf), page 69, official-domain indexed extract: factor and computerized methods can start with any recipe yield. It notes that some ingredients do not scale proportionally, so mathematical scaling is a preparation estimate, not a guarantee of culinary quality.

## Recommendation for Masanao

Use one clearly labelled field in Recipe setup: **Ingredient quantities are for ___ servings**. Permit 1, 10, 50, 100, or another positive serving count; do not force staff to convert familiar batch recipes to tiny per-person amounts.

In issuance, assume one recipe serving per selected pax unless staff adjust that recipe's target. Calculate:

`issuance quantity = saved ingredient quantity × target recipe servings ÷ baseline recipe servings`

For example, both `100 g rice for 1 serving` and `10 kg rice for 100 servings` produce `18 kg rice for 180 servings`. A sidebar can show “Recipe for 100 servings” and “For 180 pax” side by side. Showing both quantities does not remove the need to define the baseline.

Before implementation, confirm what current kitchen template quantities mean. Require confirmation of missing baselines rather than silently migrating them to 1. This recommendation is an implementation inference from the documented foodservice pattern, not a mandated standard.
