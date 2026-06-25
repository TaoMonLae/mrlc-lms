# MRLC Exam System — Phase 3 Implementation Plan
**Reusable question bank & assessment-platform hardening (TCExam-inspired, native build)**

Author: senior full-stack / assessment-platform review
Scope: planning only — no code changed.
Repo inspected: `TaoMonLae/mrlc-lms` (local working copy)
Build status at time of writing: **`vite build` ✓, server esbuild bundle ✓** (production build succeeds).

---

## 0. How to read this document

The request lists 23 features. **Inspection shows ~14 already exist** (delivered in the Phase 2 commits `b70dddd` / `c61762b`). Recreating them would be waste and risk. This plan:

- marks each requested feature **DONE / PARTIAL / MISSING**,
- for **PARTIAL/MISSING** features gives the full breakdown (code affected, models, migration, endpoints, UI, validation, authz, audit, risks, deps, order),
- for **DONE** features states what to reuse and the small polish needed (if any).

The single largest change is **promoting `Question` from an exam-owned row to a reusable bank entity** (currently `Question.examId` is a required FK with `onDelete: Cascade`). Everything else (topics, difficulty, versioning, random selection, import/export) hangs off that.

---

## 1. Current exam architecture summary

### 1.1 Data model (`prisma/schema.prisma`)
Core (original):
- `Exam` — `title, type (ExamType), status, date, durationMinutes, totalMarks, settings(Json), classId, subjectId`. **Phase 2 added**: `availableFrom/Until, resultReleaseAt, attemptLimit, gracePeriodMinutes, allowLateStart, requiresAccessCode, accessCodeHash, requiresInvigilator, shuffleQuestions, shuffleOptions, negativeMarking, passMark` + relations to sections/stimuli/groups/assignments/accommodations/rubrics/resultPolicy/questionStats.
- `Question` — `text, type (QuestionType), points, options(Json), correctAnswer, explanation` + **Phase 2** `orderIndex, sectionId, groupId, stimulusId, correctAnswers(Json), optionWeights(Json), negativePoints, minScore, numericTolerance, caseSensitive, partialCredit, requiresManualGrading`. **`examId` is a required FK (`onDelete: Cascade`)** → a question belongs to exactly one exam. **No bank, topic, difficulty, version.**
- `ExamAttempt` — `score, isCompleted, startedAt, completedAt, securityWarnings, autoSubmitted, integrityEvents` + **Phase 2** `state (AttemptState), attemptNumber, serverDeadline, effectiveDurationMinutes, pausedAt, accumulatedPauseSeconds, lastSavedAt, submittedAt, gradedAt, releasedAt, invalidatedAt, gradingStatus, sessionToken, questionOrder(Json), ipAddress, userAgent, deviceInfo`. Unique on `(studentId, examId, attemptNumber)`.
- `ExamAnswer` — `answerText, selectedOptions(Json), isCorrect, pointsAwarded, autoScore, manualScore, maxPoints, flaggedForReview, timeSpentSeconds, gradingState`. Unique `(attemptId, questionId)`.

Phase 2 models (already present): `ExamSection, Stimulus, QuestionGroup, ExamAssignment, ExamAccommodation, GradingRubric, RubricCriterion, ManualGrade, AttemptEvent, AttemptSnapshot, ExamResultPolicy, QuestionStatistic`.
Enums: `ExamType, QuestionType (10 values incl. GED_*), StimulusType, AttemptState (9 states)`.

### 1.2 Routes
- **Legacy (`server.ts`)**: `GET /api/exams`, `GET /api/exams/:id`, `POST /api/exams`, `PUT /api/exams/:id`, `POST /api/exams/:id/submit`, `GET /api/exams/:id/results`, `PUT /api/exam-attempts/:attemptId/grade`. Validated via Zod `schemas.exam / examSubmit / examGrade` through a `validate()` middleware.
- **Phase 2 (`examPhase2.ts`, 46 endpoints)**: scheduling, result-policy, accommodations, assignments, attempt lifecycle (`start/state/save/pause/submit/result/available`), grading (`queue/:a/:q/finalize/release`), analytics (`analyze/analytics/questions/:q/analytics`), invigilator (`/invigilator`, `/invigilate`), print, and authoring CRUD (sections/stimuli/groups/rubrics + `PATCH /api/questions/:id` + `GET /api/exams/:id/questions`). Registered before the SPA catch-all in `startServer()`.

