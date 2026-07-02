# Student Engagement — Mastery Visuals + Streaks & Badges
**Implementation Plan**

Scope: planning only — no code changed yet.
Fits the existing stack (Prisma + Express `server.ts` + Vite/React pages, role-based `navigation.ts`); no new infrastructure.

---

## 0. Current state (what's already there)

- `GedReadiness` (schema.prisma:1259) already tracks each student across 4 GED subjects (`RLA`, `MATH`, `SCIENCE`, `SOCIAL_STUDIES`) through a 6-stage pipeline: `NOT_READY → DEVELOPING → NEAR_READY → READY → TEST_SCHEDULED → PASSED`.
- It's already surfaced to students today: `buildStudentProgress()` (server.ts:9382) feeds `GET /api/student/grades`, rendered on `src/pages/gradebook/StudentProgress.tsx` (route `/student/grades`, nav label "My Progress"). Right now it's just a flat colored badge per subject (line 118–129 of that file) — no sense of how close the student is along the pipeline, and no link to their actual exam performance.
- **Nothing exists yet** for streaks or badges — no table, no endpoint, no UI.

This means Part 1 below is a visual upgrade to data you already have (no schema change), and Part 2 is new (one migration).

---

## 1. Mastery visuals

### 1.1 Backend — small addition, no migration

Extend `buildStudentProgress()` (server.ts:9382) to also compute a per-subject exam signal, so the stage isn't just a teacher-set label — it's backed by a number. Reuse the exact aggregation already used in `GET /api/student/dashboard` (server.ts:8827–8836): pull `ExamAttempt` where `isCompleted: true`, group by `exam.subject`, average `score / exam.totalMarks`.

Add to the object returned per `gedReadiness` entry:
```
{ subject, status, note, updatedAt, examAverage: number | null, attemptCount: number }
```
No new endpoint needed — `/api/student/grades` and `/api/gradebook/student/:studentId` (teacher/admin view, server.ts:9443) both already funnel through `buildStudentProgress`, so both views get the upgrade for free.

### 1.2 Frontend — replace the badge grid with a stage tracker

In `StudentProgress.tsx`, replace the "GED Readiness" block (lines 118–129) with a horizontal 6-step tracker per subject: filled steps up to the current status, current step highlighted, `examAverage` shown underneath as supporting detail (e.g. "Near Ready · 68% avg across 4 exams"). Keep the existing `STATUS_LABELS`/`STATUS_STYLES` maps — just change the rendering from a single badge to a segmented progress bar using those same colors.

Add a compact version to `StudentDashboard.tsx`: a small 4-chip row (one per subject, mini progress + current stage), linking to `/student/grades`. This is the only new surface — everything else reuses the existing page and route.

### 1.3 Files touched
- `server.ts` — extend `buildStudentProgress` (~15 lines)
- `src/pages/gradebook/StudentProgress.tsx` — replace readiness block with tracker component
- `src/pages/student/StudentDashboard.tsx` — add compact subject-progress card
- New: `src/components/GedStageTracker.tsx` (shared by both pages)

No Prisma migration, no new routes, no nav changes.

---

## 2. Streaks & badges

### 2.1 Data model (one migration)

