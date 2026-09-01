---
version: alpha
name: Masanao Municipal Kitchen
description: A calm, compact civic operations system for planning activities, managing food supplies, recording deliveries, and maintaining accountable inventory.
color:
  canvas: "#F3F1EB"
  surface: "#FFFDF8"
  surfaceRaised: "#FFFFFF"
  surfaceSubtle: "#E8EFE8"
  ink: "#1A2825"
  inkMuted: "#53665E"
  border: "#D2DBD4"
  borderControl: "#738C7F"
  primary: "#1F5A4B"
  primaryStrong: "#164538"
  primarySoft: "#DDEBE1"
  onPrimary: "#FFFDF8"
  secondary: "#A3553D"
  secondarySoft: "#F3E1D8"
  secondaryInk: "#713B2B"
  accent: "#A3553D"
  accentSoft: "#F3E1D8"
  onAccent: "#FFFDF8"
  accentStrong: "#8F4C32"
  onAccentStrong: "#FFFDF8"
  success: "#2F6B4E"
  successSoft: "#E1F0E4"
  successInk: "#1D4B35"
  onSuccess: "#FFFDF8"
  warning: "#8A5A18"
  warningSoft: "#F8ECCD"
  warningInk: "#5F3D0C"
  onWarning: "#FFFDF8"
  danger: "#9D4137"
  dangerSoft: "#F7E1DE"
  dangerInk: "#713029"
  onDanger: "#FFFDF8"
  info: "#2D6670"
  infoSoft: "#DDECEF"
  infoInk: "#1E4B53"
  onInfo: "#FFFDF8"
  focusRing: "#164538"
  focusRingInverse: "#FFFDF8"
rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 12px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
  sidebarWidth: 15rem
  contentMaxWidth: 90rem
  pageGutter: 24px
  sectionGap: 24px
  navGroupGap: 20px
components:
  app-shell:
    backgroundColor: "{color.canvas}"
    textColor: "{color.ink}"
  app-sidebar:
    backgroundColor: "{color.primaryStrong}"
    textColor: "{color.onPrimary}"
    width: "{spacing.sidebarWidth}"
    padding: "{spacing.xl}"
  nav-item:
    backgroundColor: "{color.primaryStrong}"
    textColor: "{color.onPrimary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  nav-item-active:
    backgroundColor: "{color.primarySoft}"
    textColor: "{color.primaryStrong}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  app-header:
    backgroundColor: "{color.surface}"
    textColor: "{color.ink}"
    height: 64px
    padding: "{spacing.lg}"
  page-surface:
    backgroundColor: "{color.canvas}"
    textColor: "{color.ink}"
    padding: "{spacing.xl}"
  card:
    backgroundColor: "{color.surfaceRaised}"
    textColor: "{color.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  data-table:
    backgroundColor: "{color.surfaceRaised}"
    textColor: "{color.ink}"
    rounded: "{rounded.sm}"
    padding: 0px
  table-header:
    backgroundColor: "{color.surfaceSubtle}"
    textColor: "{color.inkMuted}"
    padding: "{spacing.md}"
  divider:
    backgroundColor: "{color.border}"
    height: 1px
    width: 100%
  button-primary:
    backgroundColor: "{color.primary}"
    textColor: "{color.onPrimary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  button-primary-hover:
    backgroundColor: "{color.primaryStrong}"
    textColor: "{color.onPrimary}"
  button-secondary:
    backgroundColor: "{color.surface}"
    textColor: "{color.primaryStrong}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  button-secondary-hover:
    backgroundColor: "{color.primarySoft}"
    textColor: "{color.primaryStrong}"
  button-accent:
    backgroundColor: "{color.accent}"
    textColor: "{color.onAccent}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  button-accent-hover:
    backgroundColor: "{color.accentStrong}"
    textColor: "{color.onAccentStrong}"
  input:
    backgroundColor: "{color.surface}"
    textColor: "{color.ink}"
    borderColor: "{color.borderControl}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  input-focus:
    backgroundColor: "{color.surfaceRaised}"
    textColor: "{color.ink}"
  status-success:
    backgroundColor: "{color.successSoft}"
    textColor: "{color.successInk}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-warning:
    backgroundColor: "{color.warningSoft}"
    textColor: "{color.warningInk}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-danger:
    backgroundColor: "{color.dangerSoft}"
    textColor: "{color.dangerInk}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-info:
    backgroundColor: "{color.infoSoft}"
    textColor: "{color.infoInk}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  success-action:
    backgroundColor: "{color.success}"
    textColor: "{color.onSuccess}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  info-action:
    backgroundColor: "{color.info}"
    textColor: "{color.onInfo}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  warning-action:
    backgroundColor: "{color.warning}"
    textColor: "{color.onWarning}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  danger-action:
    backgroundColor: "{color.danger}"
    textColor: "{color.onDanger}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  danger-action-hover:
    backgroundColor: "{color.dangerInk}"
    textColor: "{color.onDanger}"
  role-badge-admin:
    backgroundColor: "{color.accentSoft}"
    textColor: "{color.secondaryInk}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  role-badge-user:
    backgroundColor: "{color.primarySoft}"
    textColor: "{color.primaryStrong}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  empty-state:
    backgroundColor: "{color.infoSoft}"
    textColor: "{color.infoInk}"
    rounded: "{rounded.md}"
    padding: "{spacing.2xl}"
  focus-indicator:
    outlineColor: "{color.focusRing}"
    outlineWidth: 3px
    outlineOffset: 2px
  workbench-nav-group:
    textColor: "{color.primarySoft}"
  workbench-context-tab:
    backgroundColor: "{color.surfaceRaised}"
    textColor: "{color.inkMuted}"
    padding: "{spacing.md}"
  workbench-context-tab-active:
    backgroundColor: "{color.primarySoft}"
    textColor: "{color.primaryStrong}"
    padding: "{spacing.md}"
  workbench-next-action:
    backgroundColor: "{color.secondarySoft}"
    textColor: "{color.secondaryInk}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  workbench-next-action-accent:
    backgroundColor: "{color.secondary}"
    height: 4px
    width: 100%
