# MRLC LMS — Mon Refugee Learning Centre

> A comprehensive Learning Management System for the Mon Refugee Learning Centre (GED School)

**Developed by Tao Mon Lae**

---

## Overview

MRLC LMS is a full-featured, single-school Learning Management System designed specifically for the Mon Refugee Learning Centre. It provides a complete digital platform for managing students, teachers, classes, subjects, attendance, examinations, digital library resources, physical book catalog with borrowing management, fee tracking, case management, announcements, role-based access control, and configurable school branding.

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
| **Attendance** | Daily attendance tracking with reporting and analytics |
| **Examinations** | Exam creation, scheduling, proctoring, and automated grading |
| **Gradebook** | Student progress tracking, grade reports, and performance analytics |
| **Digital Library** | E-book (EPUB/PDF) collection with reading progress tracking |
| **Physical Library** | Book catalog, borrowing system, and due date management |
| **Fee Management** | Fee structure, payment tracking, and receipt generation |
| **Case Management** | Student case notes, interventions, and follow-up tracking |
| **Announcements** | School-wide announcements with rich text and media support |
| **Timetable** | Class scheduling with conflict detection and calendar view |
| **Reports** | Comprehensive reporting across all modules with export options |
| **Settings** | School branding, system configuration, and backup management |

### Specialized Features

- **Chat System**: Real-time messaging between users with sticker support
- **Social Space**: Community feed for sharing updates and media
- **Video Management**: Educational video library with categories
- **Document Management**: Secure document generation and printing
- **Lesson Planner**: Teacher lesson planning and resource management
- **Admissions**: Student application and enrollment workflow
- **HR & Payroll**: Staff management and payroll processing
- **Bank Integration**: Fee payment tracking and reconciliation

### Multi-Language Support

The LMS includes built-in internationalization (i18n) with support for:

- **English** (`en.po`) – Default language
- **Burmese** (`my.po`) – မြန်မာ
- **Mon** (`mnw.po`) – ဘာသာမန်

Adding new languages is straightforward—simply add a `.po` file to `src/i18n/locales/` and the system will automatically register it. The default language can be configured in **Settings → System Settings → Language**.

---

## Tech Stack

- **Frontend**: React 19 · Vite 6 · TypeScript · Tailwind CSS v4 · Radix UI · Lucide Icons
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
│   ├── components/     # Reusable UI components
│   ├── lib/            # API clients, utilities, helpers
│   ├── i18n/           # Internationalization files (.po)
│   ├── hooks/          # Custom React hooks
│   ├── providers/      # Context providers
│   └── types/          # TypeScript type definitions
├── prisma/
│   ├── schema.prisma   # Database schema
│   ├── migrations/     # Database migration files
│   └── seed.ts         # Seed script for starter accounts
├── public/
│   └── stickers/       # Built-in sticker packs for chat
├── data/               # Runtime data directory (uploads, backups, etc.)
├── deploy/             # Deployment configurations
└── server.ts           # Express server entry point
```

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
| `BACKUP_DIR` | No | `./data/backups` | Database backup location |
| `BACKUP_RETENTION` | No | `14` | Number of backups to retain |
| `BACKUP_HOUR` | No | `2` | Hour for daily backup (0-23) |

### Backup Configuration

Automatic database backups can be enabled in **Settings → System Settings**. Backups use `pg_dump` and are stored in `BACKUP_DIR` with retention based on `BACKUP_RETENTION`.

---

## Support & Contributing

For issues, questions, or contributions related to MRLC LMS, please refer to the project repository or contact the development team.

---

**License:** All rights reserved

**Developed by Tao Mon Lae**

© 2024 Mon Refugee Learning Centre
