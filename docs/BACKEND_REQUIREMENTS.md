# TestPilot — Backend Requirements (canonical)

The backend manages authentication, projects, requirements, test cases, test execution,
defects, AI-powered test generation, regression planning, browser automation, and reports.

## 1. Technology stack

| Package | Purpose |
| --- | --- |
| express | REST API framework |
| @prisma/client, prisma | Database access and migrations |
| mysql2 | MySQL driver |
| dotenv | Environment configuration |
| cors | Restrict frontend origins |
| helmet | Security HTTP headers |
| zod | Validate request data |
| bcrypt | Hash passwords |
| express-session / custom cookie | Authentication (**decision: HTTP-only cookie + server-managed DB sessions**) |
| express-rate-limit | Limit repeated requests |
| multer | File uploads with strict limits |
| nodemon | Restart during development |
| playwright | Browser automation (isolated worker) |
| vitest + supertest | Unit and integration testing |

**Authentication decision.** Server-managed sessions stored in the `sessions` table and
delivered as an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie named
`testpilot_sid`. There is no JWT: tokens are never readable by JavaScript, are revoked by
deleting the session row, and expire (sliding window, absolute maximum). Mutating requests
require the `X-CSRF-Token` header to match the non-HttpOnly `testpilot_csrf` cookie
(double-submit pattern), which is exempt only for login/register/reset endpoints that have
no ambient session.

The browser never talks to MySQL and never holds database credentials. Every request goes
through Express, which validates input and enforces permissions before data access.

## 2. Architecture

```
React + Vite frontend  ->  Express REST API  ->  Prisma  ->  MySQL
                                             ->  worker (Playwright) + artifact storage
```

Each feature module keeps `*.routes.js` (HTTP), `*.controller.js` (thin request/response
handling), `*.service.js` (business rules and permission checks), `*.validation.js` (zod
schemas). Controllers never touch Prisma directly.

## 3. Endpoints

### 3.1 Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Register an account |
| POST | `/api/v1/auth/login` | Authenticate a user |
| POST | `/api/v1/auth/logout` | End the session |
| GET | `/api/v1/auth/me` | Retrieve current user |
| POST | `/api/v1/auth/forgot-password` | Request a reset |
| POST | `/api/v1/auth/reset-password` | Reset a password |

Supporting user endpoints: `GET /api/v1/users`, `GET|PATCH /api/v1/users/me`,
`POST /api/v1/users/me/password`, `GET|PUT /api/v1/users/me/preferences`.

Roles: Owner, Admin, QA Engineer (`qa_lead`), Tester, Viewer.

### 3.2 Workspaces and projects

| Method | Endpoint |
| --- | --- |
| GET | `/api/v1/projects` |
| POST | `/api/v1/projects` |
| GET | `/api/v1/projects/:projectId` |
| PATCH | `/api/v1/projects/:projectId` |
| DELETE | `/api/v1/projects/:projectId` (archive) |
| GET | `/api/v1/projects/:projectId/members` |
| POST | `/api/v1/projects/:projectId/members` |
| GET | `/api/v1/workspaces/current` |
| PATCH | `/api/v1/workspaces/current` |
| GET | `/api/v1/workspaces/current/members` |
| PATCH | `/api/v1/workspaces/current/members/:memberId` |
| DELETE | `/api/v1/workspaces/current/members/:memberId` |

Every endpoint checks that the authenticated user can access the requested project;
cross-workspace access returns `404`, not `403`, so records are never confirmed to exist.

### 3.3 Requirements

`GET|POST /api/v1/projects/:projectId/requirements`,
`GET|PATCH|DELETE /api/v1/requirements/:requirementId`,
`GET /api/v1/requirements/:requirementId/history`,
`GET /api/v1/requirements/:requirementId/test-cases`.

Requirement revisions are preserved so changes can be reviewed and reused by the
regression planner.

### 3.4 Test cases