### 1.3 Auth / validation / audit
- **AuthN**: JWT (`authMiddleware`), `req.user = {userId, role, email}`; tokens 8h.
- **AuthZ**: role checks (`requireRole`, `reportRole`, Phase 2 `teacherGuard`), plus per-attempt ownership checks (student resolves to their `Student` row). Frontend `ProtectedRoute allowedRoles`.
- **Validation**: Zod schemas + `validate()` middleware that **replaces `req.body` with parsed output** (strips unknown keys). Phase 2 endpoints largely hand-validate (`num()`, allow-lists).
- **Audit**: `createAuditLog(userId, userName, action, entityType, entityId, description, ip, ua, severity)` → `AuditLog`. Phase 2 logs grading, finalize, release, invigilation, schedule/policy, authoring mutations.
- **Rate limiting**: `examLimiter` (120/min) on start/save/submit; `gradingLimiter` (60/min).

### 1.4 Frontend
- Legacy exam pages: `src/pages/exams/{ExamsList,ExamNew,ExamEdit,ExamProfile,ExamTake,ExamResults}.tsx`.
- Phase 2 pages: `src/pages/exam2/{ExamPlayer,ResumeAttempt,ExamResultView,ExamScheduling,ExamAuthoring,ManualGradingQueue,RubricGrading,InvigilatorDashboard,ExamAnalytics,QuestionAnalytics,AccommodationManagement,PrintableExport}.tsx`, lazy-routed in `src/App.tsx`.
- API helpers: `src/lib/api.ts` (`apiGet`, `apiSend` now supports `POST|PUT|PATCH|DELETE`).
- Reusable import pattern already exists: `src/components/students/StudentCsvImport.tsx`.

### 1.5 Known weaknesses / dead-ish code
- **Two parallel exam stacks**: legacy `ExamTake`/`/api/exams/:id/submit` vs Phase 2 `ExamPlayer`/`/api/exam2/...`. They don't share a submission path. Risk of divergence; should converge on the Phase 2 lifecycle.
- `Exam.shuffleOptions` and `ExamSection.questionsToPick` are **persisted but not applied** at delivery (only `shuffleQuestions` is honored in `start`). → option shuffle & random selection are effectively stubs.
- `QuestionType` enum has redundant values (`MULTIPLE_CHOICE` vs `MCQ`, `ESSAY` vs `WRITTEN`) — scoring branches on a subset; normalize before adding bank import.
- Legacy `POST /api/exams` creates questions inline (exam-owned), which is the model the bank must replace.

---

## 2. Gap analysis

| # | Requested feature | Status | Notes / what exists |
|---|---|---|---|
| 1 | Reusable question bank | **MISSING** | `Question.examId` is a hard FK; no reuse |
| 2 | Topics & subtopics | **MISSING** | no taxonomy models |
| 3 | Question difficulty | **MISSING** | no field (item-analysis difficulty is computed post-hoc, not authored) |
| 4 | Exam–question linking | **MISSING** | needs M:N join (`ExamQuestion`) |
| 5 | Random question selection | **PARTIAL** | `ExamSection.questionsToPick` stored, **not applied** |
| 6 | Shuffle questions | **DONE** | `shuffleQuestions` + `seededShuffle` on `start` |
| 7 | Shuffle answer options | **PARTIAL** | `shuffleOptions` stored, **not applied** to delivery/scoring |
| 8 | Exam sections | **DONE** | `ExamSection` + authoring UI |
| 9 | Passage-based questions | **DONE** | `Stimulus` + `QuestionGroup` + authoring |
| 10 | Scheduled availability | **DONE** | `availableFrom/Until`, enforced in `start` |
| 11 | Attempt limits | **DONE** | `attemptLimit` enforced |
| 12 | Auto-save & resume | **DONE** | `ExamPlayer` + `save`/`state` + snapshots |
| 13 | Manual grading queue | **DONE** | `ManualGrade` + `ManualGradingQueue` |
| 14 | Rubric grading | **DONE** | `GradingRubric/RubricCriterion` + `RubricGrading` |
| 15 | Partial-credit scoring | **DONE** | `scoreObjective` (weights, tolerance, neg. marking) |
| 16 | Controlled result release | **DONE** | `ExamResultPolicy` + gated `/result` |
| 17 | Question versioning | **MISSING** | no version chain |
| 18 | Exam cloning | **MISSING** | no clone endpoint |
| 19 | Item analysis | **DONE** | `QuestionStatistic` + `/analyze` |
| 20 | Invigilator dashboard | **DONE** | `/invigilator` + `/invigilate` |
| 21 | Student accommodations | **DONE** | `ExamAccommodation` |
| 22 | Printable exams | **DONE** | `PrintableExport` (A/B/C, key, QR) |
| 23 | CSV/Excel import-export | **MISSING** | only student CSV import exists |

