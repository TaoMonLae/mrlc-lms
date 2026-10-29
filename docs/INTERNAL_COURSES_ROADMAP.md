# Internal courses for MRLC LMS

Research and code review: 23 October 2026. This is a proposed implementation sequence, not a claim that the course module is built.

## Current foundation and gap

- Learning Quest already has authored units, lessons, practice, mastery, progress, teacher review, and four independently written GED subject courses. Keep it as the practice engine.
- Video lessons support uploads, captions, chapters, notes, quizzes, homework, playlists, and watch progress. E-Library supports PDF/EPUB reading. Classwork organizes class resources, homework, and exams.
- These tools do not yet give a student one syllabus with a reading, video, practice, assignment, and teacher feedback in a single ordered path. A playlist is only a sequence of videos; a Learning Quest course is a sequence of challenges.
- PostgreSQL stores records; uploaded video and books need persistent disk. The current Express server serves the client and authenticated video files. Keep this deployment for the first school cohort, with media volumes and file backups separate from database backups.

## Recommended course model

Add an **internal Course** layer, scoped to school accounts and classes. It should reference existing resources by stable IDs rather than copy their content or grades.

| Entity | Essential fields |
| --- | --- |
| Course | title, subject, level (Foundation/Pre-GED/GED), language, summary, objectives, estimated time, cover, owner, draft/published/archived, version |
| Module | course ID, title, order, learning outcomes |
| Item | module ID, order, type (original text, video, e-book section, Learning Quest lesson, resource link, homework, exam), target ID/URL, completion rule |
| Enrollment | course ID, student ID, assigned class/teacher, assigned and completed timestamps, active state |
| Item progress | enrollment and item IDs, completion timestamp, last activity, evidence reference |
| Source record | item ID, author/publisher, URL, title, license/version, attribution, rights decision, review date |

Use database transactions for publish and enrollment updates. Validate resource availability and ownership both when publishing and each time a student opens an item. Save course completion from the referenced activity's trusted server state: a video completion, submitted homework, released exam result, or completed Learning Quest lesson. Never trust a client supplied completion flag for graded items. Preserve a published version so editing a course does not silently change an enrolled student's requirements. Only the owner/admin may edit; teachers submit for admin review, following the existing Learning Quest approval pattern.

Student screen: **My Courses** (assigned, in progress, completed) → course overview (outcomes, time, modules) → lesson (text/read/watch/practice) → feedback → next item. Teacher screen: drafts, preview as student, assign by class or individual, progress by item, students needing help. Admin screen: approve, unpublish, rights audit, and enrollment audit. Provide a simple linear path first; optional prerequisites and certificates can follow.

## First curriculum catalog

| Path | Initial units | Evidence of learning |
| --- | --- | --- |
| Foundation English / Pre-GED reading | vocabulary in context; sentence and paragraph meaning; main idea and evidence; inference; charts and short paired texts | short original passages, comprehension and explanation |
| Pre-GED writing | sentence structure; punctuation; paragraph writing; claims and reasons; revision | paragraph drafts and teacher feedback |
| Pre-GED math | whole numbers and operations; fractions/decimals; ratios/percent; signed numbers; simple equations; data and graphs | short practice, worked solutions, mastery checks |
| Pre-GED science and social studies literacy | scientific method, tables/graphs, source credibility, timelines/maps and civic vocabulary | source based questions with explanation |
| GED RLA | close reading; argument/evidence; language editing; extended response | original paired passages, timed writing and rubric feedback |
| GED Mathematical Reasoning | quantitative reasoning, algebra, graphs/functions, geometry/data, calculator and formula use | worked problems and mixed timed checks |
| GED Science | life/physical/Earth science contexts; experimental design; data and graphs | original experiments and evidence questions |
| GED Social Studies | civics, U.S. history, economics/geography; sources, bias and quantitative evidence | original document and chart questions |
| Digital study skills | LMS navigation, typing, file use, reliable sources, exam interface and accessibility tools | practical tasks and completion checks |

