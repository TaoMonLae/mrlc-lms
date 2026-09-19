# UI and module audit — 19 September 2026

## Scope and method

Reviewed the shared application shell and controls first, then module entry pages and selected workflows. Inventoried 386 page/component files and 261 explicitly declared routes, inspected literal navigation destinations (including the nested settings routes), and ran the existing unit suite. Browser checks use isolated API fixtures and block service workers; they do not create or modify school records.

This is a cross-module resilience audit with focused workflow regressions, not a claim that every record type, role combination, or external integration has been exercised against a live database.

## Design reference lock

The existing MRLC Fieldbook UI remains the primary visual target: existing semantic colors, typography, compact controls, borders, and light/dark surfaces. Refero's Linear style (`554b801c-3b31-4086-a7e5-ae613cdd618b`) informs compact hierarchy only. Make's settings screen (`b326a09e-f2c6-4b3a-b6ef-38c710053816`) informs reachable form actions and stacked narrow-screen controls, without importing its purple brand styling. Refero's craft-details guidance informs scroll containment, labeled controls, explicit request failures, and destructive-action confirmation. Existing motion/react behavior remains reduced-motion-aware.

| Decision | Source / reason |
| --- | --- |
| Constrain dialog height to the dynamic viewport and allow internal scrolling | Refero form/touch guidance; reproduced short-screen layout risk |
| Preserve brand tokens and use a reusable error/retry panel | Existing Fieldbook design system; failed reads must remain distinct from empty data |
| Reset workspace scroll on route changes | Navigation context: new pages should not open halfway down |
| Restore tab active selectors | Base UI renders `data-active`; obsolete Radix selectors were not matching |
| Show report labels from the last successful request | The displayed parameters must describe the displayed data |
| Replace an ineffective private-note checkbox with actual visibility information | The case-note API/schema do not support per-note privacy |

## Fixed findings

- **Shared UI:** long dialogs/sheets could overflow short screens; app viewport height used a static unit; module changes could retain the previous page's internal scroll position. Corrected active tab styles on class, subject, teacher, teacher-class, and student-exam pages.
- **Fee structures, fee assignments, fee discounts, vendors, donation campaigns:** failed responses were parsed as arrays, causing render crashes. Shared list loading now rejects failed or malformed responses, cancels stale requests, and provides retry. Applied the same failure/empty distinction to budgets and duty definitions/rosters.
- **Budget, vendor, expense, fee-structure, user editors:** failed reads could show editable default values or remain loading indefinitely. Editing now waits for successful reads and displays retry on failure; obsolete requests are cancelled.
- **Reports:** draft filter changes relabeled previously loaded data. Attendance, fees, exam results, student profile, and monthly reports now retain the parameters associated with the successful response. Printing is disabled when the current request failed, including the class-performance report.
- **Teacher attendance:** deep-linked sessions could resolve before their session metadata, leaving an empty roster. Roster requests now depend on the resolved class, discard stale responses, reset marks when context changes, surface retry, and block empty/loading/failed or duplicate submissions.
- **Question bank:** stale search responses could replace newer results, and errors appeared as “No questions match.” Added request ordering, loading/error states, retry, and accessible action/filter names.
- **Duties:** failed performance requests no longer masquerade as an empty leaderboard.
- **HR departments/designations:** added labels, narrow-screen wrapping, request guards, persistent load errors, and confirmation before removal.
- **Donors:** replaced the terminal error-only screen with a named retry state.
- **Cases:** failed reads no longer render error JSON as a case or spin indefinitely. Removed the unsupported private-note control and state the actual shared visibility.

## Module coverage

| Module group | Entry pages checked |
| --- | --- |
| Dashboard and people | Dashboard, students, teachers, classes, subjects, users, admissions |
| Teaching and assessment | Attendance reports, timetable, exams, question bank, gradebook, classwork, teacher homework, flashcards |
| Resources | Library, e-library, books, videos, documents, news, dictionary |
| Finance | Fees, fee structures, fee assignments, discounts, expenses, vendors, budgets, financial dashboard, donations, campaigns, donors |
| Student support | Duties, definitions, rosters, performance, cases, conduct, student success, reports |
| HR | Staff directory, departments/designations, payroll, leave |
| Communication and operations | Chat, social, announcements, school operations |
| Settings | School, branding, system, roles, backups, health, audit log, export |
| Games | Chess entry/access state and Language Quest entry; existing unit coverage also covers other game rules and course logic |

Each listed entry page is checked on desktop and mobile with unavailable service responses for uncaught client errors and route/render failure. Focused tests additionally exercise error recovery, record-editor protection, report-filter consistency, attendance submission payloads, modal bounds/action reachability, tab selection/keyboard access, workspace scroll, case-note visibility, and cancelled HR deletion. Existing exam tests cover Studio, grading, student attempts, result/schedule recovery, timer expiry, and time extensions.

## Validation boundaries

No migrations or backend changes were needed. Live database write paths, real payments/payroll, message delivery, backup restoration, and external media/AI providers were not exercised. The browser smoke tests verify failure resilience and reachability; they are not exhaustive CRUD or accessibility certification. Existing toast-only failures in other pages and deeper role-specific flows merit future focused reviews.

## Validation results

- TypeScript/lint: passed (`npm run lint`).
- Unit tests: 358 passed (`npm run test:unit`).
- Production build: passed (`npm run build`).
- Browser verification: 200 distinct desktop/mobile checks verified passing across the main run and a focused rerun. The main run passed 197 checks; three assertions were corrected to wait for a tab transition and account for the department staff count. All four affected desktop/mobile checks passed on rerun.
- Coverage includes 59 module entry pages on both desktop and mobile, focused regression checks, and existing exam workflow checks.
- Whitespace validation: `git diff --check` passed.
- Browser tests used mocked API fixtures and made no live school-record writes.
