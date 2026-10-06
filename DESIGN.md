---
name: MRLC LMS
description: School Operations Fieldbook. A flat, ruled school ledger with a navy spine, gold for action and teal for selection, built for daily staff work in English, Burmese and Mon.
colors:
  fieldbook-paper: "#f0f1ec"
  fieldbook-sheet: "#ffffff"
  fieldbook-ink: "#101b27"
  card-ink: "#172033"
  fieldbook-rule: "#cfd5d2"
  input-rule: "#c4cbc8"
  sage-wash: "#e5e8e3"
  slate-caption: "#5d6a72"
  academic-gold: "#f2b84b"
  academic-navy-deep: "#0c2538"
  academic-navy: "#19324d"
  academic-teal: "#168c83"
  teal-wash: "#dcefeb"
  teal-ink: "#126a65"
  academic-coral: "#e97961"
  academic-sky: "#4e91bd"
  link-blue: "#347da7"
  signal-red: "#d65445"
  spine-navy: "#102b3b"
  spine-active: "#244b56"
  spine-active-line: "#83d8c1"
  spine-text: "#bdcdd7"
  dark-canvas: "#101720"
  dark-sheet: "#18232f"
  dark-raised: "#22313f"
  dark-rule: "#304252"
  dark-ink: "#f4f7fa"
  dark-caption: "#a9b7c6"
  dark-gold: "#f4c86e"
  dark-teal: "#55b7ae"
typography:
  display:
    fontFamily: "'IBM Plex Sans Variable', 'Geist Variable', system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'IBM Plex Sans Variable', 'Geist Variable', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'IBM Plex Sans Variable', 'Geist Variable', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'IBM Plex Sans Variable', 'Geist Variable', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'cv02', 'cv03', 'cv04', 'cv11', 'tnum'"
  label:
    fontFamily: "'IBM Plex Sans Variable', 'Geist Variable', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
  myanmar-body:
    fontFamily: "'Padauk', 'Noto Sans Myanmar', 'Myanmar Text', 'Inter', system-ui, sans-serif"
    lineHeight: 1.9
  myanmar-display:
    fontFamily: "'Khit Haungg', 'Noto Sans Myanmar', system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.6
rounded:
  none: "0px"
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.academic-gold}"
    textColor: "{colors.academic-navy-deep}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.academic-coral}"
    textColor: "{colors.academic-navy-deep}"
  button-outline:
    backgroundColor: "{colors.fieldbook-sheet}"
    textColor: "{colors.fieldbook-ink}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.fieldbook-ink}"
    textColor: "{colors.fieldbook-paper}"
  button-ghost-hover:
    backgroundColor: "{colors.sage-wash}"
    textColor: "{colors.fieldbook-ink}"
  input:
    backgroundColor: "{colors.fieldbook-sheet}"
    textColor: "{colors.fieldbook-ink}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.fieldbook-sheet}"
    textColor: "{colors.card-ink}"
    rounded: "{rounded.sm}"
    padding: "16px"
  badge:
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "20px"
  nav-row:
    backgroundColor: "{colors.spine-navy}"
    textColor: "{colors.spine-text}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  nav-row-active:
    backgroundColor: "{colors.spine-active}"
    textColor: "#d6fff4"
  top-bar:
    backgroundColor: "{colors.fieldbook-sheet}"
    height: "72px"
    padding: "0 32px"
---

# Design System: MRLC LMS

## Overview

**Creative North Star: "School Operations Fieldbook"**

MRLC LMS is a working school's record book. Each screen should read like a well-kept ledger page: pale paper, white sheets laid on it, hairline rules where a ledger would rule, and one dark navy spine down the side. Depth comes from rules and hierarchy, not from floating cards, glows or gradients. The system was locked on 31 August 2026 ([docs/ui/REFERO-UI-AUDIT.md](docs/ui/REFERO-UI-AUDIT.md)). It replaced a generic grid of rounded, shadowed cards with purple gradients, and that look is the confirmed anti-reference.

