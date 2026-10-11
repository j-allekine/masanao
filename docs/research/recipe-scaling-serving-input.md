# Recipe scaling: where should staff enter servings?

## Question

For one meal schedule with several recipes, should kitchen staff enter a pax
count for every recipe, or enter the expected diners once and let ingredient
amounts scale automatically?

## Finding

**Enter the expected diners once for the meal schedule. Do not require a
second pax input for every recipe.** Each Recipe instead needs a stable
**standard yield**: the number of portions produced by the ingredient
quantities stored on that template.

At issuance, each included recipe should initially target the meal schedule's
expected servings. The system calculates its ingredient quantities using:

`issue ingredient quantity = template ingredient quantity × target servings ÷ recipe standard yield`

For example, if an arroz caldo template uses `5 kg` of rice for `100`
portions, an issuance for `180` diners shows `9 kg` of rice. The recipe
template itself is unchanged.

This is the established pattern in food-service systems. MealSuite stores a
recipe yield as the number of servings it produces, then scales ingredient
amounts when the recipe is scaled to a new yield. Its published calculation is
`new yield / original yield × original ingredient amount`. [MealSuite: creating
a recipe](https://support.mealsuite.com/hc/en-us/articles/4405412103827-Creating-a-New-Recipe)
and [scaled recipes report](https://support.mealsuite.com/hc/en-us/articles/4406371308563-Scaled-Recipes-Report-Recipes).
Oracle similarly models a recipe yield and portion size, derives the number of
portions from them, and recalculates all ingredient quantities only when the
operator intentionally chooses the ingredient-quantity scaling method.
[Oracle: recipe details](https://docs.oracle.com/en/industries/food-beverage/restaurants-netsuite/resim/c_recipe_header.htm)
and [scaling a recipe](https://docs.oracle.com/en/industries/food-beverage/back-office/invug/t_recipes_scale_recipe.htm).

## Recommended lean flow

1. **Set up the Recipe once.** Staff enter its standard yield, such as
   `100 portions`, and the ingredient quantities for that yield.
2. **Set up the Meal Schedule.** Staff enter `Expected diners: 180` once.
3. **Start issuance.** The screen lists every scheduled recipe. Each begins at
   `Servings to make: 180` and displays its calculated ingredient lines.
4. **Use an exception only when needed.** An action such as **Change servings
   for this recipe** reveals an editable `Servings to make` field. It should
   show the relationship to the meal total: `90 of 180 expected diners`.
5. **Save an issuance snapshot.** Preserve the selected recipe, its standard
   yield, target servings, calculation factor, and calculated ingredient
   quantities. Do not mutate the Recipe template when issuing.

The normal screen therefore has one obvious input (expected diners) and shows
the result, rather than repeating a confusing "pax" field beside every
recipe. Use **servings** or **portions** in recipe screens: a person may take
zero, one, or more portions, whereas *pax* describes people.

## When a per-recipe override is necessary

The default of `180 servings for every recipe` is correct only if each listed
recipe is a component served to all 180 diners. Keep a per-recipe override for
these real exceptions:

| Situation | Example | Target servings |
| --- | --- | --- |
| Optional food | Dessert is offered to only half the diners | `90` |
| Different uptake | Extra beverage is prepared for more than one serving per diner | `220` |
| Menu choice | Chicken and munggo are alternative meals, not dishes on the same tray | separate allocations, such as `120` and `60` |
| Different portion plan | A side dish has a different production plan | explicit target after review |

Do not silently apply the meal headcount to all recipes if the kitchen uses
them as alternatives. That is a planning choice, not a recipe-scaling rule.
Oracle explicitly distinguishes scaling ingredient quantity from changing only
the number of portions or portion size; this reinforces that a new portion
count should be an intentional operation, not an automatic edit to every
template. [Oracle: scaling a recipe](https://docs.oracle.com/en/industries/food-beverage/back-office/invug/t_recipes_scale_recipe.htm).

## Minimum data needed

| Record | Needed values | Purpose |
| --- | --- | --- |
| Recipe template | standard yield in portions; ingredient quantities and units | The stable basis for the calculation |
| Meal Schedule | expected diners/servings | The one normal operational input |
| Issuance recipe snapshot | target servings; source yield; scale factor; calculated ingredient lines | Evidence of what was planned/issued even if the template changes later |

If a Recipe has ingredient lines but no standard yield, the system cannot
safely calculate scaled quantities. The first implementation must therefore
add and validate that yield before presenting automatic issuance quantities.

## Product decision to confirm

Ask the kitchen this plain-language question:

> When lunch expects 180 people, is every listed food prepared for all 180,
> or are some foods alternatives or only for a subset of people?

If every food is for everyone, the default flow above is sufficient. If not,
retain the same single meal-level headcount but let staff allocate target
servings per recipe as an exception during issuance.

## Sources

- MealSuite, [Creating a New Recipe](https://support.mealsuite.com/hc/en-us/articles/4405412103827-Creating-a-New-Recipe): recipe yield is the number of servings; scaling by yield adjusts ingredient amounts (accessed 2026-10-10).
- MealSuite, [Scaled Recipes Report](https://support.mealsuite.com/hc/en-us/articles/4406371308563-Scaled-Recipes-Report-Recipes): published ingredient-scaling formula (accessed 2026-10-10).
- Oracle, [Recipe Details](https://docs.oracle.com/en/industries/food-beverage/restaurants-netsuite/resim/c_recipe_header.htm): yield, portion size, and calculated number of portions (accessed 2026-10-10).
- Oracle, [Scaling a Recipe](https://docs.oracle.com/en/industries/food-beverage/back-office/invug/t_recipes_scale_recipe.htm): distinct methods for quantity, number of portions, and portion size (accessed 2026-10-10).
