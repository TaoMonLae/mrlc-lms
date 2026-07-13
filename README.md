# MRLC LMS — Mon Refugee Learning Centre

> A comprehensive Learning Management System for the Mon Refugee Learning Centre (GED School)

**Developed by Tao Mon Lae**

---

## Overview

MRLC LMS is a full-featured, single-school Learning Management System designed specifically for the Mon Refugee Learning Centre. It provides a complete digital platform for managing students, teachers, classes, subjects, attendance, homework, examinations, digital library resources, physical book catalog with borrowing management, fee tracking (with discounts and partial payments), student conduct/discipline tracking, case management, announcements, GED readiness tracking with gamified student engagement (streaks & badges), a curated news digest, a community Social Space with moderation, built-in Sudoku and Snake games (the latter with a vocabulary-learning mode and class leaderboards), role-based access control, and configurable school branding.

The application is built as a unified Node.js/Express server that serves both the API and the compiled Vite/React frontend, backed by a PostgreSQL database managed through Prisma ORM.

**Server:** `http://localhost:8000` (configurable via `PORT` environment variable)

---

## Features

### Core Functionality

| Module | Description |
|--------|-------------|
| **User Management** | Role-based access for Admin, Teacher, Student, Librarian, HR, and Finance users with granular permissions |
| **Student Management** | Comprehensive student profiles, enrollment tracking, and academic history |
| **Teacher Management** | Teacher profiles, class assignments, and workload tracking |
| **Class Management** | Class creation, enrollment, teacher assignment, and scheduling |
| **Subject Management** | Subject catalog with prerequisites and difficulty levels |
| **Attendance** | Daily and session-based attendance tracking with reporting, analytics, and bulk marking |
| **Homework** | Assignment creation, submission tracking, on-time scoring, and gradebook sync |
| **Examinations** | Exam creation, scheduling, reusable question bank, advanced proctoring (lockdown browser, accommodations, invigilator dashboard), and automated + manual grading |
| **Gradebook** | Student progress tracking, grade reports, and performance analytics |
| **GED Readiness & Engagement** | Per-subject mastery tracker (6-stage readiness pipeline tied to real exam performance), attendance streaks, and achievement badges to keep students motivated |
| **Flashcards** | Teacher-authored study decks with class assignment, deck sharing/cloning between teachers, and four student study modes (classic flip cards with mastery tracking, quiz with multiple question types, matching game, and spelling practice) |
| **Digital Library** | E-book (EPUB/PDF) collection with resume-reading position, in-book search, highlights, in-book dictionary lookup, batch upload with auto metadata/cover extraction, one-click Project Gutenberg import, and a full-page reading mode |
| **Dictionary** | Offline English dictionary (definitions, parts of speech, examples, synonyms) plus English-to-Myanmar and English/Myanmar/Thai-to-Mon translations, with no internet required |
| **Physical Library** | Book catalog, borrowing system, and due date management |
| **Fee Management** | Manual fee charges with optional discounts and partial payments (plus an optional bulk Fee Structures / Assign Fees workflow), balance top-ups, QR-verifiable receipts, and a Fees dashboard that correctly shows Paid/Partial/Unpaid |
| **Financial Management** | Income/expense tracking, budget vs. actual reporting, monthly finance summaries, expense management, and donor/donation tracking with PDF/Excel export |
| **Conduct & Discipline** | Handbook-derived rule catalog with severity tiers, per-student violation logging by teachers/admin/case workers, and per-student/per-rule violation counts |
| **Case Management** | Student case notes, interventions, and follow-up tracking |
| **Announcements** | School-wide announcements with rich text and media support |
| **Timetable** | Class scheduling with conflict detection and calendar view, including a per-class view on the Class Profile page |
| **Reports** | Comprehensive reporting across all modules with export options |
| **Settings** | School branding, system configuration, and backup management |

### Specialized Features

