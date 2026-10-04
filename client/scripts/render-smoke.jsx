import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../src/context/AuthContext.jsx'
import { ThemeProvider } from '../src/context/ThemeContext.jsx'
import { ToastProvider } from '../src/context/ToastContext.jsx'
import { PermissionsProvider } from '../src/context/PermissionsContext.jsx'
import { ActiveProjectProvider } from '../src/context/ActiveProjectContext.jsx'
import { DashboardLayout } from '../src/layouts/DashboardLayout.jsx'
import { storage } from '../src/services/storage.js'

import { LoginPage } from '../src/features/auth/pages/LoginPage.jsx'
import { RegisterPage } from '../src/features/auth/pages/RegisterPage.jsx'
import { ForgotPasswordPage } from '../src/features/auth/pages/ForgotPasswordPage.jsx'
import { ResetPasswordPage } from '../src/features/auth/pages/ResetPasswordPage.jsx'
import { DashboardPage } from '../src/features/dashboard/pages/DashboardPage.jsx'
import { ProjectsPage } from '../src/features/projects/pages/ProjectsPage.jsx'
import { ProjectFormPage } from '../src/features/projects/pages/ProjectFormPage.jsx'
import { ProjectDetailPage } from '../src/features/projects/pages/ProjectDetailPage.jsx'
import { RequirementsPage, RequirementDetailPage } from '../src/features/requirements/pages/RequirementsPage.jsx'
import { TestCasesPage, TestCaseFormPage, TestCaseDetailPage } from '../src/features/testCases/pages/TestCasesPage.jsx'
import { AiGeneratorPage } from '../src/features/aiGenerator/pages/AiGeneratorPage.jsx'
import { TestRunsPage, TestRunFormPage, TestRunDetailPage } from '../src/features/testRuns/pages/TestRunsPage.jsx'
import { DefectsPage, DefectFormPage, DefectDetailPage } from '../src/features/defects/pages/DefectsPage.jsx'
import { RegressionPlannerPage } from '../src/features/regression/pages/RegressionPlannerPage.jsx'
import { AutomationPage, AutomationJobPage } from '../src/features/automation/pages/AutomationPage.jsx'
import { ReportsPage, ReleaseReadinessPage } from '../src/features/reports/pages/ReportsPage.jsx'
import { SettingsPage } from '../src/features/settings/pages/SettingsPage.jsx'

// Route params only need to be well-formed: `useApi` never resolves during
// `renderToStaticMarkup`, so these pages render their loading state. Use real
// ids from the API when it is reachable so the smoke doubles as a data check.
const API = process.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'
const PLACEHOLDER = 'cm0000000000000000000test'

async function loadRouteIds() {
  const email = process.env.SMOKE_EMAIL
  const password = process.env.SMOKE_PASSWORD
  const fallbacks = {
    project: PLACEHOLDER,
    requirement: PLACEHOLDER,
    testCase: PLACEHOLDER,
    run: PLACEHOLDER,
    defect: PLACEHOLDER,
    job: PLACEHOLDER,
  }
  if (!email || !password) {
    console.log('note: SMOKE_EMAIL/SMOKE_PASSWORD not set; using placeholder route ids.\n')
    return fallbacks
  }

  try {
    const login = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!login.ok) throw new Error(`login returned ${login.status}`)

    // The session id is HttpOnly; the CSRF cookie is readable and echoed for reads.
    const csrf = login.headers
      .getSetCookie()
      .map((raw) => raw.split(';')[0])
      .find((pair) => pair.startsWith('testpilot_csrf='))
      ?.split('=')[1]
    const cookie = login.headers.getSetCookie().map((raw) => raw.split(';')[0]).join('; ')

    const get = async (path) => {
      const response = await fetch(`${API}${path}`, { headers: { cookie, ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}) } })
      const body = await response.json()
      if (!response.ok) throw new Error(`${path} returned ${response.status}`)
      return body
    }

    const projectId = (await get('/projects?pageSize=1'))?.data?.items?.[0]?.id ?? PLACEHOLDER
    const paths = {
      requirement: `/projects/${projectId}/requirements?pageSize=1`,
      testCase: `/projects/${projectId}/test-cases?pageSize=1`,
      run: `/projects/${projectId}/test-runs?pageSize=1`,
      defect: `/projects/${projectId}/defects?pageSize=1`,
      job: `/projects/${projectId}/automation/jobs?pageSize=1`,
    }
    const ids = { project: projectId }
    await Promise.all(
      Object.entries(paths).map(async ([key, path]) => {
        ids[key] = (await get(path))?.data?.items?.[0]?.id ?? PLACEHOLDER
      }),
    )
    return ids
  } catch (error) {
    console.log(`note: could not load live ids (${error.message}); using placeholder route ids.\n`)
    return fallbacks
  }
}

