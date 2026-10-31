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

Start the MySQL service before setup. The launcher starts the MongoDB Windows
service if needed. MongoDB is used by the full demo; the dashboard can display
its unavailable state if it later goes offline.

## Run the project

### First run

1. Install the requirements above and start the MySQL service.
2. Double-click `backup-launchers\start_project.bat` in the project folder.
3. Type `YES` and enter your MySQL administrator password when prompted.
4. Wait for setup and the build to finish.
5. Open <http://localhost:3000>. The local launcher opens the dashboard in
   read-only demo mode, so no website sign-in is needed. Keep the terminal
   window open while using the dashboard.

### Every run after setup

For a read-only demo, double-click `backup-launchers\run_dashboard.bat`. It
reuses the existing database and local configuration instead of refreshing
demo data or credentials.

The read-only launcher is bound to this computer. To demonstrate edits, use
the editable operator demo below. Do not expose either local demo mode to an
untrusted network.

### Editable operator demo

Double-click `run_operator_demo.bat` to launch the dashboard with editing
enabled for authenticated operators. The first time, choose **Create an
account**, select **Operator**, and set a password. The app signs you in
immediately; later launches can reuse the browser session while it remains
valid. Operator actions change the local demo database. This mode is intended
for a trusted, local presentation only.

The archived `start_project.bat` performs the full setup again, including
refreshing seeded demo rows and demo passwords. Use it when you intentionally
want to rerun setup, not for routine launches. It preserves other project
records.

Alternatively, run either launcher from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\start_project.ps1
powershell -ExecutionPolicy Bypass -File .\start_project.ps1 -SkipDatabaseSetup
powershell -ExecutionPolicy Bypass -File .\start_project.ps1 -SkipDatabaseSetup -OperatorDemo
```

The full setup launcher:

1. Creates missing schemas, applies the SQL features, and refreshes the known
   demo seed rows in MySQL. Other records are preserved.
2. Generates a least-privilege MySQL app credential and writes it only to the
   ignored `next-app/.env.local`.
3. Starts MongoDB if its Windows service is stopped and provisions its indexes.
4. Creates fresh operator and viewer demo accounts, installs locked npm
   dependencies if needed, type-checks and builds the app.
5. Prints the one-time demo credentials and starts the dashboard.

The generated operator/viewer passwords are printed only in the setup
terminal. Add `-Force` only when you intend to skip its confirmation prompt:

```powershell
powershell -ExecutionPolicy Bypass -File .\start_project.ps1 -Force
```

The operator demo launcher enables operator registration locally. Do not
expose demo mode to an untrusted network or use it for a public deployment.

If port 3000 is already occupied, choose another port:

```powershell
powershell -ExecutionPolicy Bypass -File .\start_project.ps1 -WebsitePort 3001
```

The database-only setup script is archived at
`.\backup-launchers\run_project.ps1`; it prompts before refreshing seeded demo
rows and accepts `-Force`.

## Demo walkthrough

1. Choose **Create an account** on the sign-in page, select **Operator**, and
   set a password you can remember for the demo. You can also register as a
   viewer to demonstrate read-only access.
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
  and browser writes enforce same-origin checks. Users can register for
  viewer access; the local demo launcher also enables operator registration.
  Only operators can mutate data.
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

- `run_operator_demo.bat` — editable local demo for operator accounts
- `start_project.ps1` — full setup and website launcher
- `backup-launchers/` — hidden setup and read-only launch shortcuts
- `next-app/src/` — Next.js pages, dashboard, API routes, and database clients
- `next-app/sql/` — live application's MySQL schema, sample data, analytics
- `sql-companion/` — companion SQL examples used by setup
- `docs/` — project design and requirements checklist

Do not upload `.env.local`, `.env` files, database data, `node_modules`, or
build output. Never commit real passwords. Credentials previously shared in
chat should be rotated before final deployment.

Course-specific facts such as title uniqueness, team approval/contributions,
and originality must be confirmed by the students and instructor; repository
files cannot establish them.