- **Flashcards**: Teachers build decks (with LaTeX math and image support) and assign them to classes; students study via classic flip cards, a quiz mode (multiple choice, true/false, fill-in-the-blank with configurable question types), a timed matching game (with difficulty/size presets), and a spelling mode using browser speech synthesis. Includes per-card mastery tracking, attempt history with personal bests, teacher-facing progress dashboards, CSV import/export, and deck sharing/cloning between teachers
- **AI Assistant**: Built-in AI assistant for Admins and Teachers with quick prompts for lesson planning, quiz generation, announcement drafting, and multi-language translation (English/Mon/Burmese)
- **Chat System**: Real-time messaging with typing indicators, presence, sticker support, and a message-reporting/moderation queue for admins
- **Social Space**: 24-hour ephemeral community feed (photos and text) with likes, comments (editable by their author), cursor-paginated "Load more", and a post/comment reporting + admin moderation queue
- **Conduct & Discipline**: A rule catalog transcribed from the school handbook (with severity tiers), so teachers/admin/case workers can log which rule a student broke and see running per-student violation counts instead of relying on free-text case notes
- **Sudoku**: A built-in, fully offline Sudoku game — five difficulties, hints, notes, undo/redo, keyboard shortcuts, and a custom puzzle creator with uniqueness checking. A native port of the open-source [super-sudoku](https://github.com/TN1ck/super-sudoku) project by Tom Nick (MIT licensed) — see **Acknowledgments** below
- **Snake**: A built-in Snake game with two modes — a Classic mode (adjustable board size and speed, high-score tracking) and a Vocabulary mode where each food item is a dictionary word that's spoken aloud and shown with its definition as you collect it. Keyboard (arrows/WASD), on-screen D-pad for touch devices, pause/resume, per-mode high scores, and class leaderboards backed by the student's account so scores and words-learned persist across sessions
- **Dictionary**: Search any English word for its definitions (grouped by part of speech), example sentences, synonyms, a Myanmar (Burmese) translation, and matching Mon dictionary entries where available — or paste a Mon word directly to see its English/Myanmar/Thai definitions and IPA pronunciation. Daily "Word of the Day" and recent-search history, backed entirely by offline data, so it works with no internet connection. See **Acknowledgments** below
- **News & Daily Digest**: Curated multi-source RSS feed (world, tech, education, and Myanmar-focused independent outlets) with a clean in-app reading view
- **Video Management**: Educational video library with categories, captions, and required-viewing tracking
- **Document Management**: Secure document generation and printing
- **Lesson Planner**: Teacher lesson planning and resource management
- **Admissions**: Student application and enrollment workflow
- **HR, Payroll & Leave**: Staff directory with departments/designations, monthly payroll, and leave request/approval workflow
- **Financial Management**: Comprehensive financial dashboard with income/expense tracking, budget vs. actual reporting, monthly finance summaries, expense management, and donor/donation tracking with PDF and Excel export
- **Bank Integration**: Fee payment tracking and reconciliation
- **Global Search**: Cross-module search with deep links into students, classes, exams, and more

### Multi-Language Support

The LMS includes built-in internationalization (i18n) with support for:

- **English** (`en.po`) – Default language
- **Burmese** (`my.po`) – မြန်မာ
- **Mon** (`mnw.po`) – ဘာသာမန်

Adding new languages is straightforward—simply add a `.po` file to `src/i18n/locales/` and the system will automatically register it. The default language can be configured in **Settings → System Settings → Language**.

---

## Recent Updates

### Latest Features & Improvements

**Dictionary (NEW)**
- Offline English dictionary, backed by the bundled WordNet database — no internet connection needed for a lookup
- Definitions grouped by part of speech, with example sentences, clickable synonyms, a "Word of the Day," and recent-search history
- English-to-Myanmar translations alongside the English definition, from an offline dataset (Zawgyi-encoded source text converted to standard Unicode) — see **Acknowledgments** for the licensing caveat on this data
- Mon dictionary: search an English word to see matching Mon entries, or paste a Mon word directly to see its IPA pronunciation and definitions in English, Myanmar, and Thai — 21,000+ Mon headwords, cleanly MIT-licensed

**E-Library improvements**
- Resume reading: both the PDF and EPUB readers now pick up where you left off automatically
- In-book search across the whole book, jump straight to a match
- Highlight passages while reading; Teachers/Admins can turn a highlight straight into a flashcard in one of their decks
- Select any word while reading to see its definition (English/Myanmar/Mon) in a popup, without leaving the book — works in full page (fullscreen) reading mode too
- Multi-file batch upload with auto-detected title/author/cover per file, sorting and category filters, and a "Continue Reading" strip on the library home
- Import free public-domain books directly from Project Gutenberg by title/author search — one click downloads the EPUB and cover and adds it to the library. Admins/Teachers/Librarians only, via "Import from Gutenberg" on the E-Library page — see **Acknowledgments**
- A full-page reading mode, and a fix for the table-of-contents dropdown overflowing into the page controls
- The Dictionary and the E-Library's in-book Define lookup are both usable without signing in

**Fee Management overhaul**
- Manual fee charges can now be recorded directly against a student with an optional discount and an optional partial payment — no separate Fee Structure required
- A "Pay Balance" / "Record Additional Payment" action lets staff top up a partially-paid charge until it's fully settled
- Receipts and student fee statements now show Amount Due, Amount Paid, Discount, and Balance separately, plus a real Paid/Partial/Unpaid status
- Fee Structures (the optional bulk-billing workflow) got working "Add Item", "Add Discount", and "Create Plan" forms, per-item delete, and an Archive action, plus an "Assign Fees" safeguard against structures with no items
- Fixed a structural bug where Unpaid/Partial fees could never appear in the Fees dashboard or Fee Collection report

**Conduct & Discipline (NEW)**
- Rule catalog transcribed from the school's own Rules, Regulations & Hostel Guidelines handbook, with severity tiers (Minor/Moderate/Serious)
- Teachers, admin, and case workers can log which rule a student broke, with a running per-student/per-rule violation count

**Social Space improvements**
- Reporting: any user can flag a post or comment; admins get a Reports queue with Remove/Dismiss actions
- Cursor-based pagination ("Load more") instead of fetching the entire feed on every load and poll
- Comments can now be edited by their author (with an "(edited)" indicator), not just deleted

**Sudoku (NEW)**
- A native, fully offline Sudoku game — five difficulties, hints, notes, undo/redo, keyboard shortcuts, and a custom puzzle creator
- Ported from the open-source [super-sudoku](https://github.com/TN1ck/super-sudoku) project (MIT licensed) — see **Acknowledgments**

**Snake Game (NEW)**
- Two modes: **Classic** (grow the snake, avoid walls and yourself) and **Vocabulary** (each food is a dictionary word, spoken aloud with its definition shown as you collect it — words are pulled from the English–Myanmar dictionary)
- Classic mode adds selectable board size (Small/Medium/Large) and speed (Slow/Normal/Fast), with per-mode high scores saved locally
- Vocabulary scores, words-learned, and game stats persist to the student's account (`SnakeGameScore` table) and feed class leaderboards and a progress panel
- Controls: Arrow keys / WASD, Space to pause and resume, and an on-screen D-pad on touch devices
- Reworked the movement engine to use a buffered turn queue — fixes instant-death on 180° reversals and false self-collisions when following your own tail, and stops fast perpendicular turns from being dropped
- Canvas rendering hardened: device-pixel-ratio scaling for crisp visuals, a `roundRect` fallback for older browsers, immediate redraw on resize/board-size change, and a width cap so the board fits the viewport
- Fixed a bug where opening the Vocabulary game logged the user out — its API routes now run through auth middleware, so a logged-in user gets real data instead of a 401 that tripped the global session interceptor

**Other fixes**
- Teacher ↔ Subject assignment (previously a misleading text field that didn't actually link them)
- Per-class Timetable view on the Class Profile page
- Chat messages intermittently disappearing (a stale-response race condition)
- Fee record / student dropdowns not loading for the Accountant role
- A spurious "failed to load" error flashing on student sign-in
- Print/PDF output not matching the on-screen preview for reports and receipts
- Documents page gained working Delete and Cancel actions

**Flashcards**
- Teacher-managed study decks assigned to one or more classes, with a Community tab for sharing/cloning decks between teachers
- Four student study modes: classic flip cards, quiz (multiple choice, true/false, fill-in-the-blank — mix and match question types), a matching game with Easy/Medium/Hard/Expert size presets, and a spelling mode with text-to-speech
- Per-card mastery tracking ("still learning" vs. "know it"), attempt history with personal bests, and a teacher-facing progress dashboard per deck
- Rich cards support LaTeX math and image attachments; CSV import/export for quick deck authoring

**AI Assistant**
- Built-in AI assistant for Admins and Teachers
- Quick prompt templates for lesson planning, quiz generation, announcements, and translation
- Multi-language support (English, Mon, Burmese)
- Floating panel design coordinated with chat system

**Enhanced Financial Management**
- Comprehensive financial dashboard with real-time metrics
- Income and expense tracking with detailed reporting
- Budget vs. Actual analysis with visualizations
- Monthly finance summaries with trend analysis
- Expense management with edit/delete capabilities
- Donor and donation tracking
- PDF and Excel export for all financial reports

**UI/UX Improvements**
- Fixed widget overlapping issues (AI Assistant and Chat widgets)
- Enhanced mobile responsiveness across all pages
- Improved dark mode contrast and readability
- Floating panel system for better space management
- Consistent PDF layouts across reports and receipts

**Production Readiness**
- Enhanced security configurations
- Improved error handling and logging
- Database backup management
- Environment variable validation
- Production deployment optimizations

---

## Tech Stack

- **Frontend**: React 19 · Vite 6 · TypeScript · Tailwind CSS v4 · Radix UI · Lucide Icons · Motion (animations) · Sonner (toast notifications)
- **Backend**: Express 4 · Node.js · Winston logging · JWT authentication
- **Database**: PostgreSQL · Prisma 7 ORM
- **File Processing**: Multer (uploads) · epubjs (e-books) · react-pdf (PDFs)
- **Security**: Helmet · CORS · Express rate-limiting · bcrypt password hashing · DOMPurify (XSS prevention)
- **Build Tools**: esbuild (server bundle) · Vite (client bundle)

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** database server

### Installation

1. **Clone and setup environment**
   ```bash
   git clone <repository-url>
   cd mrlc-lms
   cp .env.example .env
   ```

2. **Configure environment variables**
   Edit `.env` and set at minimum:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/school_lms"
   SESSION_SECRET="a-random-string-at-least-16-characters"
   ```
   
   > **Important**: `SESSION_SECRET` must be 16+ characters or the server will refuse to start. Generate with: `openssl rand -base64 48`

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Setup database**
   ```bash
   # Apply migrations and generate Prisma client
   npx prisma migrate deploy
   npx prisma generate
   
   # Create starter accounts (first run only)
   npm run seed

   # Optional: load the English-to-Myanmar dictionary data (first run only, ~27k words)
   npm run seed:en-my-dictionary

   # Optional: load the Mon dictionary data (first run only, ~21k words)
   npm run seed:mon-dictionary
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open **http://localhost:8000**

### Seeded Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mrlc.edu | admin123 |
| Teacher | teacher@mrlc.edu | teacher123 |
| Student | student@mrlc.edu | student123 |

> **Note**: A **Librarian** user can be created from Users → Create User to access the Book Catalog features.

---

## Deployment

### Docker Deployment (Recommended)

The fastest way to deploy the complete stack (application + database):

```bash
# First run — builds containers and creates starter accounts
SEED_ON_START=true docker compose up --build

# Subsequent runs
docker compose up
```

See **DOCKER.md** for detailed deployment instructions.

### Production Build (Without Docker)

```bash
# Build client and server bundles
npm run build

# Start production server
NODE_ENV=production npm run start
```

**Production requirements:**
- Set `NODE_ENV=production`
- Configure production `DATABASE_URL` and `SESSION_SECRET`
- The production server serves static assets from `dist/`

### Useful Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundles (client + server) |
| `npm run start` | Run production build |
| `npm run seed` | Create starter admin/teacher/student accounts |
| `npm run lint` | Type-check with TypeScript compiler |

---

## Security Features

- **Authentication**: JWT-based auth with secure token storage
- **Authorization**: Server-side role checks on all protected endpoints
- **Password Security**: bcrypt hashing with salt rounds
- **XSS Protection**: DOMPurify sanitization on all user-generated content
- **Rate Limiting**: Configurable rate limits on sensitive endpoints
- **Secure Headers**: Helmet middleware for security headers
- **CORS**: Configurable cross-origin resource sharing
- **Proxy Support**: `trust proxy` enabled for reverse proxy deployments

---

## Project Structure

```
mrlc-lms/
├── src/
│   ├── pages/          # Route components (student, teacher, admin, etc.)
│   │   ├── games/sudoku/  # Sudoku UI (board, menus, contexts) — see Acknowledgments
│   │   ├── games/snake/   # Snake game UI (classic + vocabulary modes, context, leaderboard)
│   │   ├── dictionary/    # Dictionary search page — see Acknowledgments
│   │   └── elibrary/      # E-Library reader (PDF/EPUB, progress, search, highlights)
│   ├── lib/            # App-specific API clients, utilities, helpers
│   │   └── sudoku/     # Sudoku engine (solvers, generator, puzzle data access)
│   ├── i18n/           # Internationalization files (.po)
│   ├── hooks/          # Custom React hooks
│   ├── providers/      # Context providers
│   └── types/          # TypeScript type definitions
├── lib/                # Shared utilities (imported as @/lib/*), e.g. badge catalog, GED constants
├── components/         # Shared/reusable UI components (imported as @/components/*), incl. shadcn/ui primitives
├── hooks/              # Shared hooks (imported as @/hooks/*)
├── prisma/
│   ├── schema.prisma   # Database schema
│   ├── migrations/     # Database migration files
│   └── seed.ts         # Seed script for starter accounts
├── public/
│   ├── stickers/       # Built-in sticker packs for chat
│   └── sudokus/        # Sudoku puzzle data files, by difficulty
├── data/               # Runtime data directory (uploads, backups, etc.)
├── deploy/             # Deployment configurations
├── server.ts           # Express server entry point (core API routes)
├── examBank.ts         # Reusable question bank (question pooling, randomized composition)
├── examPhase2.ts       # Advanced exam features (lockdown browser, accommodations, rubrics, invigilator dashboard)
├── flashcards.ts       # Flashcards feature (decks, study modes, mastery/attempts, sharing, image uploads)
├── conduct.ts          # Conduct/Discipline feature (rule catalog, violation logging)
├── snakeGame.ts        # Snake game API (vocabulary words, score saving, leaderboards, progress)
├── dictionary.ts       # Offline English dictionary (WordNet lookup) — see Acknowledgments
└── news.ts             # News/daily digest RSS aggregation
```

> Note: `@/*` resolves to the project root (see `tsconfig.json` / `vite.config.ts`), so both `src/` and the root-level `lib/`, `components/`, `hooks/` directories are reachable via the `@/` alias.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | — | Secret for signing JWT tokens (≥16 chars) |
| `APP_URL` | No | `http://localhost:8000` | Public origin for CORS |
| `PORT` | No | `8000` | Server listening port |
| `EBOOK_DIR` | No | `./data/ebooks` | E-book storage location |
| `VIDEO_FILES_DIR` | No | `./data/videos` | Uploaded and transcoded lesson-video storage |
| `BACKUP_DIR` | No | `./data/backups` | Database backup location |
| `BACKUP_RETENTION` | No | `14` | Number of backups to retain |
| `BACKUP_HOUR` | No | `2` | Hour for daily backup (0-23) |

### Backup Configuration

Automatic database backups can be enabled in **Settings → System Settings**. Backups use `pg_dump` and are stored in `BACKUP_DIR` with retention based on `BACKUP_RETENTION`.

---

## Acknowledgments

The built-in **Sudoku** game (`src/pages/games/sudoku/`, `src/lib/sudoku/`) is a native port of [**super-sudoku**](https://github.com/TN1ck/super-sudoku) by **Tom Nick** (TN1ck), used and adapted under the MIT License:

> Copyright (c) Tom Nick.
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction, subject to the MIT License terms in the upstream repository.

The puzzle generator, solvers, and core game logic were ported closely to the original; the surrounding UI chrome (theming, layout, and internationalization) was adapted to fit natively into MRLC LMS.

The built-in **Dictionary** (`/dictionary`) is powered by [**WordPOS**](https://github.com/moos/wordpos) and the [**Princeton WordNet 3.1**](https://wordnet.princeton.edu/) database (via the `wordnet-db` package), bundled as an offline dependency so lookups work with no internet connection. WordNet is distributed under its own permissive license:

> This software and database is being provided to you, the LICENSEE, by Princeton University under the following license. By obtaining, using and/or copying this software and database, you agree that you have read, understood, and will comply with these terms and conditions: Permission to use, copy, modify and distribute this software and database and its documentation for any purpose and without fee or royalty is hereby granted, provided that you agree to comply with the following copyright notice and statements, including the disclaimer, and that the same appear on ALL copies of the software, database and documentation, including modifications that you make for internal use or for distribution.

The Dictionary's **English-to-Myanmar translations** were imported from the [**ornagai-V2**](https://github.com/saturngod/ornagai-V2) project by Htain Lin Shwe (MIT-licensed code), whose own README states its word list was originally sourced from a separate "MZ dictionary" product. That means, unlike WordNet above, **this translation data does not carry a clean, verifiable open license of its own** — it's included here as an internal, non-commercial school tool with that provenance on record, not as freely-licensed content. See `prisma/seedEnMyDictionary.ts` for the full note. The source data was also Zawgyi-encoded (the pre-2019 de facto Myanmar font encoding); it was converted to standard Unicode using the Z2U rule table from Google's [**myanmar-tools**](https://github.com/googlei18n/myanmar-tools) project, Apache License 2.0.

The Dictionary's **Mon dictionary data** (21,086 Mon headwords with IPA pronunciation and English/Myanmar/Thai definitions) was imported from [**MonDictDB**](https://github.com/Barnista/MonDictDB) by Barnista, MIT License, Copyright (c) 2025 Barnista — a purpose-built, contributor-authored Mon dictionary, not sourced from a third-party commercial product. Unlike the English-to-Myanmar data above, this dataset carries a clean, verifiable open license. See `prisma/seedMonDictionary.ts` for the import notes.

The E-Library's **"Import from Gutenberg"** feature (`gutenberg.ts`) searches and downloads books via [**Gutendex**](https://github.com/garethbjohnson/gutendex) (`gutendex.com`), a free, public, read-only API over [**Project Gutenberg**](https://www.gutenberg.org)'s own catalog of 70,000+ books. Unlike the datasets above, nothing from Gutenberg is bundled with the app — books are fetched live, on demand, only when an admin/teacher/librarian explicitly chooses to import one, directly from Project Gutenberg's own servers. Every book in Project Gutenberg's US catalog is in the public domain, so imported books carry no licensing caveat.

These are the only third-party-derived components in the app — everything else in this repository is covered by the license below.

---

## Support & Contributing

For issues, questions, or contributions related to MRLC LMS, please refer to the project repository or contact the development team.

---

**License:** All rights reserved (except the Sudoku module noted under Acknowledgments, which remains MIT licensed)

**Developed by Tao Mon Lae**

© 2026 Mon Refugee Learning Centre