The density is operational. Staff move through attendance, exams, fees and cases all day, so controls are 40px tall, text is compact, and pages are connected strips and tables, not tiles of equal weight. Personality comes from precise details: tight display type with negative tracking, uppercase micro-labels in teal, a coral block that marks what needs attention today, and the gold button that means "do this".

Burmese and Mon text uses the same system. The ledger structure stays the same, but line heights open up so stacked Myanmar-script glyphs never clip.

**Key Characteristics:**
- Flat paper and sheet surfaces, with 1px rules instead of shadows
- Low, square corners (4px by default, 0 on ruled forms)
- Every color has one job: gold for the primary action, teal for selection and links, coral for priority, navy for structure
- IBM Plex Sans throughout, with tabular numerals
- A navy spine that stays fixed in light and dark themes
- Light theme by default, with a layered blue-grey dark theme (never pure black)

## Colors

A muted paper-and-ink ground with three hard-working accents, each with one job.

### Primary
- **Ledger Gold** (academic-gold): The primary action and nothing else. Default buttons, the skip link, the sidebar focus outline and unread dots. In dark mode it lifts to Lamplight Gold (dark-gold).
- **Fieldbook Teal** (academic-teal): Selection, navigation, links and focus rings. Micro-labels above section titles, link buttons, active filters and chart series 1. Teal Wash (teal-wash) with Deep Teal Ink (teal-ink) form the selected-row and accent surface. In dark mode it lifts to Lagoon Teal (dark-teal).

### Secondary
- **Harbour Navy** (academic-navy-deep, academic-navy): Structure. The strong border around the dashboard field note, text on gold, and the dark ground of the app's identity. The sidebar uses Spine Navy (spine-navy), with Spine Teal (spine-active) and Mint Line (spine-active-line) for the active row.

### Tertiary
- **Priority Coral** (academic-coral): What needs attention today. The dashboard's priority block, case-queue labels and the primary button's hover. It means priority, never error.
- **Survey Sky** (academic-sky) and **Record Blue** (link-blue): Informational and chart secondary series only.

### Neutral
- **Fieldbook Paper** (fieldbook-paper): App background, ruled every 48px on the workspace canvas.
- **Sheet White** (fieldbook-sheet): Cards, tables, inputs, popovers and the top bar.
- **Fieldbook Ink** (fieldbook-ink) / **Card Ink** (card-ink): Body text on paper and on sheets.
- **Field Rule** (fieldbook-rule) / **Input Rule** (input-rule): Borders, dividers and input strokes.
- **Sage Wash** (sage-wash): Secondary and muted surfaces, and ghost-button hover.
- **Slate Caption** (slate-caption): Supporting text and metadata.
- **Signal Red** (signal-red): Destructive actions and validation errors, usually as a 10% tint with red text.
- Dark theme: Night Canvas (dark-canvas), Night Sheet (dark-sheet), Night Raised (dark-raised), Night Rule (dark-rule), Night Ink (dark-ink), Night Caption (dark-caption).

### Named Rules
**The One Job Rule.** Gold is for the primary action only, teal marks selection and navigation, coral marks priority, navy carries structure. Never swap them, and never use gold as decoration.

**The No-Purple Rule.** Purple and indigo gradients were deliberately removed from the school app. The legacy `aubergine-*` utility names now resolve to teal; don't reintroduce violet.

## Typography

**Display Font:** IBM Plex Sans Variable (with Geist Variable, system-ui)
**Body Font:** IBM Plex Sans Variable
**Myanmar/Mon Body:** Padauk (with Noto Sans Myanmar), applied when `lang` is `my` or `mnw`
**Myanmar/Mon Display:** Khit Haungg, used only for News headlines

**Character:** An institutional sans with real character. It is set tight and heavy for headlines and small and tracked for labels, so pages read like a printed register. Numbers use tabular figures everywhere, so columns of marks and fees line up.

