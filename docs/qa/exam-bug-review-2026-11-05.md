# Exam module bug review · 5 November 2026

## Fixed

- Cloning copied sections and bank links but omitted Studio questions, passages, groups, rubrics and the result policy. The copy now preserves that content with new IDs and remapped relationships. It belongs to the person making the copy. Scheduled results require a new release date. A database test confirms that a failed copy rolls back.
- Some advanced editing routes could change a published paper or a paper students had started, despite Studio locking those controls. Bank links, random rules, passages, groups and sections now share the content-lock check. Shared bank changes also respect the exams that use the content.
- A partial schedule update could set the closing date before the saved opening date. Malformed numeric values could silently become defaults. Validation now checks the resulting window, rejects invalid inputs and writes only supplied fields.
- The retired bulk-grading path could change active or finalized attempts without the current rubric and finalization checks. It now returns HTTP 410 and directs callers to the supported grading queue. No application screen called that endpoint.
- An older save finishing while a student continued writing could show the latest text as saved. The player now reports pending changes. Queued navigation saves stop when submission begins.
- The grading queue fetched full student and account records. It now selects the student code and display name needed by the screen.

## Refactoring

Cloning and schedule validation are isolated in testable helpers. Advanced content mutations share a paper-lock helper. The obsolete grading implementation and its unused input schema were removed. The student save function was expanded into readable steps.

## Verification

84 exam unit tests passed. All 86 selected desktop and phone Brave checks passed across two runs. The first runner stalled after 82 passes and was stopped. A fresh run completed the four remaining mobile grading checks and repeated the grading and save-race checks. The fresh test server also corrected font loading in the isolated worktree.

The real API and disposable PostgreSQL checks passed for owner-granted access, cloning and relationship remapping, rollback, partial schedule validation, locked-paper edits and the retired grading route. TypeScript and the production build passed. These changes require application deployment and add no database migration.
