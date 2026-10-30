# Smart Street Lighting

A DBMS Level 3 project with a role-aware Next.js operations dashboard, MySQL
transactional records, and MongoDB audit telemetry. The running application is
in [`next-app/`](./next-app/); the setup scripts prepare both databases and
launch this application.

## Requirements

- Windows PowerShell
- Node.js 20.9 or newer (npm is included)
- MySQL Server 8.0 and MySQL Shell 8.x
- MongoDB Server 5.0 or newer, installed as a Windows service named `MongoDB`
- MySQL administrator credentials for the local server

Start the MySQL and MongoDB services before setup. MongoDB is used by the full
demo; the dashboard can display its unavailable state if it later goes offline.

## Start the entire project

From the repository folder, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start_project.ps1
```

Confirm setup by typing `YES`, then enter your MySQL administrator password
at the secure prompt. The launcher:

1. Creates missing schemas, applies the SQL features, and refreshes the known
   demo seed rows in MySQL. Other records are preserved.
2. Generates a least-privilege MySQL app credential and writes it only to the
   ignored `next-app/.env.local`.
3. Starts MongoDB if its Windows service is stopped and provisions its indexes.
4. Creates fresh operator and viewer demo accounts, installs locked npm
   dependencies if needed, type-checks and builds the app.
5. Prints the one-time demo credentials and starts the dashboard.

Open <http://localhost:3000>. Keep the PowerShell window open; press Ctrl+C to
stop the server. The generated operator/viewer passwords are printed only in
that terminal. The setup preserves existing database rows and MongoDB audit events. It
refreshes seeded sample records, the generated MySQL service credentials, and
the demo login passwords. Add `-Force` only when you intend to skip the
confirmation prompt:

```powershell
powershell -ExecutionPolicy Bypass -File .\start_project.ps1 -Force
```

After the first setup, start the app without recreating databases by using the
existing ignored `.env.local`:

```powershell
powershell -ExecutionPolicy Bypass -File .\start_project.ps1 -SkipDatabaseSetup
```

If port 3000 is already occupied, choose another port:

```powershell
powershell -ExecutionPolicy Bypass -File .\start_project.ps1 -WebsitePort 3001
```

The database-only setup script is also available as
`.\run_project.ps1`; it prompts before refreshing seeded demo rows and accepts
`-Force`.

## Demo walkthrough

1. Sign in as `demo-operator` using the password printed by the launcher.
2. Show the MySQL connection, seeded poles, readings, schedules, summary
   metrics, and MongoDB telemetry search/aggregation on the dashboard.
3. Add a pole, add a sensor reading, create/delete a schedule, and change
   brightness. Show that a reading creates a power log and that a brightness
   change uses the stored transaction procedure.
4. Sign out and sign in as `demo-viewer`; demonstrate read-only access and
   denied write actions.
5. Explain the MySQL constraints/indexes/views/procedure/trigger and the
   MongoDB event document, indexes, and `$facet` aggregation.

## What is implemented

- **MySQL (`streetlight_ops`)** is the live app's source of truth for users,
  hashed sessions, poles, readings, schedules, and power logs. It includes
  check/foreign-key constraints, indexes, summary views, a reading-to-power
  trigger, and a transactional brightness procedure.
- **MongoDB (`streetlight_ops.streetlight_events`)** stores flexible audit
  documents for operator actions. Text and compound indexes support search;
  a `$facet` aggregation produces recent events, action counts, and hourly
  activity.
- **Next.js App Router** serves the dashboard and API. Passwords are bcrypt
  hashes, opaque session tokens are hashed in MySQL, cookies are HTTP-only,
  and browser writes enforce same-origin checks. Viewers can read; operators
  can mutate data.
- **SQL companion database (`smart_streetlight_grid`)** preserves the course
  SQL examples and demonstrates roles, indexes, analytics, views, a trigger,
  and a transaction procedure. It is not the database used by the dashboard.

See [`docs/PROJECT_DESIGN.md`](./docs/PROJECT_DESIGN.md) for the actual schema,
data dictionary, architecture, and query rationale; see
[`docs/REQUIREMENTS_CHECKLIST.md`](./docs/REQUIREMENTS_CHECKLIST.md) for the
course requirement evidence and remaining student confirmations.

## Development and validation

From `next-app/`, run:

```powershell
npm ci
npm test
npm run typecheck
npm run build
```

The tests cover validation, viewer/operator policy, same-origin protection,
and cookie settings without requiring live databases. The root launcher
provisions the local MySQL/MongoDB integration and performs the production
build before starting the website.

## Important files

- `start_project.ps1` — full setup and website launcher
- `run_project.ps1` — MySQL schema/seed setup
- `next-app/src/` — Next.js pages, dashboard, API routes, and database clients
- `next-app/sql/` — live application's MySQL schema, sample data, analytics
- `sql file for project/` — companion SQL examples used by setup
- `docs/` — project design and requirements checklist

The older `website/` directory is a standalone prototype and is not launched
by the full-project script. Do not upload `.env.local`, `.env` files, database
data, `node_modules`, or build output. Never commit real passwords. Credentials
previously shared in chat should be rotated before final deployment.

Course-specific facts such as title uniqueness, team approval/contributions,
and originality must be confirmed by the students and instructor; repository
files cannot establish them.
