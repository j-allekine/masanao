# Inventory quantity display precision

Primary-source check: 2026-10-11. No universal two-decimal inventory quantity standard was established.

## Official examples

- [Oracle Retail Store Inventory Operations Cloud 19.10: Item](https://docs.oracle.com/en/industries/retail/store-inventory-op-cloud/19.10/reiug/item1.htm) documents whole quantities for eaches and three decimals for other units. This is a historical product/version policy, not a general standard.
- [Oracle Fusion 26C: Configure Decimal Precision for Quantity and Yield](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26c/faipr/configure-decimal-precision.html) allows configured precision up to 30 decimal places. Precision depends on the business process.
- [Oracle JD Edwards: Summary Quantity Information](https://docs.oracle.com/en/applications/jd-edwards/supply-chain-manufacturing/9.2/eoaim/summary-quantity-information.html) makes summary display decimals configurable, with a default of zero. Display configuration is not necessarily calculation/storage precision.

## Lean Masanao recommendation

- Trim unnecessary trailing zeros: display `18 kg`, not `18.000000 kg`.
- Display up to six decimal places for automatically calculated/ledger quantities, consistent with the chosen stored quantity precision. This is a proposed Masanao policy, not a sourced industry requirement.
- Preserve exact accepted manual originals; do not reinterpret an entered quantity solely for prettier display.
- Never hide a meaningful nonzero quantity as `0`. Choose a smaller allowed Unit or reveal sufficient precision if necessary.
- Keep monetary formatting separate. Two decimal places for money do not imply two decimal places for inventory quantities.

The specification must separately define arithmetic/storage precision, rounding stage/mode, and display formatting. Showing fewer digits must not change stock checks or deductions.