const { project, requirement, testCase, run, defect, job } = await loadRouteIds()

const publicRoutes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password?email=arun.mehta%40testpilot.dev', element: <ResetPasswordPage /> },
]

const appRoutes = [
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/projects', element: <ProjectsPage /> },
  { path: '/projects/new', element: <ProjectFormPage /> },
  { path: `/projects/${project}`, element: <ProjectDetailPage /> },
  { path: `/projects/${project}/settings`, element: <SettingsPage /> },
  { path: `/projects/${project}/requirements`, element: <RequirementsPage /> },
  { path: `/requirements/${requirement}`, element: <RequirementDetailPage /> },
  { path: `/projects/${project}/test-cases`, element: <TestCasesPage /> },
  { path: `/projects/${project}/test-cases/new`, element: <TestCaseFormPage /> },
  { path: `/projects/${project}/test-cases/${testCase}`, element: <TestCaseDetailPage /> },
  { path: `/projects/${project}/ai-test-generator`, element: <AiGeneratorPage /> },
  { path: `/projects/${project}/test-runs`, element: <TestRunsPage /> },
  { path: `/projects/${project}/test-runs/new`, element: <TestRunFormPage /> },
  { path: `/projects/${project}/test-runs/${run}`, element: <TestRunDetailPage /> },
  { path: `/projects/${project}/defects`, element: <DefectsPage /> },
  { path: `/projects/${project}/defects/new`, element: <DefectFormPage /> },
  { path: `/projects/${project}/defects/${defect}`, element: <DefectDetailPage /> },
  { path: `/projects/${project}/regression`, element: <RegressionPlannerPage /> },
  { path: `/projects/${project}/automation`, element: <AutomationPage /> },
  { path: `/projects/${project}/automation/jobs/${job}`, element: <AutomationJobPage /> },
  { path: `/projects/${project}/reports`, element: <ReportsPage /> },
  { path: `/projects/${project}/release-readiness`, element: <ReleaseReadinessPage /> },
  { path: '/settings/members', element: <SettingsPage /> },
  { path: '/settings/workspace', element: <SettingsPage /> },
  { path: '/settings/notifications', element: <SettingsPage /> },
  { path: '/settings/preferences', element: <SettingsPage /> },
]

function withProviders(children, path) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <PermissionsProvider>
              <ActiveProjectProvider>{children}</ActiveProjectProvider>
            </PermissionsProvider>
          </AuthProvider>
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}

let failures = 0

function render(label, path, element, { authenticated }) {
  if (authenticated) {
    storage.setUser({ id: PLACEHOLDER, name: "Smoke User", email: "smoke@testpilot.dev", role: "OWNER" })
  } else {
    storage.clearSession()
  }

  try {
    const tree =
      authenticated === false
        ? withProviders(<Routes><Route path={path.split('?')[0]} element={element} /></Routes>, path)
        : withProviders(
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route path={path} element={element} />
              </Route>
            </Routes>,
            path,
          )
    const html = renderToStaticMarkup(tree)
    console.log(` ok  ${label} (${html.length} chars)`)
  } catch (error) {
    failures += 1
    console.log(`FAIL ${label} -> ${error.message?.split('\n')[0]}`)
    if (error.stack) console.log(`     ${error.stack.split('\n').slice(1, 4).join('\n     ')}`)
  }
}

for (const { path, element } of publicRoutes) {
  render(path, path, element, { authenticated: false })
}

for (const { path, element } of appRoutes) {
  render(path, path, element, { authenticated: true })
}

console.log(`\n${appRoutes.length + publicRoutes.length - failures}/${appRoutes.length + publicRoutes.length} routes rendered.`)
process.exit(failures === 0 ? 0 : 1)