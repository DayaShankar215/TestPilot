# Server

Express + Prisma + MySQL API for TestPilot. Every route lives under `/api/v1` and speaks the envelope documented in [`../docs/BACKEND_REQUIREMENTS.md`](../docs/BACKEND_REQUIREMENTS.md).

## Prerequisites

- Node.js >= 20.11
- Docker Desktop (for the local MySQL 8 instance)

## Setup

```powershell
npm.cmd install
Copy-Item .env.example .env
docker compose -f ..\docker-compose.yml up -d
npm.cmd run db:deploy
npm.cmd run db:seed
```

The seed creates the `TestPilot` workspace with five users. Sign in as `arun.mehta@testpilot.dev` / `TestPilot@2026`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | API with reload on `:4000` |
| `npm.cmd start` | API without reload |
| `npm.cmd run lint` | oxlint over `src` and `prisma` |
| `npm.cmd run verify` | lint plus the test suite |
| `npm.cmd run db:migrate` | Create and apply a migration from schema changes |
| `npm.cmd run db:deploy` | Apply pending migrations |
| `npm.cmd run db:seed` | Idempotent development fixtures |
| `npm.cmd run db:studio` | Browse data in Prisma Studio |

## Authentication

Sessions live in the database; the client only holds an opaque cookie.

- `testpilot_sid` — HttpOnly, SameSite=Lax. Only its SHA-256 hash is stored.
- `testpilot_csrf` — readable by JavaScript. Send it in `X-CSRF-Token` on every state-changing request or the server answers `403 CSRF_TOKEN_MISMATCH`.

`GET /api/v1/auth/me` returns the profile, preferences, and workspace memberships for the current session.

## Layout

```
src/
  app.js                     express app wiring
  server.js                  process entry point
  config/                    env validation and Prisma client
  middleware/                auth, CSRF, validation, rate limits, errors
  modules/                   one folder per API surface (auth, users, ...)
  services/                  domain logic and shared services
  schemas/                   reusable Zod fragments
  utils/                     ApiError, pagination, ids
  workers/                   Playwright job runner
prisma/
  schema.prisma              MySQL data model
  migrations/                committed SQL migrations
  seed.js                    development fixtures
tests/                       vitest suites
```

## Testing

Unit and integration tests run against a real MySQL database. Create one first:

```powershell
docker exec testpilot-mysql mysql -uroot -ptestpilot-root -e "CREATE DATABASE testpilot_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL ON testpilot_test.* TO 'testpilot'@'%';"
$env:DATABASE_URL = "mysql://testpilot:testpilot@127.0.0.1:3306/testpilot_test"
npx.cmd prisma migrate deploy
npm.cmd test
```