**Net Phase 3 work = 9 items**: bank (1,4), taxonomy (2), difficulty (3), real random selection (5), option shuffle completion (7), versioning (17), cloning (18), import/export (23). Everything else is reuse + minor polish + (recommended) convergence of the two exam stacks.

---

## 3. Proposed database design

### 3.1 New models
```
QuestionTopic        id, name, parentId? (self-relation for subtopics), subjectId?, code?, createdAt/updatedAt
                     @@index(parentId), @@index(subjectId)

QuestionBankItem     -- the reusable, exam-independent canonical question
                     id, stem(text), type(QuestionType), defaultPoints(Float),
                     options(Json?), correctAnswer?, correctAnswers(Json?), optionWeights(Json?),
                     explanation?, difficulty(QuestionDifficulty), topicId?, subjectId?,
                     stimulusRef? (optional shared passage by value/text), caseSensitive,
                     numericTolerance?, negativePoints?, minScore?, partialCredit,
                     requiresManualGrading, status(DRAFT|ACTIVE|RETIRED),
                     currentVersionId?, authorId, createdAt/updatedAt
                     @@index(topicId),(subjectId),(difficulty),(status),(type)

QuestionVersion      id, bankItemId, version(Int), snapshot(Json -- full item payload),
                     changeNote?, createdById, createdAt
                     @@unique(bankItemId, version)

ExamQuestion         -- M:N join replacing Question.examId ownership
                     id, examId, bankItemId?, sectionId?, groupId?, stimulusId?,
                     orderIndex, pointsOverride?, required(Bool), versionPinned(Int?)
                     @@unique(examId, bankItemId), @@index(examId),(bankItemId),(sectionId)

ExamSelectionRule    -- declarative random/auto selection per exam or section
                     id, examId, sectionId?, topicId?, difficulty?, type?, count(Int),
                     pointsEach?, createdAt
                     @@index(examId),(sectionId)

QuestionImportBatch  id, examId?, subjectId?, filename, rowCount, successCount, errorCount,
                     errors(Json), createdById, createdAt   -- import audit/rollback handle

enum QuestionDifficulty { VERY_EASY EASY MEDIUM HARD VERY_HARD }
enum QuestionBankStatus { DRAFT ACTIVE RETIRED }
```

### 3.2 Changes to existing models (additive, non-destructive)
- `Question` — **keep as the per-exam materialized instance**, but add `bankItemId? (FK QuestionBankItem)`, `bankVersion?(Int)`, `topicId?`, `difficulty?`. Make `examId` **stay required** (questions remain exam-scoped instances); reuse is expressed by linking many `Question` instances to one `QuestionBankItem`. _This avoids touching the M:N hot path of scoring/answers and is far lower risk than re-pointing `ExamAnswer`/`ManualGrade` to a join table._ (Alternative, higher-risk: make `Question.examId` nullable and route everything through `ExamQuestion`; see §6.)
- `Exam` — add `clonedFromId?`, `templateName?`.
- `QuestionStatistic` — already present; add `bankItemId?` so difficulty/discrimination can roll up to the bank item across exams.

