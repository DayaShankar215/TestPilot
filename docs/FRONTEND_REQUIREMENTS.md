# TestPilot — Frontend Requirements Specification

**Product:** TestPilot
**Type:** Software Quality Assurance and Test Management Platform
**Frontend:** React + Vite

**Purpose:** Manage requirements, test cases, test execution, defects, regression testing, and release readiness.

> This document is the UI/UX specification for the TestPilot frontend. It is written to be
> self-contained and can be handed directly to an AI coding assistant to build the React client.
>
> MySQL and Node.js are integrated later through the backend API. Until then the frontend runs on
> mock data behind a dedicated service layer.

---

## 1. Frontend Technology Requirements

| Technology | Purpose |
| --- | --- |
| React + Vite | Frontend application |
| JavaScript (JSX) | Component and page development |
| React Router | Page navigation and protected routes |
| Standard CSS / CSS Modules | Styling and responsive layouts |
| Axios | HTTP requests to the future Express API |
| Recharts | Dashboard charts and analytics |
| Lucide React | Icons |
| React Hook Form + Zod | Form management and validation |
| Context API | Authentication, theme, and shared application state |
| date-fns | Date formatting and date utilities |

Do not add Redux or other heavy state-management libraries unless the application genuinely needs them.

---

## 2. Overall Application Layout

The application should use a professional SaaS interface rather than a generic admin template.

The authenticated application has four primary layout areas.

### A. Sidebar Navigation

- TestPilot logo and workspace selector
- Dashboard
- Projects
- Requirements
- Test Cases
- Test Runs
- Defects
- Regression Planner
- Automation
- Reports
- Team and Settings
- Collapsible sidebar with icons and tooltips

### B. Top Navigation Bar

- Breadcrumb navigation
- Current project selector where applicable
- Global search
- Notifications
- Light/dark theme toggle
- User avatar and account menu

### C. Main Content Area

- Page title and contextual description
- Primary action buttons
- Filters, tables, cards, charts, and forms
- Consistent page spacing and responsive content widths

### D. Feedback and Overlays

- Toast messages
- Confirmation dialogs
- Form validation errors
- Loading skeletons
- Empty states and error screens
- Modals and drawers where appropriate

---

## 3. Frontend Pages and Functional Requirements

### Module 1 — Authentication

**Pages**

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

**Requirements**

- Email and password inputs
- Show/hide password
- Client-side input validation
- Loading and API error states
- Remember-me behavior only if supported by the chosen session design
- Redirect users to the dashboard after successful login
- Redirect unauthenticated users away from protected pages

### Module 2 — Dashboard

**Route:** `/dashboard`

An at-a-glance view of the selected project or workspace.

**Required components**

- KPI cards: total test cases, executed tests, pass rate, open defects, and requirement coverage
- Test execution trend chart
- Test status distribution chart
- Defect severity chart
- Recent test runs table
- Recently reported defects
- Recent activity feed
- Quick actions to create a project, requirement, test case, or test run

**Interactions**

- Selecting a project or date range updates the relevant metrics
- Clicking a metric or chart segment navigates to the corresponding filtered page

All metrics must be calculated from API data when the backend is available, not permanently hardcoded.

### Module 3 — Project Management

**Routes**

- `/projects`
- `/projects/new`
- `/projects/:projectId`
- `/projects/:projectId/settings`

**Requirements**

- Project list with cards or a data table
- Search, sorting, and status filters
- Create and edit project forms
- Project detail overview
- Project members and role display
- Project activity and QA metrics
- Archive confirmation dialog
- Clear loading, empty, and error states
- Each project card shows project name, description, status, owner, member count, and a small selection of QA metrics

### Module 4 — Requirements Management

**Routes**

- `/projects/:projectId/requirements`
- `/requirements/:requirementId`

**Requirements**

- Create, edit, view, and archive requirements
- Display unique requirement IDs
- Show title, description, acceptance criteria, priority, status, and owner
- Filter by status, priority, and assigned user
- Link test cases to requirements
- Display test coverage and uncovered requirements
- Show requirement version history
- Highlight requirements that changed after a previous test run
- Requirement detail page uses a tabbed or section-based layout for description, acceptance criteria, linked test cases, change history, and activity

### Module 5 — Test Case Management

**Routes**

- `/projects/:projectId/test-cases`
- `/test-cases/new`
- `/test-cases/:testCaseId`

**Requirements**

- Test case list with search, sorting, filters, and pagination
- Create and edit test cases
- Ordered test steps with action and expected result fields
- Preconditions and test data
- Type selection: functional, positive, negative, boundary, integration, regression
- Priority and status indicators
- Requirement linking
- Duplicate or clone test case
- Revision history
- Bulk selection for adding cases to a test run
- Test case editor makes it easy to add, remove, and reorder steps without navigating away from the form

### Module 6 — AI Test Case Generator

**Route:** `/projects/:projectId/ai-test-generator`

**Requirements**

- Select an existing requirement or enter a requirement description
- Choose test types to generate
- Select the number of suggested test cases
- Show a generation progress state
- Display generated test cases in editable cards or a table
- Allow approval, rejection, editing, and regeneration
- Highlight missing fields and possible duplicate cases
- Allow approved test cases to be saved to the test library
- Display a clear error state when AI generation fails

The frontend must treat AI output as unapproved suggestions until the user explicitly accepts it. Actual generation happens through the Express backend.

### Module 7 — Test Execution and Test Runs

**Routes**

- `/projects/:projectId/test-runs`
- `/test-runs/new`
- `/test-runs/:runId`

**Requirements**

