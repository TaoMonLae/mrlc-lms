# Teacher-created courses

Research and implementation: 31 October 2026. The scope is internal school courses for teachers, administrators and assigned students. Public Learning Quest courses remain a separate practice tool.

## GED curriculum research

GED preparation combines content knowledge with reasoning. A syllabus should organize measurable skills and evidence of learning, rather than become a folder of videos. The official educator guides separate content topics, practices and levels of cognitive demand.

| Subject | Implications for course authors | Official source |
| --- | --- | --- |
| Mathematical Reasoning | Balance quantitative problem solving (approximately 45%) and algebraic problem solving (55%). Include worked reasoning, realistic problems, procedural fluency and calculator/non-calculator practice. | [Mathematical Reasoning educator guide](https://www.ged.com/content/dam/websites/ged/resources/en/assessment-guide-for-educators-math.pdf) |
| Reasoning Through Language Arts | Teach close reading, argument and evidence, editing in context, and source-based extended responses. Informational passages make up 75% of the stimulus passages; include academic and workplace reading. | [RLA educator guide](https://www.ged.com/content/dam/websites/ged/resources/en/assessment-guide-for-educators-rla.pdf) |
| Science | Combine scientific practices with life science (40%), physical science (40%), and Earth/space science (20%). Have students interpret investigations, tables and graphs and justify conclusions. | [Science educator guide](https://www.ged.com/content/dam/websites/ged/resources/en/assessment-guide-for-educators-science.pdf) |
| Social Studies | Use source analysis and quantitative evidence across civics/government (50%), U.S. history (20%), economics (15%) and geography/the world (15%). Topic recall alone does not cover the reasoning practices. | [Social Studies educator guide](https://www.ged.com/content/dam/websites/ged/resources/en/assessment-guide-for-educators-social-studies.pdf) |

The [international Curriculum and Notional Learning guide](https://www.ged.com/content/dam/websites/ged/resources/en/GED-Curriculum-and-Notional-Time-Aug.-2022.pdf) treats classroom instruction, independent reading/practice, coursework and formative/summative assessment as parts of learning time. An estimated lesson duration in MRLC is a teacher planning estimate, not a guaranteed route to passing.

The [GED teaching resources](https://www.ged.com/en/professional-development/develop-student-skills.html) provide Performance Level Descriptors and High Impact Indicators. Teachers can use these to choose starting skills and diagnose gaps. The following sequence is an MRLC implementation recommendation, not a prescribed official GED course:

1. Use a short diagnostic and review the learner's language/reading and mathematical foundation.
2. Set observable course outcomes and group related skills into modules.
3. Explain one concept, demonstrate an example, and connect guided and independent practice.
4. Add a formative check using existing homework, Learning Quest practice or exams.
5. Give feedback, revisit misconceptions, and gradually mix/timestamp practice when appropriate.
6. Use assessments and teacher judgment to review readiness separately from syllabus completion.

The four included templates are original, editable module outlines. They contain no imported GED test items and no ready-to-publish lesson bodies. Teachers supply content and activities; administrators review before publishing. External readings require an HTTPS source link and attribution. Referencing a resource does not imply permission to copy its contents.

## Design target and reference lock

Build target: the existing **School Operations Fieldbook** in [DESIGN.md](../DESIGN.md). Preserve IBM Plex Sans, pale paper/white sheets, flat rules, navy structure, gold primary actions and teal selection. No new illustration, font or component runtime is needed.

| Reference | Narrow role | Decision |
| --- | --- | --- |
| Refero [Fonts In Use](https://fontsinuse.com), style `470e5fb7-8e29-4b30-acc5-fb2907d86b51` | Precise editorial hierarchy and catalog structure | Typography and ruled course rows; retain MRLC fonts and accessible text sizes rather than copying the reference's smallest labels. |
| Refero [Udemy](https://www.udemy.com), style `64bb1262-e0d5-4ca7-b5fc-9d560bd8a552` | Clear course metadata and section rhythm | Subject, level, duration and module grouping. MRLC's palette continues to own all color roles. |
| [Microsoft Learn module overview on Refero](https://refero.design/pages/14c43ec8-d00c-4461-be8b-2c25d178ffd6) | Outcomes before starting | Course overview displays outcomes, prerequisites via teacher instructions, planned time and a clear start/continue action. Screenshot inspected. |
| [Preply learning plan on Refero](https://refero.design/pages/8d17cf60-e52b-4ea3-af22-360dd7e59cab) | Ordered module/lesson hierarchy | Compact module outline, grouped lesson rows and predictable progression. Screenshot inspected. |
| [Attio sequence editor on Mobbin](https://mobbin.com/screens/fae99b0d-659c-4ebe-8322-4ff0ab9501ce) | Editor structure only; a different product category | Separate content editing from review/assignment controls; keep the current saved state visible. Screenshot inspected. |
| [SchoolAI learning overview on Mobbin](https://mobbin.com/screens/a7422811-12a7-4c57-9fef-e84bc989d1ba) | Teaching overview hierarchy | Separate introduction, agenda/outcomes and preview. No AI generation, imagery or chat UI is copied. Screenshot inspected. |
| Installed licensed React Bits Pro `components/blocks/dashboard-11.tsx` and `settings-form-1.tsx` | Working component patterns | Adapt the brief reduced-motion-aware entrance, flat panels and responsive outline/editor split. Existing Motion dependency only; no new Pro download or license credential. |

Desktop: module outline beside a lesson editing sheet; teacher overview, curriculum, review/assignment and progress are separate sections. Mobile: stack the outline and editor, keep navigation scrollable, use 44px targets and readable input sizes. Both light and dark themes use existing tokens. Myanmar/Mon retain their larger line heights.

## Storage, authorization and lifecycle

- `Course.draft` is a validated JSON syllabus with stable module/item IDs. A single revision number protects concurrent saves, review decisions and assignment actions.
- Teacher drafts become `IN_REVIEW`; only an administrator can approve. Approval creates an immutable `CourseVersion` snapshot in the same transaction as the review decision. Editing resets the draft to reviewable state; it does not mutate earlier published syllabuses.
- Course enrollment records reference a version and an active student's current class. Assigning the same version twice is idempotent. Reassign to add newly joined students. A later version is a separate explicit assignment; old progress is retained.
- Teachers manage their own courses and assign/report only within their teaching classes. Administrators can manage all courses. External learning-only accounts, guardians and other staff roles cannot access these routes.
- Each student read checks active enrollment, current class, course archive state, resource publication/visibility, class scope and exam assignment restrictions. Resource routes continue to enforce their own authorization.
- Plain text lessons and external readings use explicit student completion. Video, whole-book reading, Learning Quest lesson, submitted homework and released exam completion are derived from their existing records. REDO homework and voided/hidden exam attempts do not count. The UI does not accept client assertions for these activities.
- E-book completion currently means the existing whole-book completion record. Authors can describe page/chapter ranges in instructions, but page-range mastery/completion is not implemented.
- Internal activities open in the same tab to retain session-only logins. A Return to course link follows the learner through video, reading, homework and exam review views; Learning Quest uses its existing return control. The link is suppressed during a live exam. External HTTPS readings open separately with no opener access.
- Admin archive hides a course from students while retaining assignments/progress. Restore exposes earlier approved assignments and returns the editable draft to DRAFT.
- Current scope has no public marketplace, payment, automatic certificates, course grading formula, prerequisites or coauthor permissions. Existing resource grades remain in their original modules.

## Deployment

Apply `20261031010000_internal_courses` using the normal reviewed migration process, regenerate the Prisma client, build, and restart. Do not seed the templates as published courses. The feature is reachable under Academics / Courses (admin), My Teaching / Courses (teacher), and My Learning / My Courses (student). No production database was modified during implementation.

## Offline package extension

Course owners/admins can export a saved draft as a versioned MRLC ZIP. An import page supports file selection, server-validated preview, rights confirmation and creation of a new teacher-owned draft. Its select → preview → create sequence adapts the structural pattern in [Acuity's import preview on Refero](https://refero.design/pages/2c65d68c-ca8c-44fa-bcb7-b3e68354884a), whose screenshot was inspected. MRLC retains its existing Fieldbook surfaces, typography and responsive panels; no contacts UI or third-party data model is copied.

The package contains `course.json`, `README.txt`, UTF-8 lesson files, and optional PDF/MP4/WebM media. Portable resource aliases replace database IDs. Practice, homework and exam links are explicit reconnect tasks. See [the offline course guide](offline-courses.md) for the user workflow and supported formats.

Archive handling bounds compressed/expanded sizes and entry counts, validates paths and media signatures, rejects symlinks, and never extracts user-chosen paths to disk. Preview creates no persistent records. Confirmed import uses a transaction and server-generated filenames; a failed transaction removes staged files. Identical retries reuse a user/file/request-derived ID. New media remains staff-only. Submission/review accepts only staged assets belonging to that exact course and owner; administrator approval publishes those referenced assets and the immutable syllabus in the same transaction. Student reads continue to use normal live availability checks.

ZIP transfer requires no new schema fields or migration. No live school records were imported during verification; database tests use a dedicated disposable local database.

Verification: the full unit suite passed, along with 16 PostgreSQL integration checks and 30 desktop/mobile course workflow cases. A final focused pass covered the eight ZIP workflow cases after responsive refinements, including light/dark accessibility checks. The installed browser runner needed interruption during teardown after reporting passing cases. Production build, type checking, Prisma schema validation and whitespace checks passed. The generated [offline starter](../outputs/offline-course-starter/MRLC-Offline-Course-Starter.zip) was parsed with the same importer before handoff.
