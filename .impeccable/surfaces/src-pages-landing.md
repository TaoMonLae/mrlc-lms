---
version: 1
slug: "src-pages-landing"
primary_target: "src/pages/Landing.tsx"
related_targets:
  - "src/pages/landing.css"
---

# Public landing surface brief

Scope: public route `/`. Visitor mode: Persuade.

Audience and job: school students, families and staff should recognize MRLC, find school sign-in, and distinguish the public Learning Quest path. First-time visitors should understand the connected school workflow and the newest platform work without implying that pilot features are generally released.

Constraints: preserve the school name, configurable logo and hero image, role-aware portal destination, light and dark theme control, public Learning Quest route, and multilingual product context. Public About navigation stays on the landing page because the detailed `/about` route currently requires sign-in.

Research: Refero Google for Education (institutional clarity), Medium (editorial hierarchy), and Mux (product demonstration on a restrained canvas); Mobbin Duolingo for Schools (direct education CTA), Airtable What's New (dated scanable changes), and Intercom Just Shipped (recent-work hierarchy). The landing carries MRLC Fieldbook tokens from `DESIGN.md`.

## Direction contract

THESIS: The landing reads as a connected school day: a direct school entrance beside an illustrative workflow, followed by the people, learning path and recent changes.

OWN-WORLD: MRLC Fieldbook paper, navy ink, teal for selection and learning, gold for the closing action, IBM Plex Sans, ruled rows and square controls. The Learning Quest illustration is the existing Pip asset.

STORY: A visitor identifies the school, signs in or explores Learning Quest, sees how school work connects, and finds current changes with the pilot status stated plainly.

FIRST VIEWPORT: A sticky school masthead; a large two-line statement and two actions at left; a tilted but legible school-day sheet at right with clearly marked illustrative data. On mobile, the copy and actions precede the sheet, with navigation collapsed to a labeled menu.

FORM: Connected school-day ledger, position 4 of 7 grounded structures; seed key b273abb1 (degraded roll, no catalog challengers). Code-led implementation.

Signature move: the same ruled school-day sheet vocabulary appears in the hero and the compact workflow rows below, while Learning Quest gets one illustrated color field.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
