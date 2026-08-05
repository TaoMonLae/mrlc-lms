# MRLC LMS

Learning management and school operations platform for the Mon Refugee Learning Centre (MRLC) GED School.

MRLC LMS combines teaching, assessment, student services, communication, finance, digital resources, and school administration in one role-based web application. A single Express server exposes the API and serves the Vite/React frontend, with PostgreSQL managed through Prisma.

## Webapp preview

![MRLC LMS webapp login portal](docs/images/mrlc-lms-webapp-preview.jpg)

- Default local URL: `http://localhost:8000`
- Public Language Quest preview: `http://localhost:8000/language-quest`
- Public Language Quest credits and course sources: `http://localhost:8000/language-quest/about`
- Primary runtime: Node.js 22.22+, Express, React 19, PostgreSQL 16
- Developed by Tao Mon Lae
- Developer: [github.com/TaoMonLae](https://github.com/TaoMonLae)

## Latest updates — July 2026

### Game-time parental controls

- Administrators and teachers can manage student game access from `/games/controls`.
- Policies can apply school-wide, to a teacher's assigned class, or to one student, and can target all recreational games or one specific game.
- Supports complete blocking, daily allowances, per-session timers, mandatory screen breaks, weekday selection, and allowed-time windows.
- The most restrictive matching rule wins. Teachers cannot weaken or remove administrator-managed policies, and teachers can manage only their assigned classes and students.
- Student play sessions use authenticated server heartbeats, persisted daily usage, automatic lock screens, and visible countdowns. Word Trail, multiplayer Chess, and Neon Snake also enforce access through their server APIs or socket authentication.
- Language Quest and Daily Quest remain learning activities and are not counted as recreational game time.

### Daily Learning Quest

- A short English vocabulary quest available only to Student and Teacher accounts, linked from their navigation and dashboards.
- Three daily modes: Relaxed (3 questions), Standard (5 questions), and Challenge (7 questions).
- Uses only the curated Everyday, Academic, Word Power, and Advanced English word courses, plus a review word from recent mistakes when available.
- Server-verified answers, one saved quest per Kuala Lumpur calendar day, completion XP, accuracy feedback, and current/best streak tracking.
- Responsive learner flow with progress, passages, question images, explanations, and an end-of-quest summary.

### Word Trail board game

- A server-authoritative English vocabulary board game for Student and Teacher accounts at `/games/word-trail`.
- Learners roll a six-sided die, answer a question from the six curated English Word courses, and move across a responsive 25-space board.
- Book bridges and rockets move players forward, word stars award bonus points, and slip spaces add classic board-game surprises.
- Four hearts, answer streaks, saved in-progress games, completion results, personal statistics, and a learner leaderboard encourage repeat practice.
- Dice rolls, answers, movement, special-space effects, and scoring are validated by the server so clients cannot award their own progress.

### Multiplayer Neon Snake

- Replaces the old Classic Snake mode with an authenticated, real-time 3D neon arena at `/games/snake/play?mode=classic`.
- LMS display names appear in the live leaderboard while Socket.IO synchronizes players and collectible energy orbs.
- Keyboard, swipe gestures, large on-screen touch controls, and an in-arena Full Screen mode support desktop, tablet, and phone play; boost consumes length for a tactical speed advantage.
- Completed Student runs continue to feed the existing Classic Snake score history and class leaderboard.
- Vocabulary Snake remains available as the learning-focused alternative.

### Language Quest

Language Quest is MRLC's public-facing, game-like language learning experience. Visitors can browse the published course catalog at `/language-quest`; beginning a lesson and saving progress requires a free account. Public learner accounts are deliberately isolated from private LMS records and school administration.

#### Preview

The responsive learner dashboard brings courses, hearts, points, streaks, sentence practice, and progress together in a colorful light/dark experience.

![Language Quest learner dashboard with course cards, progress, hearts, points, and streaks](docs/images/language-quest-dashboard.png)

Course pages provide a consistent Learn → Build → Check routine and an English/Burmese explanation switch. Learners can listen first, type complete sentences from memory, and then continue to the quiz with clear correction and retry guidance.

![Language Quest Spanish course with Burmese lesson guidance](docs/images/language-quest-burmese-guide.png)

Completed courses unlock personalized certificates. Active learners can also create streak cards containing their name, points, and current achievement; both formats can be saved as PNG files or shared through the device share menu.

![Language Quest completion certificate for Everyday English](docs/images/language-quest-completion-certificate.png)

#### Public access and account isolation

- `/language-quest` is a public, responsive course showcase with an accessible light/dark switch and complete contrast styling in both themes.
- Visitors may browse the published catalog without signing in. Starting lessons, earning points, and saving progress require an account.
- `/signup` creates a free Language Quest learner account that remains separate from school records and private LMS modules. A learner chooses one of the built-in character avatars during signup; profile-photo uploads are intentionally unavailable.
- External learners are restricted to an explicit browser-route and API allowlist covering Language Quest and its in-lesson learning tools. Both client and server checks prevent access to administration, finance, student records, Course Studio, and other private LMS content.
- Existing students, teachers, administrators, and staff continue to use their normal LMS accounts.

#### Learner experience

- Guided course paths with unit and lesson progression, lesson locking, five daily hearts, points, current/best streaks, saved progress, replay practice, and a learner leaderboard.
- Daily and weekly missions reward consistent learning, mastery reviews, and exploring more than one language course. Mission rewards are server-verified and cannot count toward their own goals.
- The spaced-repetition **Mastery Arena** schedules completed challenges at expanding review intervals, awards XP for correct recall, and returns missed cards sooner without consuming hearts.
- Twelve original Quest Card companions unlock at fixed XP levels. After Level 12, nine mystery **Legendary Vault** rewards reveal MRLC’s supplied Mon history portrait cards from animated golden chests. Separate language albums fill from completed challenges, while best-streak milestones unlock cosmetic card frames.
- A dedicated learner profile lets each person choose from twelve safe built-in avatars, write a short learning bio, and see their Language Quest identity without uploading a personal photo.
- Each lesson follows three stages: learn and listen, build complete sentences from memory, then check understanding with a quiz.
- Sentence checks ignore capitalization, repeated spaces, and light punctuation while still requiring the correct words and spelling.
- Correct sentence practice triggers immediate visual celebration and a short success sound.
- Incorrect answers show the model sentence and focused retry guidance instead of ending the practice.
- Optional Kokoro-82M speech provides a consistent multilingual teacher voice for supported courses, with automatic browser-voice fallback when the local model is offline or the language is unsupported. Learners may choose either provider in their profile.
- Learners can highlight an unfamiliar word anywhere in the lesson area to open the built-in dictionary. Available English definitions, Myanmar translations, and Mon entries appear without leaving Language Quest.

#### Guidance, accessibility, and achievements

- The Language Quest header includes an English/Burmese explanation switch. The choice updates lesson guides, sentence instructions, recovery messages, and other learning support copy.
- Light and dark themes are available throughout the public landing page and signed-in experience, with readable text, cards, controls, and course content in both modes.
- Device-local controls let learners turn success sounds off or reduce confetti, tilting, animation, and transition motion. The reduced-motion default respects the browser or operating-system preference.
- Learners can generate a personalized streak card after completing a lesson that day.
- Completing a course unlocks a personalized certificate containing the learner's name, course title, points, date, MRLC logo, and developer credit.
- Achievement cards and certificates can be downloaded as 1200×630 PNG images or shared using the browser/device share menu. If file sharing is unavailable, Language Quest saves the image locally.

#### Classroom use and learner administration

- Teachers can create opt-in Language Quest classrooms, choose a focus course, and share an automatically generated eight-character join code.
- Teachers can start time-bounded cooperative classroom XP challenges with a goal and optional classroom reward. Eligible XP from all enrolled learners contributes to one shared progress bar.
- Learners join or leave classrooms from their profile. Joining does not create or modify a private school Student record.
- Teacher rosters show the learner's display name, built-in avatar, points, streak, last Language Quest activity, and focus-course completion. Learner email addresses and private LMS data are not exposed.
- Teachers can close a classroom to new joins, change its focus course, refresh the roster, and remove a learner while preserving that learner's independent progress.
- Administrators can search and filter public learner accounts, review learning activity and classroom membership, deactivate or reactivate access, and permanently terminate an inactive account.
- Deactivation immediately blocks sign-in and revokes active sessions while preserving progress. Permanent termination is deliberately a second step and is available only after deactivation.
- A read-only monthly learner showcase celebrates the top three learning-XP earners with avatars and Quest Cards. It intentionally has no comments, public profile links, or direct messaging.

#### Course content and authoring

- Teacher and administrator Course Studio supports courses, units, lessons, multiple challenge types, accent colors, images, ordering, and draft/published states.
- Answers, progress, hearts, streaks, points, rewards, and completion are verified by the server rather than trusted to the browser.
- The public catalog and signed-in learner dashboard organize published content into collapsible, folder-style **Chinese Courses**, **English Courses**, **Spanish Courses**, and **Other Courses** so learners can find the language path they want quickly.
- Includes an original **Everyday English** starter course with two units, four lessons, and twelve challenges, provisioned when Language Quest is first opened.
- Includes the linked source repository's Spanish course as **Spanish Foundations**, with two units, ten lessons, and eighty visual or speech-assisted challenges.
- Includes an original **Chinese Conversation Starter** course with two units, eight lessons, and thirty-two speech-assisted practices for greetings, names, countries, introductions, friends, and simple identity questions. Pinyin appears in every question as pronunciation guidance.
- Includes an original **Mandarin Foundations** course with three units, nine lessons, and thirty-six speech-assisted challenges covering beginner conversations and daily life.
- Converts the school-provided `duolingo-chinese.md` curriculum into **Mandarin Complete Course**, preserving all seventy topics and 1,870 translation pairs across seven units and seventy-one LMS-safe lessons.
- Run `npm run generate:language-quest-chinese` after editing the Markdown source to rebuild the generated course data.
- Adds three curated courses from [dwyl/english-words](https://github.com/dwyl/english-words): **Everyday English Word Quest**, **Academic English Word Quest**, and **English Word Power**, with 180 definition and pronunciation challenges backed by the LMS's offline WordNet data.
- Run `npm run generate:language-quest-english-words` to rebuild the English word courses; set `ENGLISH_WORDS_ALPHA_PATH` to an upstream `words_alpha.txt` checkout to revalidate every selected word.
- Adds three ranked courses from [Isomorpheuss/advanced-english-vocabulary](https://github.com/Isomorpheuss/advanced-english-vocabulary): **Advanced English: Core**, **Advanced English: Mastery**, and **Advanced English: Expert**, with 180 WordNet-backed challenges selected from words appearing across at least nine vocabulary lists.
- Run `npm run generate:language-quest-advanced-english` to rebuild the ranked courses; set `ADVANCED_ENGLISH_VOCAB_PATH` to the upstream `9ormore-withfreqandlistcount-413.csv` file to refresh the validated selection.
- Adds six CEFR courses from [AyeNyeinSan22/linguify](https://github.com/AyeNyeinSan22/linguify), progressing from **A1 Foundations** to **C2 Mastery**, with 18 topic units and 360 definition, example, part-of-speech, listening, and source-supplied IPA challenges.
- Run `npm run generate:language-quest-linguify` to rebuild the six CEFR courses from the licensed source snapshot.
- Adds five school-provided Bahasa Malaysia CEFR courses (**A1–C1**, 46 units, ~370 vocabulary items) converted from a richer curriculum snapshot in `curricula/sources/malay/` -- see that folder's own README for the full package (vocabulary, matching/cloze/reorder drills, an AI-conversation scenario, speaking prompts, and a unit quiz per unit). Only the vocabulary and unit-quiz content converts into Language Quest's current multiple-choice/typed-answer format; matching, cloze, reorder, minimal-pair, listening, and speaking-drill exercises don't have a corresponding engine yet, so a best-effort subset of them is folded into extra multiple-choice questions and the rest (the AI-roleplay scenario, audio recording + rubric speaking prompts) are not imported. These five courses are seeded **unpublished** (`published: false`) because the source package's own README calls for native-speaker review (register accuracy, checking for drift into Indonesian forms) before going live -- publish each from the Language Quest course editor once reviewed. Malay has no Kokoro voice, so its teacher voice always uses the browser's installed `ms-MY` speech, same as Burmese and Mon.
- Run `npm run generate:language-quest-malay` to rebuild the five Malay CEFR courses from the source snapshot.
- Adds two more Malay courses, self-contained and speaking-first (vocabulary sprint, daily speaking sentences, scenario dialogue, sentence workshop, per unit): **Malay Speaking: Beginner to Advanced** (`MRLC-MALAY-SPEAKING-A1-C1-V1`, 12 units) and **Modern Spoken Malay: Source-Guided Course** (`MRLC-MALAY-GOVINFO-GUIDE-V1`, 12 units). The source-guided course follows the practical sequence of a 1943 U.S. War Department Malay phrasebook (public domain) but is newly written in current Malaysian Malay -- old spelling, military material, and colonial-era framing are removed; see `curricula/sources/malay-pack-v2/SOURCE_REFERENCE.md` for the full modernization policy and old-to-modern spelling table. Both courses are also seeded **unpublished** pending review, same as the other Malay courses, and use the same `ms-MY` browser voice fallback.
- Run `npm run generate:language-quest-malay-speaking` and `npm run generate:language-quest-malay-guide` to rebuild these two courses.

#### Optional Kokoro teacher voice

Language Quest can use the Apache-2.0-licensed [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) model as a private, built-in speech provider with named voices (see its [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)). The browser never connects to Kokoro directly: authenticated requests go through the LMS, which validates the language and text, caches generated audio, and falls back to browser speech if the provider is unavailable. Each supported course language is pinned to that language's highest-graded published voice (for example American English uses `af_heart`, Japanese uses `jf_alpha`). **Kokoro's published voice list has no Burmese/Myanmar voice**, so Burmese now uses browser speech, same as Mon already does.

Kokoro is a small model (82M parameters) and downloads its weights on first launch. It runs comfortably on CPU; a GPU is optional. It also depends on the system `espeak-ng` package for phoneme fallback in most non-English languages.

```bash
python3 -m venv Kokoro/.venv
Kokoro/.venv/bin/pip install "kokoro>=0.9.2" soundfile numpy
# macOS: brew install espeak-ng
# Debian/Ubuntu: sudo apt-get install espeak-ng
```

Then set `KOKORO_API_URL=http://127.0.0.1:8810` in `.env`, start the private voice process in one terminal, and start the LMS in another:

```bash
npm run voice:kokoro
npm run dev
```

The service binds to `127.0.0.1` by default. Do not expose port `8810` publicly. In a multi-server deployment, protect the private service network and set `KOKORO_API_URL` to its internal address.

### Flashcards

- Teacher-created decks with class assignment, Community sharing, cloning, images, LaTeX, and CSV import/export.
- Four study modes: flip cards, configurable quiz, matching game, and speech-assisted spelling.
- Per-card mastery, student progress bars, attempt history, personal bests, elapsed-time tracking, and teacher progress reports.
- Keyboard controls for study mode: Space/Enter to flip and arrow keys to navigate.
- Fixed duplicate/incorrect quiz choices and stale “study still learning” cards.
- Hardened deck validation, assignment authorization, image cleanup, clone behavior, and attempt validation.

### Exams

- Guided exam creation and editing with safer partial updates and validation for schedules, duration, pass marks, attempt limits, access codes, and status transitions.
- Reusable question bank, topic management, blueprints, drag-and-drop questions, passages, and expanded question types.
- Scheduling, targeted assignment, accommodations, invigilator tools, lockdown controls, printable exports, rubrics, manual grading, and question analytics.
- Fixed attempt limits, invalidated-attempt numbering, paused/resumed attempt behavior, session conflicts, empty exams, and access-code configuration.
- Attempts are graded from their immutable question snapshot, so later answer-key or point edits do not change an attempt already in progress.

### Video lessons

- Chunked uploads for lesson videos up to 2 GB.
- Teachers and administrators can upload custom JPG, PNG, or WEBP lesson thumbnails up to 5 MB. Uploaded images are validated, resized, converted to WEBP, previewed in the lesson form, and cleaned up when replaced or deleted.
- Native MP4/WebM playback; MOV, AVI, MKV, WMV, FLV, MTS/M2TS, TS, M4V, MPG/MPEG, and 3GP sources are converted in the background to browser-compatible MP4.
- Videos over 250 MB — including MP4/WebM that needed no format conversion — are automatically re-encoded smaller in the background.
- Conversion uses H.264 video, AAC audio, `yuv420p`, even dimensions, and fast-start metadata.
- Converted files are validated with `ffprobe` before they are published, preventing broken `0:00 / --:--` players.
- Processing, failure, retry/re-upload, cancellation, restart recovery, captions, required viewing, and teacher watch analytics are supported.

### E-Library

- PDF and EPUB batch upload with metadata and cover extraction.
- PDF/EPUB files up to 100 MB may be uploaded and files over 50 MB are compressed automatically. CBR and CBZ support uploads up to 500 MB; comic archives at or above 50 MB are automatically optimized to a 100 MB stored-file ceiling. CBR files that require optimization are converted to CBZ.
- Books are grouped by genre, and books assigned to a series appear in expandable series cards ordered by volume. Titles are unique across the E-Library regardless of letter case or extra spacing.
- PDF compression uses Ghostscript. EPUB compression rebuilds the archive and optimizes embedded images.
- PDF and EPUB readers support zoom in/out, Single Page, Two Page, Fit to Width, and Fit to Height modes.
- Resume position, full-book search, table of contents, highlights, full-page reading, selected-word dictionary lookup, and highlight-to-flashcard creation.
- Reading analytics show books opened, books completed at 90%+, percentage read, active reading time, open count, and last-read activity by student.
- Optional Project Gutenberg import through Gutendex.

### Mon language learning

- Every authenticated role has a **Mon Language** navigation tab that embeds [The Mon Language](https://the-mon-language.web.app/) learning app inside the LMS.
- The embedded page is responsive and includes a direct “Open in new tab” fallback.
- Production Content Security Policy configuration explicitly permits this trusted iframe origin.

### Platform fixes

- PixelBlast TypeScript compatibility fixes.
- Improved upload validation, failure messages, cleanup of abandoned files, and persistent-storage behavior.
- Continued improvements to fees, reports, timetable, chat, Social Space moderation, dictionary data, games, and responsive/dark-mode UI.

## Features

### Teaching and learning

| Module | Capabilities |
| --- | --- |
| Classes and subjects | Enrollment, teacher assignment, class profiles, subject profiles, prerequisites, and timetable views |
| Attendance | Daily and session attendance, bulk marking, reports, analytics, and truancy-oriented monitoring |
| Homework | Assignment creation, student submissions, tracking, scoring, and gradebook integration |
| Exams | Guided authoring, question bank, scheduling, attempts, proctoring, accommodations, grading, analytics, and printable output |
| Gradebook | Marks, class reports, individual progress, and GED readiness tracking |
| Daily Learning Quest | Student/teacher English Word practice with review questions, XP, and streaks |
| Word Trail | Student/teacher English vocabulary board game with dice, special spaces, saved progress, scores, and leaderboard |
| Multiplayer Neon Snake | Authenticated real-time 3D arena with LMS player names, live ranking, keyboard/touch controls, and saved Student scores |
| Game-time controls | Admin/teacher blocking, schedules, daily/session limits, breaks, server heartbeats, and student lock screens |
| Language Quest | Public course browsing, isolated learner signup, built-in avatar profiles, opt-in teacher classrooms, cooperative class goals, admin learner lifecycle controls, bilingual guidance, sentence practice, spaced-repetition mastery, missions, Quest Card levels, language albums, streak frames, accessibility controls, monthly showcases, achievements, speech-assisted challenges, hearts, XP, streaks, leaderboard, and Course Studio |
| Flashcards | Deck creation, sharing, class assignment, mastery, quiz, match, spelling, and progress reporting |
| Lesson planner | Teacher planning and classroom resource organization |
| Video lessons | Upload/conversion, custom thumbnails, captions, required viewing, progress, and watch analytics |
| E-Library | PDF/EPUB management, reading tools, progress, highlights, dictionary lookup, and analytics |
| Mon Language | Embedded Mon language learning and play activities for every authenticated role |
| Resource library | Class/subject resources and external links |
| Physical library | Book catalog, borrowing, returns, and due-date management |
| Dictionary | Offline English definitions and English/Myanmar/Thai/Mon/Chinese lookup data |

### School operations

| Module | Capabilities |
| --- | --- |
| Users and permissions | Admin, Teacher, Student, Librarian, HR, Finance, and other permission-based staff access |
| Admissions | Application review and enrollment workflow |
| Student and teacher records | Profiles, assignments, academic information, photos, and documents |
| HR and payroll | Staff directory, departments, designations, payroll runs, payslips, and leave |
| Fees | Charges, discounts, partial payments, balance payments, fee structures, assignments, receipts, and statements |
| Finance | Expenses, vendors, budgets, income/expense reporting, monthly summaries, donors, and donations |
| Conduct and cases | Rule catalog, violation history, restricted case notes, interventions, and follow-up |
| Duties | Duty definitions, rosters, student views, and performance tracking |
| Reports | Attendance, fees, exams, students, classes, finance, and monthly summaries with export/print support |
| Settings | Branding, language, permissions, news sources, backups, audit logs, and data export |

### Communication and engagement

- Real-time chat with presence, typing indicators, stickers, media, reporting, and moderation.
- Social Space with 24-hour posts, likes, editable comments, pagination, reporting, and admin moderation.
- Announcements with rich content and audience visibility.
- Curated RSS news and an in-app article reader.
- AI assistant for lesson planning, quiz generation, announcements, and translation using Gemini or a local Ollama model.
- Daily Learning Quest, Word Trail, Language Quest, Sudoku, Multiplayer Neon Snake, Snake vocabulary mode, and Checkers with account-backed progress, scores, or learning activity where applicable.
- Global search across major school records.

### Languages

The interface supports English, Burmese, and Mon through locale files under `src/i18n/locales/`. The school-wide default is configurable in Settings, and users can select their own preference where supported.

The **Mon Language** tab at `/mon-language` embeds `https://the-mon-language.web.app/` for all authenticated users. It requires browser access to that external origin; if embedding is unavailable, users can open the learning app in a separate tab from the page header.

**Language Quest** has a public course showcase at `/language-quest`. Visitors can browse published courses, while `/signup` creates a learning-only account for starting lessons and saving progress. These external accounts are restricted to Language Quest routes and in-lesson learning tools and cannot access private school modules or records. Existing LMS users enter the learning experience at `/games/language-quest`; teachers and administrators can publish and maintain course content from `/games/language-quest/manage`.

Signed-in learners manage their built-in avatar, learning bio, and classroom codes at `/games/language-quest/profile`. Teachers and administrators use `/games/language-quest/classrooms` for opt-in rosters and focus-course progress. Administrators use `/games/language-quest/learners` to manage public learner access without mixing those accounts into school Student records.

Language Quest explanations can be switched between English and Burmese independently from the language being studied. The selected explanation language is remembered in the browser. The shared light/dark preference also applies to the public landing page, which includes its own theme switch.

**Daily Learning Quest** at `/daily-quest` is restricted to Student and Teacher accounts and creates one English Word practice session per Kuala Lumpur calendar day. Learners choose a 3-, 5-, or 7-question mode; answers, completion XP, review words, and streaks are stored against their existing LMS account.

**Word Trail** at `/games/word-trail` is restricted to Student and Teacher accounts. It uses only the curated English Word Language Quest courses, saves the active board after every turn, and keeps personal results and a learner leaderboard.

**Multiplayer Neon Snake** at `/games/snake/play?mode=classic` uses authenticated LMS Socket.IO sessions for the live arena. The original Vocabulary Snake mode remains at `/games/snake/play?mode=vocabulary`.

## Architecture

```text
Browser
  └─ React 19 + TypeScript + Vite + Tailwind CSS
       └─ JSON/file APIs and Socket.IO over Express 4
            ├─ Prisma 7 → PostgreSQL
            ├─ Persistent uploads in data/ or configured volumes
            ├─ ffmpeg/ffprobe for video conversion
            ├─ Ghostscript + Sharp/JSZip for e-book compression
            └─ pg_dump for managed database backups
```

The production build creates:

- `dist/index.html` and `dist/assets/` for the browser application.
- `dist/server.cjs` for the server runtime.

## Requirements

### Required

- Node.js 22.22 or newer
- npm
- PostgreSQL 16 or a compatible supported PostgreSQL release
- A persistent filesystem for uploads and backups

### Required for all production features

- `ffmpeg` and `ffprobe` — non-browser video conversion and output validation
- Ghostscript (`gs`) — PDF compression above the 50 MB stored-file limit
- `pg_dump` matching the database server major version — manual and automatic backups

CBR reading includes a bundled WebAssembly RAR fallback, so `bsdtar` is optional. The Docker image still installs `libarchive-tools` as a native accelerator.

The provided Docker image installs these tools. For a manual Ubuntu/Debian deployment:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg ghostscript postgresql-client
```

If the distribution package does not match PostgreSQL 16, install `postgresql-client-16` from the PostgreSQL Apt repository as shown in `deploy/ubuntu-setup.sh`.

## Quick start

1. Clone the repository and create the environment file.

   ```bash
   git clone <repository-url>
   cd mrlc-lms
   cp .env.example .env
   ```

2. Set at least these values in `.env`.

   ```dotenv
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/school_lms"
   SESSION_SECRET="replace-with-a-random-secret-at-least-16-characters"
   APP_URL="http://localhost:8000"
   PORT="8000"
   ```

   Generate a production secret with `openssl rand -base64 48`.

3. Install dependencies and prepare the database.

   ```bash
   npm ci
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Optionally seed starter accounts and dictionary data.

   ```bash
   npm run seed
   npm run seed:en-my-dictionary
   npm run seed:mon-dictionary
   ```

5. Start development mode.

   ```bash
   npm run dev
   ```

Open `http://localhost:8000`.

### Starter accounts

When `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD`, and `SEED_STUDENT_PASSWORD` are not configured, the seed uses these demo credentials and forces a password change:

| Role | Email | Demo password |
| --- | --- | --- |
| Admin | `admin@mrlc.edu` | `admin123` |
| Teacher | `teacher@mrlc.edu` | `teacher123` |
| Student | `student@mrlc.edu` | `student123` |

Never use the demo passwords in production. Set the three seed password variables before the first production seed.

## Environment configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | — | JWT signing secret; minimum 16 characters |
| `APP_URL` | Production | `http://localhost:8000` in server fallback | Exact public origin used for CORS and password-reset links; normally the public HTTPS origin |
| `PORT` | No | `8000` | HTTP listening port |
| `SMTP_HOST` | Password recovery | — | SMTP server used by the durable email outbox |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_SECURE` | No | `false` | Use implicit TLS; normally `true` for port 465 |
| `SMTP_USER` | Provider-specific | — | SMTP username |
| `SMTP_PASS` | Provider-specific | — | SMTP password or app password |
| `SMTP_FROM` | No | `MRLC LMS <no-reply@mrlc.local>` | From address for password resets and notifications |
| `EBOOK_DIR` | No | `./data/ebooks` | Persistent PDF/EPUB storage |
| `VIDEO_FILES_DIR` | No | `./data/videos` | Persistent uploaded and converted video storage |
| `BACKUP_DIR` | No | `./data/backups` | PostgreSQL backup storage |
| `BACKUP_RETENTION` | No | `14` | Number of backups retained |
| `BACKUP_HOUR` | No | `2` | Local hour for scheduled backups |
| `OFFSITE_BACKUP_DIR` | No | unset | Separate mounted directory that receives a copy of every backup artifact |
| `SEED_ADMIN_PASSWORD` | No | Demo password | Initial admin password |
| `SEED_TEACHER_PASSWORD` | No | Demo password | Initial teacher password |
| `SEED_STUDENT_PASSWORD` | No | Demo password | Initial student password |
| `AI_PROVIDER` | No | `gemini` | `gemini` or `ollama` |
| `GEMINI_API_KEY` | Gemini only | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` in server code | Gemini model name |
| `OLLAMA_API_URL` | Ollama only | `http://localhost:11434/api/chat` | Local Ollama chat endpoint |
| `OLLAMA_MODEL` | No | `gemma2:9b` | Local Ollama model |
| `KOKORO_API_URL` | No | unset | Private Kokoro endpoint; when unset Language Quest uses browser speech |
| `KOKORO_MODEL` | No | `hexgrad/Kokoro-82M` | Model identifier sent to the voice service |
| `KOKORO_TIMEOUT_MS` | No | `120000` | Maximum server wait for one speech generation request |

Additional upload directories can be overridden for advanced deployments; see the constants near the top of `server.ts` and `flashcards.ts`.

Password-reset requests are stored in a retryable email outbox. Configure SMTP in production, then verify **Settings → System Health → Email delivery** before relying on self-service recovery. MFA uses standard TOTP authenticator apps; recovery codes are displayed once and stored only as hashes.

## File limits and processing

### E-books

- Accepted formats: PDF, EPUB, CBR, and CBZ.
- PDF/EPUB maximum incoming size: 100 MB; stored-file target: 50 MB or less.
- CBR/CBZ maximum incoming size: 500 MB; browser uploads are sent in 20 MB chunks to work through common reverse-proxy limits. Archives at or above 50 MB are rebuilt with optimized page images and must finish at 100 MB or less. CBR files that require optimization are stored as CBZ because the portable runtime can read but cannot safely create RAR archives.
- Upload fails with an actionable error if compression cannot reach the format's stored-file target.
- Very large or damaged PDFs may require repair outside the LMS before upload.

### Videos

- Maximum assembled file size: 500 MB.
- Large files use resumable-style chunked transport in the form UI.
- MP4 and WebM are stored directly.
- Other supported formats are converted asynchronously to MP4.
- Custom thumbnails accept JPG, PNG, and WEBP files up to 5 MB and are normalized to WEBP with a maximum size of 1280×720.
- Keep the application process and persistent video volume available until conversion completes.
- A process restart marks an interrupted conversion as failed so it can be re-uploaded instead of remaining stuck forever.

### Persistence

Do not treat `data/` as disposable build output. At minimum, preserve:

- E-books and covers
- Lesson videos, thumbnails, captions, and conversion state
- Flashcard images
- Student and staff documents/profile media
- Database backups

Docker Compose already uses named volumes for the database, e-books, videos, and backups. Add or bind additional upload directories if your deployment overrides them.

## Development commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start Express and Vite development mode |
| `npm run lint` | Run the TypeScript type checker (`tsc --noEmit`) |
| `npm run build` | Build the Vite client and bundled Express server |
| `npm run test:unit` | Run the Node unit test suite |
| `npm run start` | Run `dist/server.cjs` in production mode |
| `npm run smoke` | Run the configured API smoke suite |
| `npm run seed` | Create/update starter school records and accounts |
| `npm run seed:en-my-dictionary` | Import the English–Myanmar dataset |
| `npm run seed:mon-dictionary` | Import the Mon dictionary dataset |
| `npm run seed:chinese-dictionary` | Import the Chinese (CC-CEDICT) dictionary dataset |
| `npm run generate:language-quest-chinese` | Rebuild the generated Mandarin Complete curriculum |
| `npm run generate:language-quest-english-words` | Rebuild the three curated English Word courses |
| `npm run generate:language-quest-advanced-english` | Rebuild the three ranked advanced-English courses |
| `npm run generate:language-quest-linguify` | Rebuild the six CEFR vocabulary courses |
| `npx prisma migrate deploy` | Apply committed database migrations |
| `npx prisma validate` | Validate the Prisma schema |

Before committing or deploying application changes:

```bash
npm run lint
npm run test:unit
npm run build
npx prisma validate
```

## Deployment

### Docker Compose

Docker is the simplest way to run the complete stack because the image includes the native media and backup tools.

```bash
export SESSION_SECRET="$(openssl rand -base64 48)"
export APP_URL="https://your-lms.example.org"
SEED_ON_START=true docker compose up --build -d
```

After the first successful seed, remove `SEED_ON_START=true` from subsequent starts.

```bash
docker compose up -d
docker compose logs -f app
```

The container entrypoint waits for PostgreSQL, applies migrations, optionally seeds, and then starts `dist/server.cjs`. See [DOCKER.md](DOCKER.md) and [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md) for detailed server and reverse-proxy guidance.

### Manual production build

```bash
npm ci
npx prisma migrate deploy
npm run build
NODE_ENV=production npm run start
```

Run the app behind an HTTPS reverse proxy and set `APP_URL` to that exact public origin.

### PM2

```bash
npm ci
npx prisma migrate deploy
npm run build
NODE_ENV=production pm2 start dist/server.cjs --name mrlc-lms --update-env
pm2 save
```

For an existing process:

```bash
pm2 restart mrlc-lms --update-env
pm2 status
pm2 logs mrlc-lms --lines 200
```

If PM2 repeatedly changes from `online` to `errored`, inspect the logs before restarting again. Common causes are a missing/short `SESSION_SECRET`, an unreachable database, unapplied migrations, missing `dist/server.cjs`, a port already in use, or missing native tools/persistent-directory permissions.

## Backups

Backups are controlled from Settings. Database snapshots use `pg_dump`; admins can also create uploaded-file ZIP archives and JSON/CSV application exports. Artifacts can be integrity-checked from the history table. The scheduler writes to `BACKUP_DIR`, runs at `BACKUP_HOUR`, and prunes each backup type according to `BACKUP_RETENTION`.

Use a PostgreSQL client matching the server major version. Set `OFFSITE_BACKUP_DIR` to a separately mounted disk or replicated share to copy every artifact off the application volume; a local backup on the same disk is not sufficient by itself. Settings → System Health reports storage writability, database reachability, backup freshness, and missing native utilities.

## Security

- JWT authentication with bcrypt password hashing.
- Server-enforced roles and granular permission checks.
- Public Language Quest accounts are confined by client route guards and a server-side method/path allowlist.
- Ownership and class-scope checks on student, exam, accommodation, media, flashcard, and analytics APIs.
- Helmet security headers, restricted CORS, and rate limiting.
- DOMPurify sanitization for rendered user content.
- Audit logs for sensitive administrative and academic changes.
- Restricted case-management and personally identifiable student data.
- Path, type, size, ownership, and attachment validation for uploaded files.

Production operators should also enforce HTTPS, protect database and backup credentials, restrict filesystem permissions, monitor PM2/container logs, and regularly test restoration from backup.

`npm run audit:prod` runs `npm audit --omit=dev --audit-level=high` and must pass before deployment. The app uses the patched React Router v8 package directly; v8 removed the legacy `react-router-dom` compatibility package.

## Project structure

```text
mrlc-lms/
├── src/
│   ├── App.tsx                 # Routes and role/permission boundaries
│   ├── pages/                  # Feature and role pages
│   │   ├── elibrary/           # PDF/EPUB list, upload, reader, analytics
│   │   ├── exam2/              # Advanced exam workflow
│   │   ├── flashcards/         # Deck, study, game, and progress UI
│   │   └── games/              # Daily Quest, Language Quest, Word Trail, Sudoku, Neon Snake, Checkers, and Chess
│   ├── components/             # App-specific components, including Language Quest shell, dictionary, and achievements
│   ├── lib/                    # API and feature utilities
│   ├── providers/              # React providers
│   └── i18n/                   # Locale setup and translations
├── components/                 # Shared UI primitives and visual components
├── lib/                        # Shared domain utilities
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Versioned migrations
│   └── seed*.ts                # Core and dictionary seeders
├── data/                       # Runtime uploads and backups; persist in production
├── deploy/                     # Ubuntu, Docker, Nginx, and deployment guidance
├── server.ts                   # Main Express API and server startup
├── examBank.ts                 # Question bank and exam composition
├── examPhase2.ts               # Attempts, scheduling, accommodations, grading
├── flashcards.ts               # Flashcard API and image lifecycle
├── languageQuest.ts            # Language Quest courses, progress, rewards, and authoring API
├── shared/externalLearnerAccess.ts # External learner browser/API allowlists
├── dailyQuest.ts               # Daily English Word practice, review, XP, and streak API
├── englishWordPractice.ts       # Shared curated English Word question provider
├── wordTrail.ts                 # Word Trail board state, rolls, answers, scores, and leaderboard API
├── aiAssistant.ts              # Gemini/Ollama assistant integration
├── dictionary.ts               # Offline dictionary services
├── gutenberg.ts                # Gutendex/Project Gutenberg import
├── news.ts                     # RSS aggregation
├── conduct.ts                  # Rules and conduct records
├── snakeGame.ts                # Vocabulary game persistence
├── neonSnakeServer.ts          # Authenticated multiplayer Neon Snake arena
├── checkersGame.ts             # Checkers game services
├── Dockerfile
├── docker-compose.yml
└── package.json
```

The `@/` alias resolves from the repository root, so shared root-level modules and `src/` modules can both be imported through that alias.

## Troubleshooting

### The app exits immediately

Check:

```bash
pm2 logs mrlc-lms --lines 200
npx prisma migrate deploy
test -f dist/server.cjs && echo "build exists"
```

Confirm `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, port availability, and write permissions for persistent directories.

### A converted video is blank or remains in processing

- Verify `ffmpeg -version` and `ffprobe -version` work for the same operating-system user running the LMS.
- Check the application logs for the conversion error.
- Ensure `VIDEO_FILES_DIR` is writable and persistent.
- Re-upload conversions marked as interrupted after a process restart.

### A PDF over 50 MB cannot be stored

- Verify `gs --version` works for the application user.
- The source may already be highly compressed; the upload is rejected if the output remains over 50 MB.
- Optimize scanned pages externally or split the PDF before retrying.

### Browser/API requests fail after deployment

- Set `APP_URL` to the exact HTTPS origin used in the browser.
- Ensure the reverse proxy forwards to the configured `PORT`.
- Rebuild after frontend changes and restart with updated environment variables.

### The Mon Language tab does not load

- Confirm the browser and server network can reach `https://the-mon-language.web.app/`.
- Confirm the production `frame-src` Content Security Policy still includes `https://the-mon-language.web.app`.
- Use **Open in new tab** to distinguish an upstream availability problem from an iframe/CSP problem.

## Notable third-party data and acknowledgments

- Language Quest was informed by the concepts and interface patterns in [sanidhyy/duolingo-clone](https://github.com/sanidhyy/duolingo-clone), licensed under MIT. Its Spanish seed curriculum was adapted from [TaoMonLae/duolingo-clone](https://github.com/TaoMonLae/duolingo-clone). The complete attribution and license text are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Optional Language Quest speech uses [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), licensed under Apache-2.0. Kokoro and its model weights are installed separately and are not bundled in this repository.
- The six CEFR vocabulary courses adapt the MIT-licensed vocabulary sets from [AyeNyeinSan22/linguify](https://github.com/AyeNyeinSan22/linguify); attribution and license text are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Sudoku is adapted from [super-sudoku](https://github.com/TN1ck/super-sudoku) by Tom Nick under the MIT License.
- English definitions use [WordPOS](https://github.com/moos/wordpos) and Princeton WordNet 3.1.
- English-to-Myanmar translations originate from the ornagai/MZ dictionary dataset; its data license is not independently verifiable, so it is retained for internal, non-commercial school use with provenance documented in `prisma/seedEnMyDictionary.ts`.
- Mon dictionary entries come from [MonDictDB](https://github.com/Barnista/MonDictDB) under the MIT License.
- Chinese dictionary entries come from [CC-CEDICT](https://cc-cedict.org) under a Creative Commons Attribution-ShareAlike license; attribution and provenance notes are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `prisma/seedChineseDictionary.ts`.
- Project Gutenberg search/import uses the public [Gutendex](https://github.com/garethbjohnson/gutendex) service and downloads selected public-domain books on demand.

Review the upstream licenses and the source notes before redistributing third-party data.

## License and support

MRLC LMS is open-source software released under the [MIT License](LICENSE).
You may use, copy, modify, and distribute the project's original code subject
to the license terms.

Third-party components, course material, and datasets remain under their
respective licenses and are not relicensed under MIT. Review
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before redistributing the
repository or its bundled data.

For deployment details, see [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md). For project-specific issues, use the repository issue tracker or contact the MRLC development team.

© 2026 Mon Refugee Learning Centre
