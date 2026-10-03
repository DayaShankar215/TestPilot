import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { ProtectedRoute, PublicOnlyRoute } from './app/routeGuards'
import { DashboardLayout } from './layouts/DashboardLayout'
import { Spinner } from './components/common/Spinner'

const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() =>
  import('./features/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('./features/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const DashboardPage = lazy(() =>
  import('./features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const ProjectsPage = lazy(() => import('./features/projects/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })))
const ProjectFormPage = lazy(() =>
  import('./features/projects/pages/ProjectFormPage').then((m) => ({ default: m.ProjectFormPage })),
)
const ProjectDetailPage = lazy(() =>
  import('./features/projects/pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })),
)
const RequirementsPage = lazy(() =>
  import('./features/requirements/pages/RequirementsPage').then((m) => ({ default: m.RequirementsPage })),
)
const RequirementDetailPage = lazy(() =>
  import('./features/requirements/pages/RequirementsPage').then((m) => ({ default: m.RequirementDetailPage })),
)
const TestCasesPage = lazy(() =>
  import('./features/testCases/pages/TestCasesPage').then((m) => ({ default: m.TestCasesPage })),
)
const TestCaseFormPage = lazy(() =>
  import('./features/testCases/pages/TestCasesPage').then((m) => ({ default: m.TestCaseFormPage })),
)
const TestCaseDetailPage = lazy(() =>
  import('./features/testCases/pages/TestCasesPage').then((m) => ({ default: m.TestCaseDetailPage })),
)
const AiGeneratorPage = lazy(() =>
  import('./features/aiGenerator/pages/AiGeneratorPage').then((m) => ({ default: m.AiGeneratorPage })),
)
const TestRunsPage = lazy(() =>
  import('./features/testRuns/pages/TestRunsPage').then((m) => ({ default: m.TestRunsPage })),
)
const TestRunFormPage = lazy(() =>
  import('./features/testRuns/pages/TestRunsPage').then((m) => ({ default: m.TestRunFormPage })),
)
const TestRunDetailPage = lazy(() =>
  import('./features/testRuns/pages/TestRunsPage').then((m) => ({ default: m.TestRunDetailPage })),
)
const DefectsPage = lazy(() => import('./features/defects/pages/DefectsPage').then((m) => ({ default: m.DefectsPage })))
const DefectFormPage = lazy(() =>
  import('./features/defects/pages/DefectsPage').then((m) => ({ default: m.DefectFormPage })),
)
const DefectDetailPage = lazy(() =>
  import('./features/defects/pages/DefectsPage').then((m) => ({ default: m.DefectDetailPage })),
)
const RegressionPlannerPage = lazy(() =>
  import('./features/regression/pages/RegressionPlannerPage').then((m) => ({ default: m.RegressionPlannerPage })),
)
const AutomationPage = lazy(() =>
  import('./features/automation/pages/AutomationPage').then((m) => ({ default: m.AutomationPage })),
)
const AutomationJobPage = lazy(() =>
  import('./features/automation/pages/AutomationPage').then((m) => ({ default: m.AutomationJobPage })),
)
const ReportsPage = lazy(() => import('./features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const ReleaseReadinessPage = lazy(() =>
  import('./features/reports/pages/ReportsPage').then((m) => ({ default: m.ReleaseReadinessPage })),
)
const SettingsPage = lazy(() =>
  import('./features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const NotFoundPage = lazy(() => import('./features/shared/pages/NotFoundPage'))

function RouteFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
      <Spinner size="lg" />
    </div>
  )
}

function Page({ children }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Page>
              <LoginPage />
            </Page>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Page>
              <RegisterPage />
            </Page>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <Page>
              <ForgotPasswordPage />
            </Page>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnlyRoute>
            <Page>
              <ResetPasswordPage />
            </Page>
          </PublicOnlyRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Page><DashboardPage /></Page>} />
        <Route path="/projects" element={<Page><ProjectsPage /></Page>} />
        <Route path="/projects/new" element={<Page><ProjectFormPage /></Page>} />
        <Route path="/projects/:projectId" element={<Page><ProjectDetailPage /></Page>} />
        <Route path="/projects/:projectId/settings" element={<Page><SettingsPage /></Page>} />

        <Route path="/projects/:projectId/requirements" element={<Page><RequirementsPage /></Page>} />
        <Route path="/requirements/:requirementId" element={<Page><RequirementDetailPage /></Page>} />

        <Route path="/projects/:projectId/test-cases" element={<Page><TestCasesPage /></Page>} />
        <Route path="/projects/:projectId/test-cases/new" element={<Page><TestCaseFormPage /></Page>} />
        <Route path="/test-cases/:testCaseId" element={<Page><TestCaseDetailPage /></Page>} />

        <Route path="/projects/:projectId/ai-test-generator" element={<Page><AiGeneratorPage /></Page>} />

        <Route path="/projects/:projectId/test-runs" element={<Page><TestRunsPage /></Page>} />
        <Route path="/projects/:projectId/test-runs/new" element={<Page><TestRunFormPage /></Page>} />
        <Route path="/test-runs/:runId" element={<Page><TestRunDetailPage /></Page>} />

        <Route path="/projects/:projectId/defects" element={<Page><DefectsPage /></Page>} />
        <Route path="/projects/:projectId/defects/new" element={<Page><DefectFormPage /></Page>} />
        <Route path="/defects/:defectId" element={<Page><DefectDetailPage /></Page>} />

        <Route path="/projects/:projectId/regression" element={<Page><RegressionPlannerPage /></Page>} />
        <Route path="/projects/:projectId/automation" element={<Page><AutomationPage /></Page>} />
        <Route path="/automation/jobs/:jobId" element={<Page><AutomationJobPage /></Page>} />
        <Route path="/projects/:projectId/reports" element={<Page><ReportsPage /></Page>} />
        <Route path="/projects/:projectId/release-readiness" element={<Page><ReleaseReadinessPage /></Page>} />

        <Route path="/settings/members" element={<Page><SettingsPage /></Page>} />
        <Route path="/settings/workspace" element={<Page><SettingsPage /></Page>} />
        <Route path="/settings/notifications" element={<Page><SettingsPage /></Page>} />
        <Route path="/settings/preferences" element={<Page><SettingsPage /></Page>} />
      </Route>

      <Route
        path="*"
        element={
          <Page>
            <NotFoundPage />
          </Page>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  )
}