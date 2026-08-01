# Language Quest: Lesson & Course-Practice Improvements — Implementation Plan

This is the companion plan to `language-quest-practice-styles-plan.md`. That plan scoped new **challenge types** (REORDER, CLOZE, MATCHING, DICTATION, GRAMMAR_TRANSFORM, MINIMAL_PAIR_LISTENING) and Phases 1–2 of it have shipped in the engine (`fb23d2c`, `0b31681`). This plan addresses everything that plan didn't cover: the shipped types are barely used in real content, and there are separate gaps in lesson pedagogy, spaced repetition, course-authoring tooling, leaderboards, content depth, and speech assessment.

## Current state (verified against the codebase)

- **Shipped types are content-starved.** Across the 8 generated course files in `curricula/language-quest/*.generated.json`, MATCHING, DICTATION, GRAMMAR_TRANSFORM, and ODD_ONE_OUT appear in **zero** challenges. Only `malay-cefr-courses.generated.json` uses CLOZE (46), REORDER (7), and MINIMAL_PAIR_LISTENING (3) — under 7% of its 824 challenges. Everything else (Mandarin's 1,870, both English word courses, teach-yourself-malay, malay-speaking-a1-c1, malay-govinfo-guide, linguify-cefr) is pure SELECT/ASSIST.
- **Mandarin (the largest course) uses one literal question template for all 1,870 challenges**: `"Choose the Mandarin translation for X"` (confirmed via direct grep — 1,870/1,870 identical). English word courses similarly use a single `"Which word means X?"` template with no usage-in-context sentences.
- **Lesson feedback is generic.** `LanguageQuestLesson.tsx` (`src/pages/games/language-quest/LanguageQuestLesson.tsx`) shows fixed boilerplate on a miss — `"Not quite — compare the meaning and retry."` (line 1244) — with no per-challenge explanation. The phase order (`learn → vocabulary → spelling → sentence → quiz`, line 77) is identical for every learner and a miss just re-prompts the same challenge via `continueLesson` (line 406) instead of resurfacing it later.
- **Spaced repetition is a flat ladder, not SM-2.** `nextLanguageQuestMasteryReview` (`shared/languageQuestEngagement.ts:151-162`) steps through `[1, 3, 7, 14, 30]` days on any correct answer and resets fully to stage 0 on any miss — no ease factor, so a lucky guess and a confident answer graduate identically.
- **Course Studio can't author the new types.** `LanguageQuestEditor.tsx` has its own code comment admitting this (lines 21-25): CLOZE/REORDER/MATCHING/MINIMAL_PAIR_LISTENING/DICTATION/GRAMMAR_TRANSFORM challenges load without corruption but there's no UI to create or edit them — only generator scripts can produce them.
- **Leaderboard is single global scope.** `LanguageQuestLeaderboard.tsx` calls one endpoint (`/api/language-quest/leaderboard`) with no course/level/classroom parameter — a Malay beginner ranks against Mandarin power-users on raw XP.
- **Speech input doesn't assess pronunciation.** `src/lib/languageQuestSpeechInput.ts` transcribes via the Web Speech API and feeds the result through the same exact-match/fuzzy text grading (`languageQuestAnswerMatches`) used for typed answers — there's no tone, phoneme, or pronunciation scoring despite this being the "speaking" practice mode.
- **Malay content is split across 4 overlapping curricula** (`teach-yourself-malay`, `malay-cefr-courses`, `malay-speaking-a1-c1`, `malay-govinfo-guide`) with no clear default entry point.
- **Spanish was added and reverted same day.** `848b367` added a LibreLingo-based Spanish course; `d48de88` reverted it hours later with no content ever generated — Spanish currently has category/culture scaffolding but no course.

## Guiding constraints

- **Don't touch the challenge-type engine again.** Phases 1–2 of the practice-styles plan already built grading/UI for all 7 new types. This plan is about *using* what's built (content, authoring, onboarding) and about systems that sit above the challenge level (spaced repetition, leaderboards, analytics) — not re-opening the engine.
- **Content work follows the existing generator-script pattern.** New/regenerated content goes through `scripts/generate-language-quest-*.mjs` → `.generated.json` → thin course wrapper `.ts` file, same as today. No hand-edited JSON.
- **Ship independently.** Each phase below stands alone; none blocks another except where noted.

## Phase 1 — Make lessons teach, not just quiz (small–medium lift)

- **Per-challenge explanations.** Add an optional `explanation` string to the challenge shape (generator output + `LanguageQuestChallenge`, same additive pattern as the `metadata Json?` column from the practice-styles plan). Surface it in `LanguageQuestLesson.tsx`'s feedback panel in place of/alongside the current fixed "Not quite" text (line 1244). Backfill can be gradual — fall back to today's generic message when absent.
- **Missed-challenge requeue instead of immediate retry.** Change `continueLesson` (line 406) so a miss re-inserts the challenge a few positions later in the current lesson queue instead of repeating it immediately — cheap interleaving win with no new data model.
- **First-use onboarding for REORDER/MATCHING/DICTATION/etc.** A one-time dismissible tooltip/modal keyed by challenge type and stored per-user (localStorage or a small preference flag), shown the first time a learner hits each new type.
- **Rough size:** 1 sprint.

## Phase 2 — Spaced repetition & weak-area practice (medium lift)

- **Upgrade `nextLanguageQuestMasteryReview` toward SM-2-style ease.** Track a per-item ease factor (new nullable column on the mastery progress table) instead of a flat stage index; a confident correct answer should graduate further than a hesitant one, and repeated misses should lengthen the "reset" interval less harshly than a full stage-0 reset every time.
- **Add a "practice weak areas" queue.** Currently `LanguageQuestMastery.tsx`'s review modes (Arena/Lightning/Daily Chain) pull only by due-date. Add a mode that pulls by lowest recent accuracy per skill/course-category instead, reusing existing progress records — no new grading logic needed.
- **Rough size:** 2 sprints.

## Phase 3 — Course Studio authoring parity (large lift)

- Extend `LanguageQuestEditor.tsx` to create/edit all 9 challenge types, not just SELECT/ASSIST. This is mostly UI work — build a type-specific sub-form for each (paired-groups editor for MATCHING, tile-order editor for REORDER, blank-picker for CLOZE, audio-pair picker for MINIMAL_PAIR_LISTENING, prompt/target pair for DICTATION and GRAMMAR_TRANSFORM) reusing the `metadata Json?` column the engine already writes.
- Add a lightweight content-moderation step before a teacher-authored course flips from draft to `published` (currently a bare boolean) — even just an admin-review queue.
- **Rough size:** 3 sprints — the single highest-leverage item for unblocking Phase 5's content work from being centralized in generator scripts only.

## Phase 4 — Leaderboard segmentation (medium lift)

- Add course/category and classroom scoping to `/api/language-quest/leaderboard` and `LanguageQuestLeaderboard.tsx` — e.g., league brackets by recent XP band, plus a per-classroom view teachers can show in class. Keep the existing global board as one tab among several rather than replacing it.
- **Rough size:** 1–2 sprints.

## Phase 5 — Content depth & language parity (large, content-heavy)

- **Diversify Mandarin's 1,870 challenges** beyond the single "Choose the Mandarin translation for X" template — add listening-first questions, tone drilling, and route a meaningful share into MINIMAL_PAIR_LISTENING/DICTATION now that Phase 3 gives teachers (and generator scripts) a way to produce them.
- **Add usage-in-context questions to the English word courses** — sentence-completion or GRAMMAR_TRANSFORM style items instead of pure "Which word means X?" definition matching.
- **Consolidate the 4 Malay curricula** into a single clear entry point with explicit CEFR levels, folding or archiving the overlapping ones (`teach-yourself-malay`, `malay-govinfo-guide`, `malay-speaking-a1-c1`) behind `malay-cefr-courses` as the canonical path.
- **Resolve the Mandarin / English-word CEFR gap** — both currently ship as monolithic courses with no `category`/level split, unlike Malay and Linguify English.
- **Decide on Spanish.** It was added via LibreLingo import and reverted same day with no content ever live. Needs an explicit decision — retry the import with fixes, generate original content via the existing script pattern, or drop the category/culture scaffolding that currently references a course that doesn't exist.
- **Rough size:** 3–4+ sprints, largely content-authoring time rather than engineering; unblocked fastest once Phase 3 (Course Studio) gives non-engineers a way to author the richer types.

## Phase 6 — Real pronunciation/speech assessment (large lift, needs research)

- Replace the exact-match text grading currently applied to Web Speech API transcripts (`languageQuestSpeechInput.ts`) with actual pronunciation scoring — at minimum a confidence/similarity score from the recognizer, ideally a phoneme or tone-accuracy check for tonal languages (Mandarin) rather than accepting/rejecting on transcript text match alone.
- **Rough size:** 2–3 sprints, dependent on picking a speech-scoring approach (browser API confidence scores vs. a hosted pronunciation-assessment API) — needs a short technical spike before sizing further.

## Phase 7 — Teacher-facing per-skill analytics (medium lift)

- Add a per-question/per-skill accuracy view for Language Quest, mirroring the existing exam module's `QuestionAnalytics.tsx` pattern, so teachers can see which concepts a class is failing rather than only per-student aggregate progress (points/streak/% complete) as today.
- **Rough size:** 1–2 sprints.

## Suggested sequencing

1. **Phase 1** (lesson explanations, requeue, onboarding) — fastest win, improves every existing lesson immediately with no content or schema dependency.
2. **Phase 3** (Course Studio authoring parity) — unlocks Phase 5's content diversification without waiting on generator-script engineering for every new question.
3. **Phase 2** (spaced repetition/weak-area practice) and **Phase 4** (leaderboard segmentation) — can run in parallel with Phase 3, independent of it.
4. **Phase 5** (content depth/parity, Spanish decision) — start once Phase 3 ships so teacher authoring can share the load with generator scripts.
5. **Phase 7** (teacher analytics) — valuable any time, but most useful once Phase 5 content diversity gives teachers more to analyze.
6. **Phase 6** (pronunciation assessment) — treat as its own initiative; needs a technical spike before committing to a sprint estimate.

## Open questions before Phase 1 starts

- Should challenge `explanation` text be required for all new content going forward, or optional/backfilled opportunistically?
- For Spanish: retry the LibreLingo import with fixes, commission original content, or quietly drop the unused category scaffolding?
- Is there budget/appetite for a hosted pronunciation-assessment API (cost per call), or should Phase 6 stay limited to what the free Web Speech API confidence scores can support?
