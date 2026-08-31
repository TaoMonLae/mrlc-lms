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

## Clock & date extension

The clock and date control desk extends the same reference lock instead of introducing a second settings aesthetic.

| Decision | Source | Preserved role | MRLC adaptation |
| --- | --- | --- | --- |
| Flat, connected settings rows | PostHog + mono | Dividers create hierarchy; cards and shadows do not | Four numbered rows for timezone, time notation, date order and precision |
| Live proof beside the settings title | Acuity timezone settings | Show the operational consequence of the selected zone | Navy live school-time panel updates as controls change |
| One regional group for time and date | Skiff Format settings | Related calendar formats stay together with short explanations | Dedicated Clock & date route rather than duplicate fields in System preferences |
| Account-wide language | DocuSign Regional Settings | Make the scope explicit | Copy states that schedules, attendance, reports and the top bar share the standard |
| Gold action / teal selection | Existing Fieldbook token lock | Gold is CTA-only; teal marks selection/navigation | Save stays gold; selected date order uses the restrained teal active surface |

Rejected patterns: generic statistic cards, an ornamental analog clock, gradients, oversized toggle tiles, and controls that change only a preview without persisting to the product.

## Finance control desk extension

The finance module extends the fieldbook into a digital operating ledger. Research focused on high-trust financial dashboards rather than generic analytics galleries.

| Decision | Source | MRLC adaptation |
| --- | --- | --- |
| One dominant movement chart with supporting controls | Stripe Revenue Recognition (`5f9b93d3-6315-4656-8f74-cd26b07f1069`) | A single 12-month receipts-versus-paid-expenses plot replaces three disconnected mini charts |
| Flat, dense financial hierarchy | PostHog + Operate (`13bc10c0-3cf9-4feb-8bf8-bfdd123931fc`, `a0f473eb-0310-4df5-b5f6-5bc124ad5954`) | Connected metric strip, ruled action ledger, budget watch, and rectangular register links |
| Restrained trust-oriented palette | N26 (`59911817-9d14-445a-9f1b-617418001061`) | Navy carries structure, teal denotes cash received/healthy position, and coral is reserved for outflow or exceptions |
| Precise chart inspection | React Bits Pro `dashboard-2` + `analytics-2` | Pointer crosshair, arrow/Home/End keyboard inspection, a period summary strip, and a reduced-motion-aware reveal |
| Evidence follows the summary | Squarespace Revenue + OpenAI Usage (`92bca338-acae-46bb-8b26-88f554f11e91`, `b9307fdb-d0a9-4259-8273-66e5f1d7aa08`) | Finance actions and report links sit beside the overview so staff can trace a number into its register |

Rejected finance patterns: equal-weight KPI card collages, duplicate cash-flow summaries, pie charts for two income sources, rainbow category palettes, oversized quick-action tiles, gradients, and decorative chart animation without inspection value.

The finance audit also corrected the reporting contract: fee collections and donations are both included in revenue; partial fee balances cannot become negative; selected-year receivables and commitments are date-scoped; pending commitments and budget actuals include tax; report ranges reject malformed or partial dates; stale year requests are aborted; API failures no longer render as plausible zero totals; exports use the configured currency and escape CSV cells.

## Timetable module reference lock

Research sources: Refero style systems MONO (`4b3c372c-aff6-4608-bafb-1dde853c4805`), Goodnotes (`20a06982-45ea-4df0-ae36-7cb6de2b6a4b`), and Cron Calendar (`0528b40d-d5ef-4783-9206-d42fa97ad1d2`); Refero product screens Rise Calendar (`bc9dff96-d4b1-445f-9bcc-c9509b6a4956`), Google Classroom (`ede86745-aea2-4d30-b5e3-deca21aefb93`), Missive week calendar (`63c25d8d-1c22-4060-93b2-ce08e51ab76b`), and Luma event creation (`5cbfca17-3479-429f-90df-ca9ffe3ebc39`); React Bits Pro `scheduling-6`, `scheduling-3`, and `scheduling-1`.

| Decision | Source | MRLC adaptation |
| --- | --- | --- |
| Architectural weekly grid | MONO + Rise Calendar | A visible hour rail, sharp rules, date headers, proportional sessions, and side-by-side overlap lanes replace floating day cards |
| Academic orientation | Google Classroom | Class/person/room focus remains at the top of the week; the current date is marked without turning every category into a new color |
| Operational calendar behavior | React Bits Pro `scheduling-6` | Week navigation, current-time line, compact event density, keyboard-reachable actions, and responsive agenda treatment |
| Form plus evidence | Luma + React Bits Pro `scheduling-3` | Create/edit uses a split field-entry sheet with a live slot proof instead of disconnected generic cards |
| Mobile agenda | React Bits Pro `scheduling-1` | Narrow screens become a date-led chronological ledger rather than a squeezed seven-column grid |

Timetable color roles are fixed: navy carries structure; teal marks published records and links; gold marks the current date, changed assignment, and primary publish action; coral is reserved for cancellations and destructive actions. Schedule type is communicated with text labels, not a rainbow palette.

Rejected timetable patterns: duplicate page titles, soft floating filter cards, native unlabelled selects, rainbow subject blocks, decorative empty-state icons behind every day, equal-height day stacks that ignore clock time, and week controls that change the label without changing one-off/effective-date records.

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
