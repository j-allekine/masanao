# FIFO receipt allocation

Approved extension to Meal Schedule issuance: use receipt-level FIFO to trace issued quantities to Delivery Receipts and Purchase Orders. Expiry dates, lot tracking, FEFO, accounting valuation, returns and corrections remain outside this change.

## Behavior

- Saving a draft has no receipt allocation or stock effect. Posting uses the confirmed combined Item quantity in its Base Unit.
- Use the oldest actual receipt date first. Break ties by receipt posting time, receipt identity, then receipt-line identity. Newly recorded backdated receipts participate in subsequent postings; they never rewrite previous allocations.
- A receipt line is a stock layer. Its capacity is its stock-in ledger quantity minus all recorded allocations. An issuance may split across lines, receipts and POs.
- Keep exact decimal quantities. Allocations must sum exactly to the stock-out, and no receipt may be overdrawn.
- Allocate inside the existing SQLite writer transaction alongside the stock-out and Draft-to-Posted transition. Failure rolls back allocations and ledger writes; successful retries return the same allocations.
- Retain receipt number, PO number and receipt date as immutable source evidence. Posted quantities offer Item Details containing the FIFO receipt sources alongside calculation and policy. Draft editing stays unchanged.

## Existing sample history

The user confirmed current data is sample data and permitted reconstruction. On the first subsequent posting for an Item, reconstruct previously unallocated stock-outs in posting order using the remaining FIFO receipt capacities. Label those allocations `reconstructed`; do not claim they are recorded historical picking choices. Do not alter old ledger rows, quantities, timestamps or original posting evidence. Supplement old reads with labelled reconstructed source links. New allocations use `fifo`.

Reconstruction is an assumption about old source consumption. It can use receipts available at reconstruction time and does not prove that those receipts existed at the original posting time. Inconsistent or insufficient receipt evidence blocks the transaction rather than inventing stock.

## Data

`IssuanceReceiptAllocation` links an Issuance Item Total to a Delivery Receipt Line, with exact Base Unit quantity, allocation basis and copied document evidence. Each pair is unique. Restrictive foreign keys preserve both sources. The existing unified inventory ledger remains authoritative for Item balances; allocations describe where stock-out came from and do not create a second deduction.

## Verification

Cover oldest-date ordering, stable ties, exact decimal splits, exhausted layers, shortages, cross-PO allocation, immutable document evidence, legacy reconstruction, rollback after allocation, independent-process competition, retry idempotency, migration preservation and keyboard/mobile source-detail behavior.