- Create a test run by selecting test cases
- Set a run name, release or build identifier, environment, and assignee
- Display progress and result summaries
- Execute each test case step by step
- Record Pass, Fail, Blocked, or Not Run
- Enter actual results and notes
- Upload screenshots or other evidence
- Create a defect directly from a failed test
- Preserve previous execution results
- Support retesting and viewing historical runs

The execution interface should prioritize readability and fast interaction so testers can work through many test cases efficiently.

### Module 8 — Defect Management

**Routes**

- `/projects/:projectId/defects`
- `/defects/new`
- `/defects/:defectId`

**Requirements**

- Defect list with filters for severity, priority, status, and assignee
- Create and edit defect forms
- Title, description, reproduction steps, expected and actual results
- Linked requirement, test case, and failed execution
- Screenshot and attachment display
- Assignee selector
- Comments and status history
- Retest and reopen actions
- Confirmation for destructive or irreversible actions
- Consistent visual distinctions for defect severity and lifecycle status

Color must never be the only way to communicate status; include text labels and accessible contrast.

### Module 9 — Regression Planner

**Route:** `/projects/:projectId/regression`

**Requirements**

- Display recently changed requirements or modules
- Allow a user to select a change set
- Display recommended test cases
- Explain why each test was recommended
- Show direct links and related dependency paths
- Allow inclusion or exclusion of individual tests
- Save selected tests as a regression suite
- Compare results against previous executions

The frontend displays recommendations returned by the backend. It must not independently invent regression results or claim that a test is affected without supporting data.

### Module 10 — Automated Testing

**Routes**

- `/projects/:projectId/automation`
- `/automation/jobs/:jobId`

**Requirements**

- List configured automated tests
- Display supported environment and test configuration
- Start an authorized test run
- Show queued, running, passed, failed, cancelled, or timed-out status
- Display execution duration, logs, screenshots, and failure details
- Rerun an eligible failed test
- View execution history
- Link automation results to TestPilot test cases

Do not expose server secrets or provide an interface for executing arbitrary user-supplied shell commands.

### Module 11 — Reports and Release Readiness

**Routes**

- `/projects/:projectId/reports`
- `/projects/:projectId/release-readiness`

**Requirements**

- Test execution summary
- Requirement coverage report
- Defect severity and aging report
- Regression execution summary
- Release readiness metrics
- Date, project, release, and environment filters
- PDF and CSV export actions
- Print-friendly report layout
- Clear display of the reporting period and the underlying counts

The release readiness page summarizes configurable release criteria, unresolved defects, test results, and uncovered requirements. It must not present an arbitrary score as proof that a release is safe.

### Module 12 — Team, Settings, and Profile

**Routes**

- `/settings/profile`
- `/settings/workspace`
- `/settings/members`
- `/settings/notifications`
- `/settings/preferences`

**Requirements**

- Edit profile details
- Change password through a secure API flow
- Manage workspace members and roles
- Display project membership
- Configure notification preferences
- Toggle light and dark themes
- Configure timezone and date preferences
- Provide logout and account actions
- Display clear permission restrictions

Administrative controls are rendered according to the user's role, but the backend remains responsible for enforcing those permissions.

---

## 4. Design System Requirements

Establish a small, reusable design system before building every page.

**Visual direction:** Navy, Indigo, Teal, Light canvas.

**Reusable components**

- Button variants
- Input and select
- Modal and drawer
- Data table
- Status badge
- KPI card
- Filter toolbar
- Pagination
- Tabs
- Toast notifications
- Loading skeleton
- Empty state

**Visual and accessibility rules**

- Consistent spacing, typography, borders, shadows, and corner radii
- Support both light and dark themes
- Forms have labels and clear validation messages
- Support keyboard navigation and visible focus states
- Use semantic HTML and accessible dialog behavior
- Maintain readable contrast and responsive chart labels
- Avoid excessive gradients, unnecessary animations, and overcrowded dashboards
- Use responsive tables or alternative mobile layouts for small screens

---

## 5. Frontend Folder Structure

Organize the React application by feature so the project remains manageable as it grows.

```
client/
└── src/
    ├── app/
    │   ├── App.jsx
    │   ├── router.jsx
    │   └── providers.jsx
    ├── assets/
    ├── components/
    │   ├── common/
    │   ├── forms/
    │   ├── tables/
    │   ├── charts/
    │   └── feedback/
    ├── layouts/
    │   ├── AuthLayout.jsx
    │   └── DashboardLayout.jsx
    ├── features/
    │   ├── auth/
    │   ├── dashboard/
    │   ├── projects/
    │   ├── requirements/
    │   ├── testCases/
    │   ├── aiGenerator/
    │   ├── testRuns/
    │   ├── defects/
    │   ├── regression/
    │   ├── automation/
    │   ├── reports/
    │   └── settings/
    ├── services/
    │   ├── apiClient.js
    │   └── endpoints/
    ├── hooks/
    ├── context/
    ├── utils/
    ├── styles/
    │   ├── tokens.css
    │   ├── global.css
    │   └── themes.css
    └── main.jsx
```

Keep API calls out of page components where practical. Each feature should have its own components, API functions, validation schemas, and hooks where useful.

---

## 6. Frontend Integration Requirements

Even before the backend is complete, prepare the frontend for real integration.

- Create a shared Axios instance with a configurable API base URL
- Keep API service functions separate from UI components
- Define consistent request and response shapes through documented JavaScript shapes and validation schemas
- Handle 401, 403, 404, 422, and 500 responses
- Display loading, success, empty, and error states
- Use server-side pagination, sorting, and filtering for large lists
- Keep mock data in separate files and never mix it into production API responses
- Avoid hardcoded authentication states or fake successful API calls
- Use environment variables for frontend configuration, remembering that Vite-exposed variables are public and must not contain secrets

**Suggested frontend environment variable**

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

This is appropriate for local development. The production value should point to the deployed API.
