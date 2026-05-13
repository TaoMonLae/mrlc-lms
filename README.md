# Single-School LMS

Production-ready LMS for single-school management.

## Setup

1. Copy `.env.example` to `.env`.
2. Configure `DATABASE_URL` for your PostgreSQL instance.
3. Replace `SESSION_SECRET` with a secure random string.
4. Install dependencies: `npm install`.

## Database Migrations

Run migrations to synchronize your database schema:
```bash
npx prisma migrate dev
```

## Seeding Admin

To create an initial administrator account, run the seed script:
```bash
npx prisma db seed
```
(Ensure your `prisma/seed.ts` is configured for your desired initial admin account.)

## Production Deployment

This application uses Vite + Express.

1. Build for production:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm run start
   ```

## Production Hardening

- Security middleware (helmet, cors, rate-limiting) is enabled in `server.ts`.
- Structured logging is enabled using `winston`.
- Errors are sanitized to prevent stack trace leaks.
