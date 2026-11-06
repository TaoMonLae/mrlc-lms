# Student Council and forum

## Scope and school sources

The uploaded **MRLC_Student_Council.pdf**, MRLC GED Preparation Program, academic year 2025–2026, is the source for the council guidance. It is an internal handbook; the original file is not published or copied into the public application assets.

- Pages 2 and 6: three-month council appointments. Staff record appointments and renewals. Existing student council labels remain visible, but a matching current appointment is required for student management access. Treasurer is now a supported role. No disciplinary removal or election decision is automated.
- Pages 3–6: President, Vice President, Secretary, Treasurer, hostel and resource monitor responsibilities appear in the handbook panel.
- Page 7: rotations last seven days; monitors confirm weekly teams; students cannot cook and clean in the same rotation week. Each student belongs to one team and each slot uses a different team. Overlapping plans for the same students are rejected; subsequent plans retain the same weekly boundary.
- Page 7: meal times, kitchen cleanup, morning common-area cleaning, twice-daily toilets and maintenance reporting are supplied as editable duty instructions.
- Pages 8–10: weekly meetings, minutes within 48 hours and action owners/due dates appear as guidance. This release does not implement a meetings or treasury ledger.
- Eight teams is the handbook's example, not a fixed enrollment limit. Team count, names, numbers, members, duty numbers and names are configurable.
- Ratings from 1 to 5 come from the user's request, not the handbook. They are duty feedback and do not create conduct records, rewards or penalties. The school can agree its rating rubric separately.
- LMS Student and Family handbook S09 informs forum privacy/reporting guidance. Reports go to staff, including reports involving council members. Urgent concerns require direct staff contact.

## Design reference lock

Blue & Slate, the existing application typography and shared theme variables remain the visual system. The council workspace uses a dated register, a practical roster editor and a compact role directory. The forum uses readable topic rows and linear replies. Both adapt to phone screens without horizontal page scrolling.

Research inspected before implementation:
- Refero Google for Education style `bf4966c6-7f2f-47a2-ac10-8a496c044d5e`: restrained blue actions and legible neutral surfaces.
- [Wrike workload view](https://refero.design/pages/8c850476-7e99-402c-8ca2-c2fd92397a57): dated assignments and grouping, adapted to a daily register.
- [Teachable discussion](https://mobbin.com/screens/ce14878c-7ccf-4a16-ae05-7f1c402b5404): topic context, replies and report actions.
- [Podia community](https://mobbin.com/screens/8ecaca2d-cff4-41dd-bcb6-c38320340cf1) and [Circle community](https://mobbin.com/screens/1c11eb75-f2d3-4ba4-8324-04e109b7037d): category navigation and a contextual reply composer.
- Impeccable expansion and craft guidance: clear hierarchy, functional empty/error/loading states, keyboard focus, semantic theme colors, no decorative dashboard statistics.

## Routes and access

- `/council`: duty register, team/rotation editor for current council members and staff, handbook and appointment directory.
- `/student-forum`: permanent school discussions, categories, search and pagination.
- `/student-forum/:id`: replies, reporting and council/staff moderation. Hidden discussions can be restored through the moderator's hidden-discussion filter; hidden replies remain visible only to moderators for restoration.
- `/api/council/*`: current database role and active student status checked for every request. External learners and guardians have no access. Staff can record council terms; students cannot appoint themselves.
- Team members can mark their own work done. Council members cannot rate their own teams; staff can review all duties. Reviews use a version check to prevent lost updates, and changes are audited.
- Published rotations snapshot membership and instructions. Reuse the configuration for the next period; published membership is not silently rewritten. The existing individual-duty module remains available, with a link to the team register. Existing individual-duty assignments are not migrated into council plans or included in their conflict checks.

## Verification and deployment

- Unit tests cover weekly rotation fairness, no mixed duty types in a week, duplicate membership/numbers, invalid dates, score limits and term dates.
- Integration test uses a disposable PostgreSQL database and actual HTTP requests: active term authority, external account isolation, appointment protection, overlapping plans, self-rating, wrong-team edits, concurrent review updates, locked discussions, report privacy and hidden-content access.
- Browser tests use mocked school records in Brave, desktop and phone sizes: divide teams, rename, preview/publish, score a duty, create/reply/report/close a discussion, light and dark modes.
- Migration tested locally: `20261105030000_council_forum`. No production records changed.

Before releasing, run the normal production migration process (`prisma migrate deploy`) and regenerate Prisma Client with the application's complete schema. Deploy frontend and server together. Staff must confirm term dates for existing council role holders before those students receive editing access.

Commands: `npm run lint`, `npm run build`, `npm run test:unit`; `COUNCIL_TEST_DATABASE_URL=... node --import tsx --test tests/integration/council.test.ts` against a disposable local database named `council_test`; `playwright test tests/e2e/council.spec.ts` with the application's browser configuration.

Verification outcome (5 November 2026): TypeScript and production build passed. All six council browser checks passed; the scoped WCAG checks reported no violations. Five domain/database checks passed, and the updated navigation checks passed. The wider 531-test run found three pre-existing E-Library contrast-test failures, reproduced unchanged at base commit `79c3d03`; these older tests expect literal colors rather than the shared theme variables. The fourth failure was the navigation expectation and was updated for the new links, then passed.
