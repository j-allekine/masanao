# Master Data: Units and Item Conversions

Status: accepted for the MVP design.

## Purpose

Masanao lets staff record an Item using a familiar package Unit while keeping the Inventory Ledger in the Item's Base Unit.

## Model

### Global Unit catalog

The global catalog contains reusable Unit labels and abbreviations. It does not contain a universal quantity conversion.

Examples:

- Kilogram (`kg`)
- Milliliter (`mL`)
- Piece (`pc`)
- Sack (`sack`)
- Tray (`tray`)

Unit names and abbreviations must be unique without regard to capitalization.

### Item Base Unit

Every Item has one Base Unit. The Base Unit is the authoritative unit for inventory balances and Inventory Ledger movements. The Base Unit is always available when recording the Item.

### Item Unit Conversion

An Item may have one or more conversions that relate a global Unit label and package size to that Item's Base Unit.

Example for Rice with `kg` as its Base Unit:

| Display label | Unit label | Base Unit | Default conversion |
| --- | --- | --- | ---: |
| Sack (25 kg) | Sack | kg | 1 sack = 25 kg |
| Sack (50 kg) | Sack | kg | 1 sack = 50 kg |

The display label must distinguish multiple package sizes. `Sack x 50` is avoided because it could mean either a 50 kg sack or 50 sacks.

The same fixed Item Unit Conversion is available for both receiving and issuance. There are no separate receiving-only or issuance-only settings.

## Transaction behavior

When a user selects an Item Unit, Masanao calculates the Base Unit quantity:

```text
entered quantity × Item Unit conversion = calculated Base Unit quantity
```

The user may edit the final Base Unit quantity for that transaction. This is a Conversion Override. It does not change the Item Unit Conversion for future transactions.

Example:

| Transaction | Entered quantity | Calculated quantity | Final Base Unit quantity |
| --- | ---: | ---: | ---: |
| Receive Rice | 4 Sack (25 kg) | 100 kg | 98.4 kg |
| Issue Rice | 1 Sack (25 kg) | 25 kg | 25 kg |
| Issue Rice | 1 Sack (25 kg) | 25 kg | 24.6 kg |

No manual reason, note, approval, or transaction-use flag is required for an override.

If a package size is a recurring standard, create a separate Item Unit Conversion such as `Sack (50 kg)`. If the quantity is an isolated variation, use a transaction-level Conversion Override. Items with no reliable package conversion are recorded directly in their Base Unit.

## Setup flow

1. An administrator creates or selects a global Unit label.
2. In an Item's Units section, the administrator adds a package size and defines its conversion to the Item's Base Unit.
3. Staff select the Item Unit during receiving or issuance.
4. Masanao shows the calculated Base Unit quantity.
5. Staff may adjust the final Base Unit quantity for that transaction.

## Out of scope for MVP

- Variable-conversion modes
- Separate receiving and issuance permissions for an Item Unit
- A global rule such as `1 Sack = 25 kg`
- Manually entered override reasons or approval workflows
