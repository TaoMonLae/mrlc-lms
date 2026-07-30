# Language Quest — Malaysian Malay, A1–C1 (complete course content)

Full content for the "Language Quest" module of the MRLC LMS (github.com/TaoMonLae/mrlc-lms), built from the Language Quest research report (habit-formation science + CEFR curriculum design). **All five CEFR levels are now complete.**

## What's in this package

- `course.json` — top-level course manifest: all 5 CEFR levels with final unit/vocab/lesson counts, daily-goal tiers, XP/gamification constants.
- `schema/language-quest-schema.md` — the JSON shape every unit file follows.
- `a1/units/*.json`, `a2/units/*.json`, `b1/units/*.json`, `b2/units/*.json`, `c1/units/*.json` — **46 units, complete**.

| Level | Units | Vocab items | Lessons | Focus |
|---|---|---|---|---|
| A1 — Baru Belajar | 8 | 98 | 41 | Survival Malay: greetings, numbers, family, market, food, time, transport, health basics |
| A2 — Boleh Berbual Sikit | 8 | 63 | 31 | Everyday transactions: clinic, LRT/Grab, banking, renting, work, slang, past-tense narration |
| B1 — Boleh Uruskan Sendiri | 10 | 80 | 40 | Independent living: immigration/UNHCR paperwork, job hunting, workplace, tenancy disputes, school, money, Bahasa Rojak, negotiation, advanced health |
| B2 — Fasih untuk Kerja | 10 | 70 | 40 | Confident/professional Malay: meetings, customer service, news, legal literacy, mental health, culture/etiquette, debate, formal writing, dialects, digital literacy |
| C1 — Mahir | 10 | 62 | 40 | Advanced/academic Malay: academic discourse, leadership, complex debate, literature/proverbs, professional writing, high-level negotiation, media critique, formal protocol, mentoring, capstone/SKBMW mock exam |
| **Total** | **46** | **373** | **192** | |

Every unit follows the same schema: vocabulary with example sentences, phonetics, and register tags (colloquial/standard/rojak); 3–6 lessons with practice exercises (matching, cloze, listening, minimal-pair, reorder, translate); one full real-life bilingual scenario with an AI-conversation-partner system prompt; 2–3 speaking prompts (shadowing, roleplay, pronunciation, and — from B1 up — presentation); and an end-of-unit quiz. C1's final unit (`c1-u10-projek-akhir-skbmw`) is a capstone that mirrors the actual SKBMW four-skill format (Writing/Reading/Listening/Speaking).

## Progression logic, in brief

- **A1→A2**: from survival phrases to independent daily transactions, introducing `dah/tadi/nanti` time markers and first colloquial slang.
- **A2→B1**: from transactions to independence — bureaucracy (imigresen), employment, tenancy disputes, school involvement, and the first deliberate Bahasa Rojak unit.
- **B1→B2**: from independence to professional fluency — meetings, customer service, news, legal/health literacy, culture, debate, formal writing, dialects beyond KL, and digital-scam literacy.
- **B2→C1**: from professional fluency to mastery — academic discourse, leadership/management language, complex ethical debate, literature and proverbs, high-stakes negotiation/advocacy, media critique, ceremonial/official register, mentoring others, and a capstone mock exam.

## Before this goes live

1. **Native-speaker review** of every line — naturalness, register accuracy (especially the C1 ceremonial/academic register and B1's Bahasa Rojak unit, which are the easiest to get subtly wrong), and confirming nothing has drifted into Indonesian forms.
2. **Audio recording** for every `audioUrl` placeholder (`/audio/ms/<id>.mp3`) — ideally 2+ voices, and for C1's formal-register content, a speaker comfortable with ceremonial Malay.
3. **Mon glosses** — the `mon` field is `null` throughout; MRLC's Mon-speaking staff should fill these in via the existing MonDictDB dataset.
4. **Seeding into the LMS** — write `seed:lang-quest.ts` following the `seedMonDictionary.ts` / `flashcards.ts` pattern; map `vocab` → flashcard-like rows, `unit`/`lesson` → new tables, reuse per-card mastery + attempt-history tables for `reviewState`, and reuse the exam engine for `unitQuiz` and the C1 capstone mock exam.
5. **SRS scheduler** — not included here (a runtime service, not content); implement SM-2 or FSRS over `reviewState.dueAt` per the research report.
6. **SKBMW alignment check** — verify current SKBMW format, fees, and session dates with MPM directly before marketing C1 completion as exam-ready; the capstone unit approximates but doesn't officially replicate the real exam.

## Generator scripts (for future edits)

The units were built with small Python generator scripts (`gen_a2_part1.py`, `gen_b1_part1.py`, etc.) using shared helpers in `lq_helpers.py`. To edit a unit's content programmatically rather than hand-editing JSON, adjust the relevant `gen_*.py` script and re-run it — it will overwrite just that batch's unit files. `lq_helpers.py` documents the `unit()/v()/lesson()/ex()/scenario()/sp()/quiz()` builder functions used throughout.
