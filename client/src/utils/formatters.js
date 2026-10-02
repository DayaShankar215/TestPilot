import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

export function toDate(value) {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : new Date(value)
  return isValid(date) ? date : null
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  const date = toDate(value)
  return date ? format(date, pattern) : '—'
}

export function formatDateTime(value, pattern = 'dd MMM yyyy, HH:mm') {
  const date = toDate(value)
  return date ? format(date, pattern) : '—'
}

export function timeAgo(value) {
  const date = toDate(value)
  if (!date) return '—'
  return formatDistanceToNow(date, { addSuffix: true })
}

export function relativeDate(value) {
  const date = toDate(value)
  return date ? format(date, 'yyyy-MM-dd HH:mm') : '—'
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${Number(value).toFixed(digits)}%`
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes < 60) return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_COLORS = [
  '#24406b',
  '#4236b1',
  '#14716e',
  '#b45309',
  '#7c3aed',
  '#0e7490',
  '#b91c1c',
  '#15803d',
]

export function avatarColor(seed = '') {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function titleCase(value = '') {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function truncate(value = '', length = 120) {
  if (!value || value.length <= length) return value
  return `${value.slice(0, length).trimEnd()}…`
}

export function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}

export function uniqueBy(items, keyFn) {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function downloadCsv(filename, rows, columns) {
  const header = columns.map((column) => `"${column.label}"`).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = column.value(row)
          const text = value === null || value === undefined ? '' : String(value)
          return `"${text.replace(/"/g, '""')}"`
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function daysBetween(a, b) {
  const start = toDate(a)
  const end = toDate(b)
  if (!start || !end) return 0
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
}
