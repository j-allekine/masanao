# Delivery Receipt quantity override research

## Question

When staff receive `4 Sack (25 kg)` of Rice, Masanao calculates `100 kg`.
May staff record an actually measured `98.4 kg` as the stock-in quantity?

## Finding

**Yes, with a narrower meaning than an unrestricted override.** The final Base
Unit quantity should be the quantity actually received and verified, not a
blind consequence of the package label. The selected package Unit and its
configured conversion remain useful receiving context; they are not evidence
that every package contains that exact quantity.

This is already the accepted Masanao model. [ADR 0004](../adr/0004-item-specific-conversions-and-transaction-overrides.md)
allows a transaction-specific final Base Unit quantity without changing the
Item conversion. [The Units specification](../master-data-units.md#transaction-behavior)
gives this exact receiving example. [ADR 0006](../adr/0006-delivery-receipt-posting-boundary.md)
then requires the posted line and stock-in movement to retain that final Base
Unit quantity.

Philippine government guidance supports recording what is verified at receipt,
not substituting a system calculation for inspection. COA's receipt,
inspection, and acceptance procedure says the inspector verifies delivered
items' **quantity** and conformity against the Delivery Receipt and approved
PO; if a delivery is incomplete or not in conformity, the Inspection and
Acceptance Report records that fact. [COA, procedures for receipt, inspection,
and acceptance](https://coa.gov.ph/wp-content/uploads/abc-help/gam_b/ppe1.54.htm).
The current Philippine Bidding Documents are stricter than Masanao's
operational stock-in screen: the procuring entity may inspect/test goods and
must reject nonconforming goods; payment follows delivery according to the
contract and inspection/acceptance. [GPPB, NGPA Philippine Bidding Documents
for Goods](https://www.gppb.gov.ph/wp-content/uploads/2025/09/NGPA_PBDs_Goods.pdf)
(General Conditions of Contract, Clauses 12 and 20).

The pattern also exists in mature inventory systems. Microsoft Business
Central calculates inventory from an alternate unit's quantity-per-unit but
its receiving example changes a box-of-six receipt to five pieces when one is
missing. [Microsoft, Set up item units of measure](https://learn.microsoft.com/en-gb/dynamics365/business-central/inventory-how-setup-units-of-measure).
Oracle Purchasing permits a receiver to override a receipt quantity and
supports a receipt reason/comment. [Oracle, Receiving with an alternate unit
of measure](https://docs.oracle.com/cd/A60725_05/html/comnls/us/po/rcts07.htm).

Therefore, Masanao must not present a Delivery Receipt post as the legal
Inspection and Acceptance Report or as authority to waive a supplier shortage.
It is the kitchen's inventory record of the physically accepted quantity. The
agency's procurement and payment controls remain outside this MVP.

## Risks of the currently phrased design

- Calling the field an editable "override" can imply that staff may choose a
  number arbitrarily, even though a posted receipt is immutable.
- Saving only the final Base Unit quantity makes a later reviewer unable to
  tell whether `98.4 kg` came from four 25 kg sacks, a scale reading, or a
  data-entry mistake.
- A recurrent difference means the configured Item conversion no longer
  describes the package reliably. Repeated ad-hoc entries would hide a master
  data problem.
- A shortage may require a notation or action in the agency's separate
  inspection, acceptance, and payment workflow. Masanao must not silently
  treat it as procurement acceptance.

## Recommendation for the lean receipt-first feature

Keep the capability, but call the value **Actual received quantity** in the
receiving form. Pre-fill it from the calculation and make an explicit
"Actual quantity differs" action reveal editing. This avoids an extra
workflow while making the distinction clear.

At posting, retain these immutable values on each Delivery Receipt Line:

| Value | Purpose |
| --- | --- |
| selected Item Unit and entered quantity | What was counted on arrival |
| configured conversion factor and calculated Base Unit quantity | The calculation available when the receipt was posted |
| final Actual received Base Unit quantity | The quantity added to inventory |

Require the final quantity to be a positive exact decimal. When it differs
from the calculation, require a short line note such as `weighed 98.4 kg` or
`one sack torn`; this is evidence context, not an approval workflow. Continue
to use the Delivery Receipt's existing optional note for receipt-wide context.

If the difference is recurring, staff should record directly in the Base Unit
until an administrator creates a reliable separate package conversion. Do not
change an existing conversion from a single receipt.

This keeps the accepted receipt-first boundary: no PO expected quantities, no
variance workflow, no draft, and no correction feature. It does add the
minimum audit trail needed for an immutable stock-in record.

## Sources

- Masanao, [ADR 0004: Item-specific fixed conversions with transaction overrides](../adr/0004-item-specific-conversions-and-transaction-overrides.md) (accepted).
- Masanao, [Master Data: Units and Item Conversions](../master-data-units.md#transaction-behavior) (accepted).
- Masanao, [ADR 0006: Delivery Receipt Posting Boundary](../adr/0006-delivery-receipt-posting-boundary.md) (accepted).
- Commission on Audit, [Procedures in the Recording of Receipt, Inspection and Acceptance of PPE](https://coa.gov.ph/wp-content/uploads/abc-help/gam_b/ppe1.54.htm), Chapter 10, Section 28 (official COA guidance; accessed 2026-09-19).
- Government Procurement Policy Board, [NGPA Philippine Bidding Documents for Goods](https://www.gppb.gov.ph/wp-content/uploads/2025/09/NGPA_PBDs_Goods.pdf), General Conditions of Contract, Clauses 12 and 20 (official procurement document; accessed 2026-09-19).
- Microsoft, [Set up item units of measure](https://learn.microsoft.com/en-gb/dynamics365/business-central/inventory-how-setup-units-of-measure), alternate-unit receipt and base-quantity example (official product documentation; accessed 2026-09-19).
- Oracle, [Receiving with an alternate unit of measure](https://docs.oracle.com/cd/A60725_05/html/comnls/us/po/rcts07.htm), receipt override and reason/comment behavior (official product documentation; accessed 2026-09-19).
