# Student exam paper

Approved direction: GED-style exam structure with Microsoft Forms-style simplicity.
The Studio preview and live `/exam2/attempts/:attemptId/play` route share one
presentation component. Live saving, recovery, deadlines, and scoring remain owned
by the existing player.

## Reference lock / decision ledger

| Decision | Reference | Adaptation |
| --- | --- | --- |
| Numbered paper, constrained reading width, points beside question | [Coursera / Mobbin](https://mobbin.com/screens/03035cf1-9337-4336-81af-4113dede7eca) | 800px question sheet, 23px question text, thin rules, no decorative imagery |
| Compact clickable answer rows | [Preply / Refero](https://refero.design/pages/b3a05826-8326-426e-809f-84c10934b56e) | Selection emphasis only; no correctness feedback during the exam |
| White surface, restrained borders | Previously reviewed Refero shadcn style, existing MRLC design system | Navy text, MRLC teal for current/selected/primary actions; dark theme equivalents |
| Precise remaining-time display | [Microsoft Forms timer](https://support.microsoft.com/en-us/forms/set-a-timer-for-forms-or-quizzes-in-microsoft-forms) | Numeric minutes and seconds; untimed state; no animated urgency |
| Passage/question arrangement and question review | [GED previews](https://www.ged.com/study/free-online-ged-test.html), approved user brief | Side-by-side reading on desktop, stacked on mobile; explicit answered/unanswered/flagged navigator |
| Review before final submit | Approved user brief | Return to any item, inspect completion, submit explicitly; preview never creates an attempt |

Neither library returned an exact GED or Microsoft Forms student screenshot.
Official sources supplement the related product references. No proprietary exam
questions or brand assets are copied.

## Interaction decisions

- Progress counts completed answers, not visited questions. First dropdown option
  is an unanswered placeholder; choice index zero is a valid answer.
- Partially completed word-bank questions remain unanswered until all blanks fill.
- Questions preserve answers and flags while navigating and reviewing.
- Live navigation waits for a successful save; failures leave the current question
  and locally entered answers intact.
- Autosave does not disable answer entry. Submission and timer expiry do.
- Final manual submission uses the review screen instead of a browser confirm.
  Automatic deadline submission remains independent of review.
- Preview timer ending is explicitly informational. Preview answers remain local.
- Keyboard focus moves to the question/review heading; navigation states have
  accessible labels and flags/checkmarks in addition to color.

## Verification

Browser coverage includes desktop/mobile Studio preview and real player routes,
answer retention, review/flagging, final submission snapshot, autosave failures,
time expiry/extension, dark mode, and passage layout. Type checking and production
build are also run. API responses in browser tests are mocked; this is not a
production exam attempt.

Validation result: TypeScript and the production build passed. The 48-case
desktop/mobile browser suite produced 47 passes and one stale viewport assertion;
after updating that assertion to scroll to the inline review action, its focused
mobile rerun passed. Desktop/mobile screenshots were visually inspected.
