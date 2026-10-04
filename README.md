<p align="center">
  <img src="public/icon-192.png" alt="Mon Refugee Learning Centre school logo" width="112" height="112" />
</p>

<h1 align="center">MRLC LMS</h1>
<p align="center"><strong>Mon Refugee Learning Centre · GED School · Malaysia</strong></p>
<p align="center">A full-stack platform for learning, assessment and school operations.</p>
<p align="center">
  <a href="#latest-updates">Latest updates</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#local-development">Local development</a> ·
  <a href="#testing-and-quality">Testing</a> ·
  <a href="#deployment-and-operations">Deployment</a> ·
  <a href="#documentation">Documentation</a>
</p>

MRLC LMS brings teaching, student records, assessment, communication, finance and administration into one role-based application. It supports the daily work of a school serving refugee learners in Malaysia, alongside a separate public Learning Quest experience.

**Designed and developed by [Tao Mon Lae](https://github.com/TaoMonLae).**

![MRLC school login portal](docs/images/mrlc-lms-webapp-preview.jpg)

## Latest updates

**October 3, 2026 · Notifications and reliability**

| Area | Current changes |
| --- | --- |
| Notification settings | A dedicated `/notifications/settings` page with in-app and email delivery controls, role-appropriate topics, save/discard actions and retry feedback. |
| Teacher communication | Preferences cover personal payroll updates, class and timetable changes, announcements and app releases. Email is opt-in and requires configured SMTP. |
| Delivery consistency | Disabled topics are excluded from the bell and unread count. Queued notification emails are checked again before sending. Video lesson reminders use the shared delivery service. |
| Account protection | Active sessions are checked against current account status and role. MFA recovery codes are consumed atomically to prevent concurrent reuse. |
| Interface accessibility | Mobile notification access, stronger text contrast, readable password recovery in dark mode and named timetable filters. |
| Application reliability | Improved async API error handling, email retry bookkeeping and JSON 404 responses for unknown API routes. |
| AI removal | The AI Assistant, its API and AI question-generation action have been removed. Manual exam authoring, question banks and school chat remain available. |

The October 2 Exam Studio, student exam review and navigation improvements remain part of the application. See the [module audit and verification record](docs/qa/module-audit-2026-10-03.md) for the scope, evidence and remaining limitations of the latest work. The in-app **What's New** content is maintained in [src/data/releases.ts](src/data/releases.ts).

## Platform capabilities

| Domain | Capabilities |
| --- | --- |
| Teaching and assessment | Classes, subjects, homework, classwork, exams, question banks, accommodations, grading, gradebook, attendance and timetables. |
| Learning Quest | Language courses, K–12 Mathematics, GED preparation, guided practice, mastery reviews, classroom progress and completion certificates. |
| Learning resources | Flashcards, video lessons and activities, physical-library records, PDF/EPUB/comic readers and dictionaries. |
| Student and family support | Student records, private documents, linked guardian access, interventions, conduct and case management. |
| Finance and people operations | Fees, payments, discounts, expenses, budgets, donations, staff, leave and payroll. |
| Communication | Announcements, chat, school social features and configurable in-app/email notifications. |
| Administration | Role permissions, school settings, branding, reports, audit records, exports, system health and backup tools. |
| Practice and engagement | Vocabulary activities and games with school-, class- and student-level access and time controls. |

The interface supports **English, Burmese and Mon**. Permissions are enforced at API boundaries as well as in navigation. Public learners use an explicit route/API allowlist, and guardian access is restricted to the family experience.

Visitors can browse published courses at `/language-quest`; an account is required to save learning progress. School users access Learning Quest at `/games/language-quest`.

## Architecture

The application is organized as a single Node.js service with a React frontend and PostgreSQL persistence. Express serves the APIs, integrates Vite during development, and serves the compiled frontend in production. Domain route modules and shared libraries separate functionality from the central server entry point. Socket.IO and server-sent events support real-time features.

| Layer | Implementation |
| --- | --- |
| Web client | React 19, TypeScript, React Router, Vite and Tailwind CSS |
| UI and interaction | Shared UI components, Lucide icons, Motion and theme-aware styles |
| Application server | Node.js, Express 4, request validation with Zod, Socket.IO and server-sent events |
| Persistence | PostgreSQL, Prisma ORM and versioned migrations |
| Authentication | Signed tokens, persisted sessions, role/permission checks, optional MFA and recovery codes |
| Email | Nodemailer, a persisted outbox, bounded retries and notification preferences |
| Media and documents | Sharp, PDF tooling, FFmpeg/ffprobe and Ghostscript; persistent file storage |
| Verification | Node.js unit/integration tests, Playwright browser tests and Axe accessibility checks |

Business writes and their notifications use database transactions where implemented. Email delivery runs through the outbox after commit. Delivery retries are not an exactly-once guarantee across SMTP acceptance and process/database failures. Payroll emails link users to their own payslips without including pay amounts.

### Repository layout

```text
src/                  Application routes, pages, providers and client utilities
components/           Shared UI primitives and application blocks
shared/               Client/server contracts, validation and domain logic
lib/                  Server services and operational helpers
server.ts             Express entry point, middleware and core API routes
*Routes.ts, *.ts       Additional domain API and game modules
prisma/               Database schema, migrations and seed data
curricula/            Learning Quest curriculum data and source attribution
public/               Static assets and school branding
scripts/              Build, validation, data-generation and operational scripts
tests/                Unit, integration and browser regression suites
deploy/               Host, reverse-proxy and deployment configuration
docs/                 Feature references, operations, design and audit records
```

## Local development

### Requirements

- **Node.js 22.22 or newer**, as declared in `package.json`, and npm.
- A PostgreSQL database. The supplied Compose configuration targets **PostgreSQL 16**; the October 3 isolated integration audit also ran on PostgreSQL 17.
- Writable, persistent storage for uploaded files and backups.
- FFmpeg/ffprobe for video conversion, Ghostscript for PDF compression, and a compatible `pg_dump` client for database backups. These tools are required for their respective features.

### Install and configure

For a new checkout:

```bash
git clone https://github.com/TaoMonLae/mrlc-lms.git
cd mrlc-lms
cp .env.example .env
```

Create a local PostgreSQL database and configure `.env` before starting the application:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/school_lms"
SESSION_SECRET="replace-with-a-long-random-secret"
APP_URL="http://localhost:8000"
PORT="8000"
```

Generate a signing secret with `openssl rand -base64 48`. Keep credentials out of version control. [.env.example](.env.example) documents email, storage, backup and optional speech configuration.

```bash
npm ci
npx prisma migrate deploy
npm run seed
npm run dev
```

`npm ci` generates the Prisma client through the postinstall script. Open [localhost:8000](http://localhost:8000) after the server starts.

The seed is intended for initial setup and includes starter accounts/data. Configure `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD` and `SEED_STUDENT_PASSWORD` before using it outside an isolated development environment. Review [starter accounts](docs/FEATURES_AND_OPERATIONS.md#starter-accounts) and the seed script before running it against an existing database; seeding is not part of a routine upgrade.

Dictionary datasets are loaded separately with `seed:en-my-dictionary`, `seed:mon-dictionary` and `seed:chinese-dictionary`. Review the associated attribution and distribution terms before importing or redistributing them.

### Configuration boundaries

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by the application and Prisma CLI |
| `SESSION_SECRET` | Signing secret for authentication tokens |
| `APP_URL` | Public application origin for browser access and generated links; use HTTPS in production |
| `SMTP_*` | Sender and transport configuration for password recovery and opted-in notification email |
| Storage directory variables | Persistent locations for uploads, books, videos, documents and other assets |
| `BACKUP_DIR`, `BACKUP_RETENTION`, `BACKUP_HOUR` | Backup location, retention and daily schedule; automatic backups must also be enabled in Settings |
| `OFFSITE_BACKUP_DIR` | Optional second storage location for backup copies |
| `KOKORO_API_URL` | Optional local Learning Quest speech service; browser speech remains the fallback |

Notification settings are available from navigation, the notification bell and the account profile. Topic choices affect both delivery channels. Without SMTP configuration, queued mail cannot be delivered; in-app notifications remain independently configurable. See [teacher notifications and email delivery](docs/TEACHER_NOTIFICATIONS.md).

## Testing and quality

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the application with the development frontend |
| `npm run lint` | Check TypeScript with `tsc --noEmit`; this is not a separate ESLint pass |
| `npm run test:unit` | Run unit tests with Node.js and the TypeScript loader |
| `npm run test:e2e` | Run configured desktop/mobile Playwright projects |
| `npm run build` | Compile the frontend, optimize deployed icon copies and bundle the server |
| `npm start` | Run `dist/server.cjs` in production mode |
| `npm run audit:prod` | Audit production dependencies for known vulnerabilities |

Playwright requires a browser installation, such as `npx playwright install chromium`, or `PLAYWRIGHT_EXECUTABLE_PATH` pointing to a compatible Chromium binary. Some browser suites mock APIs; authentication/administration suites require a seeded test server. Integration suites are opt-in through their documented `*_TEST_*` environment variables and must use a disposable database and upload directories.

The **October 3, 2026 audit** recorded **406 unit tests, 29 database integration tests and 313 browser checks passed**, with three intentional mobile skips. TypeScript, the production build and Prisma schema validation also passed. These are dated audit results, not a guarantee for subsequent changes or a substitute for deployment verification.

The production dependency audit reported zero known vulnerabilities on that date. Seven high findings remained in a development-only dependency chain rooted in `braces`; details and verification limits are recorded in the [audit report](docs/qa/module-audit-2026-10-03.md).

## Deployment and operations

Use a Node.js runtime satisfying `package.json`, a PostgreSQL database, an HTTPS reverse proxy and persistent storage. The Express application serves both the API and built client.

Search discovery includes an XML sitemap, robots.txt and page-specific metadata for public pages. Set `APP_URL` to the production origin and follow the [SEO deployment and Search Console checklist](docs/SEO.md) after publishing.

**Deployment template compatibility:** the current `Dockerfile` and Ubuntu automation still target Node.js 20. Align those files with the application's Node.js 22.22+ requirement before using them with this dependency set. The [deployment guide](deploy/DEPLOYMENT.md) remains useful for host and proxy configuration, but its older runtime instructions must be adjusted.

For an existing PM2 deployment, after backing up the database and persistent files and updating the checkout:

```bash
npm ci
npx prisma migrate deploy
npm run build
pm2 restart mrlc-lms --update-env
pm2 status
```

For the first start:

```bash
NODE_ENV=production pm2 start dist/server.cjs --name mrlc-lms --update-env
pm2 save
```

Set `APP_URL` to the public HTTPS origin and validate `/api/health`, sign-in, role access and storage permissions after deployment. If email is enabled, verify delivery with designated test accounts. The existing `20261003120000_teacher_notifications` migration is required for category preferences and delivery deduplication; the October 3 audit changes do not add another migration.

Deploy the **entire `dist/` directory, including `.server/`**. The private curriculum bundle is required at runtime, and a `dist/*` shell copy can omit it. A manual installation also needs production dependencies, Prisma-generated artifacts, configuration and persistent storage. `.build-debug/` contains local debugging artifacts and is not a runtime requirement.

Keep uploads and backups outside disposable build output. Database backups do not replace backups of uploaded files. Verify restoration in an isolated environment and review migration compatibility before rolling back application code. See [persistence](docs/FEATURES_AND_OPERATIONS.md#persistence), [backups](docs/FEATURES_AND_OPERATIONS.md#backups) and [troubleshooting](docs/FEATURES_AND_OPERATIONS.md#troubleshooting).

## Interface previews

Screenshots use demonstration or test data. The notification settings capture is from October 3, 2026; the exam and school captures are from October 2. Branding and school imagery remain configurable.

### Notification settings

![Notification settings with delivery channels and teacher topics](docs/qa/assets/notification-settings-desktop-light-2026-10-03.png)

### Exam Studio

![Exam Studio with an outline, question editor and student preview](docs/images/exam-studio.jpg)

### Student exam experience

![Student exam preview with question navigation and answer controls](docs/images/student-exam-preview.jpg)

<details>
<summary>School and developer profiles</summary>

![MRLC school information page](docs/images/about-school.jpg)

![Developer profile](docs/images/about-developer.jpg)

</details>

## Documentation

| Reference | Contents |
| --- | --- |
| [Features and operations](docs/FEATURES_AND_OPERATIONS.md) | Module details, configuration, media limits, optional services and troubleshooting |
| [Notifications and email](docs/TEACHER_NOTIFICATIONS.md) | Recipients, preferences, delivery behavior, API contract and deployment checks |
| [Module audit](docs/qa/module-audit-2026-10-03.md) | Confirmed fixes, module coverage, tests, design references and remaining limitations |
| [HTTP route inventory](docs/qa/module-route-inventory-2026-10-03.tsv) | Registered API methods, paths and source locations at the audit snapshot |
| [Deployment guide](deploy/DEPLOYMENT.md) | Hosting and reverse-proxy setup; see the runtime compatibility note above |
| [Finance procedures](docs/finance/PROCEDURES-AND-AUDIT.md) | Finance workflows and audit considerations |
| [Production build notes](docs/qa/build-optimization-2026-10-02.md) | Bundle structure and measured build optimizations |
| [In-app release notes](src/data/releases.ts) | Current What's New content and release identifier |
| [Third-party notices](THIRD_PARTY_NOTICES.md) | Upstream attribution, licenses and redistribution requirements |

## Maintainer and contributions

<img src="public/images/about/tao-mon-lae.jpg" alt="Tao Mon Lae, developer of MRLC LMS" width="96" height="96" />

**[Tao Mon Lae](https://github.com/TaoMonLae)** — product designer and full-stack developer, responsible for the application architecture, interfaces and integration of learning and school-operation workflows.

When proposing a change, describe the affected role and workflow, validate permissions at the API boundary, preserve existing data, and run the relevant checks. Include database migrations when the schema changes and update operational documentation when configuration or behavior changes. Update the What's New release identifier only for a new release: it controls per-user acknowledgement and deduplicated teacher app-update notifications.

[Report an issue](https://github.com/TaoMonLae/mrlc-lms/issues) with reproduction steps, expected/actual behavior and sanitized logs. Do not include student records, private documents, credentials or session tokens in public reports.

## License and acknowledgements

Original MRLC LMS code is released under the [MIT License](LICENSE). Third-party components, curricula, imagery and datasets retain their own terms; review [third-party notices](THIRD_PARTY_NOTICES.md) and [data acknowledgements](docs/FEATURES_AND_OPERATIONS.md#notable-third-party-data-and-acknowledgments) before redistribution.

GED preparation content is independently authored using public educator guidance. MRLC Learning Quest is not endorsed by GED Testing Service and does not reproduce official test questions.

© 2026 Tao Mon Lae and Mon Refugee Learning Centre
