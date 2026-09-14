# Unified Classwork

## Brief and scope

Designing a native class learning desk for MRLC teachers, students, and administrators on the web. The goal is to find and organize homework, exams, readings, and Language Quest links in one place without replacing existing submission or grading workflows. The principal risk is exposing another class's work or presenting an ungraded resource as an assignment.

Direct-build target: the existing MRLC Homework design system, extended with a topic index and compact learning rows. No Google Classroom API, Google account connection, or data synchronization is included.

## Refero reference lock

- Primary: Google for Education style `bf4966c6-7f2f-47a2-ac10-8a496c044d5e`. Preserve near-white academic canvas, neutral typography, blue reserved for interactive states, thin borders, and restrained 8px containers.
- Secondary: shadcn Ui style `c14c0a94-1037-449e-bf5b-4cb972656ac7`. Borrow compact controls and functional monochrome icons only. Retain MRLC's existing typography.
- [Classwork screen](https://refero.design/pages/62675cc8-32e6-44bc-8ef3-35d37598cb02): adapt topic-organized learning rows and the secondary topic index.
- [Creation feedback screen](https://refero.design/pages/c14ee6de-5ea0-4768-9dfa-c67ecd9239d7): adapt explicit save feedback and organization guidance.
- [Programa creation flow](https://refero.design/flows/13442): borrow title/notes → metadata → save → visible new row. No unrelated project-management behavior.
- Reject marketing heroes, statistic-card grids, decorative charts, heavy shadows, arbitrary gradients, and fake completion metrics. The Notion marketing direction was considered but not adopted.
- Media strategy: real item titles and code-native functional icons. No bitmap imagery is necessary for this working screen.

## Decision ledger

| Decision | Evidence / role | Reason |
| --- | --- | --- |
| Numbered topic index and grouped rows | Refero Classwork screen; navigation only | Keeps the syllabus visible without duplicating content. |
| Near-white canvas, dark neutral text, blue actions | Primary style; accent only for interactions | Aligns with the existing Homework workspace. |
| Compact filters and low-elevation forms | shadcn secondary reference | Allows useful density instead of generic dashboard blocks. |
| Inline topic/resource composer with explicit save | Programa flow and creation-feedback screen | Preserves list context and returns a visible saved result. |
| Native library/News/course picker | User's unified-classwork request and MRLC data | Teachers can choose real content without memorizing URLs. |
| Short ReactBits AnimatedContent entrance | User's ReactBits requirement; existing MRLC component | Introduces the list without interrupting reading; reduced motion supported. |
| Original homework and exam destinations | Existing authorization and grading workflows | Avoids copying scores, submissions, or access rules. |
| Resource label and no artificial due dates | Product-truth constraint | Reading/course links do not claim assignment tracking. |

## Implementation

Route: `/classwork?class=<school-class-id>`. Navigation is available to ADMIN, TEACHER, and STUDENT. School Class is the identity; Language Quest classroom memberships are not modified.

Existing homework and exams are read live. Three additive tables store topics, pins/filing, and linked resources. Teachers can create/rename topics, pin/file work, and add/remove resource links. Removing a link never deletes the original article, book, course, homework, or exam.

Students only receive their own class's content and their own submission state. Draft/archived exams and individually assigned exams for other students are excluded. Exam question data, answers, access codes, and other students' submissions are not selected. Books must be student-visible, courses published/reviewed, and internal resource availability is rechecked when loading. Destination permissions remain authoritative. External resources use HTTPS without server-side URL fetching.

## Deployment

Apply `prisma/migrations/20260914090000_unified_classwork/migration.sql` through the normal Prisma migration deployment workflow before enabling the module. Regenerate the Prisma client during installation/build. Missing tables return an explicit 503 migration-needed message rather than an empty learning desk.

This implementation does not add rubric grading, scheduled publishing, Google integration, or automatic reading/course completion tracking. Existing source features continue to handle submissions and exam access.

## Verification

- Browser QA used the actual Classwork component with isolated sample API responses at 1440×1000 desktop, 390×844 mobile, and 768×1024 dark tablet sizes. Inspected hierarchy, row density, action placement, forms, contrast, and overflow against the reference lock. The existing MRLC shell canvas is retained; the new white controls and blue interaction roles follow the lock.
- Verified topic creation, native-resource selection and form prefill, resource save into the chosen topic, pin state, student absence of management controls, type filtering, deadline view, and empty-search recovery. A mobile grid min-content overflow was found and fixed; main content then measured exactly 390px with no horizontal overflow. Tablet also had no horizontal overflow; no runtime errors were recorded.
- Executed the additive SQL migration in disposable PostgreSQL 16 against a minimal Class baseline. Used the generated Prisma client to verify create/read/update, duplicate-topic rejection, class foreign keys, and topic deletion setting placements to null. No school database was modified. The minimal baseline check is not a full production migration-history rehearsal.
- Unit tests cover helper behavior, class/role authorization, targeted exam visibility, own-submission projection, source/topic ownership, pin updates preserving topics, private/withdrawn resource handling, topic input validation, and explicit missing-migration errors.
- Prisma schema validation, TypeScript checking, and production build passed. Existing Lottie eval and Node deprecation warnings remain unrelated to this module.

The isolated UI fixture was removed after QA. It verifies interaction/layout but does not prove live school data connectivity or source-destination end-to-end workflows. Production migration deployment and authenticated smoke testing remain deployment steps.

## Bug review — 2026-09-14

- Student exam deadlines and opening states now use individual assignment overrides. Exam timestamps display local date and time rather than treating a UTC timestamp as a calendar-only homework deadline.
- Exam attempt counts and latest-attempt selection exclude invalidated attempts. Individual attempt limits are respected, active attempts remain resumable, and eligible retakes are not hidden behind a result-only link.
- Classwork's “View exam” now opens `/exam2/resume?exam=<id>` without starting a timed attempt. The existing exam entry screen filters to that exam and requires an explicit Start/Resume action. Result-only links remain for completed work without a currently available retake.
- The exam entry screen now requests access codes for resumed protected attempts, matching the server's requirements. It handles network errors, prevents overlapping start requests, and distinguishes failed loading from an empty exam list with a retry action.
- Closed homework no longer shows a pending redo request as actionable work. Submitted/marked state remains visible.
- Classwork save refreshes are scoped to the classroom/request generation that initiated them, so browser-history navigation cannot let an old response overwrite the current classroom. Mutations also have a synchronous in-flight guard.

Regression coverage includes six additional route tests for assignment windows, safe exam destinations, retakes, resume at the attempt limit, invalidated-attempt query isolation, and closed homework. Browser checks using isolated fixtures verified zero start requests on preview, a failed start followed by successful retry, protected resume submitting a prompted test code, visible load errors, and class A remaining visible after a delayed class B save. Fixtures were removed; school data was not modified. No schema migration or dependency changes are required for these fixes.
