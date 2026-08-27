# Masanao Municipal Kitchen

Shared language for the Municipal Kitchen's activity planning, food supplies, deliveries, and accountable inventory movements.

## Language

### Activity planning

**Activity Design**:
A planning context that groups related Activities.

**Activity**:
A named undertaking within an Activity Design, with its own date, particulars, and Meal Schedule.

**Activity particulars**:
Free-form descriptive information about an Activity.
_Avoid_: Activity description

**Meal Schedule**:
The schedule associated with an Activity, containing its Schedule Entries. Lunch, Snack, and Feeding are user-entered labels, not fixed meal types.
_Avoid_: Meal Occasion

**Schedule Entry**:
The canonical internal term for one named and timed entry inside a Meal Schedule. Its name or description is user-entered; Lunch, Snack, and Feeding are examples, not fixed types.

### Food and issuance

**Recipe**:
A reusable reference for one food and its ingredient lines.

**Recipe Snapshot**:
The Schedule Entry-specific copy of a Recipe's ingredient lines for a Food Supply, distinct from the master Recipe.

**Food Supply**:
The food context associated with an Issuance Record. Its ingredient lines identify the stock used for that food, and it requires a Recipe.

**Direct-use Stock Item**:
An inventory item issued separately from the ingredient lines of a Food Supply.

**Issuance Record**:
A record of supplies associated with a Schedule Entry.

### Purchasing and inventory

**Purchase Order**:
The order under which supplies are expected and Delivery Receipts are recorded.

**Delivery Receipt**:
A record of items delivered under a Purchase Order.

**Partial Delivery**:
A Delivery Receipt representing only part of the quantity ordered on a Purchase Order line or group of lines.

**Over-delivery**:
A condition where posted Delivery Receipts record more of an item than the referenced Purchase Order line ordered.

**Inventory Ledger**:
The accountable record of posted inventory movements.

**Posted Transaction**:
A transaction recorded as posted and represented as a movement in the Inventory Ledger.
