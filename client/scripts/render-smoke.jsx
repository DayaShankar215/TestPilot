import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../src/context/AuthContext.jsx'
import { ThemeProvider } from '../src/context/ThemeContext.jsx'
import { ToastProvider } from '../src/context/ToastContext.jsx'
import { PermissionsProvider } from '../src/context/PermissionsContext.jsx'
import { ActiveProjectProvider } from '../src/context/ActiveProjectContext.jsx'
import { DashboardLayout } from '../src/layouts/DashboardLayout.jsx'
import { storage } from '../src/services/storage.js'
import { db } from '../src/services/mock/db.js'

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

const project = db.projects[0]
const requirement = db.requirements.find((item) => item.projectId === project.id)
const testCase = db.testCases.find((item) => item.projectId === project.id)
const run = db.testRuns.find((item) => item.projectId === project.id)
const defect = db.defects.find((item) => item.projectId === project.id)
const job = db.automationJobs[0]

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
  { path: `/projects/${project.id}`, element: <ProjectDetailPage /> },
  { path: `/projects/${project.id}/settings`, element: <SettingsPage /> },
  { path: `/projects/${project.id}/requirements`, element: <RequirementsPage /> },
  { path: `/requirements/${requirement.id}`, element: <RequirementDetailPage /> },
  { path: `/projects/${project.id}/test-cases`, element: <TestCasesPage /> },
  { path: `/projects/${project.id}/test-cases/new`, element: <TestCaseFormPage /> },
  { path: `/test-cases/${testCase.id}`, element: <TestCaseDetailPage /> },
  { path: `/projects/${project.id}/ai-test-generator`, element: <AiGeneratorPage /> },
  { path: `/projects/${project.id}/test-runs`, element: <TestRunsPage /> },
  { path: `/projects/${project.id}/test-runs/new`, element: <TestRunFormPage /> },
  { path: `/test-runs/${run.id}`, element: <TestRunDetailPage /> },
  { path: `/projects/${project.id}/defects`, element: <DefectsPage /> },
  { path: `/projects/${project.id}/defects/new`, element: <DefectFormPage /> },
  { path: `/defects/${defect.id}`, element: <DefectDetailPage /> },
  { path: `/projects/${project.id}/regression`, element: <RegressionPlannerPage /> },
  { path: `/projects/${project.id}/automation`, element: <AutomationPage /> },
  { path: `/automation/jobs/${job.id}`, element: <AutomationJobPage /> },
  { path: `/projects/${project.id}/reports`, element: <ReportsPage /> },
  { path: `/projects/${project.id}/release-readiness`, element: <ReleaseReadinessPage /> },
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
    storage.setToken('mock.smoke.token')
    storage.setUser(db.users[0])
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