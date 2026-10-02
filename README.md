<p align="center">
  <img src="public/icon-192.png" alt="Mon Refugee Learning Centre school logo" width="112" height="112" />
</p>

<h1 align="center">MRLC LMS</h1>
<p align="center"><strong>Mon Refugee Learning Centre · GED School · Malaysia</strong></p>
<p align="center">Learning, assessment and school operations in one connected platform.</p>
<p align="center">
  <a href="#latest-updates">Latest updates</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#documentation">Documentation</a> ·
  <a href="#developer">Developer</a>
</p>

---

MRLC LMS supports the everyday work of a school serving refugee learners in Malaysia. It brings classroom learning, examinations, student support, communication and administration into a role-based web application built around the school community.

**Designed and developed by [Tao Mon Lae](https://github.com/TaoMonLae).**

![MRLC LMS school login portal](docs/images/mrlc-lms-webapp-preview.jpg)

## Latest updates

**October 2, 2026**

| Area | What changed |
| --- | --- |
| **Exam Studio** | A focused authoring workspace with eight question types, a question outline, scheduling and grading settings, adjustable student preview, and clearer save/retry feedback. |
| **Student exams** | A shared question-paper layout for preview and live attempts, numbered navigation, answered/unanswered and flagged states, reading passages, a precise timer, and an answer-review step before submission. |
| **Exam management** | Compact **Manage exam** and **Responses** menus group authoring, scheduling, printing, monitoring, grading and gradebook actions. Studio and Preview remain directly accessible. |
| **Exam reliability** | Fixes to scoring, result release, timing and recovery, alongside focused regression checks. |
| **About page** | Readable typography, section navigation, responsive light/dark layouts, preserved school branding and a developer profile with the verified GitHub photo. |
| **Production builds** | The server entry is approximately **1.75 MiB**, down from roughly 5.2 MiB. Large curriculum data is split into a private chunk; debug maps live outside `dist`; oversized production PNG copies are optimized without changing original artwork. |
| **What's New** | An in-app October release guide introduces the updated teacher and student exam workflows. |

Build sizes are measurements from the development checkout, not a fixed download size. The private curriculum chunk remains part of the deployment; image savings depend on the artwork present. See the [build measurements and verification notes](docs/qa/build-optimization-2026-10-02.md).

## What the platform includes

| Workspace | Capabilities |
| --- | --- |
| **Teaching & assessment** | Classes, homework, exams, question banks, scheduling, grading, accommodations, attendance and timetables. |
| **Learning Quest** | Language learning, K–12 Mathematics, four GED preparation pathways, guided practice, mastery reviews, classroom progress and exam-earned certificates. |
| **Learning resources** | Flashcards, video lessons, an e-library with PDF/EPUB/comic readers, dictionaries and Mon-language learning resources. |
| **Student & family support** | Student records, linked guardian Family Portal, communication and school support workflows. |
| **School operations** | Finance, fees, payroll, documents, reports, permissions, audit records and backup tools. |
| **Practice & engagement** | Daily Learning Quest, vocabulary activities and games with school-, class- and student-level game-time controls. |

The interface supports **English, Burmese and Mon**. Public Learning Quest accounts are restricted to learning routes and APIs; they do not provide access to private school records or administration.

### Learning Quest access

Visitors can browse published courses at `/language-quest`. Starting lessons and saving progress requires an account. Existing school users access the experience through `/games/language-quest`.

## Interface preview

Captured from the current application on October 2, 2026, using demonstration data. Student exam images show the teacher preview; no live student records are included. School images and branding remain configurable.

### Exam Studio

A dedicated outline, question editor and student preview keep authoring in one workspace.

![Exam Studio with a government question and interactive student preview](docs/images/exam-studio.jpg)

### Student exam experience

A focused question paper with numbered navigation, answer controls and a review step.

![Student exam preview with a branch-of-government question and answer navigation](docs/images/student-exam-preview.jpg)

### About the school

Readable school information, section navigation and a compact introduction.

![Redesigned MRLC About page with readable typography and school identity](docs/images/about-school.jpg)

<details>
<summary>View the developer profile</summary>

![Developer profile with Tao Mon Lae's GitHub portrait and project responsibilities](docs/images/about-developer.jpg)

</details>

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Server | Node.js, Express, Socket.IO |
| Database | PostgreSQL with Prisma |
| Media & backups | FFmpeg/ffprobe, Ghostscript, Sharp and PostgreSQL `pg_dump` |
| Deployment | Single application server; Docker Compose or a managed Node.js process such as PM2 |

The Express server serves the API and the built frontend. Uploaded media and backups are stored separately on persistent storage.

## Quick start

### Requirements

- **Node.js 22.22 or newer**, with npm.
- **PostgreSQL 16** for the documented deployment setup.
- Persistent, writable storage for uploads and backups.
- FFmpeg/ffprobe for video conversion, Ghostscript for PDF compression, and a matching PostgreSQL `pg_dump` client for database backups. The supplied Docker image includes these tools.

### Install and configure

```bash
git clone https://github.com/TaoMonLae/mrlc-lms.git
cd mrlc-lms
cp .env.example .env
npm ci
```

Set the following values in `.env` for your local environment:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/school_lms"
SESSION_SECRET="replace-with-a-long-random-secret"
APP_URL="http://localhost:8000"
PORT="8000"
```

Generate a secret with `openssl rand -base64 48`. See [.env.example](.env.example) for email, storage, backup and optional AI/voice settings. Keep real credentials out of version control.

### Prepare the database and run

```bash
npx prisma migrate deploy
npm run seed
npm run dev
```

Open **http://localhost:8000**. The seed creates starter accounts; see [starter accounts](docs/FEATURES_AND_OPERATIONS.md#starter-accounts). Set `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD` and `SEED_STUDENT_PASSWORD` before seeding a production database.

Dictionary datasets can be loaded separately using the `seed:en-my-dictionary`, `seed:mon-dictionary` and `seed:chinese-dictionary` npm scripts. Review their attribution and distribution terms first.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run lint` | Run TypeScript checks (`tsc --noEmit`). |
| `npm run test:unit` | Run unit tests. |
| `npm run test:e2e` | Run Playwright browser tests; requires a compatible browser installation. |
| `npm run build` | Build the frontend, optimize production icon copies and bundle the server. |
| `npm start` | Run the production server from `dist/server.cjs`. |
| `npm run audit:prod` | Check production dependencies for known vulnerabilities. |

## Deployment

Follow the [deployment guide](deploy/DEPLOYMENT.md) for Docker, reverse-proxy and host configuration. Set `APP_URL` to the exact public HTTPS origin.

For an existing PM2 deployment, after updating the checkout:

```bash
npm ci
npx prisma migrate deploy
npm run build
pm2 restart mrlc-lms --update-env
pm2 status
```

For the first PM2 start, use `NODE_ENV=production pm2 start dist/server.cjs --name mrlc-lms --update-env`, then `pm2 save`.

**Deploy the entire `dist/` directory, including the hidden `.server/` directory.** Copying only `dist/*` can omit required curriculum data. `.build-debug/` contains local source maps and bundle analysis and is not required at runtime. A manual deployment also needs production dependencies, configuration and persistent storage; `dist/` alone is not a complete installation.

Keep uploads and backups outside disposable build output. See [persistence](docs/FEATURES_AND_OPERATIONS.md#persistence), [backups](docs/FEATURES_AND_OPERATIONS.md#backups) and [troubleshooting](docs/FEATURES_AND_OPERATIONS.md#troubleshooting) for operating guidance.

## Documentation

| Guide | Contents |
| --- | --- |
| [Feature & operations reference](docs/FEATURES_AND_OPERATIONS.md) | Detailed feature history, environment variables, media limits, seed accounts, optional services, security and troubleshooting. |
| [Deployment](deploy/DEPLOYMENT.md) | Production installation and hosting. |
| [Production build optimization](docs/qa/build-optimization-2026-10-02.md) | Bundle structure, measured savings and verification. |
| [About page redesign](docs/qa/about-redesign-2026-10-02.md) | Design references, decisions and browser checks. |
| [In-app release notes](src/data/releases.ts) | Current What's New content. |
| [Third-party notices](THIRD_PARTY_NOTICES.md) | Upstream attribution and license terms. |

## Developer

<img src="public/images/about/tao-mon-lae.jpg" alt="Tao Mon Lae, developer of MRLC LMS" width="96" height="96" />

**[Tao Mon Lae](https://github.com/TaoMonLae)**

Product designer and full-stack developer

Responsible for product direction, interface design, application engineering and integration of the learning and school-operation systems.

[GitHub profile](https://github.com/TaoMonLae) · [Source repository](https://github.com/TaoMonLae/mrlc-lms) · [Report an issue](https://github.com/TaoMonLae/mrlc-lms/issues)

## License & acknowledgements

MRLC LMS's original code is released under the [MIT License](LICENSE). Third-party components, course materials and datasets retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the [detailed acknowledgements](docs/FEATURES_AND_OPERATIONS.md#notable-third-party-data-and-acknowledgments) before redistribution.

GED preparation content is independently authored using public educator guidance. MRLC Learning Quest is not endorsed by GED Testing Service and does not reproduce official test questions.

© 2026 Mon Refugee Learning Centre
