# Direct-use Items in issuance

Primary-source check: 2026-10-11.

## Evidence

[Oracle Inventory Management: Creating Issue Requests](https://docs.oracle.com/en/industries/food-beverage/back-office/invug/c_requests_create_issue_requests.htm) supports selecting Items directly for an issue request or creating requests from existing lists. Its [Issue Requests documentation](https://docs.oracle.com/en/industries/food-beverage/back-office/invug/c_requests.htm) also includes adding Recipes to those requests.

This is evidence for the established pattern of direct Item selection alongside Recipes. It is **not** evidence that every kitchen must support both, or that Masanao needs Oracle's full workflow. Oracle's documented workflow transfers goods between stores/cost centers; municipal meal consumption is a different operation.

## Masanao recommendation

Allow a direct stock line for something like bottled water when it is actually tracked in inventory and issued with the meal. Staff select the existing Item and enter its quantity and allowed Unit. Do not create a fake one-ingredient Recipe or a new Item type merely to issue it.

Recipe-derived and direct lines should contribute to the same final Item total after conversion to Base Unit. Apply the same availability check, whole-quantity validation, posting, and stock deduction rules to that total. Direct lines need an entered quantity; they should not silently imply one bottle per pax.

Whether direct Items belong in the first release remains a scope decision. This evidence supports the interaction pattern, not an industry-wide mandate.