Use a short placement assessment to choose the starting path and review it with a teacher. The existing four GED Learning Quest courses can be linked within corresponding internal courses; their 150 lessons and 450 practices already exist in this repository (`docs/FEATURES_AND_OPERATIONS.md`). Do not import them as a second question bank.

## Sources and rights decisions

| Resource | Use in MRLC | Hosting decision |
| --- | --- | --- |
| [GED international test subjects](https://www.ged.com/en/curriculum.html), [educator assessment guide and high impact indicators](https://www.ged.com/en/professional-development/develop-student-skills.html), [performance level descriptors](https://www.ged.com/en/professional-development/develop-student-skills/plds.html) | Map learning objectives and checks to assessed skills. | Link to official documents and write MRLC lessons and questions independently. |
| [GED international study guides and sample tests](https://www.ged.com/en/professional-development/free-classroom-materials.html) | Familiarize teachers and students with the four subjects and official interface. | Link out; do not import official items into the LMS question bank without permission. |
| [OpenStax Prealgebra (original edition)](https://openstax.org/books/prealgebra/pages/preface), [Elementary Algebra](https://openstax.org/books/elementary-algebra/pages/preface) | Foundation and GED math readings and examples. | Individual editions state CC BY 4.0; provide attribution and verify the selected edition before copying. Newer 2e and other titles can have CC BY-NC-SA terms. |
| [Core Knowledge Mathematics 6–8](https://www.coreknowledge.org/mathematics/) | Structured Pre-GED math and readiness checks. | The site identifies CC BY 4.0 for these materials; record the particular unit's notices and attribution. |
| [Core Knowledge Language Arts 6–8](https://www.coreknowledge.org/language-arts/), [science](https://www.coreknowledge.org/curriculum/) | Reading and knowledge building for foundation learners. | Link first; check each PDF's rights and third-party images before rehosting or adapting. |
| [ReadTheory](https://readtheory.org/) | Optional adaptive reading practice outside MRLC. | Link to its platform; its FAQ says copying web material violates its terms. |
| Khan Academy | Optional external math practice. | Link to the original page; check its current brand and embedding terms before any embed. |

For every imported asset, retain the exact source URL, edition, license, attribution, modifications, and review date. A free-to-view resource is not automatically licensed for local hosting. Do not download YouTube/Udemy videos for local serving without rights. Student-created coursework remains access controlled and is never placed in the public course catalog.

## Delivery sequence

1. **Curriculum pilot (1–2 weeks):** choose one Pre-GED math and one GED RLA course; map outcomes to official GED skills; write 4 modules each, teacher review the readings and original questions; record rights for every external asset. Establish baseline reading/math placement and a success measure.
2. **Course MVP (2–4 weeks):** add the course/module/item/enrollment/progress schema and migrations; author/preview/publish workflow; class assignment; student My Courses and lesson view; reference existing video, library, Learning Quest, homework and exam IDs; hide unpublished and cross-class resources. Seed only the two reviewed pilot courses.
3. **Pilot with 14 students (2–3 weeks):** test on phones and low bandwidth, watch teacher time, completion, quiz results and confusion points; add resume and clear next action; fix missing media and permission edge cases. Do not infer GED readiness from course completion alone.
4. **Expand (following term):** publish the four GED subject paths and foundation English/science/social studies; introduce per-skill dashboards, feedback loops, accessibility accommodations and certificates after completion rules and versioning have been validated.

Release gates: permissions across school student, teacher, admin, family and external learner roles; no draft or answer leakage; original asset attribution; accessible captions/transcripts and keyboard navigation; backup/restore of both database and media; a real student journey from assignment through completion. For large cohorts or remote streaming later, move media delivery to protected object storage/CDN while keeping the same access checks. Measure actual storage and outbound traffic before changing infrastructure.
