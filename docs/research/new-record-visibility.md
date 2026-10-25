# New-record visibility after creation

Researched 25 October 2026. Primary sources only. This note separates published
guidance from the product choices recommended for Masanao.

## Finding

Users should receive clear confirmation and an easy way to see the record they
just created. The researched sources do **not** establish a universal rule that
every new record must permanently occupy the first table row. Opening its detail
page and revealing it in the existing list are both valid approaches.

Carbon's create-flow guidance recommends submission feedback, followed by success
or error feedback. It identifies opening the created resource/details as an
option; when remaining on the page, it recommends success notification.
This is design-system guidance, not a web standard.
[Carbon create flows, Flow completion & loading](https://v10.carbondesignsystem.com/community/patterns/create-flows/#flow-completion--loading)

## What the sources establish

| Source | Published guidance or behavior | Implication |
| --- | --- | --- |
| Carbon data tables | Tables support ascending/descending sorting, filtering, and pagination; sort state is indicated in the header. | List position follows the chosen sort. No mandated newest-first default is given. |
| Shopify product administration | Its product list defaults to newest-created first and offers other sort orders. | Newest-first is an established operational-list choice, not proof that every catalog should use it. |
| GOV.UK notification banners | Success feedback can confirm an action within an unfinished journey. Information directly relevant to the page task should be in the main content; banners can be missed. | A toast alone should not be the only way to discover the new record. |
| WCAG 2.2 SC 4.1.3, Level AA | Non-focus status messages must expose their purpose programmatically so assistive technology can announce them. | Announce the named successful creation without requiring focus on the notification. |

Sources:
[Carbon data-table guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines),
[Shopify product-list sorting](https://help.shopify.com/en/manual/products/searching-filtering#sort-your-product-list),
[GOV.UK notification banners](https://design-system.service.gov.uk/components/notification-banner/),
[W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

## Recommended Masanao contract

The following is a product recommendation inferred from that guidance and the
reported workflow; it is not a quoted external standard.

1. After successful creation, keep the created record immediately visible and
   identifiable. Do not leave the user to search or page through records.
2. For the PO working list, newest-created first is reasonable: receiving staff
   can immediately verify the PO they just entered. Use creation time, not the PO
   number or last-edited time, and use a deterministic tie-breaker.
3. Audit other lists by task. Alphabetical master-data catalogs and dated planning
   schedules can retain their useful domain order. Make their creation result
   visible by selecting the page containing it instead of forcing all tables into
   chronological order.
4. If active search/filters exclude the created record, choose an explicit reveal
   behavior. For this user's request, clear only the excluding criteria, state
   that the view changed, and reveal the record. An alternative is preserving
   filters and providing a prominent View created record action. Do not silently
   show a record under filters it does not satisfy.
5. Select the correct result page after filtering and sorting the updated dataset.
   Resetting to page 1 alone does not reveal an alphabetically sorted record.
6. Identify the created row with a short text cue such as Created, optionally
   supported by semantic highlighting. Do not rely on color alone. If moving focus,
   use the existing record link/action after the dialog closes; avoid transient
   focus targets and unexpected jumps during later refreshes.
7. Keep success and error distinct. Failed saves retain form input and list state.
   Ordinary refreshes and edits should not accidentally repeat create-only reveal
   behavior.

## Verification scenarios

- Create PO 444 when smaller numbers already exist: its immediate post-create
  position follows the stated PO order and it is visible.
- Create from page 2 with more than one page of records.
- Create while a search, Category, lifecycle, or other filter would hide it.
- Create a name near the end of an alphabetical master-data catalog.
- Verify both desktop rows and mobile cards, including the created text cue.
- Reload and revisit the list: canonical sort remains consistent.
- Verify dialog focus restoration and success announcement; no duplicate status
  messages, stale page overwrite, or filter/display contradiction.

## Implementation scope

| Surface | Creation result |
| --- | --- |
| Purchase Orders | Newest creation first; return to page 1; retain a matching search and clear an excluding search with an explanation. |
| Items | Retain alphabetical order; select the created Item's result page; clear only excluding search, Category, or status criteria and explain the adjustment. |
| Units, Categories, Offices, Vendors | Retain name ordering; select the created record's result page; retain matching search or explain why it was cleared. |
| Activity Designs, Activities, Meal Schedules, Recipes | Open the newly saved record directly. Planning retains the originating catalog return context. |
| Delivery Receipts | Existing flow already returns to the PO with the created receipt's anchor; no change needed. |
| Inventory | Read-only stock view, with no independent create flow. |
| Issuance and Item Unit Conversions | Creation stays in the current record or sheet; no separate filtered/paginated catalog to reveal. |

The shared pagination helper only finds an ID's page in an already filtered and
sorted array. Features retain filter rules, ordering, URLs, and mutations. A
small creation bridge keeps the successful action result visible until the
server-owned list includes it, then retires so later deletions stay deleted.

After creation, focus and scroll reveal the result once. Master Data targets
the record name so a wide mobile table does not scroll its identity off-screen.
Data refreshes preserve the live Master Data view; initial entry and browser
history restore the actual URL before URL canonicalization runs.
