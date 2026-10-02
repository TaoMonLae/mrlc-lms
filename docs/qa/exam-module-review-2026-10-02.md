# Exam module review — 2 October 2026

## Design references and implementation direction

The existing LMS design system remains the primary target: existing type, semantic surfaces, primary-action color, and dark-mode tokens. This is a workflow repair, not a new visual identity.

- Mobbin: [Brilliant question screen](https://mobbin.com/screens/9a178f05-ef2a-4b13-93c0-9d042d297873), inspected visually. Borrow explicit progress and a focused question area with a separate action bar.
- Refero: [Udemy style](https://refero.design/styles/64bb1262-e0d5-4ca7-b5fc-9d560bd8a552), retrieved in full. Borrow readable content hierarchy and restrained active-state emphasis, retaining the LMS palette.
- Refero: [Perplexity style](https://refero.design/styles/b95e58ce-d00e-4de1-ad6b-6f1c7d7a5593), retrieved in full. Borrow compact functional navigation, not its marketing layout or color system.
- Refero: [Typeform authoring screen](https://refero.design/pages/d2cf1fb7-0ff6-4624-9ae2-56be7473671b). Research supported retaining the Studio's question-navigation/editor/settings structure.

Reference lock: retain existing surfaces, sans-serif typography and functional accent roles; improve progress, selected states, touch targets, and recoverable errors. No imagery or decorative redesign is needed.

## Confirmed defects repaired

1. Restored written/single-choice answers with `selectedOptions: []` appeared unanswered in the player. Empty arrays now fall through to the actual text answer.
2. The same payload shape hid answers in released result review. Results now preserve the answer text without changing result-release permissions.
3. Studio emits alphanumeric blank IDs (`b0`, `b1`); the player/print splitter only recognized numbers. Rendering and reverse conversion now support both formats.
4. Catalogue request failures looked like an empty catalogue, and fast active/archive switching could apply an older response. Errors now have a retry state, with aborted obsolete requests ignored.
5. Live invigilation swallowed request failures and could leave stale data looking current. It now exposes failure/retry, retains context with a stale-data warning, and disables actions while stale or saving.

## Usability changes

- Answered progress bar and flagged count.
- 44px question navigation targets, visible flag markers and keyboard focus outlines.
- Answer choices expose pressed state, visible checkmarks and single/multiple-selection instructions.
- Text and dropdown answers have accessible labels.
- Live monitoring tables scroll within their container on mobile; a true empty roster has explanatory copy.
- Extra-time prompts reject invalid values before sending a request.
- Neutral invigilator badges use semantic theme tokens. Both design-hook findings were fixed; no suppressions or unresolved hook findings were needed.

## Verification scope

Unit tests cover exam rules, scoring, availability, route handlers, grading, analytics, bank behavior, and Studio persistence. Browser tests use API fixtures for authoring, scheduling, grading, student history, start/resume, saving/retry, expiry, result loading, live monitoring and responsive behavior. These tests do not certify a deployed database or production configuration. No production data was modified.

Final checks: 370/370 repository unit tests; 46/46 exam browser tests across desktop and mobile Chromium using installed Microsoft Edge; TypeScript check; production build; and `git diff --check` all passed. Reviewed rendered desktop/mobile player and invigilator screenshots. Existing Studio/grading tests also cover dark mode, zero scores, incomplete rubrics, and publication after partial-save failures.

## Second correctness pass

The follow-up concentrated on server behavior rather than another visual redesign.

- **Scoring:** the empty `selectedOptions` array bug also existed in objective scoring. Restored correct single-choice and numeric responses now receive their proper marks; wrong answers still receive configured penalties, and blanks remain zero. A submission-handler regression verifies atomic final-answer persistence and grading against the frozen answer key even after the canonical question changes.
- **Release safety:** failed result-policy lookups now return an error instead of falling back to immediate release. Scheduled release only permits submitted, automatically submitted, finalized, or released attempts, excluding invalidated, paused, active, and pending-grading attempts.
- **Untimed exams:** starting an exam with null/zero duration no longer invents a 60-minute deadline. Timed exams retain duration, accommodation, and grace-period behavior.
- **Complete papers:** question assembly now propagates database lookup failures. Random-question rules reject insufficient eligible questions instead of starting a shorter paper.
- **Classroom request limits:** exam requests are limited per authenticated learner instead of per shared public IP. A real local HTTP integration test exhausts one learner's 120-request budget, confirms their next request receives 429, and verifies a second learner at the same IP still reaches the endpoint.

Second-pass verification: 382 repository unit tests and the local HTTP rate-limit integration test passed; TypeScript passed. Historical stored grades are not automatically recalculated by these fixes; no existing attempts or production records were changed.

The browser rerun surfaced an extra unload save around submission. The completed player now clears its dirty-answer set before navigating to results, preventing a result-loading reload from sending an obsolete save. Added a browser regression that suspends the result module and dispatches `beforeunload` after successful submission. Final browser verification runs after the build, with development hot reload disabled, to isolate exam timing from source/build reloads.

Final second-pass results: all 24 desktop and 24 mobile exam test cases passed across the clean verification runs (48 browser checks). The deliberately suspended-module fixture was updated to release its promise after the assertion, avoiding teardown delay. The complete mobile run exited successfully. TypeScript, production build, and diff whitespace checks passed. Database-dependent route tests use controlled Prisma doubles; the request-limit test uses real local HTTP middleware, not production data.
