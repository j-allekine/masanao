---
version: alpha
name: Masanao Municipal Kitchen
description: A calm, compact civic operations system for planning activities, managing food supplies, recording deliveries, and maintaining accountable inventory.
colors:
  canvas: "#F3F1EB"
  surface: "#FFFDF8"
  surfaceRaised: "#FFFFFF"
  surfaceSubtle: "#E8EFE8"
  ink: "#1A2825"
  inkMuted: "#53665E"
  border: "#D2DBD4"
  primary: "#1F5A4B"
  primaryStrong: "#164538"
  primarySoft: "#DDEBE1"
  onPrimary: "#FFFDF8"
  accent: "#B9684A"
  accentSoft: "#F3E1D8"
  onAccent: "#120C08"
  success: "#2F6B4E"
  successSoft: "#E1F0E4"
  successInk: "#1D4B35"
  warning: "#8A5A18"
  warningSoft: "#F8ECCD"
  warningInk: "#5F3D0C"
  danger: "#9D4137"
  dangerSoft: "#F7E1DE"
  dangerInk: "#713029"
  info: "#2D6670"
  infoSoft: "#DDECEF"
  infoInk: "#1E4B53"
  focusRing: "#6F9F80"
typography:
  display:
    fontFamily: Geist
    fontSize: 3rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.06em"
  h1:
    fontFamily: Geist
    fontSize: 2rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  h2:
    fontFamily: Geist
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  h3:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  bodySm:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.035em"
  table:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.4
  mono:
    fontFamily: Geist Mono
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.35
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
components:
  app-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  app-sidebar:
    backgroundColor: "{colors.primaryStrong}"
    textColor: "{colors.onPrimary}"
    width: "{spacing.sidebarWidth}"
    padding: "{spacing.xl}"
  nav-item:
    backgroundColor: "{colors.primaryStrong}"
    textColor: "{colors.onPrimary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  nav-item-active:
    backgroundColor: "{colors.primarySoft}"
    textColor: "{colors.primaryStrong}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  app-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    height: 64px
    padding: "{spacing.lg}"
  page-surface:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    padding: "{spacing.xl}"
  card:
    backgroundColor: "{colors.surfaceRaised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  data-table:
    backgroundColor: "{colors.surfaceRaised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: 0px
  table-header:
    backgroundColor: "{colors.surfaceSubtle}"
    textColor: "{colors.inkMuted}"
    typography: "{typography.label}"
    padding: "{spacing.md}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
    width: 100%
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  button-primary-hover:
    backgroundColor: "{colors.primaryStrong}"
    textColor: "{colors.onPrimary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primaryStrong}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  button-secondary-hover:
    backgroundColor: "{colors.primarySoft}"
    textColor: "{colors.primaryStrong}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.onAccent}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  button-accent-hover:
    backgroundColor: "{colors.primaryStrong}"
    textColor: "{colors.onPrimary}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.bodySm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  input-focus:
    backgroundColor: "{colors.surfaceRaised}"
    textColor: "{colors.ink}"
  status-success:
    backgroundColor: "{colors.successSoft}"
    textColor: "{colors.successInk}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-warning:
    backgroundColor: "{colors.warningSoft}"
    textColor: "{colors.warningInk}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-danger:
    backgroundColor: "{colors.dangerSoft}"
    textColor: "{colors.dangerInk}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-info:
    backgroundColor: "{colors.infoSoft}"
    textColor: "{colors.infoInk}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  success-action:
    backgroundColor: "{colors.success}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  info-action:
    backgroundColor: "{colors.info}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  warning-action:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  danger-action:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  danger-action-hover:
    backgroundColor: "{colors.dangerInk}"
    textColor: "{colors.onPrimary}"
  role-badge-admin:
    backgroundColor: "{colors.accentSoft}"
    textColor: "{colors.onAccent}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  role-badge-user:
    backgroundColor: "{colors.primarySoft}"
    textColor: "{colors.primaryStrong}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  empty-state:
    backgroundColor: "{colors.infoSoft}"
    textColor: "{colors.infoInk}"
    rounded: "{rounded.md}"
    padding: "{spacing.2xl}"
  focus-indicator:
    backgroundColor: "{colors.focusRing}"
    height: 2px
    width: 2px
---

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

Use restrained hierarchy rather than oversized display text. Headings should be short and purposeful. Labels may use slight tracking, but body copy and table content should remain natural and easy to scan. Use Geist Mono only for identifiers, quantities, reference numbers, and other values where alignment or distinction helps.

Do not default to all-caps headings, excessive letter spacing, or a different display font on every page. A small amount of editorial warmth may appear in welcome or empty-state copy, but the core application should remain consistent and operational.

## Layout

The default application frame is a persistent left navigation rail with a compact top header and a readable content area. The recommended sidebar width is 15rem. Keep content within a maximum width of 90rem and use 24px page gutters on desktop, reducing them carefully on smaller screens.

Prefer compact vertical rhythm: 8px and 12px for control groups, 16px for related content, and 24px for sections. Use tables, timelines, lists, and action panels when they reveal current work more clearly than charts.

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
