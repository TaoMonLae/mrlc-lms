# Language Quest: New Practice Styles — Implementation Plan

This plans out the practice-style ideas discussed earlier, scoped against the actual Language Quest engine as it exists today (`LanguageQuestChallenge`/`LanguageQuestOption` in `prisma/schema.prisma`, the SELECT/ASSIST challenge types, and the course-generator script pattern in `scripts/generate-language-quest-*.mjs`).

## Guiding constraints

- **Don't break what's already shipped.** There are roughly 2,000+ SELECT/ASSIST challenges already generated across the English, Spanish, Mandarin, and Malay courses. Every new type must be additive — existing content keeps working untouched.
- **Reuse the existing progress economy.** Hearts, XP, streaks, and the Leitner-style mastery/spaced-repetition system (`LanguageQuestMasteryProgress`) all operate at the challenge level regardless of type. New challenge types should plug into this unchanged rather than needing a parallel progress system.
- **Keep the generator-script pattern.** Every course is produced by a script in `scripts/` that emits a `.generated.json` file, wrapped by a thin `languageQuest*Course(s).ts` file, and registered in `ensureOfficialCourses()`. New types should extend this pipeline, not replace it.
- **Ship in independently shippable phases.** Order phases by how much they reuse the existing options/grading engine vs. need new data models, new UI paradigms, or new content/asset pipelines.

## Architecture approach

`LanguageQuestChallenge.type` is currently a loose `String @default("SELECT")` in Prisma, not a hard enum — so adding new type strings ("REORDER", "CLOZE", etc.) needs **no migration**. What does need care:

- Some new types need structured data beyond the current `options[]` shape (text/correct/emoji/audioText) — for example, matching needs paired groups, not a single correct answer. Rather than adding a pile of nullable columns to `LanguageQuestOption`, add one optional `metadata Json?` column to `LanguageQuestChallenge` for type-specific structured data (pair groupings, canonical tile order, etc.), and keep `options[]` for everything that still fits the choice-based paradigm.
- `LanguageQuestOption.order` already exists and can be reused as the canonical answer order for REORDER challenges — no new field needed there.
- Grading logic branches by `challenge.type` in one place (mirrors how `languageQuestAnswerMatches` already branches for ASSIST/spelling/sentence checks).

## Phase 1 — Extend the options-array engine (low lift)

**Types:** REORDER, CLOZE, ODD_ONE_OUT

These reuse the existing `question` + `options[]` shape almost as-is, so they're the cheapest to ship and the best starting point.