> **Design decision (recommended path):** *Bank-as-source, instance-as-copy.* Authoring/import populates `QuestionBankItem` (+ `QuestionVersion`). Adding a bank item to an exam **materializes a `Question` row** (copy) linked back via `bankItemId`/`bankVersion`. Scoring, answers, snapshots, manual grades, statistics all continue to reference `Question` exactly as today → **zero churn to the attempt/scoring engine.** Versioning/analytics roll up via `bankItemId`. This is the lowest-risk way to get a reusable bank without destabilizing the working Phase 2 lifecycle.

### 3.3 Enum normalization (prerequisite)
Map legacy `MCQ→MULTIPLE_CHOICE`, `WRITTEN→ESSAY` in a data migration; keep old values in the enum (Postgres enums can't drop values easily) but stop emitting them. Centralize type handling in one `normalizeType()` helper used by scoring + import.

---

## 4. Proposed API design

All new routes live in a new module `examBank.ts` (mirrors `examPhase2.ts`), registered in `startServer()` before the catch-all. Teacher/Admin guarded unless noted.

**Question bank & taxonomy**
- `GET /api/question-bank` — filter `?subjectId&topicId&difficulty&type&q&status&page` (paginated; never exposes `correctAnswer` to STUDENT — bank is teacher-only anyway).
- `POST /api/question-bank` · `GET /api/question-bank/:id` · `PUT /api/question-bank/:id` · `DELETE /api/question-bank/:id` (soft → `RETIRED`).
- `GET/POST/PUT/DELETE /api/question-topics` (tree; `parentId` for subtopics).
- `GET /api/question-bank/:id/versions` · `POST /api/question-bank/:id/versions` (snapshot current) · `POST /api/question-bank/:id/revert/:version`.

**Exam ↔ bank linking & selection**
- `POST /api/exams/:id/questions/from-bank` — body `{ bankItemIds[], sectionId? }` → materializes `Question` copies.
- `POST /api/exams/:id/selection-rules` · `GET/DELETE` — declarative rules.
- `POST /api/exams/:id/generate` — apply selection rules + `questionsToPick` to **build/refresh** the exam's question set (random pick by topic/difficulty/type). Transactional.
- `POST /api/exams/:id/clone` — deep copy exam + sections + stimuli + groups + question instances + result policy (not attempts). Returns new examId.

**Delivery completeness (finish PARTIAL items)**
- Extend Phase 2 `start` to honor `shuffleOptions` (per-attempt option permutation persisted in `questionOrder`/a new `optionOrder` map) and `questionsToPick`/selection rules. Scoring already keys on option **value**, so a stored permutation is display-only and safe.

**Import / export**
- `POST /api/question-bank/import` (multipart CSV/XLSX) → dry-run validation + `QuestionImportBatch`; `POST /api/question-bank/import/:batchId/commit`.
- `GET /api/question-bank/export?format=csv|xlsx&filter…`.
- `GET /api/exams/:id/export?format=csv|xlsx` (questions + key, teacher-only).
- `POST /api/exams/:id/import` (build an exam from a sheet).

**Validation rules (Zod, via `validate()`):** enforce `type ∈ QuestionType`; `points ≥ 0`; MULTIPLE_CHOICE requires ≥2 options and a `correctAnswer`/`correctAnswers ⊆ options`; `optionWeights` keys ⊆ options and sum ≤ 1 for partial credit; `numericTolerance ≥ 0`; `difficulty ∈ enum`; topic `parentId` may not equal `id` and may not create cycles; selection `count ≥ 1`.

**Authorization:** bank/topic/version/selection/clone/import/export = ADMIN or TEACHER (`teacherGuard`); STUDENT has **no** bank access (bank endpoints never appear in student APIs). Cross-subject access optionally constrained to a teacher's subjects (future). Clone restricted to exams the teacher owns/teaches.

**Audit events:** `BANK_ITEM_CREATE/UPDATE/RETIRE`, `BANK_VERSION_CREATE/REVERT`, `TOPIC_CREATE/UPDATE/DELETE`, `EXAM_GENERATE`, `EXAM_CLONE`, `BANK_IMPORT (counts)`, `BANK_EXPORT`, `EXAM_EXPORT`. Reuse `createAuditLog`.

---

## 5. Proposed frontend structure

New pages under `src/pages/bank/` (lazy-routed, ADMIN/TEACHER):
- `QuestionBank.tsx` — searchable/filterable table (subject/topic/difficulty/type/status), bulk select.
- `QuestionBankItem.tsx` — create/edit one item incl. options, partial-credit config, topic, difficulty; version history sidebar with revert.
- `TopicManager.tsx` — topic/subtopic tree CRUD.
- `ExamBuilder.tsx` — pick from bank into an exam + define selection rules + preview generated set; "Clone exam" action.
- `QuestionImportDialog.tsx` — reuse the `StudentCsvImport.tsx` pattern: upload → column-map → dry-run errors → commit.
- Export buttons on `QuestionBank.tsx` and `ExamScheduling.tsx`/`ExamAuthoring.tsx`.

Reuse: `ExamAuthoring.tsx` already manages sections/stimuli/groups/rubrics — add a "From Question Bank" tab there rather than a new page. `apiGet/apiSend` already supports needed verbs.

Libraries: **SheetJS (`xlsx`)** for Excel, **PapaParse** for CSV (both already used elsewhere in the app per repo grep) — no new heavy deps.

---

## 6. Migration risks

1. **Question ownership change is the top risk.** The recommended *bank-as-source / instance-as-copy* design **keeps `Question.examId` required**, so `ExamAnswer`, `ManualGrade`, `AttemptSnapshot`, `QuestionStatistic`, and the scoring engine are untouched. If instead you make `examId` nullable and route via `ExamQuestion`, you must rewrite every `where: { examId }` query, the `attemptPayload` builder, `finalizeSubmission`, and item analysis — high regression risk on a working lifecycle. **Recommendation: take the additive path.**
2. **Postgres enum edits** can't drop values and `ADD VALUE` can't run inside a transaction with other DDL in older PG — add `QuestionDifficulty`/`QuestionBankStatus` as **new enums** in their own statements; don't mutate `QuestionType` values, only stop using the dupes.
3. **Prisma engine offline in sandbox** (confirmed): `prisma format/generate/migrate` 403 here. Migrations must be **hand-authored SQL** with `IF NOT EXISTS` guards (same pattern as `20260625120000_advanced_exam_phase2`) and run by you (`migrate deploy`).
4. **Two exam stacks divergence.** Generation/selection must target the Phase 2 lifecycle (`/api/exam2/...`), not the legacy `POST /api/exams/:id/submit`. Plan a deprecation of `ExamTake.tsx` to avoid double maintenance.
5. **Import safety**: never auto-commit; dry-run + `QuestionImportBatch` with per-row errors and an explicit commit step; cap file size via existing `multer` limits; sanitize formula-injection in exported CSV (`=,+,-,@` prefixes).
6. **Option shuffle vs stored answers**: persist the permutation per attempt and score on option **value**, never on display index, or historical attempts will mis-grade.
7. **Cascade on clone**: clone must copy children but **not** attempts/answers/grades; wrap in a transaction; guard against cloning very large exams (row caps).
8. **Backfill**: existing `Question` rows get `bankItemId = NULL` (they remain valid exam instances). Optional one-off job to "promote" distinct existing questions into bank items.

---

## 7. Phased implementation roadmap

**Phase 3a — Foundations (taxonomy + bank, additive, low risk)**
1. Enums `QuestionDifficulty`, `QuestionBankStatus`; models `QuestionTopic`, `QuestionBankItem`, `QuestionVersion`, `QuestionImportBatch`; add `Question.bankItemId/bankVersion/topicId/difficulty`. Hand-authored migration.
2. `examBank.ts` CRUD for topics + bank + versions; `QuestionBank.tsx`, `QuestionBankItem.tsx`, `TopicManager.tsx`.
3. Enum normalization helper + data migration for `MCQ/WRITTEN`.

**Phase 3b — Exam composition**
4. `ExamQuestion` (optional, for ordering/overrides) + `from-bank` materialization endpoint; "From Bank" tab in `ExamAuthoring.tsx`.
5. `ExamSelectionRule` + `POST /exams/:id/generate` (real random selection, honoring `questionsToPick`).
6. Finish `shuffleOptions` in Phase 2 `start` (+ scoring verified on value).

**Phase 3c — Lifecycle utilities**
7. `POST /exams/:id/clone` + UI action.
8. Question versioning UI (history + revert) wired to bank.

**Phase 3d — Interchange**
9. CSV/XLSX import (dry-run → commit) and export for bank and exams; reuse `StudentCsvImport` pattern + SheetJS/PapaParse.

**Phase 3e — Convergence & cleanup**
10. Deprecate legacy `ExamTake`/`/api/exams/:id/submit`; converge on Phase 2 lifecycle; normalize `QuestionType`; verification suite (`tsc --noEmit`, `vite build`, server bundle, scenario tests: import dry-run, generate determinism, clone integrity, option-shuffle scoring, version revert).

---

## 8. Exact files likely to change

**Backend**
- `prisma/schema.prisma` — new enums/models + `Question`/`Exam`/`QuestionStatistic` field additions.
- `prisma/migrations/<ts>_question_bank_phase3/migration.sql` — **new**, hand-authored.
- `examBank.ts` — **new** module (bank/topic/version/selection/clone/import/export routes).
- `server.ts` — import + `registerExamBankRoutes({...})` before catch-all; add Zod `schemas.bankItem/topic/selection/import`; enum-normalize in `POST /api/exams`.
- `examPhase2.ts` — extend `start` for `shuffleOptions` + selection rules; `attemptPayload` to carry option order.

**Frontend**
- `src/pages/bank/QuestionBank.tsx`, `QuestionBankItem.tsx`, `TopicManager.tsx`, `ExamBuilder.tsx`, `QuestionImportDialog.tsx` — **new**.
- `src/pages/exam2/ExamAuthoring.tsx` — add "From Bank" + "Selection rules" tabs; clone button.
- `src/pages/exams/ExamsList.tsx` / `ExamProfile.tsx` — "Clone" + "Export" actions.
- `src/App.tsx` — lazy routes for the new pages (ADMIN/TEACHER guard).
- `src/lib/api.ts` — (already supports PATCH) add a small `apiUpload()` helper for multipart import if not present.
- Reuse: `src/components/students/StudentCsvImport.tsx` as the import-UX template.

**Docs/tests**
- `docs/EXAM_PHASE3_PLAN.md` (this file); add scenario notes to the verification checklist.

---

### Appendix A — Per-feature quick reference (MISSING/PARTIAL only)

| Feature | Models | Endpoints | UI | AuthZ | Audit | Top risk | Order |
|---|---|---|---|---|---|---|---|
| Question bank | QuestionBankItem | bank CRUD | QuestionBank(+Item) | TEACHER/ADMIN | BANK_* | ownership-change scope | 1 |
| Topics/subtopics | QuestionTopic | topic CRUD | TopicManager | TEACHER/ADMIN | TOPIC_* | cycle in tree | 1 |
| Difficulty | (field on bank/Question) | within bank CRUD | bank form | TEACHER/ADMIN | BANK_UPDATE | enum migration | 1 |
| Exam–question linking | ExamQuestion (+Question.bankItemId) | from-bank | Authoring tab | TEACHER/ADMIN | EXAM_UPDATE | dup links | 2 |
| Random selection | ExamSelectionRule | selection-rules, generate | ExamBuilder | TEACHER/ADMIN | EXAM_GENERATE | determinism/repeatability | 2 |
| Shuffle options | (none — logic) | extend start | player (display) | student own attempt | n/a | score-on-value | 2 |
| Versioning | QuestionVersion | versions, revert | Item history | TEACHER/ADMIN | BANK_VERSION_* | snapshot fidelity | 3 |
| Exam cloning | Exam.clonedFromId | clone | list/profile action | TEACHER/ADMIN | EXAM_CLONE | partial copy/txn | 3 |
| CSV/Excel I/O | QuestionImportBatch | import(dry/commit), export | ImportDialog | TEACHER/ADMIN | BANK_IMPORT/EXPORT | bad rows, CSV injection | 4 |

*End of plan — no code was changed.*
