# Extended Response clock recovery, 2026-11-07

Base: `main` at `00f4fa8f71ea690b981a7359a530ea8c2abe96df`.

## Confirmed defect

The player restored its separate essay clock from the answer's saved `timeSpentSeconds`, then counted forward from the new page's current time. Time spent with the page closed was omitted. Closing before an autosave could also lose the fact that a blank essay had started. The overall exam deadline was independent and continued running.

## Change

- Persist an `ESSAY_STARTED` attempt event before enabling editing. It records the selected essay, duration, absolute deadline and accumulated approved pauses at start.
- Serialize first starts through the attempt row, preserving ownership, active-session and attempt-state checks. Repeated starts, concurrent requests and retry after a lost response reuse the same clock.
- Recover the clock from this durable event on reload or another authorized session. It does not depend on browser storage, saved answer text, unload delivery or a client-reported number of seconds.
- Return the clock on save/check-in so approved pause/resume time is recognized even when both actions occur between polls. Ordinary page closure, navigation and the GED-style break do not pause it.
- Estimate the server/device clock offset on the first response, refine it only with a faster sample, and otherwise retain the countdown while applying server deadline changes. Slow heartbeats cannot double-charge request time or reset the countdown.
- Keep the essay read-only if its start cannot be confirmed, with an explicit retry. The normal player locks editing when the allowance expires without submitting the rest of the exam.

No schema migration is required. The implementation uses the existing attempt-event storage. Deploy the backend and frontend together. Already-open old clients should reload before relying on this behavior.

## Existing attempts and scope

An existing attempt without a durable start is initialized once from its saved essay seconds, including a saved zero. Historical downtime was not recorded reliably, so it is not charged retroactively. Once initialized, future downtime counts normally.

This change persists timing and fixes the normal player editing lock. It deliberately preserves the existing final-answer snapshot acceptance policy rather than introducing a new server-enforced per-essay submission cutoff that could discard the student's last keystrokes. It does not claim to harden the whole exam against a modified client.

## Verification

- Full unit suite: 558 passed, including 9 new clock/route regressions. Command: `node --import tsx --test --test-concurrency=2 tests/unit/*.test.ts`.
- Exam browser suite: 56 checks across desktop and mobile Chromium. Includes actual page destruction/recreation with a durable mock server clock, blank starts, expiry on reopening, lost start responses, retry, pause compensation and delayed heartbeats.
- TypeScript: `NODE_OPTIONS=--max-old-space-size=6144 npm run lint`.
- Production frontend/server build: `NODE_OPTIONS=--max-old-space-size=6144 npm run build`.
- `npx prisma validate` and `git diff --check`.
- Production dependency audit: no high/critical findings; 7 moderate and 1 low existing findings were reported. Dependencies were not changed.

The browser suite used the repository's desktop/mobile projects with a local Vite server and API mocks. Playwright's official Chromium headless shell was used because the environment's system Chromium could not create its process-singleton Unix socket. The standard app-server configuration needs a disposable PostgreSQL database; no database-backed integration or deployed-site verification was performed. The default Node heap was too small for TypeScript; the larger heap check passed.

Nothing was pushed, merged or deployed.
