## Problem Statement

The Municipal Kitchen already holds supplies acquired before Masanao begins operational use. Their original Purchase Orders may be unavailable or cannot reliably be identified. Staff need to establish the quantities and supported costs still on hand without inventing procurement records. Currently, incoming stock and issuance source allocation assume Delivery Receipt Lines, so adding a starting quantity alone would not make it safely issuable.

Existing transactions are samples. Implementing this feature must not automatically delete or reclassify them.

## Solution

Add administrator-managed Opening Stock under Inventory using the selected prototype A count sheet: a desktop table and mobile count cards. Administrators prepare a persistent draft, select or create Items, configure alternate units, enter physical quantities and opening unit costs, review, and post once. Posted quantities become available stock and an identifiable issuance source without a Vendor, PO or Delivery Receipt.

Support deliberately entered zero costs with a reason. Keep unknown/blank costs distinct from zero. Record corrections separately, preserving the original record and previous issuance evidence.

## User Stories

1. As an administrator, I want Opening Stock within Inventory, so that I can establish the kitchen's starting supplies in context.
2. As an administrator, I want to start, resume or view the same setup record, so that I cannot accidentally create a second starting balance.
3. As an administrator, I want to set the count date, so that later deliveries and issuance have a clear starting boundary.
4. As an administrator, I want optional reference/notes, so that I can identify the supporting count sheet.
5. As an administrator, I want to search existing Items, so that I can quickly select supplies physically present.
6. As an administrator, I want to create a missing Item within the count, so that setup does not interrupt my work.
7. As an administrator, I want the normal Item fields during creation, so that the Item remains usable throughout Masanao.
8. As an administrator, I want to add alternate units during Item creation, so that I can count in familiar packages.
9. As an administrator, I want Item creation and its conversions saved together, so that a failed conversion does not leave partial creation.
10. As an administrator, I want the count retained when creating or cancelling an Item, so that I do not lose completed entries.
11. As an administrator, I want to add a conversion to an existing Item without leaving setup, so that counting can continue.
12. As an administrator, I want Base Unit equivalents visible, so that I can catch incorrect conversions.
13. As an administrator, I want exact decimal counted quantities, so that partial packages and divisible supplies are represented accurately.
14. As an administrator, I want incomplete or invalid lines identified, so that an unfinished count cannot be posted.
15. As an administrator, I want to remove accidental lines, so that they do not become stock.
16. As an administrator, I want cost entered per selected unit, so that the quantity and price use the same package size.
17. As an administrator, I want line amounts calculated, so that I can compare them with supporting records.
18. As an administrator, I want to record supported costs without an original PO link, so that missing references do not force fictional records.
19. As an administrator, I want to explicitly enter PHP 0 when justified, so that zero-valued stock is supported.
20. As an administrator, I want to explain and review zero costs, so that zero is deliberate.
21. As an administrator, I want blank costs kept unknown, so that missing prices never silently become zero.
22. As an administrator, I want to save incomplete costs in a draft, so that I can gather supporting information before posting.
23. As an administrator, I want separate lines for an Item at different costs, so that distinct supported opening costs are retained.
24. As an administrator, I want to reopen a saved count across sessions, so that a large count can be completed gradually.
25. As an administrator, I want unsaved-change protection, so that navigation does not unexpectedly discard work.
26. As an administrator, I want actionable field errors and focus recovery, so that I can fix rejected entries without re-entering the form.
27. As an administrator, I want a complete review of quantities, units and costs, so that I can confirm stock before it becomes available.
28. As an administrator, I want posting to succeed entirely or leave stock unchanged, so that a failure cannot create a partial balance.
29. As an administrator, I want retries to return the same posted record, so that slow responses cannot duplicate stock.
30. As kitchen staff, I want opening stock reflected in Inventory and CSV export, so that stock status uses complete balances.
31. As kitchen staff, I want to issue opening stock, so that meal preparation works after setup.
32. As kitchen staff, I want issuance to combine opening stock and later deliveries, so that a requirement can span sources.
33. As kitchen staff, I want source details to show Opening Stock instead of a fictional PO, so that provenance is understandable.
34. As kitchen staff, I want completed source allocations preserved, so that later transactions cannot rewrite historical evidence.
35. As a Planning user, I want issued supply cost to include opening sources, so that operational cost comparisons are consistent.
36. As a Planning user, I want explicit zero costs recognized as zero, so that reports distinguish entered values from missing evidence.
37. As an administrator, I want a posted record with posting actor/time, so that its provenance remains reviewable.
38. As an administrator, I want Item protections to recognize opening history, so that master edits cannot invalidate or hide stock.
39. As an administrator, I want corrections linked to the original record with a reason, so that mistakes are fixed without erasing history.
40. As an administrator, I want to add omitted starting Items through a correction, so that forgotten stock does not need a fictional delivery.
41. As an administrator, I want reductions limited to the affected remaining capacity, so that corrections cannot remove stock already issued.
42. As an administrator, I want to correct remaining-stock cost, so that future issuance uses the corrected value while past costs stay intact.
43. As an administrator, I want historical correction limits explained, so that I do not mistake a remaining-stock correction for a rewrite of issued supplies.
44. As kitchen staff, I want read access without setup powers, so that normal operations do not grant initialization privileges.
45. As a keyboard or mobile user, I want usable pickers, unit controls and actions, so that setup remains accessible.
46. As an administrator, I want balances carried into later years, so that remaining stock is not added twice.
47. As an administrator, I want a populated ledger protected from initialization, so that a physical count cannot be added on top of existing stock.
48. As an administrator, I want sample records preserved until separate cleanup is authorized, so that feature implementation cannot silently delete work.

