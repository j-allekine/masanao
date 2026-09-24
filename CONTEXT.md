# Masanao Municipal Kitchen

Shared language for the Municipal Kitchen's activity planning, food supplies, deliveries, and accountable inventory movements.

## Language

### Activity planning

**Activity Design**:
A planning context that groups related Activities. Multiple Activity Designs can exist independently.

**Activity**:
A named undertaking within an Activity Design, associated with one Office and carrying its own date and planning particulars. Meal Schedules are added as planning progresses, so an Activity may temporarily have none.

**Activity particulars**:
Free-form descriptive information about an Activity.
_Avoid_: Activity description

**Meal Schedule**:
A named and timed meal occasion associated directly with an Activity. Lunch, Snack, and Feeding are user-entered labels, not fixed meal types.
_Avoid_: Meal Occasion, Schedule Entry

### Master data

**Item**:
A distinct, uniquely named supply identity tracked in inventory, with one Base Unit and optional Item Unit Conversions.

**Item Note**:
Optional free-form information recorded with an Item.

**Base Unit**:
The default and authoritative unit in which an Item's inventory balance and ledger movements are recorded. It cannot change after stock activity begins.

**Inactive Item**:
An Item unavailable for future selection that remains identifiable in historical
records. An Item with posted delivery history cannot become inactive.

**Unit**:
A reusable quantity label such as kg, piece, sack, or tray. A Unit label does not define how much of a particular Item it represents.
_Avoid_: conversion

**Item Unit Conversion**:
A fixed relationship between an Item's alternate Unit and its Base Unit, such as one sack of rice equaling 25 kg. It is available for both receiving and issuance.

**Conversion Override**:
A transaction-specific Base Unit quantity that replaces the calculated quantity for that transaction without changing the Item Unit Conversion.

**Category**:
A flat classification required for every Item. It does not determine the Item's Unit or expiry behavior.

**Vendor**:
A supplier or organization from which supplies may be procured and received.

**Office**:
An LGU department or office associated with an Activity, never with the containing Activity Design. It is not a stock location.

### Food and issuance

**Recipe**:
A reusable reference for one food and its ingredient lines.

**Recipe Snapshot**:
The Meal Schedule-specific copy of a Recipe's ingredient lines for a Food Supply, distinct from the master Recipe.

**Food Supply**:
The food context associated with an Issuance Record. Its ingredient lines identify the stock used for that food, and it requires a Recipe.

**Direct-use Stock Item**:
An inventory item issued separately from the ingredient lines of a Food Supply.

**Issuance Record**:
A record of supplies associated with a Meal Schedule. A Meal Schedule can have zero or one Issuance Record; the record is created when supply lines are added.

### Purchasing and inventory

**Purchase Order**:
The vendor and order reference under which supplies are expected and Delivery
Receipts are recorded. A Purchase Order does not carry expected Item quantities
in the current workflow.

**Delivery Receipt**:
A record, identified by its delivery receipt number and actual receipt date, of
items delivered under a Purchase Order. It contains one or more Delivery
Receipt Lines and is posted as stock-in when recorded.

**Delivery Receipt Line**:
The actual delivered quantity of one Item on a Delivery Receipt, recorded in
the selected Item Unit, calculated Base Unit quantity, Unit Price, and Line
Amount. Its calculated Base Unit quantity is posted as stock-in.

**Unit Price**:
The monetary amount charged for one selected Item Unit on a Delivery Receipt
Line. It is recorded on the receipt, not on the Purchase Order.

**Line Amount**:
The monetary result of a Delivery Receipt Line's delivered quantity multiplied
by its Unit Price. It is calculated and stored with the posted receipt line.

**Partial Delivery**:
A Delivery Receipt representing only part of the supplies delivered under a
Purchase Order. Expected quantities are owned by a future receiving contract,
not by the Purchase Order reference.

**Over-delivery**:
A future receiving condition where posted Delivery Receipts record more of an
Item than the accepted receiving quantity. It is not modeled by the current
Purchase Order reference slice.

**Inventory Ledger**:
The accountable record of posted inventory movements.

**Posted Transaction**:
A transaction recorded as posted and represented as a movement in the Inventory Ledger.
