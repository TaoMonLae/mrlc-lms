# Invigilator review — 5 November 2026

## Fixed behavior

- Students could undo an invigilator pause through the start/resume endpoint. A student can now resume only a recorded student break belonging to the current pause. Pauses with missing or older audit evidence require an invigilator to resume them. New student pause events carry the exact pause timestamp and are saved in the same transaction.
- Explicit assignment changes hid existing attempts. The live roster now combines assigned students with existing attempts, without duplicate rows.
- Overlapping polling, retry and post-action reads could overwrite newer session data. A dedicated hook cancels superseded reads, waits for each poll to finish, suspends polling during actions, refreshes after conflicts, and ignores completions after leaving the page. Controls remain disabled when refresh fails.
- Extra time could impose a deadline on an untimed attempt. It is now rejected by the server and hidden for untimed attempts. Invalid minutes, blank or oversized incident notes, expired pauses and stale void states are rejected.
- Resume timing is shared with the student break flow, handles untimed breaks, and cannot subtract time for a future pause timestamp. Reopen resets old pause and auto-submission flags along with grades.
- Force submit no longer reports success when a concurrent void wins. Teacher action events are saved atomically with state changes and scoring. A separate general audit-log failure does not misreport a committed action as failed.
- Latest activity is included with attempt reads instead of queried once per displayed student. Last check-in uses the same start/save fallback as connection detection.

## Refactoring

`lib/examInvigilation.ts` owns action validation and state transitions, independent of persistence. `src/hooks/useInvigilatorSession.ts` owns typed dashboard data, loading, cancellation, polling and action synchronization. The dashboard retains its existing controls and confirmations. Existing owner/editor access checks remain in force.

## Verification

- 108 exam unit tests passed, including access guards, legitimate student breaks, blocked teacher pauses, force-submit conflicts, transactional event failure, time validation and roster changes.
- 66 desktop/phone browser cases passed across the exam flow and navigation suites: 62 in the first run, then the four corrected assertions passed on rerun. Corrections updated the pause message and made the slow-read fixture account for React Strict Mode's initial repeated load.
- TypeScript and production build passed.
- API and database behavior was tested with fixtures; no live student attempts were modified. Database transaction rollback is modeled by the unit harness, not a live PostgreSQL integration run.

No database migration is required. Commit is local; deployment is separate.
