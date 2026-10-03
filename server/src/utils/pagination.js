const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 200

/**
 * Central list query contract: page, pageSize, search, sortBy, sortDir and any
 * extra filters. Returns Prisma `skip`/`take`/`orderBy` plus the raw filters.
 */
export function parseListQuery(query, { searchFields = [], sortable = [], defaultSort = { createdAt: 'desc' } } = {}) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1)
  const requestedSize = Number.parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE
  const pageSize = Math.min(Math.max(requestedSize, 1), MAX_PAGE_SIZE)

  const filters = {}
  for (const [key, value] of Object.entries(query)) {
    if (['page', 'pageSize', 'search', 'sortBy', 'sortDir', 'format'].includes(key)) continue
    if (value === undefined || value === '') continue
    filters[key] = value
  }

  const sortBy = sortable.includes(query.sortBy) ? query.sortBy : Object.keys(defaultSort)[0]
  const sortDir = String(query.sortDir).toLowerCase() === 'asc' ? 'asc' : 'desc'

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    search: typeof query.search === 'string' ? query.search.trim() : '',
    searchFields,
    filters,
    orderBy: { [sortBy]: sortDir },
  }
}

export function buildMeta({ page, pageSize, total }) {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  }
}

export function paginate(items, { page, pageSize }) {
  const total = items.length
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    meta: buildMeta({ page, pageSize, total }),
  }
}

/** Prisma `where` fragment for a case-insensitive multi-field search. */
export function searchWhere(search, fields) {
  if (!search || fields.length === 0) return undefined
  return {
    OR: fields.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } })),
  }
}

/**
 * Columns are `{ key, label?, value? }`. `value` is an accessor for nested or
 * derived fields; otherwise the row is read by `key`.
 */
export function toCsv(rows, columns) {
  const escape = (value) => {
    if (value === null || value === undefined) return ''
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }

  const cell = (column, row) => (typeof column.value === 'function' ? column.value(row) : row[column.key])

  const header = columns.map((column) => escape(column.label ?? column.key)).join(',')
  const body = rows.map((row) => columns.map((column) => escape(cell(column, row))).join(',')).join('\n')
  return `${header}\n${body}`
}