Add a single table — deliberately no stored streak counter (compute streaks live from `Attendance` so there's nothing to keep in sync):

```prisma
model StudentBadge {
  id         String   @id @default(uuid())
  studentId  String
  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  badgeKey   String   // matches a key in the static catalog, e.g. "attendance_streak_10"
  earnedAt   DateTime @default(now())
  meta       Json?    // e.g. { streakLength: 10 } — snapshot at time of award

  @@unique([studentId, badgeKey])
  @@index([studentId])
}
```
Add the inverse relation `badges StudentBadge[]` on `Student`.

### 2.2 Badge catalog (code, not DB)

A static rules list, e.g. `src/lib/badges.ts` (shared type) + a server-side mirror for evaluation, following the existing pattern of constants like `GED_SUBJECTS`/`GED_STATUSES`:

| Key | Label | Rule | Data source |
|---|---|---|---|
| `attendance_streak_5` / `_10` / `_20` | Attendance streak | N consecutive school days marked `PRESENT` | `Attendance`, grouped by `studentId`, ordered by `date` |
| `homework_streak_5` | On-time streak | 5 consecutive `HomeworkSubmission`s where `submittedAt <= homework.dueDate` | `HomeworkSubmission` + `Homework.dueDate` |
| `first_exam_done` | First practice exam | 1st `ExamAttempt` with `isCompleted: true` | `ExamAttempt` |
| `exams_completed_5` | Practice makes perfect | 5 completed `ExamAttempt`s | `ExamAttempt` |
| `subject_ready` | Subject ready | Any `GedReadiness.status` transitions to `READY` or `PASSED` | `GedReadiness` |

Reading badges (e.g. "books finished") are a **phase 2 item** — there's no `EbookProgress`/reading-position model yet (only `VideoProgress` exists for videos), so that needs its own small migration first. Not blocking this plan.

### 2.3 Award logic

One helper, called after each relevant write:
```ts
async function checkAndAwardBadges(studentId: string) {
  // 1. compute attendance streak (live query, ordered by date)
  // 2. compute homework on-time streak
  // 3. count completed ExamAttempts
  // 4. check GedReadiness statuses
  // 5. for each rule newly satisfied: upsert StudentBadge (unique constraint prevents dupes)
  // return newly-earned badges so the caller can toast/celebrate
}
```
Call sites (all existing, just add one line after the write commits):
- Attendance create/upsert — server.ts:2747, 2810, 2999
- Homework submission create/update — server.ts:11562 (`POST /api/homework/:id/submit`)
- Exam attempt completion — server.ts:6886 (`tx.examAttempt.update(...isCompleted: true)`)
- GED readiness upsert — server.ts:9503 (`PUT /api/ged-readiness`)

### 2.4 New endpoint

`GET /api/student/badges` (authMiddleware + studentOnly, same pattern as `/api/student/grades`) — returns earned badges (from `StudentBadge`) plus locked badges with a progress hint (e.g. "3/5 exams completed"), computed the same way the award check does.

### 2.5 Frontend

- Badge shelf on `StudentDashboard.tsx`: row of icons, earned = full color + `earnedAt` on hover, locked = grayscale + progress tooltip.
- Live streak number next to the existing "Attendance" stat card (reuse the attendance data dashboard already fetches — server.ts:8826 — no extra query).
- Optional: a toast/celebration when `checkAndAwardBadges` returns a newly-earned badge on the submit/attempt-completion response.

### 2.6 Files touched
- `prisma/schema.prisma` — add `StudentBadge` model + migration
- `server.ts` — `checkAndAwardBadges` helper, 4 call-site hooks, new `GET /api/student/badges`
- `src/lib/badges.ts` — badge catalog (shared labels/icons)
- `src/pages/student/StudentDashboard.tsx` — badge shelf + streak number
- New: `src/components/BadgeShelf.tsx`

---

## 3. Rollout order

1. **Migration**: add `StudentBadge` table.
2. **Backend**: `buildStudentProgress` exam-average addition (Part 1) — low risk, additive.
3. **Backend**: `checkAndAwardBadges` + 4 call-site hooks + `GET /api/student/badges`.
4. **Frontend**: `GedStageTracker` component → wire into `StudentProgress.tsx` and `StudentDashboard.tsx`.
5. **Frontend**: `BadgeShelf` component → wire into `StudentDashboard.tsx`.
6. **Verify**: seed a test student with attendance/homework/exam history, confirm streak math and badge awarding against real data (not just fresh accounts, which will show all-locked correctly).

---

## 4. Explicitly out of scope for this pass

- Reading badges (needs new `EbookProgress` model first).
- Leaderboards (deliberately skipped — group/individual competition can discourage struggling students in this setting; class-level shared goals were suggested separately if wanted later).
- Persisted streak counters (computed live instead, to avoid drift).
