# Smart Street Lighting Dashboard

The Next.js App Router application for the Smart Street Lighting DBMS project.
The repository-level [`README.md`](../README.md) contains the supported
one-command setup and demo instructions. The root `start_project.ps1` prepares
MySQL/MongoDB and this app, prints generated demo logins, and starts the
production build.

## Requirements and local development

- Node.js 20.9 or newer
- MySQL 8.0+
- MongoDB 5.0+ for the full telemetry feature (the core app can report MongoDB
  as unavailable and continue to serve MySQL operations)

Run the root launcher once to create schemas, seed data, and the ignored
`next-app/.env.local`. After stopping its server with Ctrl+C, use the following
for hot reload:

```powershell
Set-Location .\next-app
npm ci
npm run dev
```

Open <http://localhost:3000>. Never commit `.env.local` or real credentials.
The tracked `.env.example` is a template only; the root launcher is the
recommended way to generate the correctly permissioned MySQL account and
local configuration.

## MySQL schema and APIs

`sql/schema.sql` creates the `streetlight_ops` database: users, hashed
sessions, poles, readings, schedules, and `power_consumption_log`, including
foreign keys, check constraints, indexes, views, `trg_reading_power_log`, and
the transactional `set_pole_brightness` procedure. `sql/seed.sql` inserts
repeatable demo poles, readings, and schedules. `sql/analytics.sql` contains
analytical query examples.

The app's route handlers use parameterized SQL through the server-only
`src/lib/db.ts` pool:

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`: login,
  logout, and session inspection.
- `GET /api/dashboard`: viewer/operator summaries, poles, readings, and
  schedules.
- `POST /api/poles`, `/api/readings`, `/api/schedules`, `/api/brightness`:
  operator-only validated writes; brightness calls the stored procedure.
- `DELETE /api/schedules?id=<id>`: operator-only schedule deletion.
- `GET /api/telemetry?q=<text>`: authenticated MongoDB search and
  aggregation.

Sessions use random tokens; only SHA-256 token hashes are persisted in MySQL.
Passwords are bcrypt-hashed. Session cookies are HTTP-only, same-site,
time-limited, and secure in production. Mutating browser requests require an
exact same-origin `Origin` header. Viewers can read dashboard and telemetry
data but cannot create or delete records.

## MongoDB event model

MongoDB stores flexible operator audit documents in the `streetlight_events`
collection of the `streetlight_ops` database:

```javascript
{
  actorId: Number,
  actor: String,
  action: String,
  entityType: String,
  entityId: String,
  details: Object,
  createdAt: Date
}
```

The bootstrap script provisions descending timestamp, action/time, actor/time,
and text indexes. The telemetry API uses a `$facet` aggregation to return
recent events, event counts by action, and hourly activity. Run
`npm run mongo:setup` from this folder to provision indexes using
`.env.local`; the script is safe to rerun.

If MongoDB is absent/unreachable, the app reports its actual unavailable state
and MySQL operations remain usable; audit failures are logged and surfaced in
the corresponding write response.

## Tests

From this directory:

```powershell
npm test
npm run typecheck
npm run build
```

Vitest checks API/form validation, viewer-versus-operator policy,
same-origin enforcement, and cookie attributes without requiring live
databases. The root launcher additionally performs a local database setup,
MongoDB index provisioning, and production build before starting the website.
