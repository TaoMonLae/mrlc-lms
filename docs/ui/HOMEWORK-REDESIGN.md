# Homework learning workspace

## Brief and reference lock

Redesign the existing MRLC teacher/student homework routes without changing server permissions, submission contracts, upload restrictions, or gradebook behavior. Direct build within the existing MRLC product shell; code-native product UI, no stock/generated hero imagery.

Primary Refero direction: **Google for Education**, style `bf4966c6-7f2f-47a2-ac10-8a496c044d5e`. The academic-whiteboard layout supplies restrained surfaces, thin dividers, compact metadata, and pale-blue grouping. Blue is reserved for actions and active controls; semantic status colors remain separate. Existing MRLC typography is retained as the system substitute. Dark mode translates the same hierarchy to the app's dark surfaces.

Secondary references are deliberately narrow: **Todoist** (`d9a3223e-d0d5-436b-aa09-0facd1805a1e`) for task prioritization, **Cron** (`0528b40d-d5ef-4783-9206-d42fa97ad1d2`) for deadline-oriented metadata. Their red/orange marketing palettes and dramatic heroes are not imported.

Refero Classroom screens `7d40841a-7319-44c2-85db-561c28e6f728` and `3aac3744-636f-4bd6-a586-4fbc18d207fe` inform the wide student-work area, narrow feedback sidebar, clear identity, score, and explicit return action. Programa's [Create Assigned Task flow](https://refero.design/flows/13442) informs brief → class/deadline → attachments → publish → visible assignment confirmation.

ReactBits: existing local `components/AnimatedContent.tsx` supplies a short 14px entrance for the contextual overview only, using the actual `main` scroller. It already respects reduced motion. Editors and grading rows do not animate while typing or saving. No new dependency or Pro license credential is added.

## Changes

- Teacher desk: review queue, class filter, deadline/review-volume sorting, compact assignment progress, three non-destructive instruction starters.
- Review studio: start at a pending submission, mark and advance to the next pending student, appendable feedback shortcuts, full-class CSV marking export of saved values (not unsaved drafts), with formula-injection protection.
- Student desk: to-do/today/overdue/redo/submitted/marked/all views, subject filter and search, collapsed briefs, word count, text draft recovery after closing or refreshing the tab.
- Drafts use sessionStorage keys isolated by authenticated user, assignment, and last server submission timestamp. They are not cross-device storage. Only text is retained; staging attachments are discarded when closing. The UI reports storage failure without falsely claiming the draft is saved. Successful submissions remove the current draft.
- Fixed marking without editing discarding existing feedback/score, including zero. Closed assignments no longer count as actionable student work. Missing counts use the current roster. Uploading prevents closing/switching a student editor; submitting disables text and attachment edits.

## Verification

- 285 unit tests passed, including five new regression tests for calendar-day grouping, closed states, review fallback, draft-key isolation, and safe CSV encoding.
- TypeScript and production build passed. Existing Lottie eval and Node module-register warnings remain unrelated.
- Actual React routes exercised in an isolated local Vite fixture with sample API responses, never production records: teacher queue filter, assignment starter/publish, preserve feedback and score 0, mark-next, request changes, student text recovery across reload, turn-in and submitted filter.
- Visual checks at 1440×1000 and 390×844, plus mobile dark mode. No page-level horizontal overflow in teacher/student/review routes; the marking table retains its own horizontal scroller. Mobile grading stacks the student work above feedback controls.
- Temporary QA entrypoints removed after validation. No server/schema changes and no commit performed.

Live authenticated integration, real file upload/download, and gradebook sync were not exercised against the database in this pass; their existing APIs are unchanged.
