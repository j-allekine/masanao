# Masanao MVP Workflow — Working Draft

> This draft is for the domain grill. It records confirmed behavior and open questions; it is not an accepted decision record.

## Proposed hierarchy

```text
Activity Design
└── Activity
    ├── Activity name, e.g. Visitors or Barangay Feeding
    ├── Activity particulars
    └── Meal Schedules
        └── Meal Schedule
            ├── User-entered name / description, e.g. Lunch, AM Snack, or Feeding
            ├── User-selected time
            └── Issuance Record (when supply lines exist; may be drafted before posting)
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

An Activity Design can contain multiple Activities. “Visitors” and “Barangay Feeding” are examples of Activity names, not a visitor entity. An Activity has exactly one date and one or more Meal Schedules. Each Meal Schedule is named and described by the user, and has its own selected time. Lunch, Snack, and Feeding are examples, not a required enum or fixed list.

For now, the Activity keeps **Activity particulars**. The draft does not introduce a planned-servings field. A future structured quantity for people served or planned servings remains open.

Each Meal Schedule may start empty. Once it contains supply lines, it has an Issuance Record, which may be drafted before posting. The record may contain multiple food supply lines with editable ingredient issue lines and direct-use stock issue lines. Whether a Meal Schedule can have multiple Issuance Records remains open.

## POS-like issuance workspace

The issuance part of an Activity should feel like a simple POS-like page:

1. The user opens a Meal Schedule and adds foods or direct-use items.
2. A food cannot be added without a Recipe. Each food's default ingredient rows appear in an editable table.
3. The user can edit ingredient quantities and add more ingredient rows for that Meal Schedule.
4. If the needed Recipe does not exist, the user can add or create a new Recipe from the issuance page.
5. Direct-use stock items can be added as their own issuance lines.
6. The user records actual quantities and, where relevant, the inventory batches being issued. One ingredient may use multiple inventory batches.
7. Once the Meal Schedule contains supply lines, it has an Issuance Record, which can remain a draft until it is posted.

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

1. Whether a Meal Schedule can have one or multiple Issuance Records.
2. Whether and when to add a structured people-served quantity beyond Activity particulars.
3. Which final UI copy should label the single delivery action: **Save** or **Post**?
4. What exact reporting should accompany a recorded over-delivery beyond the visible warning or variance?
5. How Recipes created inline from the issuance page are retained and reused later.

## Non-goals for this draft

- Defining LGU procurement, inspection, acceptance, payment, accounting, or approval procedures.
- Finalizing terminology, database schema, screens, APIs, or implementation details.
- Defining returns, waste, corrections, or other exception workflows beyond recording over-delivery for later handling.
- Defining production of finished food as a separate inventory item.

Status: working draft; grill stopped after this batch
