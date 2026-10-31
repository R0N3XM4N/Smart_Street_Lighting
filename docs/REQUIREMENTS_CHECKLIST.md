# DBMS Level 3 Requirements Checklist

Use this checklist against the supplied course requirements PDF before
submission. Code features can be verified in this repository; course/team facts
must be verified by the students and instructor.

| PDF requirement | Project evidence | Before submission |
|---|---|---|
| 1. Unique title and meaningful problem, beyond CRUD | Smart street-light monitoring and dimming use case | Confirm title is unique in the section and explain the real-world use case |
| 2. Two-person team, each contributes to DB and application | Git history and team report | Ensure both students make genuine database **and** application contributions; do not fabricate commits |
| 3. MySQL/PostgreSQL plus NoSQL/vector paradigm | MySQL operational schema and MongoDB telemetry feature | Start/test both databases and show actual Mongo documents and aggregation |
| 4. ER diagram, relational schema, keys, relationships, constraints; NoSQL model | [`PROJECT_DESIGN.md`](./PROJECT_DESIGN.md) and `next-app/sql/schema.sql` | Review the model against the executable schema |
| 5. SQL DDL, keys, constraints, indexes, views | `next-app/sql/schema.sql` and `sql-companion/` | Execute setup and show the database objects |
| 6. INSERT, UPDATE, DELETE, SELECT and analytical queries | Application forms/routes, brightness procedure, schedule deletion, and both analytics SQL files | Demonstrate each operation, joins, grouping, aggregates, subqueries, and ordering |
| 7. At least four SQL advanced concepts and one NoSQL/vector feature | Indexes, views, transaction procedure, trigger, MongoDB aggregation | Explain why each feature is used and show it running |
| 8. Vector search (optional/recommended) | The project uses the permitted SQL + document-store option; vector search is not implemented | Add embeddings only if the instructor requires them and the team can justify them |
| 9. Functional Next.js interface | Next.js app and its protected API routes | Start it and demonstrate dashboard, forms, and useful filtering |
| 10. Backend database integration and environment-based secrets | Next.js server-side database clients; launcher-generated ignored `.env.local` | Verify no real credentials are committed |
| 11. Backend authentication and at least two roles | Application login, session checks, viewer/operator policy | Show viewer access and a denied write, then operator write access |
| 12. Input validation and integrity at database level | SQL check/FK constraints and API validation | Demonstrate invalid values are rejected by both relevant layers |
| 13. Documentation contents | [`PROJECT_DESIGN.md`](./PROJECT_DESIGN.md), README, automated test suite | Capture real screenshots and append the team's actual run/test results and conclusion |
| 14. Git/GitHub source, contribution history, execution README | Project source and README | Push to the correct repository and verify actual contributions from both members |
| 15. Final demonstration | Design, DBs, important operations/features, Next.js UI, tests | Follow the demo checklist in README and show both database paradigms |
| 16. Original implementation | Project-specific schema, workflows, and code | Each student must verify originality and cite any external resources used |
| 17. Level 3 integration and justified database choices | MySQL for constrained transactional records; MongoDB for flexible telemetry/history | Explain the SQL/NoSQL boundary and demonstrate the connection end to end |

Repository files cannot independently prove course-section title uniqueness,
team approval, honest individual contribution, or originality. Those items
require confirmation from the team, GitHub history, and instructor.

Automated app verification run during implementation: `npm test` (14 tests
passed), `npm run typecheck`, and `npm run build` in `next-app/`. The local
full-project launcher also initialized MySQL/MongoDB and served the dashboard;
live checks verified operator/viewer login, seeded dashboard reads, brightness
procedure and audit event, reading insert and power-log trigger, schedule
create/delete, MongoDB telemetry, and viewer write denial. Capture submission
screenshots and rerun these checks on the demo machine.
