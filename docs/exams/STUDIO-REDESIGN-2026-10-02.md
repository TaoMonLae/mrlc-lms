# Exam Studio redesign — 2 October 2026

> Historical redesign record. AI question generation was removed on 2026-10-03; the current Studio supports manual question authoring and bank workflows.

## Brief and build target

A professional assessment-authoring workspace for teachers. Preserve the LMS's
navy typography and teal action identity, established API contracts, eight question
types, accessible native controls, draft protection, and started-exam restrictions.
The supplied Studio screenshot is the existing product target. Reorganize the
workspace instead of adding ornamental effects or generic dashboard cards.

## Research and decision ledger

| Decision | Reference | Adaptation |
| --- | --- | --- |
| Separate setup navigation from question outline | [Typeform on Mobbin](https://mobbin.com/screens/1ffcdfce-1120-4b82-823c-1738a8e63a45), [Typeform on Refero](https://refero.design/pages/270de457-c71d-4ac0-9ea5-9d68c1c652f9) | Horizontal workflow above a dedicated numbered outline; selected question gets a clear edge and readable two-line title. |
| Focused white authoring surface on a cool utility canvas | Refero shadcn style `c14c0a94-1037-449e-bf5b-4cb972656ac7`, source [shadcn](https://ui.shadcn.com) | Flat surfaces, restrained borders, compact type, minimal elevation. Keep existing LMS teal for actions. |
| Distinct grading groups in the first-question selector | Teacher authoring context; Google for Education Refero style `bf4966c6-7f2f-47a2-ac10-8a496c044d5e` | Separate selected responses from written responses and label the grading method. Use functional icons and list rows. |
| Compact functional hierarchy and dark surfaces | Linear Refero style `11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6`, source [Linear changelog](https://linear.app/changelog) | Borrow compact typography and border-led separation. Do not import marketing colors or decorative imagery. |
| Brief transition feedback | [React Bits Animated List](https://www.reactbits.dev/components/animated-list), [Stepper](https://www.reactbits.dev/components/stepper) | Adapt selection feedback and step indicators using existing Motion/CSS; preserve native focus behavior and reduced-motion support. No additional animation dependency. |
| Preview must earn its space | Supplied screenshot and authoring task | No preview panel for an empty exam or setup forms. Collapsible interactive preview for wide screens; full student preview remains available on smaller screens. |

## Reference lock

Primary: the existing LMS design system, with the precise white-surface discipline
of the shadcn reference. Preserve dark navy text, teal interactive accents, compact
12–14px utility copy, and a document-like editing canvas. Borrow Typeform's outline
and workflow separation, and React Bits' restrained interaction feedback. White
`#fff` authoring surface, cool `#f5f7f9` workspace, navy `#182b38` text, teal `#14736d`
actions, `#dce3e7` rules. Dark mode uses layered navy surfaces and lighter teal text.
Functional line icons only; no bitmap assets needed. Reject decorative gradients,
floating generic cards, animated headlines, arbitrary bright question-type colors,
and a permanently empty preview column.

## Changes

- Four setup stages become a horizontal workflow with readiness indicators.
- Dedicated question outline displays position, response type, points, and validity.
- Empty state groups all eight types by grading method with distinct response icons.
- Authoring form becomes a focused document on a cool workspace surface.
- Live preview appears only during question editing; teachers can collapse it or
  switch preview width. Full preview remains accessible on mobile and tablet.
- Sticky desktop toolbar keeps save actions in reach and replaces duplicate footer controls.
- Optional passage/image fields sit behind a disclosure after the answer controls.
- Fixed an undefined math-toolbar flag that exposed symbols while the toggle read off.
- Correct-answer selectors are circular with usable targets; remove-option controls have readable contrast.
- Narrow layouts use compact setup navigation, a bounded outline, and stacked types.

## Verification

- TypeScript: `npm run lint` passed.
- Production bundle: `npm run build` passed (existing dependency/bundle notices).
- Studio model and persistence: 10 unit tests passed.
- Browser suite: all 20 cases passed across desktop and mobile Chromium, including
  all eight question types, load retry, partial save retry, publish sequencing,
  preservation of hidden release policy, duplicate/reorder/delete, started-exam
  restrictions, accommodations, math/media, AI success/failure, and student previews.
- Two targeted browser checks also passed after retaining mobile access to question bank and advanced scheduling.
- New coverage verifies preview collapse/width, draft preservation across setup steps,
  no horizontal overflow at tablet size, sticky save controls, and hidden math tools.
- Visual review: 1680px desktop empty/editor, 1280px dark editor, 820px tablet and
  390px mobile; compared against the reference lock. No outstanding major layout issues.
- API responses are mocked in the browser suite. This validates authoring behavior,
  serialization and recovery; it is not a live-production database test.
- No new frontend dependency. Existing unrelated graphic assets left untouched.


## Exam overview navigation follow-up

The overview header now gives long exam titles their own row and places actions
in a compact toolbar: Manage exam, Responses, Preview, and Open in Studio.
Manage exam groups authoring, scheduling, printing, and separated archival.
Responses groups monitoring, grading, and gradebook synchronization. Existing
routes, write handlers, and confirmations remain unchanged.

Reference: [React Bits Card Nav](https://www.reactbits.dev/components/card-nav)
and its [public source](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Components/CardNav/CardNav.tsx).
Adapted its grouped panels and separate primary action into compact dropdown lists,
with descriptive rows and the LMS's existing colors. Reviewed Navigation 7 as an
alternative. Uses Base UI for keyboard/focus behavior and restrained CSS motion;
does not copy the GSAP component or introduce another dependency.

Four browser checks passed across desktop/mobile with mocked APIs: all destination
URLs, keyboard opening/navigation/Escape/focus restoration, long-title overflow,
light/dark screenshots, cancelled/confirmed archive, and gradebook sync. Production
build and TypeScript passed. Visual evidence is saved in the chat artifacts.