- **Data model:** no schema changes needed. REORDER reuses `LanguageQuestOption.order` as the canonical sequence; CLOZE reuses ASSIST's typed-answer grading (`languageQuestAnswerMatches`) against the blanked word; ODD_ONE_OUT is SELECT with different framing copy (4 options, one flagged `correct` as the odd one out).
- **Backend:** REORDER needs a small new grading function (compare submitted tile order to `options` sorted by `order`); everything else reuses existing grading paths.
- **Frontend:** three new renderers in `LanguageQuestLesson.tsx`'s quiz phase — draggable/tappable word tiles for REORDER, a blank-plus-input (or blank-plus-chips) layout for CLOZE, and a relabeled SELECT grid for ODD_ONE_OUT.
- **Generators:** update `scripts/generate-language-quest-*-courses.mjs` so future imports (the Malay pack's own `reorder`/`clozeGap` exercises, currently downgraded into vocabulary-recall SELECT questions) can round-trip into their native type instead of being flattened.
- **Testing:** unit tests for the new grading function(s), plus a manual pass through each new UI in a lesson.
- **Rough size:** 1–2 sprints.

## Phase 2 — New interaction paradigms needing extra data (medium lift)

**Types:** MATCHING, MINIMAL_PAIR_LISTENING, DICTATION

- **MATCHING** needs grouped pairs rather than one correct answer. Use the new `metadata Json?` column to store pair keys (e.g. `[{ pairKey: "a", side: "left" }, { pairKey: "a", side: "right" }, ...]`) layered on top of `options[]`. Frontend needs a drag-or-tap-to-connect board — this can likely borrow layout/interaction patterns from Word Trail's existing board-game UI rather than starting from zero.
- **MINIMAL_PAIR_LISTENING** turns out cheap on data: it only needs two target-language texts (which one is "correct") plus TTS for both, no new audio assets required since Kokoro/browser voice can synthesize both clips on demand. This could realistically ship alongside Phase 1 if prioritized — it's mostly a UI variant (two speaker buttons, pick which one you heard) over the existing options shape.
- **DICTATION** (play audio, type what you heard) reuses ASSIST's fuzzy text grading; the only new piece is a "play the prompt audio, then reveal a text box" flow.
- **Voice dependency:** minimal-pair and dictation both lean harder on TTS quality than anything shipped so far — worth re-checking Kokoro language coverage and the browser-voice fallback under heavier use before or during this phase.
- **Rough size:** 2–3 sprints.

## Phase 3 — Content-heavy additions (medium-high lift, needs a content/asset decision first)

**Types:** PICTURE_VOCAB, GRAMMAR_TRANSFORM, generalized SPEECH_RECORDING

- **PICTURE_VOCAB** is blocked on a product decision before any engineering starts: where do images come from (a licensed stock/CC set, AI-generated per vocab item, or teacher-uploaded via the course editor)? Each has different cost, licensing, and moderation implications.
- **GRAMMAR_TRANSFORM** ("make this sentence polite," "make this negative") needs no engine work at all — it reuses ASSIST's typed-answer grading. This is purely a content-authoring effort (new challenge text), so it can slot into any phase whenever there's authoring bandwidth.
- **SPEECH_RECORDING**, generalized: the spoken pinyin check already proved this out for Chinese via `src/lib/languageQuestSpeechInput.ts` (Web Speech API, feature-detected, falls back to typed input). This phase is mostly about lifting that pattern out of the Chinese-specific code path so any course/language can opt in, with the same graceful fallback.
- **Rough size:** 2–3 sprints, longer if PICTURE_VOCAB's asset pipeline turns out to need real production work.

## Phase 4 — AI roleplay conversation partner (highest lift, needs a product/safety review)

This is a different shape of feature, not just a new challenge type — a chat interface, not a challenge queue. Both Malay packs anticipated this (`scenario`/`aiPrompt` fields) but nothing in the app can execute it yet.

- **Needs:** per-scenario system-prompt storage, a backend proxy route into the LLM providers already used elsewhere in the app (Gemini/Ollama), rate limiting and cost controls, and content-safety guardrails — this serves a student population that includes minors, so scoping the persona prompts tightly and logging transcripts for teacher/admin review matters more here than anywhere else on this list.
- **Recommendation:** pilot narrowly — one language, a small number of scenarios — before any broad rollout, and treat it as its own project rather than folding it into the challenge-type work above.
- **Rough size:** 3–4+ sprints, plus a product conversation before coding starts.

## Suggested sequencing

1. Phase 1 (REORDER, CLOZE, ODD_ONE_OUT) — ships fastest, immediately lets the Malay pack's already-collected reorder/cloze source content upgrade from "downgraded to vocabulary SELECT" to its intended format.
2. Phase 2 (MATCHING, MINIMAL_PAIR_LISTENING, DICTATION) — MINIMAL_PAIR_LISTENING could realistically move up next to Phase 1 if you want an early listening-focused win.
3. Phase 3 (PICTURE_VOCAB, GRAMMAR_TRANSFORM, SPEECH_RECORDING) — start the PICTURE_VOCAB product decision early since it gates that one item, but GRAMMAR_TRANSFORM and SPEECH_RECORDING don't need to wait on it.
4. Phase 4 (AI roleplay) — treat as a separate, later initiative given its safety/product surface area.

## Open questions before Phase 1 starts

- Should REORDER/CLOZE/ODD_ONE_OUT retroactively upgrade any existing generated content (e.g., regenerate the Malay pack's downgraded exercises into their native types), or only apply to new content going forward?
- Is there an appetite for a lightweight teacher-facing way to author these new types directly in the course editor, or should authoring stay script/generator-driven for now?
