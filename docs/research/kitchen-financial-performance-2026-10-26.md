# Kitchen financial performance — 26 October 2026

This is the earlier research and proposal. The final implementation compares
Activity budgets with posted issued supply costs and does not add income or
payment records. See [Budget accounting Dashboard](../implementation/kitchen-dashboard.md)
for the implemented calculation contract and its limits.

## Confirmed reporting need

The user clarified that the kitchen is LGU-funded and Accounting wants to understand whether it generates profit, and whether it has a financial deficit or overspends. Stock spoilage/shortages are not the primary requested meaning of losses. Whether the kitchen also earns service income remains unconfirmed.

The first mockup answers stock/receiving questions but does not satisfy this financial-performance requirement. Revise the proposed dashboard around budget control and service cost. Show earned income separately if it exists.

## Four distinct questions

| Question | Appropriate measure | Required evidence |
| --- | --- | --- |
| Does the kitchen earn more than it costs? | Earned service income less attributable operating expenses, with funding/subsidy shown separately | Income records, period recognition, supplies expense, staff/utilities/other costs and an allocation policy |
| Is it within its authorized budget? | Budget authorization, commitments, payments and their respective balances | Accountant/Budget Office-approved budget and official obligations/disbursements |
| Is meal delivery economical? | Actual attributable service cost per actual meal served, compared with an agreed target | Cost basis, verified output, approved comparison target |
| What resources remain? | Valued closing inventory and outstanding commitments/payables | Opening quantity/value, valuation rules, receipt/issue history, financial records |

An appropriation is permission to spend; it is not automatically sales revenue or cash received. Unused budget is not automatically profit or a formally recognized saving. Providing free meals can fulfill the department's mandate without earning revenue. Do not display a department as commercially failing solely because it has no meal sales.

## Why PO and issuance cannot yield profit

- The current [PO model](../../src/prisma/schema.prisma) stores an order/vendor reference, without approved ordered quantities or order value.
- Delivery Receipt Lines record delivered quantities and selected-unit prices/amounts. These establish recorded receipt value, not payments or sales.
- Issuance records quantities released to a Meal Schedule. It has no customer charge, sales price, collection or revenue entry.
- Receipt allocation links make it possible to design a supplies-cost calculation, but the current [FIFO contract](../specs/issuance-fifo.md) explicitly excludes accounting valuation.
- `Activity.plannedBudgetCentavos` is a planning amount. It is not a department appropriation, fund release, official obligation or payment balance.
- There are no revenue, obligation, disbursement, payroll, utility expense or payable models in the reviewed schema.

Thus neither receipts minus issues nor issues minus receipts represents profit. They also have different measures unless both are valued under an agreed policy.

## Two illustrative comparisons

### Management cost comparison

Assume a completed meal service has a PHP 100,000 agreed cost target; supplies expense is PHP 60,000 and attributable staff/utilities cost is PHP 20,000. Its service cost is PHP 80,000 and favorable cost variance is PHP 20,000. That is not PHP 20,000 of earned profit. If 1,000 meals were actually served, the cost is PHP 80 per meal. Target scope, actual scope and reporting period must match.

Buying PHP 100,000 of supplies does not prove PHP 100,000 of service cost: PHP 40,000 may remain as usable inventory when PHP 60,000 is expensed. Conversely, a month can consume stock purchased in a previous month. Never expense the purchase and the same supplies issue twice.

### Budget commitment comparison

Assume PHP 100,000 is available for obligation in the defined budget slice; official obligations total PHP 90,000 and payments against them total PHP 70,000. The unobligated amount is PHP 10,000, and the unpaid portion of those obligations is PHP 20,000. PHP 30,000 not yet paid is not PHP 30,000 freely available to spend. This is a simplified example, not a prescribed government report formula; actual balances must follow Budget/Accounting records, adjustments and classifications. Unpaid obligations are not all automatically due-and-demandable payables.

## Recommended dashboard revision

Title: **Kitchen Financial Performance**.

1. **Budget position:** authorized/released budget, official obligations, paid disbursements, unobligated balance, unpaid obligations; clear period and funding scope. Do not combine distinct balances under “remaining budget.”
2. **Cost of services:** supplies expense, attributable personnel cost, utilities/fuel and other agreed operating costs; total cost and favorable/unfavorable variance against the matching target.
3. **Service output:** actual meals served, cost per meal and by Activity/Office. Current Meal pax should be labelled recorded meal pax until actual output is verified. Freeze Office/date context before historical breakdowns.
4. **Income and funding:** earned income if any, LGU funding/subsidy separately, management operating result with and without funding as appropriate to Accountant-approved treatment. If income has not been confirmed or imported, show “not recorded,” not zero revenue and a fabricated loss.
5. **Supporting evidence:** received value, issued quantities/cost basis, closing stock and source documents. Display which costs are included/excluded and which periods lack complete data.

Cost scope must be explicit. “Supplies cost per meal” can be a first milestone; “total cost per meal” requires a fuller cost basis. For shared utilities/staff costs, document the department's allocated share. If production overhead is already included in inventory cost, do not expense that same amount again.

For an incomplete month, compare actual-to-date to a matching planned service level or phased target. A simple comparison to the entire annual budget can conceal emerging overspending or make a timing difference look like a saving.

## Lean implementation sequence

1. Agree a sample monthly report with Accounting/Budget: spending authority, period, included costs, targets, attribution and source documents. Confirm whether meal/service revenue exists and whether inter-Office allocations are internal charges rather than external earnings.
2. Add approved supplies valuation and opening values. Decide cost recognition at issue/distribution/service, returns and cutoff; preserve a reproducible policy/version and distinguish reconstructed source history.
3. Import/reference official budget, obligation, disbursement and other cost totals from existing Accounting records. Preserve document references, Office/fund/account/period and avoid duplicate entries. A second general ledger is not required just to produce management reports.
4. Build the read-only financial dashboard with unknown/incomplete states, drill-down and export. Show only calculations with sufficient evidence. Reconcile each period to Accounting's totals before making it an operational KPI.

## Primary-source grounding and limits

- DBM's [2016 LGU Budget Operations Manual](https://www.dbm.gov.ph/wp-content/uploads/Issuances/2016/Local%20Budget%20Circular/LBC-112-BOM-inside%20pages-correct%20paging-FINAL.pdf), monitoring of expenditures, separates appropriations, allotments, obligations and disbursements. Its physical-output reporting also compares accomplishments with targets. These distinctions inform this proposal.
- DBM's [current circular index](https://www.dbm.gov.ph/index.php/local-budget-circulars) lists LBC 152 and a 2023 LGU manual. The linked 2023/2024-reprinted PDF returned 404 during this review. The older manual is conceptual grounding, not confirmation of current forms or all applicable rules.
- The [Government Accounting Manual hosted by the Bureau of the Treasury](https://www.treasury.gov.ph/wp-content/uploads/2018/01/Volume-I.pdf), chapter on inventories, distinguishes inventory assets, supplies expense and inventory losses. Its stated scope is National Government Agencies, so it is background accounting guidance here, not an asserted LGU-specific mandate. The Municipal Accountant must confirm applicable inventory recognition and valuation rules.

No code or financial records were changed. No actual departmental profit, deficit, saving or overspending was calculated: the necessary financial source records are not currently present in the reviewed model.
