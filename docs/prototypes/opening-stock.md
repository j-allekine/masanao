# Opening Stock UI prototype

Question: can kitchen staff enter the first physical count, create missing Items,
and add alternate units without losing their count or needing an original PO?

Run `pnpm prototype:opening-stock`, then visit
<http://localhost:3118/inventory?prototype=opening-stock&variant=A>.
Sign in as `opening.demo` with password `OpeningStockDemo123!`, then reopen the
link and choose **Opening Stock** in the Inventory header.

The runner creates a disposable SQLite database in the OS temporary directory.
It never uses the configured application database. Opening Stock, Item creation,
unit changes, draft saving and posting are simulated in memory and reset on reload.
Normal Inventory remains available; the prototype requires development mode and
the explicit `prototype=opening-stock` query parameter.

Compare layouts using the bottom arrows (or left/right keys outside form fields):

- A: compact count sheet, using a table on desktop and cards on mobile.
- B: count cards beside count details and a live per-Item summary.
- C: guided count details, Item entry, then review.

Try adding an Item from the picker, searching for an absent Item and creating it,
adding one or more alternate units during creation, and managing an existing
sample Item's units. Review preserves entered units and Base Unit equivalents.
The posted demo record identifies Opening Stock as its source.

## Assumptions and boundaries

- Sample catalog and quantities are illustrative; they do not represent office stock.
- The preview represents an administrator. Production permissions are not implemented.
- One initial kitchen count; no new warehouse or Office-as-location model.
- Category and Unit choices represent existing master lookups. Creating master
  Categories or Units is outside this prototype.
- Costs are explicitly unknown. The preview records no accounting valuation.
- Drafts, source allocations, posting, correction workflows and audit evidence
  need production implementation after the design is chosen.
- Calculations use JavaScript numbers for visual demonstration only. Production
  must preserve Masanao's exact quantity and conversion rules.
- No layout has been selected yet. Do not promote the prototype as production code.

## Verification

Browser walkthroughs exercised all three desktop layouts, Item creation with
1 sack = 25 kg and 2 sacks = 50 kg, mobile review and simulated posting.
Lint, architecture checks, TypeScript and a production build passed. The build
requires a `DATABASE_URL`, even though this prototype has no real stock writes.
