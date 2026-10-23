# Exam grading and review checks — 22 October 2026

## Confirmed bugs fixed

1. **Finalize requests reached the wrong route.** Express matched `/api/grading/:attemptId/:questionId` before `/api/grading/:gradeId/finalize`, interpreting the grade ID as an attempt ID. Register the literal action first. A regression exercises the real Express routing and middleware pipeline: save a zero mark, finalize it, recompute the total, and reject subsequent edits and student access.
2. **Corrected drag-and-drop keys could award marks to wrong tiles.** Rebuilding the bank from corrected blank answers changed numeric tile identities. Scoring now receives the original frozen bank separately from the corrected expected answers. Tests cover right, wrong, and partially correct placements.
3. **Written responses disappeared in staff review.** An empty `selectedOptions` array suppressed `answerText`. Review now falls back to the saved text.
4. **Blank student answers appeared to select the first option.** Converting an empty string to a numeric option index produced zero. Empty answers now remain unanswered.
5. **Fully auto-graded attempts remained hidden under After grading.** The release check now recognizes submitted and auto-submitted attempts whose grading status is complete. Pending grading and other result-policy restrictions remain enforced.
6. **Choice-array submissions skipped configured wrong-answer penalties.** Non-partial choice scoring now applies the same penalty and minimum-score floor as text submissions. Unanswered questions still receive zero.

## Review and marking improvements

- Teachers can filter pending questions and open the matching response's marking form directly.
- Failed finalization distinguishes a successfully saved grade from an unsuccessful lock, preserves inputs, and offers a retry. Validation and save errors remain visible inline.
- Student reviews preserve answer and feedback paragraphs, show numbered questions and awarded/available marks, render maths and question diagrams, and distinguish written model answers from objective answer keys.
- Students can refresh unreleased results without leaving the page.
- Staff results clear old data while loading a different exam.

The existing school design and theme tokens are retained. No database migration is required.

## Verification

- Exam unit tests: **64 passed**, including the Express routing regression.
- Full repository unit suite: **454 passed / 456 total**. The failures are outside the exam changes: the SEO HTML test expects a manifest link absent from the current template; the SEO HTTP test cannot bind a local port (`EPERM`).
- TypeScript check and production build passed.
- Impeccable detector reported no findings in the three changed UI files.
- Browser regression coverage was added for pending-review navigation, multiline student results, and finalization retries. Browser execution and rendered visual verification remain outstanding: this session blocks local server listeners and the attempted headless browser launch failed.

The route regression runs Express directly with Node request/response objects and a mocked persistence layer; it does not certify PostgreSQL transaction behavior or production deployment. No production data was changed, and previously stored grades were not recalculated. Older drag-and-drop attempts without a frozen bank retain the existing correction safeguard.
