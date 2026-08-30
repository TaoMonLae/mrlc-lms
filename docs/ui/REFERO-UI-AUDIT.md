# MRLC LMS — Refero UI Audit & Redesign Record

Date: 31 August 2026
Direction: **School Operations Fieldbook**

## Audit summary

The product contained 289 routed TSX pages. The pre-redesign code audit found:

- 215 files using large, repeated rounding patterns.
- 217 files using repeated elevation/shadow patterns.
- 68 files using purple/indigo gradients.
- 97 files using the generic Card primitive.
- 138 files using 10–11px supporting text.
- Four Recharts views with inconsistent chart treatment.

The supplied dashboard screenshot confirmed the structural findings: dark mode carried the primary experience, the sidebar was long and visually undifferentiated, the dashboard was a grid of equal-weight floating cards, key tasks competed with decorative surfaces, and two unrelated floating circular assistants occupied the lower corner.

## Severity ledger

| Priority | Finding | Design response |
| --- | --- | --- |
| P0 | Generic dashboard/card grid hid the school's operational hierarchy | Rebuilt as a ruled daily ledger: field note, connected metric strip, notice board, timetable, and case queue |
| P0 | Navigation and page chrome lacked a distinct institutional identity | Introduced the compact navy operations spine, numbered/routed settings rail, and rectangular action geometry |
| P1 | Decorative gradients, blur, glow, excessive radius and shadow appeared across product surfaces | Replaced shell decoration with flat paper/sheet surfaces, dividers, low-radius primitives, and scoped legacy normalization |
| P1 | Typography was small and visually uniform | Adopted IBM Plex Sans, tightened display hierarchy, raised control height, and reserved uppercase tracking for labels only |
| P1 | Color roles were inconsistent | Locked teal to navigation/links, gold to primary action, coral to operational priority, and navy to structure |
| P2 | Settings forms lacked context and a reliable save state | Added a section-led control desk and sticky dirty/saved action ledger |
| P2 | Floating AI/chat affordances read like generic consumer widgets | Converted both to square, flat, role-colored utility controls |

## Refero research and reference lock

Research covered four independent directions: high-contrast education operations, playful trustworthy learning, information-dense enterprise software, and sharp structured product UI.

Locked references:

- **PostHog** (`13bc10c0-3cf9-4feb-8bf8-bfdd123931fc`) — workbench density, flat grouping, direct hierarchy.
- **EVOKE** (`1e802d79-598e-4745-aaa5-fa66c16608ad`) — poster-like type and decisive flat color fields.
- **shadcn** (`c14c0a94-1037-449e-bf5b-4cb972656ac7`) — accessible primitives and control consistency.
- **Google for Education** (`bf4966c6-7f2f-47a2-ac10-8a496c044d5e`) — academic clarity and calm instructional tone.
- **Acuity dashboard** (`4c4d0be6-b16f-4d52-8a0b-34e137f70e61`) — real operational dashboard composition.
- **Sunsama focus day** (`45c055de-fb09-4ea3-ab77-3b9795b51067`) — daily work hierarchy.
- **Preply settings** (`fc61f849-ef0a-45ea-92dc-22bd94fae0ef`) — section-led settings navigation.
- Refero flows `2617`, `9452`, and `3899` — invitation, unsaved-change and save-confirmation behavior.

The result intentionally synthesizes the structural lessons without copying a source.

## React Bits Pro provenance

The authenticated `@reactbits-pro` registry supplied three starting patterns:

- `dashboard-11` became the real school operations dashboard and now renders live MRLC data.
- `app-sidebar-5` informed the nested, compact navigation hierarchy and active-row behavior; the registry demo was removed after adaptation.
- `settings-form-1` became the routed fieldbook settings frame and sticky save-state pattern; demo workspace/billing data was removed.

## System decisions

- Canvas: paper `#f0f1ec` with a restrained 48px horizontal rule.
- Sheet: white with `#cfd5d2` dividers; no ambient card shadows.
- Structure: navy `#0c2538`.
- Navigation/links: teal `#168c83`.
- Primary action: gold `#f2b84b`.
- Priority only: coral `#e97961`.
- Geometry: 0–4px across standard product surfaces.
- Typography: IBM Plex Sans Variable with tabular numerals.
- Motion: short opacity/position transitions; reduced-motion is respected.
- Dark mode remains supported, but light fieldbook mode is the primary authored experience.

## Coverage

The redesign propagates through the global shell and shared Button, Card, Input, Textarea, Badge, Table, Tabs and Dialog primitives. This gives all routed operational pages the new type, color, geometry, focus and surface system without unsafe page-by-page markup rewrites. The highest-value bespoke views—public landing, login, application shell, dashboard, settings navigation/form, AI and chat—were directly redesigned.

Game experiences keep purpose-built reward/progression artwork where color supports learning feedback. Generic application chrome around those experiences still inherits the fieldbook system.

## QA gates

- TypeScript lint/compile.
- Production build.
- Existing automated test suite.
- Desktop and mobile browser review of the public and authenticated shells.
- Keyboard focus, skip-link, active navigation and reduced-motion review.
- React Bits/shadcn generated-code audit.
