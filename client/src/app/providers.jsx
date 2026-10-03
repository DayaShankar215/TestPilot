import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import { ToastProvider } from '../context/ToastContext'
import { PermissionsProvider } from '../context/PermissionsContext'
import { ActiveProjectProvider } from '../context/ActiveProjectContext'
import { ToastViewport } from '../components/feedback/ToastViewport'

export function AppProviders({ children }) {
  return (
    <StrictMode>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <PermissionsProvider>
                <ActiveProjectProvider>{children}</ActiveProjectProvider>
              </PermissionsProvider>
            </AuthProvider>
          </BrowserRouter>
          <ToastViewport />
        </ToastProvider>
      </ThemeProvider>
    </StrictMode>
  )
}