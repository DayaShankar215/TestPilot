export const PROJECT_STATUS = {
  planning: { label: 'Planning', tone: 'info', description: 'Scope being defined' },
  active: { label: 'Active', tone: 'success', description: 'In active QA cycle' },
  paused: { label: 'Paused', tone: 'warning', description: 'Temporarily on hold' },
  completed: { label: 'Completed', tone: 'accent', description: 'Scope delivered' },
  archived: { label: 'Archived', tone: 'neutral', description: 'Read-only' },
}

export const REQUIREMENT_STATUS = {
  draft: { label: 'Draft', tone: 'neutral' },
  review: { label: 'In Review', tone: 'info' },
  approved: { label: 'Approved', tone: 'accent' },
  in_progress: { label: 'In Progress', tone: 'highlight' },
  implemented: { label: 'Implemented', tone: 'highlight' },
  verified: { label: 'Verified', tone: 'success' },
  obsolete: { label: 'Obsolete', tone: 'neutral' },
}

export const PRIORITY = {
  critical: { label: 'Critical', tone: 'danger', weight: 4 },
  high: { label: 'High', tone: 'warning', weight: 3 },
  medium: { label: 'Medium', tone: 'info', weight: 2 },
  low: { label: 'Low', tone: 'neutral', weight: 1 },
}

export const TEST_CASE_STATUS = {
  draft: { label: 'Draft', tone: 'neutral' },
  review: { label: 'In Review', tone: 'info' },
  approved: { label: 'Approved', tone: 'success' },
  deprecated: { label: 'Deprecated', tone: 'warning' },
}

export const TEST_CASE_TYPE = {
  functional: { label: 'Functional' },
  positive: { label: 'Positive' },
  negative: { label: 'Negative' },
  boundary: { label: 'Boundary' },
  integration: { label: 'Integration' },
  regression: { label: 'Regression' },
}

export const TEST_RESULT = {
  pass: { label: 'Pass', tone: 'success' },
  fail: { label: 'Fail', tone: 'danger' },
  blocked: { label: 'Blocked', tone: 'warning' },
  not_run: { label: 'Not Run', tone: 'neutral' },
}

export const TEST_RUN_STATUS = {
  planned: { label: 'Planned', tone: 'neutral' },
  in_progress: { label: 'In Progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  aborted: { label: 'Aborted', tone: 'warning' },
}

export const SEVERITY = {
  critical: { label: 'Critical', tone: 'danger' },
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'info' },
  trivial: { label: 'Trivial', tone: 'neutral' },
}

export const DEFECT_STATUS = {
  new: { label: 'New', tone: 'danger' },
  triaged: { label: 'Triaged', tone: 'info' },
  in_progress: { label: 'In Progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'accent' },
  verified: { label: 'Verified', tone: 'success' },
  reopened: { label: 'Reopened', tone: 'danger' },
  closed: { label: 'Closed', tone: 'success' },
  deferred: { label: 'Deferred', tone: 'warning' },
}

export const JOB_STATUS = {
  queued: { label: 'Queued', tone: 'neutral' },
  running: { label: 'Running', tone: 'info' },
  passed: { label: 'Passed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  timed_out: { label: 'Timed Out', tone: 'warning' },
}

export const ENVIRONMENT = {
  dev: { label: 'Development' },
  qa: { label: 'QA' },
  staging: { label: 'Staging' },
  production: { label: 'Production' },
}

export const MEMBERSHIP_ROLE = {
  admin: { label: 'Admin', tone: 'danger' },
  manager: { label: 'Manager', tone: 'accent' },
  tester: { label: 'Tester', tone: 'highlight' },
  developer: { label: 'Developer', tone: 'info' },
  viewer: { label: 'Viewer', tone: 'neutral' },
}

export const CONFIDENCE = {
  high: { label: 'High confidence', tone: 'success' },
  medium: { label: 'Medium confidence', tone: 'warning' },
  low: { label: 'Low confidence', tone: 'neutral' },
}

export const REGRESSION_IMPACT = {
  direct: { label: 'Direct change', tone: 'danger' },
  dependency: { label: 'Dependency impact', tone: 'warning' },
  adjacent: { label: 'Adjacent module', tone: 'info' },
}

export function toneOf(map, key) {
  return map[key]?.tone ?? 'neutral'
}

export function labelOf(map, key, fallback = 'Unknown') {
  return map[key]?.label ?? fallback
}

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export const DATE_FORMATS = [
  { value: 'yyyy-MM-dd', label: '2026-03-14 (ISO)' },
  { value: 'dd MMM yyyy', label: '14 Mar 2026' },
  { value: 'MMM d, yyyy', label: 'Mar 14, 2026' },
  { value: 'dd/MM/yyyy', label: '14/03/2026' },
]

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