### Hierarchy
- **Display** (600, 3rem rising to 3.75rem on large screens, line-height 0.98, -0.04em): The dashboard field-note headline and hero metrics. Big counts go up to 4.5rem at -0.07em.
- **Headline** (700, 1.5rem, tight tracking): Page titles (h1), sitting at the top of each workspace page.
- **Title** (600, 1.125rem, -0.02em): Section headers inside ledgers, which sit on a dark bottom rule.
- **Body** (400, 0.875rem, 1.5): Most UI text, table cells and form text. Inputs are 1rem on mobile to prevent zoom.
- **Label** (600, 11px, 0.07 to 0.16em, uppercase): Teal micro-labels above titles, column headers, badges and meta lines. 11px is the floor for any text in the school app.

### Named Rules
**The Tracked Label Rule.** Uppercase with letter-spacing is reserved for 11px labels. Headlines are never uppercase, and body text is never tracked.

**The Script Room Rule.** When Burmese or Mon is active, headings go to line-height 1.6, running text to 1.9 and controls to 1.7, and tracking resets to normal. Never apply Latin tight leading to Myanmar script.

## Layout

Each page has the navy sidebar on the left, a 72px white top bar, and a ruled paper workspace. Content is capped at 1680px and padded 16px on mobile, 24px from `sm` and 32px from `xl`. Sections are spaced 24px apart (`space-y-6`).

Pages are built from **connected strips**, not floating tiles. A metric strip is one bordered sheet split into 2 or 4 columns by internal rules. Notice boards are grids whose cells share borders, using a border on the right and top of each cell inside an outer border on the bottom and left. Two-column work areas use roughly a 1.7 : 0.7 split, with the main ledger on the left and a narrow queue on the right.

Breakpoints are the Tailwind defaults (640, 768, 1024, 1280 and 1536px). Below 768px the sidebar becomes a sheet, nav rows grow to 42px and touch targets are at least 44px.

## Elevation & Depth

The system is flat by doctrine. App-wide CSS removes `shadow-*` utilities and card shadows inside `.mrlc-app-shell`, and flattens `rounded-xl` and larger back to the base radius. Depth comes from three things: paper versus sheet (pale ground, white surface), 1px rules (Field Rule in general and Fieldbook Ink under section headers), and the dark navy spine. The workspace canvas has a faint horizontal rule every 48px, like ledger paper. In dark mode, depth comes from stepping the surfaces (Night Canvas, then Night Sheet, then Night Raised), never from shadow.

### Named Rules
**The Ruled Not Raised Rule.** Separate things with a rule or a surface change, never a shadow. A shadow on a school-app surface is a defect, apart from popovers that must float over content.

## Shapes

The corners are square-ish. The base radius is 4px, used on buttons, inputs, cards and badges. Navigation rows use 6px and sidebar flyouts 5 to 7px. The dashboard's field note and ledger strips have square corners (0). Ruled record forms, such as the timetable form, also set inputs and selects to 0. Pills appear only for avatars, status dots and the scrollbar thumb.

## Components

### Buttons
Decisive and rectangular. The primary button is a gold block you can't miss.
- **Shape:** Gently squared corners (4px), 40px tall (32px small, 44px large), 600 weight, 14px text.
- **Primary:** Ledger Gold fill and border with Harbour Navy text. Use one per view, for the main action (for example "New registration").
- **Hover / Focus:** Primary hover turns the whole button Priority Coral. Focus shows a 2px teal ring at 35%. On press, the button nudges down 1px.
- **Outline:** Sheet White with a 25% ink border. On hover it inverts fully to ink with paper text.
- **Ghost / Secondary:** Sage Wash on hover, or Sage Wash as the resting fill.
- **Link:** Teal text with an underline on hover.
- **Destructive:** A 10% red tint with Signal Red text, never a solid red block.

### Chips / Badges
- **Style:** 20px tall, 4px corners, 11px uppercase text tracked 0.07em, weight 600. Status reads as a tinted fill with matching text.