## Implementation Decisions

- **Ownership and boundaries:** Supply Operations owns Opening Stock, its drafts, posting and corrections. Extend existing public feature gateways for reads, draft saves, posting, corrections and atomic Item-with-conversions creation. Reuse Server Action -> actor -> schema -> command -> policy/domain -> feature DB boundaries. Retain one application; no generic repository framework, extra backend, test-only HTTP API or shared cross-feature bridge.
- **Presentation:** Place Opening Stock in the Inventory header. Open the same record in not-started, Draft or Posted state. Use prototype A's density and grouping, extended with costs. Use existing workspace presentation, semantic tokens and shadcn controls. Keep changes page-scoped. Demo fixtures, floating switcher, credentials and in-memory posting are not production features.
- **Document:** One initial document per installation, stable reference, effective count date, optional supporting reference/notes, Draft/Posted status, revision, posting actor/time and immutable posted line snapshots. No annual second setup; later catalog Items start at zero and use ordinary receiving. A forgotten starting Item uses a linked correction.
- **Clean start:** Reject Opening Stock initialization/posting when existing posted stock history is present. Do not automatically reset, reinterpret or relabel it. Existing populated installations retain ordinary operations without a retroactive mandatory setup gate. During an explicitly begun clean-start count, block ordinary real receiving/issuance until the count is posted. A kitchen with no starting stock can use the existing zero-stock workflow without fabricated opening lines.
- **Date boundary:** The count represents stock at the beginning of the selected local calendar day, before that day's deliveries and issuance. Explain this convention. After posting, reject newly posted receiving/issuance with an effective date before that boundary, using existing business-date conventions. Enforce this in server workflows, including direct action calls. The count date is not an inferred purchase date.
- **Authorization:** Active administrators prepare/post counts, manage inline Item/conversions and post corrections. Authorized active staff can view posted evidence. Recheck persisted role/status inside mutations; hiding UI is insufficient.
- **Drafts:** Persist incomplete exact input across sessions without stock movement/reservation. Preserve selections and conversions on unchanged reload/save; reject stale revisions and unusable references with recoverable feedback. Protect dirty navigation. Posting requires a date and at least one complete positive-quantity line. An added blank line must be completed or removed; unselected catalog Items remain at zero.
- **Quantity:** Existing active Items, Base Units and configured Item Unit Conversions only. Preserve exact decimal input and multiplication; do not reuse prototype JavaScript-number arithmetic or impose an invented six-decimal input cap. Do not apply an issuance-only whole-number policy as a global receiving/opening-count constraint. Show Base Unit equivalents without combining incompatible quantities into one total.
- **Costs:** Require an explicit nonnegative opening cost per selected unit before posting. Blank/unknown can be saved in drafts but blocks posting. Do not prefill zero. An explicit zero requires a short per-line reason and acknowledgment during review. Zero contributes zero to operational costs; missing evidence never becomes zero. Do not infer zero from old stock, missing PO, donation or lack of payment. Keep supported cost for the remaining quantity acquired under old purchases; retain optional basis/reference notes.
- **Cost precision:** Retain entered quantity, selected unit, conversion, calculated Base Unit quantity, selected-unit cost and exact line amount. Reuse the current cumulative source-allocation cost/centavo rounding contract, including final source exhaustion; do not independently round every fractional issue and lose/create value. These are operational Planning costs, not official LGU accounting valuation or expense recognition.
- **Multiple costs:** Normally select an Item once. A secondary Add another cost line action allows distinct supported costs for the same Item. Preserve separately costed source identities and stable line order while combining their quantities in Inventory. With unknown original chronology, recorded opening-line order is an allocation convention, not historical physical-picking evidence.
- **Inline Item creation:** Retain normalized unique name, Category, Base Unit, positive Reorder level, issuance quantity policy and optional Item Note. Save the Item and all submitted conversions atomically using normal validation. No sequence of independent saves that leaves partial creation. Catalog creation does not move stock; a successfully created Item remains if count edits are discarded. Preserve the count when opening/cancelling the editor.
- **Units:** Use existing active Unit master records and existing conversion contracts, including multiple package sizes where supported. Add missing conversions without clearing count entries. Never silently rebase unchanged saved lines on a changed conversion; require deliberate re-selection/review when a reference is unusable. Snapshot labels, factor and calculations when posted. Inline master Category/Unit creation is excluded.
- **Persistence:** Add relational opening headers/lines and correction headers/lines with restrictive historical references. Extend ledger source links and issuance allocations to support opening-derived and Delivery Receipt sources. Enforce exactly one appropriate source per movement/allocation and unique ledger effects for each posted line. Do not manufacture procurement records or create another balance ledger.
- **Posting:** Use the existing SQLite write-lock/transaction pattern to revalidate authorization, revision, references, setup eligibility, date and costs. Commit every movement, evidence snapshot and status transition together. Failure rolls back everything; retries return the same posted result. Balance remains total posted stock-in minus stock-out. Allocations describe source use, never a second deduction.
- **Issuance:** Consume remaining initial opening capacity before subsequent receipts; use stable saved opening-line order for ties. Retain current FIFO receipt ordering after opening stock is exhausted. Support one issuance spanning sources. Show opening reference/count date and correction provenance rather than invented receipt/PO fields. Revalidate remaining capacity under the existing issuance transaction; no source overdraw.
- **Historical compatibility:** Preserve existing posted receipt/issuance evidence and allocations. Adapt sample reconstruction to distinguish correction stock-outs from issuance stock-outs; do not require an Issuance Record for a correction or reconstruct old sample consumption against new opening sources.
- **Integration:** Inventory overview, alerts, filters, display units, CSV and shortage checks use the same ledger. Extend issued-cost/dashboard reads to both source kinds, preserving existing incomplete-cost and reconstructed-evidence behavior. Zero-valued sources are valid, identifiable evidence. Extend Item Base Unit, deactivation/deletion and historical reference protections to opening/correction history so receipt-only checks cannot hide or invalidate stock.
- **Corrections:** Administrator-only documents linked to the posted opening record, mandatory reason, effective date not before the opening boundary, actor/time and immutable before/after evidence. Review and post with the same revision, transaction and retry guarantees. Never edit original posted lines.
- **Quantity corrections:** Post explicit additions/reductions. Add omitted original Items with explicit costs and applicable zero reasons. Reductions identify affected opening-derived source capacity and cannot exceed its current unissued remainder, borrow unrelated receipt capacity or make stock negative.
- **Cost corrections:** Affect remaining opening-derived stock only. Retire its unissued source capacity through recorded correction movements/evidence and replace equal quantity at corrected cost atomically, with zero net on-hand change. Preserve original values, prior issuance costs, opening priority and correction links. Do not introduce zero-quantity ledger movements to carry a price change. Explain/reject requests requiring correction of already-issued capacity; historical issuance reversal/revaluation is excluded.
- **Rollout:** Additive migrations preserve existing receipts, issuance snapshots, balances and allocations. Development/verification use isolated data. No automatic sample reset, real-data deletion, deployment or cleanup authorization is included.

