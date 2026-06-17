# Running MRLC LMS with Docker

The app ships as a single image (Node server that also serves the built
frontend) plus a PostgreSQL container, wired together with Docker Compose.

## Quick start (Compose — recommended)

From the project root:

```bash
# 1. First run only: also create the starter accounts
SEED_ON_START=true docker compose up --build

# 2. Subsequent runs
docker compose up
```

Then open **http://localhost:8000**.

Seeded logins (only created when `SEED_ON_START=true`):

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Admin   | admin@mrlc.edu      | admin123    |
| Teacher | teacher@mrlc.edu    | teacher123  |
| Student | student@mrlc.edu    | student123  |

The entrypoint waits for Postgres, runs `prisma migrate deploy`, optionally
seeds, then starts the server. Database data persists in the `db_data` volume.

### Configuration

Override these via environment variables or a `.env` file next to
`docker-compose.yml`:

| Variable            | Default                          | Notes |
|---------------------|----------------------------------|-------|
| `POSTGRES_USER`     | `mrlc`                           | DB user |
| `POSTGRES_PASSWORD` | `mrlc_password`                  | **change for production** |
| `POSTGRES_DB`       | `school_lms`                     | DB name |
| `SESSION_SECRET`    | `change-me-to-a-long-random-string` | **must be 16+ chars; change it** |
| `APP_URL`           | `http://localhost:8000`          | public URL (CORS origin) |
| `SEED_ON_START`     | `false`                          | set `true` once to seed |

## Build just the image (without Compose)

```bash
docker build -t mrlc-lms .

docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://USER:PASS@HOST:5432/school_lms" \
  -e SESSION_SECRET="a-long-random-string-min-16-chars" \
  -e APP_URL="http://localhost:8000" \
  -e SEED_ON_START=true \
  mrlc-lms
```

(Point `DATABASE_URL` at any reachable PostgreSQL instance.)

## Notes

- The image runs migrations automatically on start, so new deploys stay in sync.
- Uploaded logos/signatures are stored in the database (no volume needed for them).
- To rebuild after code changes: `docker compose up --build`.
