import { createContext, useCallback, useContext, useMemo } from 'react'
import { MEMBERSHIP_ROLE } from '../utils/constants'
import { useAuth } from './AuthContext'

const PermissionsContext = createContext(null)

const MATRIX = {
  admin: {
    'project:create': true,
    'project:edit': true,
    'project:archive': true,
    'requirement:write': true,
    'testCase:write': true,
    'testRun:write': true,
    'defect:write': true,
    'automation:run': true,
    'automation:configure': true,
    'ai:generate': true,
    'report:export': true,
    'member:manage': true,
    'workspace:manage': true,
  },
  manager: {
    'project:create': true,
    'project:edit': true,
    'project:archive': true,
    'requirement:write': true,
    'testCase:write': true,
    'testRun:write': true,
    'defect:write': true,
    'automation:run': true,
    'automation:configure': true,
    'ai:generate': true,
    'report:export': true,
    'member:manage': false,
    'workspace:manage': false,
  },
  tester: {
    'project:create': false,
    'project:edit': false,
    'project:archive': false,
    'requirement:write': true,
    'testCase:write': true,
    'testRun:write': true,
    'defect:write': true,
    'automation:run': true,
    'automation:configure': false,
    'ai:generate': true,
    'report:export': true,
    'member:manage': false,
    'workspace:manage': false,
  },
  developer: {
    'project:create': false,
    'project:edit': false,
    'project:archive': false,
    'requirement:write': true,
    'testCase:write': true,
    'testRun:write': true,
    'defect:write': true,
    'automation:run': true,
    'automation:configure': false,
    'ai:generate': false,
    'report:export': true,
    'member:manage': false,
    'workspace:manage': false,
  },
  viewer: {
    'project:create': false,
    'project:edit': false,
    'project:archive': false,
    'requirement:write': false,
    'testCase:write': false,
    'testRun:write': false,
    'defect:write': false,
    'automation:run': false,
    'automation:configure': false,
    'ai:generate': false,
    'report:export': false,
    'member:manage': false,
    'workspace:manage': false,
  },
}

export function PermissionsProvider({ children }) {
  const { user } = useAuth()

  const can = useCallback(
    (ability) => {
      if (!user) return false
      return MATRIX[user.role]?.[ability] ?? false
    },
    [user],
  )

  const value = useMemo(
    () => ({
      can,
      role: user?.role ?? 'viewer',
      roleLabel: MEMBERSHIP_ROLE[user?.role]?.label ?? 'Viewer',
      isAdmin: user?.role === 'admin',
      isManager: user?.role === 'admin' || user?.role === 'manager',
    }),
    [can, user],
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) throw new Error('usePermissions must be used inside PermissionsProvider')
  return context
}

export function useCan(ability) {
  return usePermissions().can(ability)
}