## Testing Decisions

- The user confirmed isolated real-database integration tests through existing high-level feature commands/queries, plus desktop/mobile browser walkthroughs. Prefer the Supply Operations public workflow seam, composed with existing Issuance and dashboard public interfaces for end-to-end outcomes. Reuse existing seams; no test-only production API or unnecessary abstraction layer.
- Assert external behavior: saved/reloaded documents, permissions, validation, balances, sources, costs, correction evidence and immutable history. Avoid mocked Prisma-call choreography or tests mirroring component state/helper implementation. Fixtures/database inspection may verify durable outcomes; prefer public reads for primary assertions.
- Prior art: existing Item creation/conversion, Delivery Receipt posting, issuance draft/posting, FIFO, Inventory/CSV and dashboard-budget integration suites. Reuse their isolated databases, authentication/navigation fixtures and existing rollback fault-injection seam where appropriate.
- Cover duplicate initial-document creation, save/reload, incomplete drafts, stale revisions, disabled/unauthenticated/staff mutation rejection, clean-start eligibility and date gates without disrupting populated installations.
- Cover exact fractional quantities and conversions, different-cost lines for one Item, missing/negative/explicit-zero costs, zero reason/acknowledgment, precise amounts, tampered server inputs, frozen labels/conversions and no stock from drafts/catalog creation.
- Cover duplicate/inactive Item lookups, all normal Item fields, atomic Item-plus-conversion success/rollback, cancelling creation, unsaved navigation, retained count and adding existing-Item units.
- Verify opening-only, receipt-only and mixed-source issuance. Example: 75 kg opening at PHP 50/kg plus 25 kg delivered at PHP 60/kg, then issue 80 kg: remaining 20 kg, issued cost PHP 4,050, and allocations of 75 kg opening plus 5 kg receipt. Include zero-cost opening sources, exact shortages, exhausted layers and repeated fractional-issue rounding.
- Verify partial-failure rollback, retries, source capacity and duplicate-post safety under existing SQLite locking. Reuse current transaction checks; this does not introduce a new multi-user product workflow.
- Verify positive/negative corrections, omitted Items, zero reasons, equal-quantity remaining-cost replacement, insufficient affected capacity, unchanged historical issued costs, source priority and reconstruction with correction stock-outs.
- Verify Inventory/status/filter/CSV/display-unit behavior, source details, dashboard cost completeness and Item lifecycle protections after opening-only history. Preserve normal receipt, Recipe and Planning behavior.
- Browser journey: Inventory -> opening draft -> inline Item/units -> save/reload -> review/post -> issuance/source details/cost -> remaining-stock correction. Capture fresh desktop and narrow-mobile evidence, keyboard/Escape/focus return, actionable validation, long labels and large counts, without unintended wrapping, clipping, overflow or inaccessible actions.
- Run lint, architecture checks, relevant unit/integration/browser tests, Prisma validation/generation/migration checks and production build. Prototype checks do not prove production posting exists.