`GET|POST /api/v1/projects/:projectId/test-cases`,
`GET|PATCH|DELETE /api/v1/projects/:projectId/test-cases/:testCaseId`,
`POST /api/v1/projects/:projectId/test-cases/:testCaseId/clone`,
`PUT /api/v1/projects/:projectId/test-cases/:testCaseId/requirements`,
`GET /api/v1/projects/:projectId/test-cases/:testCaseId/history`.

Test case: unique id/title, description, preconditions, test data, ordered steps with
expected results, type (`functional`, `positive`, `negative`, `boundary`, `integration`,
`regression`), priority, status, linked requirements, timestamps and change history.

Steps are validated server-side, order is preserved, and a case plus its steps are saved in
a single transaction.

### 3.5 Test runs and results

`GET|POST /api/v1/projects/:projectId/test-runs`,
`GET|PATCH /api/v1/projects/:projectId/test-runs/:runId`,
`POST /api/v1/projects/:projectId/test-runs/:runId/results`,
`GET /api/v1/projects/:projectId/test-runs/:runId/results`,
`PATCH /api/v1/test-results/:resultId`.

Execution status is `pass`, `fail`, `blocked`, `not_run`. Results are append-only: rerunning
a case inserts a new row instead of overwriting the previous one, which is what makes
retests and run-over-run comparison possible. Failed results link to defects.

### 3.6 Defects

`GET|POST /api/v1/projects/:projectId/defects`,
`GET|PATCH /api/v1/projects/:projectId/defects/:defectId`,
`POST /api/v1/projects/:projectId/defects/:defectId/comments`,
`POST /api/v1/projects/:projectId/defects/:defectId/reopen`,
`POST /api/v1/projects/:projectId/defects/:defectId/retest`,
`GET /api/v1/projects/:projectId/defects/:defectId/history`.

Statuses: `open`, `in_progress`, `fixed`, `ready_for_retest`, `reopened`, `closed`.
Status history is retained; closing requires `qa_lead` or above.

### 3.7 AI test generation

`POST /api/v1/ai/test-case-generation`. Accepts a requirement reference/id or free-text
description and returns structured cases covering positive, negative, boundary and
validation scenarios. The provider key stays server-side only. Generated cases are
validated, returned as `draft` suggestions, and only persisted after the user edits and
approves them. Timeouts, rate limits, malformed output and usage limits are handled.

### 3.8 Regression planner

`POST /api/v1/projects/:projectId/regression/plan`,
`GET /api/v1/projects/:projectId/regression/plans`,
`GET /api/v1/projects/:projectId/regression/plans/:planId`.

Recommendations come from explicit requirement/module/test-case links and
`module_dependencies`, each with a reason and dependency path. Users include or exclude
suggested tests, save plans, and launch them as test runs.

### 3.9 Automation

`GET|POST /api/v1/projects/:projectId/automation/jobs`,
`GET|PATCH /api/v1/projects/:projectId/automation/jobs/:jobId`,
`POST /api/v1/projects/:projectId/automation/jobs/:jobId/runs`,
`POST /api/v1/projects/:projectId/automation/jobs/:jobId/rerun`,
`POST /api/v1/projects/:projectId/automation/jobs/:jobId/cancel`,
`GET /api/v1/projects/:projectId/automation/jobs/:jobId/artifacts`,
`POST /api/v1/automation/jobs/:jobId/artifacts`.

Job states: `queued`, `running`, `passed`, `failed`, `cancelled`, `timed_out`. Jobs run in a
worker process with timeouts, concurrency limits, URL allow-lists and resource limits.
Arbitrary user shell commands are never executed and unrestricted URLs are never fetched.
Screenshots and logs are written to private storage; only metadata lives in MySQL.

### 3.10 Dashboard, reports, activity

