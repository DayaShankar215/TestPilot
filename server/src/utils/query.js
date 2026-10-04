import { prisma } from '../config/database.js'
import { ApiError } from '../utils/apiError.js'

/**
 * Shared list-envelope values for project-scoped endpoints.
 * Every list route returns `meta: { page, pageSize, total, totalPages, hasNext, hasPrevious }`.
 */
export function listMeta({ page, pageSize, total }) {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0
  return { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 }
}

/** Normalises `?page=1&pageSize=25` into Prisma `skip`/`take`. */
export function readPaging(query, { defaultPageSize = 25, maxPageSize = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const requested = Number.parseInt(query.pageSize, 10) || defaultPageSize
  const pageSize = Math.min(Math.max(1, requested), maxPageSize)
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

/** Case-insensitive contains across the given columns. */
export function textSearch(value, columns) {
  if (!value) return undefined
  return { OR: columns.map((column) => ({ [column]: { contains: value, mode: 'insensitive' } })) }
}

/** Whitelisted ORDER BY, falling back to a stable default. */
export function orderBy(query, allowed, fallback) {
  const sortBy = allowed[query.sortBy] ? query.sortBy : fallback
  return { [sortBy]: query.sortDir === 'asc' ? 'asc' : 'desc' }
}

/** Runs a findMany + count pair and returns the standard list envelope. */
export async function paginate(model, { where, select, include, orderBy: order, page, pageSize, skip, take }) {
  const [items, total] = await Promise.all([
    prisma[model].findMany({ where, select, include, orderBy: order, skip, take }),
    prisma[model].count({ where }),
  ])
  return { items, meta: listMeta({ page, pageSize, total }) }
}

/**
 * Next human-readable reference such as `REQ-12`. Counts existing rows rather
 * than using max()+1 so archived or deleted rows cannot cause collisions.
 */
export async function nextRef(model, projectId, prefix) {
  const count = await prisma[model].count({ where: { projectId } })
  return `${prefix}-${count + 1}`
}

export { ApiError }