# Masanao MVP Workflow — Historical Working Draft

> This is a historical domain-grill draft. The canonical implementation specification is [GitHub Issue #13](https://github.com/j-allekine/masanao/issues/13). Keep this file for background context; do not use it as the implementation specification.

## Proposed hierarchy

```text
Activity Designs
└── Activity Design
    └── Activity
        ├── Activity name, e.g. Visitors or Barangay Feeding
        ├── Activity particulars
        └── Meal Schedules
            └── Meal Schedule
                ├── User-entered name / description, e.g. Lunch, AM Snack, or Feeding
                ├── User-selected time
                └── Issuance Record (when supply lines exist; may be drafted before posting)
                    └── Issuance Items (one list)
                        ├── Food Supply
                        │   └── Editable ingredient issue lines (from a required Recipe)
                        └── Direct-use Stock Item issue lines

Purchase Order (PO)
└── Delivery Receipt
    └── Delivery Receipt Lines (each references a PO line)
        └── Posted delivered quantity → Inventory Ledger

Recipe (master reference)
└── Ingredient lines
```

Masanao can contain multiple Activity Designs. The Activity Designs page lists those designs; opening one leads to an Activity Design page that contains multiple Activities. “Visitors” and “Barangay Feeding” are examples of Activity names, not a visitor entity. An Activity has exactly one date. It may be saved before any Meal Schedule is added; Meal Schedules are added as planning progresses. Each Meal Schedule is named and described by the user, and has its own selected time. Lunch, Snack, and Feeding are examples, not a required enum or fixed list.

For now, the Activity keeps **Activity particulars** and may record a planned participant count (pax). Each Meal Schedule may record planned servings.

Each Meal Schedule may start empty. Once it contains supply lines, it has its single Issuance Record, which may be drafted before posting. Food-related entries and directly issued stock entries are presented in one unified Issuance Items list. The exact item classification for that list remains deferred.

## Activity Design — current working fields

This section records the current MVP direction. It is a working note, not an accepted specification.

### Activity Design

- Internal unique identifier for the record.
- User-entered Activity Design No., unique across all Activity Designs.
- Fiscal year.
- Design title or name.
- Optional AIP Reference Code. This is an external LGU planning or budget reference; it is not the same as the Activity Design No.
- Office, stored as free text for now.

The first planning slice does not include an Activity Design status, planned budget, or Program/Project field.

### Activity

The child record is called **Activity**, not Program.

- Activity name.
- Activity particulars.
- Scheduled date.
- Venue.
- Planned participant count or pax.
- Planned budget, if applicable.

An Activity may be saved before any Meal Schedule is added.

### Meal Schedule

- Meal name or label.
- Meal time.
- Planned servings.

### Issuance Record

- Cardinality: zero or one Issuance Record per Meal Schedule; it is created when supply lines are added.
- Status: **Draft** or **Posted**.
- One unified Issuance Items list.
- Food or recipe-related entries with editable ingredient issue lines.
- Directly issued stock entries in the same list.

No new `FOOD_SUPPLY` or `DIRECT_USE_STOCK` item type is introduced in this working draft. If an existing item classification already covers this, reuse it. Otherwise, defer the classification decision.

## POS-like issuance workspace

The issuance part of an Activity should feel like a simple POS-like page:

1. The user opens a Meal Schedule and adds foods or direct-use items.
2. A food cannot be added without a Recipe. Each food's default ingredient rows appear in an editable table.
3. The user can edit ingredient quantities and add more ingredient rows for that Meal Schedule.
4. If the needed Recipe does not exist, the user can add or create a new Recipe from the issuance page.
5. Direct-use stock items can be added as their own issuance lines.
6. The user records actual quantities and, where relevant, the inventory batches being issued. One ingredient may use multiple inventory batches.
7. Once the Meal Schedule contains supply lines, it has its single Issuance Record, which can remain a draft until it is posted.

The master Recipe remains a reusable reference with multiple ingredient lines. Selecting a Recipe copies its current ingredient rows into the Meal Schedule's Recipe Snapshot. Those copied rows become editable ingredient issue lines: they may be adjusted or extended without changing the master Recipe, and later Recipe edits do not change the snapshot or posted Issuance history. How Recipes created inline are retained and reused later remains a small open note.

## Partial deliveries

All deliveries are recorded under a PO. A PO has ordered item lines. One PO may have multiple Delivery Receipts, including partial deliveries, and each receipt may contain multiple item lines. Each Delivery Receipt line references an existing PO line.

```text
PO-2026-014
  Rice          100 kg
  Cooking oil    20 L

DR-001 (partial)
  Rice           60 kg  → posted to Inventory immediately
  Cooking oil    20 L   → posted to Inventory immediately

DR-002 (later partial)
  Rice           40 kg  → posted to Inventory immediately

PO-2026-014 total received: 100 kg rice, 20 L cooking oil
```

Working rules confirmed so far:

- A Delivery Receipt may represent part of a PO quantity; later receipts may record the remaining quantity.
- Multiple receipts may reference the same PO line. This supports separate deliveries or batches.
- Posting a receipt records its delivered quantity in Inventory immediately.
- MVP does not block over-delivery. If the posted receipts exceed the ordered PO quantity, the extra quantity is recorded and the system shows a visible warning or variance. Exact over-delivery reporting remains open.
- MVP has one delivery action, labeled either **Save** or **Post**. That single action immediately records the receipt as posted stock-in and creates the inventory stock-in movement. There is no separate draft-save state for Delivery Receipts in this draft.
- This draft does not define LGU procurement, inspection, acceptance, payment, accounting, or approval procedures. Immediate inventory posting is the Masanao MVP system behavior.

## Inventory boundary

Activity Design, Activity, Activity particulars, Meal Schedules, Food Supply, and Recipe are planning or reference information. They do not, by themselves, create inventory movements.

Posting a Delivery Receipt creates inventory stock-in movements for the delivered quantities. A Meal Schedule may have no supply lines or Issuance Record at first. Once it contains supply lines, it has an Issuance Record. A draft Issuance Record has no inventory effect; posting the issuance creates ledger movements for the actual quantities and batches issued through editable ingredient issue lines and direct-use stock issue lines. One ingredient may be issued from multiple inventory batches.

## Source alignment note

The current local decisions for this workflow are [ADR 0005](adr/0005-meal-schedule-as-issuance-context.md), which records the Activity, Meal Schedule, and Issuance boundary, and [ADR 0003](adr/0003-partial-deliveries-and-immediate-stock-in.md), which records partial deliveries and immediate stock-in. [ADR 0002](adr/0002-activity-schedule-and-issuance-boundary.md) records the superseded Schedule Entry model. The older source-repo ADR 0003 at `C:\Users\LENOVO\Code\lgu-san-miguel\masanao-system\docs\adr\0003-activity-design-issuance-and-nonstock-food-output.md` remains historical and unmodified.

## Unresolved questions

1. Whether an existing Item type or another line classification should be used for the unified Issuance Items list.
2. Which final UI copy should label the single delivery action: **Save** or **Post**?
3. What exact reporting should accompany a recorded over-delivery beyond the visible warning or variance?
4. How Recipes created inline from the issuance page are retained and reused later.

## Non-goals for this draft

- Defining LGU procurement, inspection, acceptance, payment, accounting, or approval procedures.
- Finalizing terminology, database schema, screens, APIs, or implementation details.
- Defining returns, waste, corrections, or other exception workflows beyond recording over-delivery for later handling.
- Defining production of finished food as a separate inventory item.

Status: working draft; grill stopped after this batch