`GET /api/v1/projects/:projectId/dashboard`,
`GET /api/v1/projects/:projectId/reports/execution`,
`GET /api/v1/projects/:projectId/reports/coverage`,
`GET /api/v1/projects/:projectId/reports/defects`,
`GET /api/v1/projects/:projectId/reports/release-readiness`,
`GET /api/v1/projects/:projectId/activity`.

Metrics are computed from real records. Lists support filtering by date, project, release,
environment and status, plus pagination and sorting. CSV export is generated server-side.
Release readiness is computed from configurable criteria (execution coverage, unresolved
critical defects, failed tests, flaky tests, unreviewed AI suggestions) and reports the
evidence for each criterion instead of claiming a release is defect-free.

### 3.11 Notifications

`GET /api/v1/notifications`, `PATCH /api/v1/notifications/:notificationId`,
`POST /api/v1/notifications/read-all`.

## 4. API conventions

Success:

```json
{ "success": true, "message": "Test case created successfully", "data": { "id": "tc_123" }, "meta": { "page": 1, "total": 42 } }
```

Validation failure:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "title", "message": "Title is required" }],
  "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "fieldErrors": [{ "field": "title", "message": "Title is required" }] }
}
```

List endpoints always return `meta: { page, pageSize, total, totalPages, hasNext, hasPrevious }`.

Status codes: `200` read/update, `201` created, `204` no content, `400` malformed request,
`401` unauthenticated, `403` insufficient permission, `404` not found (also used to conceal
cross-workspace records), `409` conflicting state, `422` invalid field values, `429` rate
limited, `500` unexpected error.

## 5. Database

Prisma + MySQL. Tables: `users`, `workspaces`, `workspace_members`, `projects`,
`project_members`, `requirements`, `requirement_versions`, `test_cases`, `test_steps`,
`requirement_test_cases`, `test_runs`, `test_results`, `defects`, `defect_test_results`,
`defect_comments`, `defect_history`, `module_dependencies`, `regression_plans`,
`automation_jobs`, `automation_artifacts`, `automation_job_runs`, `activity_logs`,
`notifications`, `sessions`, `password_reset_tokens`, `ai_generations`.

Rules: primary/foreign keys, unique constraints, indexes on commonly filtered columns
(project, status, priority, createdAt), timestamps, soft deletion/archival where history
matters, transactions for multi-record writes, workspace/project ownership checks in every
query.

## 6. Security

Hash passwords with bcrypt (cost 12). Validate every request with zod. Enforce permissions
in the service layer. Prevent IDOR and cross-workspace access. Restrict CORS to the
frontend origin. Rate limit login, password reset and AI endpoints. Validate upload type,
size and destination. Protect workers against SSRF and resource exhaustion (URL allow-list,
no shell execution, per-job timeout and memory caps). Keep secrets in environment variables.
Audit sensitive actions in `activity_logs`. Never commit `.env`.

## 7. Folder structure

```
server/
├── prisma/schema.prisma
├── prisma/seed.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/{env,database}.js
│   ├── middleware/{authenticate,authorize,validate,errorHandler,rateLimiter,requestContext}.js
│   ├── modules/{auth,users,workspaces,projects,requirements,testCases,testRuns,defects,ai,regression,automation,reports,notifications}/
│   ├── services/{permissions,activity,pagination,artifacts,aiProvider}.js
│   ├── workers/{playwrightWorker,jobQueue}.js
│   ├── utils/{apiError,asyncHandler,pagination,ids}.js
│   └── tests/
├── .env / .env.example
└── package.json
```

## 8. Roadmap

1. Foundation and authentication — Express, Prisma, MySQL, env, errors, validation, auth.
2. Projects and requirements — workspace, membership, project, requirement, revisions.
3. Test cases and manual execution — steps, traceability, runs, results, defects, retests.
4. Dashboard and reporting — metrics, filters, activity logs, coverage, exports.
5. AI and regression intelligence — structured generation with approval, traceability plans.
6. Automation and hardening — Playwright worker, queue, artifacts, tests, deployment.