# MRLC LMS — Mon Refugee Learning Centre

A single-school Learning Management System for the Mon Refugee Learning Centre
(GED School). It covers students, teachers, classes, subjects, attendance,
exams, a digital library, a physical book catalog with borrowing, fees, case
management, announcements, role-based access, and configurable school
branding/settings.

The app runs as one Node/Express server (built with `esbuild`) that also serves
the compiled Vite/React frontend, backed by PostgreSQL via Prisma.

The app listens on **http://localhost:8000** by default (override with the
`PORT` environment variable).

---

## Run locally

**Prerequisites:** Node.js 18+ and a PostgreSQL instance.

1. Copy `.env.example` to `.env` and set at least:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/school_lms"
   SESSION_SECRET="a-random-string-at-least-16-characters"
   ```
   `SESSION_SECRET` **must be 16+ characters** or the server refuses to start.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Apply database migrations and generate the Prisma client:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. (First run) create the starter accounts:
   ```bash
   npm run seed
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```
   Open **http://localhost:8000**.

To run a port other than 8000, set `PORT` (e.g. PowerShell: `$env:PORT=3000; npm run dev`).

### Seeded logins

| Role    | Email             | Password   |
|---------|-------------------|------------|
| Admin   | admin@mrlc.edu    | admin123   |
| Teacher | teacher@mrlc.edu  | teacher123 |
| Student | student@mrlc.edu  | student123 |

Create a **Librarian** user from Users → Create User to access the Book Catalog.

---

## Run with Docker

The fastest way to get everything (app + database) running. See **DOCKER.md**
for details. In short, from the project root:

```bash
# first run — also creates the starter accounts
SEED_ON_START=true docker compose up --build

# after that
docker compose up
```

Open **http://localhost:8000**. Migrations run automatically on container start.

---

## Production build (without Docker)

```bash
npm run build     # builds the client (dist/) and server (dist/server.cjs)
npm run start     # NODE_ENV=production node dist/server.cjs
```

Set `NODE_ENV=production` and a real `DATABASE_URL` / `SESSION_SECRET` in the
environment. The production server serves the static client from `dist/`.

---

## Useful scripts

| Command          | Description |
|------------------|-------------|
| `npm run dev`    | Dev server (Express + Vite middleware) on port 8000 |
| `npm run build`  | Build client and server bundles |
| `npm run start`  | Run the production build |
| `npm run seed`   | Seed starter admin/teacher/student accounts |
| `npm run lint`   | Type-check with `tsc --noEmit` |

## Production hardening

- Security middleware (helmet, CORS, rate-limiting) is enabled in `server.ts`.
- `app.set("trust proxy", 1)` so rate limiting / client IPs work behind a proxy.
- JWT auth with server-side role checks; passwords hashed with bcrypt.
- Structured logging via `winston`; error responses are sanitized.

## Tech stack

React 19 · Vite 6 · Tailwind CSS v4 · Express 4 · Prisma 7 · PostgreSQL ·
TypeScript · Inter (Webflow-inspired theme).
