## Problem Statement

Recipe scaling can produce a fractional quantity for an Item that must be issued as whole Base Units. The application currently cannot distinguish those Items from divisible quantities such as rice in kilograms. Guessing from Item names or global Unit labels risks false warnings and incorrect deductions.

## Solution

Add an Item-specific "Issuance quantities" choice beneath Base Unit: "Allow decimals" or "Whole numbers only". This supplies the later issuance workflow with an explicit validation rule, without automatic rounding or changing receiving behavior.

## User Stories

1. As an Item manager, I want to specify whether an Item can be issued fractionally, so that inventory issue quantities match its practical handling.
2. As an Item manager, I want the choice beside Base Unit, so that I understand which quantity it governs.
3. As an Item manager, I want to mark individually tracked eggs as whole-only, so that issuance cannot deduct half an egg unintentionally.
4. As an Item manager, I want rice in kilograms to allow decimals, so that fractional weight remains valid.
5. As an Item manager, I want Items sharing the same Unit to have different policies, so that a Unit label does not dictate every Item's behavior.
6. As a kitchen staff member, I want to read the selected policy wherever Item reference details are available, so that I understand issuance warnings.
7. As an Item manager, I want to update this policy without rewriting past stock, so that historical transactions remain accurate.
8. As an Item manager, I want existing Items and conversions preserved during rollout, so that setup does not disrupt receiving.
9. As a staff user without setup privileges, I want the same read access as before but no new editing rights, so that authorization stays consistent.
10. As a keyboard or mobile user, I want the choice to work with the existing form controls, so that Item setup remains accessible.
11. As an issuance implementer, I want the policy exposed by public Item reads, so that selection, warnings, and posting use one authoritative value.

## Implementation Decisions

- Ownership is the Item capability in Supply Operations. Extend Item persistence, input schemas, create/update workflows, public reads, and creation/edit forms.
- Use the exact user-facing choices "Allow decimals" and "Whole numbers only" under "Issuance quantities", placed beneath Base Unit. Explain that the rule applies after conversion to Base Units and combining demand for that Item.
- This is an issuance-specific rule, not a global Unit property, packaging conversion, or automatic rounding instruction.
- Use a closed validated policy value with an additive default of Allow decimals for new and existing Items. This preserves today's permissive quantity behavior and avoids guessing which legacy Items are indivisible. Managers must explicitly classify whole-only Items before relying on that protection.
- Do not silently switch the policy based on Base Unit abbreviation, Item name, or Category. Do not auto-ceil issued quantities.
- Preserve current manager-only Item setup permissions and existing Base Unit/conversion protections.
- Policy edits do not change received stock, posted history, ingredient quantities, or configured conversions. Expose the current policy for issuance validation; posted issuance retains the policy used at posting as historical evidence.
- Existing Item updates with an omitted policy preserve their current policy; only Item creation and the additive migration default to Allow decimals. Do not accidentally turn a whole-only Item back into decimal-allowed through an older caller.
- The Issuance specification owns fractional warnings, conversion/aggregation, adjusted final quantities, and posting enforcement. This slice only provides the stored reference rule and its setup UI.
- Do not impose whole-only validation on receiving, Recipe baseline ingredients, or fractional alternate packaging quantities as part of this slice.
- Follow the established feature public gateways, schema/command/policy/data-access boundaries, shared workspace form presentation, and shadcn primitives.

## Testing Decisions

- Prefer existing Item create/update/read integration tests through supported public feature interfaces using the isolated database. Assert persisted/read policy, authorization, validation, and unchanged stock/conversions.
- Extend existing Item schema tests for valid choices, unknown/tampered values, default behavior, and compatibility with existing inputs.
- Add migration coverage for defaulting legacy Items to Allow decimals without changing their balances, Base Units, conversions, or received transactions.
- Extend Item browser coverage for creation/editing, read-only access, field placement/helper text, keyboard interaction, visible validation, and mobile layout.
- Test that changing policy is not a stock movement and does not retroactively rewrite quantities.
- Test that an update omitting the new field preserves the existing whole-only policy, while an explicit permitted change is persisted.
- Do not test private implementation calls or implement a new test-only API. Run relevant tests, lint, type checks, schema validation/generation, and production build as appropriate; obtain fresh browser evidence for affected Item routes.

## Out of Scope

- Whole-unit receiving restrictions, global Unit precision settings, automatic rounding, configurable increments such as multiples of six, or replacing Item Unit Conversion contracts.
- Issuance persistence, warnings, posting, stock adjustments, reversals, or returns.
- Automatic classification of existing Items and changes to existing Base Unit locking rules.

## Further Notes

- This is specification 2 of 3 and can be implemented independently of Recipe baseline setup. Issuance depends on its public Item policy.
- Item-specific quantity precision is an established approach, but our two-choice issuance policy is a deliberately lean design: https://learn.microsoft.com/en-us/dynamics365/business-central/inventory-how-setup-units-of-measure.
- Preserve legacy stock data even if it already contains fractional balances for an Item subsequently marked whole-only. The later posting workflow checks the outgoing quantity; this rule does not silently repair old inventory.