### Cards / Containers
- **Corner Style:** 4px (the `rounded-sm` default), or square for ledger strips.
- **Background:** Sheet White on Fieldbook Paper.
- **Shadow Strategy:** None (see Elevation).
- **Border:** 1px Field Rule. Key panels use a Harbour Navy border.
- **Internal Padding:** 16px (12px small). Ledger headers are 16 to 20px with a dark bottom rule.

### Inputs / Fields
- **Style:** 40px tall, Sheet White fill, 1px Input Rule stroke, 4px corners, no shadow.
- **Focus:** The border turns teal with a 2px teal ring at 30%.
- **Error / Disabled:** Red border with a 20% red ring. Disabled fields fade to 50% on an input-tinted fill.

### Navigation
The school sidebar is the Harbour Navy spine.
- Group headings are 10px uppercase in muted blue-grey.
- Rows are 36px tall with 13px text and 17px line icons (stroke 1.6).
- On hover, a row gets a faint white wash.
- The active row has a Spine Teal fill, mint text and a 2px Mint Line on its left edge.
- Child menus indent under a hairline guide.
- Keyboard focus shows a 2px gold outline.
- Collapsed mode shows a flyout of 240px.
- The top bar is white and 72px tall, with a 40px search field on paper that shows a ⌘K hint.

### Field Note and Priority Block (signature)
The dashboard opens with a single sheet with a navy border, split into two parts:
- **Left:** a teal micro-label, a large tight headline and the actions.
- **Right:** a 300px **Priority Coral** block that shows the day's count in very large numerals.

Under it sit the connected metric strip and a shared-border notice board, whose cells take a 45% teal wash on hover. This is the reference composition for operational overviews.

## Do's and Don'ts

### Do:
- **Do** keep one gold primary action per view, with navy text on gold.
- **Do** use teal for whatever is selected, active, linked or focused.
- **Do** build overviews from connected strips and shared-border grids on Sheet White, separated by 1px rules.
- **Do** put a teal uppercase micro-label (11px, tracked 0.1 to 0.16em) above section titles.
- **Do** keep tabular numerals on for marks, fees, counts and dates.
- **Do** test every new surface in Burmese and Mon and let the script line heights apply.
- **Do** keep the dark theme blue-grey (Night Canvas #101720 and above).

### Don't:
- **Don't** set text below 11px, or use generic `slate-*` / `gray-*` colours; use the theme tokens (`text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`). `node scripts/codemods/fieldbook-tokens.mjs` converts stragglers.
- **Don't** ship an icon-only button without an `aria-label`; `tests/unit/iconButtonLabels.test.ts` enforces it.
- **Don't** use drop shadows, glows, blur or gradient panels in the school app.
- **Don't** use radii above 8px, or pill-shaped buttons, on school-app surfaces.
- **Don't** reintroduce purple or indigo gradients, or floating circular assistant buttons.
- **Don't** fill a dashboard with a grid of equal-weight floating cards.
- **Don't** use coral for errors or red for priority. They are separate signals.
- **Don't** bring Learning Quest's Poppins, 45px pill buttons or bright gradients into the school app.

### Scoped worlds (outside this system)
These areas have their own design documents and are excluded from the rules above, inside their own wrappers:
- **Learning Quest** (`.lq-mesh`): [docs/language-quest/DESIGN-Languagequest.md](docs/language-quest/DESIGN-Languagequest.md). It uses Poppins, larger radii and vivid colour.
- **Games:** game scenes keep their own colour art.
- **Finance:** [docs/finance/DESIGN.md](docs/finance/DESIGN.md) extends Fieldbook for the finance workflow and does not replace it.
- **News:** uses Khit Haungg for Myanmar headlines ([docs/ui/NEWS-REDESIGN.md](docs/ui/NEWS-REDESIGN.md)).

The previous root file, an analysis of Discord's style, is kept as a reference at [docs/ui/reference-discord.md](docs/ui/reference-discord.md). It is not part of this system.
