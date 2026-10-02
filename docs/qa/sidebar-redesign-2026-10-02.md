# MRLC sidebar redesign — 2 October 2026

## References and direction

- Refero: Linear Changelog, style `11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6` (https://linear.app/changelog). Primary reference for compact typography, tonal surface separation and restrained navigation. Retain MRLC navy rather than adopting Linear's monochrome brand.
- Refero: Cron Calendar, style `0528b40d-d5ef-4783-9206-d42fa97ad1d2` (https://cron.com). Borrow small-radius controls and a disciplined accent; reject oversized marketing type.
- Mobbin: https://mobbin.com/screens/a0193431-e1b3-44c4-b1a2-1d1f4a017ccc. Inspected Linear's grouped workspace links and compact icon/text alignment.
- React Bits: https://reactbits.dev/components/line-sidebar and https://pro.reactbits.dev/docs/blocks/navigation/navigation-4. Reviewed the public navigation references; Pro describes vertical navigation with tooltips and dock-style hover scaling. Adapt grouped icon access and restrained motion, without dock magnification that would move school navigation targets. No paid source code was copied or new package installed.

## Implementation decisions

- Navy workspace surface, 13px group labels, 12px child links, 36px desktop rows and larger mobile targets.
- School identity remains visible; active links have a pale-teal foreground and inset indicator.
- Collapsed navigation keeps one icon per group, with accessible flyout menus instead of flattening every destination into a long rail.
- Preserve role definitions, boarding-only visibility, route matching, unread counts, profile actions and logout.
- Add explicit current-page semantics, group controls and a visible collapse/close button. Existing keyboard shortcut and rail remain available.
- Forward sidebar classes into the mobile drawer so its colors and controls match desktop.
- Honor reduced-motion preferences; no new animation dependency.

## Validation

TypeScript, production build and all four desktop/mobile browser checks passed. Browser validation uses mocked demo accounts and checks desktop/mobile accordion behavior, collapsed keyboard menus, current-route marking, student administration exclusion and mobile closing. Screenshots are reviewed after disabling animation for stable captures.