---

## Theme source

`src/app/globals.css` is the single source of truth for the design system. The shadcn semantic variables (`--background`, `--primary`, `--muted`, and so on) live in its `:root` and `.dark` blocks, alongside the common status roles (`--success`, `--warning`, and `--info`).

Use the semantic color roles instead of copying hex values into components. Use `border` for quiet dividers, `borderControl` for form controls, `focusRing` on light surfaces, and `focusRingInverse` on dark surfaces. The clay `accent` is an alias of `secondary` and is reserved for emphasis, role badges, and next-action treatment.

Use shared semantic color and typography roles instead of recreating styles in components. Keep component styles on these shared roles so theme changes stay centralized.

## Overview

Masanao Municipal Kitchen is a civic operations system for planning activities, managing food supplies, recording deliveries, and maintaining accountable inventory.

The visual system should feel trustworthy, practical, and quietly distinctive. It is an operational workspace, not a marketing site and not a generic analytics dashboard. Screens should help staff understand what needs attention, what is happening now, and what action comes next.

There are two roles:

- **Admin:** the broader-control role. Admin-only areas may eventually include user management, password changes or resets, and system settings, in addition to the workflows available to Users. The final permission matrix is still open.
- **User:** the day-to-day operations role. Users work with activities, schedules, supplies, delivery records, issuance records, and inventory information within the permissions eventually assigned to them.

Role differences should be communicated through navigation, labels, and available actions. Do not create a completely different visual theme for Admin and User.

## Colors

Use an off-white canvas instead of stark white. Green is the primary action and navigation color, communicating continuity, care, and dependable operations. Use the clay accent sparingly for warmth, emphasis, and secondary moments; it must not compete with primary actions.

Keep the palette mostly quiet: off-white surfaces, deep green text and navigation, soft green support surfaces, and thin muted borders. Use success, warning, danger, and information colors for explicit status meaning. Statuses must include text or an icon label; color alone is not sufficient.

Do not use gradients, neon colors, glass effects, or large decorative color fields in operational screens.

## Typography

Use Geist, already configured by the project, as the primary typeface. It is clear at compact sizes and works well for forms, tables, labels, and dense workflows.

The runtime stylesheet owns typography values and semantic role definitions. This document provides usage guidance only; it is not a second typography configuration.

### Operational

Primary interface text used for controls, navigation, table data, tabs, and normal application content. Keep it easy to scan and avoid decorative tracking.

### Supporting

Secondary metadata, captions, helper text, validation details, and compact context. Supporting text should remain clearly readable and should not carry essential instructions by itself.

### Reading

Longer instructions, explanations, notices, and content intended for sustained reading. Give this content enough rhythm and separation from nearby controls.

### Table header

Table headers use the same base size as table data but stronger emphasis. Establish hierarchy with weight, contrast, spacing, and the header surface rather than making headers smaller or larger than the data.

### Monospace