## Out of Scope

- Reconstructing missing procurement documents or historical physical picking choices.
- Automatic sample/real-data reset, relabeling or deletion; production deployment.
- Official LGU valuation, prescribed government forms, financial ledger posting, supplier payment or budget-obligation recognition. Free acquisition does not automatically establish an official zero valuation.
- General donations/receiving or stock adjustments unrelated to the opening record; transfers, warehouses/subcustody, returns, waste, expiry/lots or FEFO.
- Historical issuance editing/reversal or retroactive meal-cost recalculation through an opening correction.
- Annual repeated initialization, spreadsheet import, inline master Category/Unit creation or unrelated global UI redesign.

## Further Notes

- Selected prototype A is preserved at immutable commit https://github.com/j-allekine/masanao/tree/c0ca92e1625c64a3a8edc8954409a68265b126c4 . Its data, demo login, calculations and simulated actions are illustrative only; implement production behavior against the current contracts.
- The user confirmed existing transactions are samples, separate reasoned corrections are acceptable, and opening unit cost may explicitly be PHP 0. Missing old PO references do not establish zero cost. The testing approach above was confirmed on November 20, 2026.
- Zero-value precedent: ERPNext's explicit zero-valuation option (https://docs.frappe.io/erpnext/stock-entry) and nonnegative opening valuation handling (https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/item/item.py). These support product behavior, not a universal accounting rule.
- This specification supersedes the earlier proposed planning note. No production implementation or data cleanup is performed by publishing it.
