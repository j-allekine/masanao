## Problem Statement

Kitchen staff store Recipe ingredient quantities for familiar batches, but the application does not record how many people those quantities serve. Issuance cannot safely scale an existing Recipe without that denominator. Assuming every Recipe serves one person would produce incorrect stock requirements.

## Solution

Add an explicit Recipe Baseline Pax, labelled "Ingredients for ___ pax", to Recipe setup and reference displays. Staff record a positive whole-number batch size, including 1. Existing Recipes without a baseline remain identifiable and editable but cannot be automatically scaled until a manager supplies the missing value. This slice prepares Recipes for issuance; it does not implement issuance or deduct stock.

## User Stories

1. As a Recipe manager, I want to record the pax served by my ingredient batch, so that quantities have an unambiguous meaning.
2. As a Recipe manager, I want to enter 1, 50, 100, or another positive whole number, so that I can use a familiar batch rather than normalize everything per person.
3. As a Recipe manager, I want the baseline beside the ingredient setup, so that I know which quantities it describes.
4. As a Recipe manager, I want clear errors for missing, zero, negative, fractional, or invalid baseline values, so that unusable Recipes are not created.
5. As a Recipe manager, I want to edit a baseline deliberately without automatically changing the stored ingredients, so that I can correct the reference batch definition.
6. As a Recipe manager, I want existing ingredient quantities preserved exactly, so that adding baseline information does not change the Recipe.
7. As a kitchen staff member, I want to see the baseline on Recipe details and previews, so that I understand the reference quantities.
8. As a Recipe manager, I want to recognize older Recipes missing a baseline, so that I can complete them without guessing their yield.
9. As a kitchen staff member, I want missing-baseline Recipes clearly distinguished from scaling-ready Recipes, so that I do not unknowingly use an assumed denominator.
10. As a Recipe manager, I want existing Recipe management permissions and lifecycle rules retained, so that this addition does not broaden access.
11. As a keyboard or mobile user, I want the new field and validation to work within the existing editor, so that setup remains accessible.
12. As an issuance implementer, I want public Recipe reads to expose baseline eligibility, so that issuance can enforce it without reaching into Recipe internals.

## Implementation Decisions

- Ownership is the Recipes module. Extend its input, persisted model, public return types, create/update workflows, and reference UI with Recipe Baseline Pax.
- New Recipe creation and successful Recipe content edits require a positive whole-number baseline between 1 and 2,147,483,647, consistent with a signed 32-bit persisted count. Reject unsafe/out-of-range values rather than coercing or truncating them. Existing activation/deactivation actions remain separate and do not require a content edit solely to supply the baseline.
- Use "Ingredients for ___ pax" and explain that the entered ingredient quantities serve that many people. Do not call this the current issuance target.
- Baseline changes redefine the existing ingredient batch; they do not multiply ingredients. Make that distinction visible when editing a Recipe with ingredients.
- Migrate additively with a nullable legacy baseline. Do not assign 1 or infer a value from names, notes, or ingredient quantities. Preserve existing rows and quantities.
- Legacy records without a baseline remain viewable; display "Baseline pax not set". Their next successful management edit supplies the baseline. Expose scaling eligibility through the feature's public reads.
- Preserve Recipe uniqueness, ingredient uniqueness, active/inactive behavior, reference protections, exact-decimal quantities, Item-specific Unit selections, and current management authorization.
- A baseline is reusable Recipe reference data. Meal pax and recipe-specific issuance pax belong to the later Issuance module.
- Follow current feature gateways and mutation/data-access boundaries. Use existing shadcn controls and semantic tokens rather than adopting prototype markup as production code.

## Testing Decisions

- Prefer the existing Recipe public command/query integration seam with a real isolated database. Assert accepted/rejected input, persisted values, legacy eligibility, permissions, and preservation of ingredient data; do not test private helper call sequences.
- Extend existing Recipe schema/catalog coverage where invalid-input cases already belong; avoid inventing a separate service layer solely for tests.
- Add migration coverage proving preexisting Recipes survive without an invented baseline and can be completed through supported commands.
- Extend Recipe browser scenarios for create, edit, detail/preview, field errors, legacy messaging, staff versus manager access, keyboard operation, and narrow-screen layout.
- Verify changing the baseline leaves entered ingredients unchanged and that public reads expose the same baseline displayed by the UI.
- Run relevant tests, lint, type checks, schema validation/generation, and a production build when schema or server/client boundaries change. Require fresh browser evidence for affected Recipe routes.

## Out of Scope

- Issuance targets, Recipe Snapshots, stock checks, inventory deduction, whole-quantity Item policy, and automatic scaling of master ingredient quantities.
- Portion weight, nutrition, waste/yield-loss models, finished-food inventory, Recipe versioning, or an inline Recipe creator inside issuance.
- Invented baseline values or bulk normalization of existing Recipes.

## Further Notes

- This is specification 1 of 3. It can be implemented independently of the Items specification. Issuance depends on both.
- The accepted Recipe Baseline Pax glossary term and ADR 0007 govern this addition.
- Batch yield is an established food-service pattern, not a requirement to use a fixed batch size: https://support.mealsuite.com/hc/en-us/articles/4405412103827-Creating-a-New-Recipe.
- Baseline data is snapshotted when a Recipe is later added to issuance. Subsequent master edits must not rewrite those snapshots.
- Only scaling-reference data is delivered here. Once issuance introduces source references, that dependent specification owns restrictive deletion integration; do not claim this slice already implements future issuance protections.