Reserve Geist Mono for identifiers, codes, reference numbers, quantities, and values where comparison or alignment benefits from monospace. Do not style an entire table as code.

### Accessibility and usage

- Keep text and its background sufficiently distinct in normal, muted, selected, disabled, hover, focus, and dark or light states.
- Pair status color with a text label or icon; never rely on color alone.
- Preserve readable text when content wraps, names are long, the viewport is narrow, or text is enlarged.
- Use the operational role for everyday controls and navigation, the supporting role for secondary context, the reading role for longer copy, and the table roles for structured data.
- Keep restrained heading steps and purposeful hierarchy. Do not default to all-caps headings, excessive letter spacing, or a different display font on every page.
- Routes under `src/components/prototypes` are exploratory visual references; their display-specific treatments are intentionally isolated from production surfaces.

## Layout

The default application frame is a persistent left navigation rail with a compact top header and a readable content area. The recommended sidebar width is 15rem. Keep content within a maximum width of 90rem and use 24px page gutters on desktop, reducing them carefully on smaller screens.

Prefer compact vertical rhythm: 8px and 12px for control groups, 16px for related content, and 24px for sections. Use tables, timelines, lists, and action panels when they reveal current work more clearly than charts.

For task-heavy screens, use the Workbench shell: group navigation by the staff member's job to be done, keep the current workspace visibly active, and use contextual tabs for the selected record. Keep the primary rail stable while the content area changes from planning context to operational action.

Every page should establish:

1. Where the staff member is.
2. What requires attention now.
3. The next safe action.

Admin-only navigation should appear as a clearly labeled settings or administration area. User navigation should focus on daily operations and should not show controls that the user cannot use unless the product intentionally explains why they are unavailable.

## Elevation & Depth

Use depth sparingly. Prefer a surface change, a border, or a divider before using a shadow. Cards should organize related content, not turn every field or row into a floating panel.

Use one quiet shadow level for important raised surfaces such as a menu, dialog, or focused workflow panel. Avoid layered shadows, floating glass panels, and excessive card stacking.

## Shapes

Use small to medium corner radii: 6px for controls, 8px for standard cards, and 12px only for larger grouped surfaces. Pills are reserved for compact role badges, filters, and statuses. Do not use fully rounded buttons or cards as the default shape.

Borders should be thin and low contrast. Focus indicators must remain visible and must not depend on color perception alone; pair focus styling with a clear outline or offset in implementation.

## Components

Primary buttons are green and reserved for the main safe action on a screen. Secondary buttons use quiet surfaces with green text. Clay is an accent, not the default call to action. Destructive actions use the danger treatment and should be labeled with an explicit verb.

The Workbench shell uses grouped navigation labels such as Today, Plan, Supplies, Accountability, and Admin. The selected item uses the soft-green active state, while the clay secondary token is reserved for attention cues, draft or review emphasis, and the next-action panel. Contextual tabs belong to the selected workspace and should not replace the stable global navigation.

Data tables should support scanning: stable column alignment, compact rows, clear headers, readable quantities, and visible status labels. Use monospace type selectively for IDs, quantities, and reference numbers rather than styling the entire table as code.

The Admin and User role badges are compact labels, not status indicators of personal importance. Admin-only controls should be grouped under administration or settings and should use the same surfaces, controls, and spacing as the rest of the system.

In Masanao's domain model, planning context is not the same as an inventory movement. Activity Design, Activity, Meal Schedule, Schedule Entry, Recipe, and Food Supply should not be visually presented as if they change stock. Posted Delivery Receipts and posted Issuance Records are the actions that should receive strong operational confirmation and ledger-related status treatment.

## Do's and Don'ts

### Do

- Use green for the primary action and active navigation state.
- Use off-white and white surfaces to create a calm, paper-like civic workspace.
- Make the current state and next action obvious.
- Use text labels with status colors and icons where appropriate.
- Keep Admin and User on one coherent visual system.
- Use realistic operational language such as Activity, Schedule Entry, Delivery Receipt, Issuance Record, and Inventory Ledger.
- Preserve visible confirmation when a posted action creates an inventory movement.

### Don't

- Do not make the interface look like an AI-generated dashboard with gradients, glass cards, giant headings, or decorative metric tiles.
- Do not use charts as the default answer for operational information.
- Do not imply that an Activity or planning record changes inventory by itself.
- Do not hide important actions behind icon-only controls.
- Do not rely on color alone to communicate role, status, success, or danger.
- Do not use a different palette to make Admin feel artificially superior to User.
- Do not use large rounded cards, excessive pills, or heavy shadows as the default visual language.
