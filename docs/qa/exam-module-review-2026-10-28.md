# Exam lifecycle checks — 28 October 2026

## Bugs fixed

- Two simultaneous start requests could create separate active attempts when the exam allowed retakes. The creation transaction now checks for an active or paused attempt before consuming another attempt number.
- Idle readers stopped sending saves, so the dashboard could label them disconnected and the player missed teacher time extensions or pauses. The player now checks in every eight seconds. Empty check-ins update liveness without duplicating answer snapshots or event records.
- Completed attempts could keep checking in while the result screen loaded. Result navigation now stops check-ins and unload saves, including after a teacher submission or server expiry.
- Force submission could turn an invalidated or unstarted attempt into an unscored completed attempt. Those transitions now return a conflict. Results also honor an existing invalidation timestamp if an older action changed the state.
- Reopening an attempt cleared its total but retained rubric criterion scores and feedback. Reopening now clears the previous marking fields together, while retaining the rubric and grader assignment. The confirmation explains this reset.
- Invigilator read failures were converted into successful empty lists. They now reach the existing error and retry state.
- Class exams without explicit assignments omitted students who had not started. The dashboard now includes the class roster alongside recorded attempts.

## UI improvements

- Attempt actions match the allowed state: time, pause/resume, and submit for active attempts; reopen for eligible completed attempts; note for voided attempts.
- Action buttons have larger mobile targets. Connection status has an accessible label and is shown only for live attempts.
- The last-save column is named “Last check-in” to reflect idle check-ins.

## Verification

- All 75 exam unit tests pass. Seven newly added cases reproduced failures before the fixes.
- Eight focused desktop/mobile browser checks pass, covering idle check-ins, extensions and pauses, valid actions, stale dashboard recovery, and stopping saves after submission.
- All 34 desktop exam browser cases reported passes across Studio, scheduling, exam taking, grading, review, and profile navigation. The runner lingered after the final case and was manually stopped; it printed `34 passed` during shutdown. The focused desktop/mobile run exited normally.
- TypeScript and the production build pass. Impeccable's detector reports no findings in the two changed UI files. Desktop and mobile screenshots were inspected.

Tests use mocked persistence and API responses. These checks do not certify live PostgreSQL concurrency or a production rollout. No migration or recalculation of stored marks is required. Marking resets only when a teacher explicitly reopens an attempt.
