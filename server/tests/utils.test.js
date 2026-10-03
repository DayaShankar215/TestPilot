import { describe, expect, it } from 'vitest'
import { ApiError } from '../src/utils/apiError.js'
import { buildMeta, paginate, parseListQuery, searchWhere, toCsv } from '../src/utils/pagination.js'
import { hostOf, isValidUrl, nextRef, sha256, shortCode } from '../src/utils/ids.js'
import { ApiError as AliasedApiError } from '../src/utils/apiError.js'

describe('pagination helpers', () => {
  it('clamps page size and computes skip', () => {
    const parsed = parseListQuery({ page: '3', pageSize: '9999' }, { defaultSort: { createdAt: 'desc' } })
    expect(parsed.page).toBe(3)
    expect(parsed.pageSize).toBe(200)
    expect(parsed.skip).toBe(400)
  })

  it('rejects untrusted sort columns by falling back to the default', () => {
    const parsed = parseListQuery({ sortBy: 'passwordHash' }, { sortable: ['createdAt'], defaultSort: { createdAt: 'desc' } })
    expect(parsed.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('builds page metadata', () => {
    expect(buildMeta({ page: 2, pageSize: 10, total: 25 })).toEqual({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrevious: true,
    })
  })

  it('slices an in-memory collection', () => {
    const items = Array.from({ length: 25 }, (_unused, index) => index)
    const { items: page, meta } = paginate(items, { page: 3, pageSize: 10 })
    expect(page).toEqual([20, 21, 22, 23, 24])
    expect(meta.totalPages).toBe(3)
  })

  it('builds an insensitive multi-field search filter', () => {
    expect(searchWhere('wallet', ['title', 'description'])).toEqual({
      OR: [
        { title: { contains: 'wallet', mode: 'insensitive' } },
        { description: { contains: 'wallet', mode: 'insensitive' } },
      ],
    })
    expect(searchWhere('', ['title'])).toBeUndefined()
  })

  it('escapes CSV cells containing separators or quotes', () => {
    const csv = toCsv([{ ref: 'TC-1', title: 'Login, then "retry"' }], [
      { key: 'ref', label: 'Ref' },
      { key: 'title', label: 'Title' },
    ])
    expect(csv).toBe('Ref,Title\nTC-1,"Login, then ""retry"""')
  })
})

describe('reference generation', () => {
  it('increments the highest existing ref', () => {
    expect(nextRef('TC', ['TC-1', 'TC-1041', 'TC-9'])).toBe('TC-1042')
  })

  it('starts at 1 when nothing matches', () => {
    expect(nextRef('BUG', ['REQ-1'])).toBe('BUG-1')
  })
})

describe('url helpers', () => {
  it('accepts http and https only', () => {
    expect(isValidUrl('https://example.com/x')).toBe(true)
    expect(isValidUrl('file:///etc/passwd')).toBe(false)
    expect(isValidUrl('javascript:alert(1)')).toBe(false)
  })

  it('extracts the hostname', () => {
    expect(hostOf('https://app.testpilot.dev/login')).toBe('app.testpilot.dev')
    expect(hostOf('nonsense')).toBe('')
  })
})

describe('token helpers', () => {
  it('hashes deterministically and differently per input', () => {
    expect(sha256('abc')).toBe(sha256('abc'))
    expect(sha256('abc')).not.toBe(sha256('abcd'))
    expect(sha256('abc')).toHaveLength(64)
  })

  it('generates url-safe short codes', () => {
    const code = shortCode()
    expect(code).toHaveLength(12)
    expect(code).toMatch(/^[a-z0-9]+$/)
  })
})

describe('ApiError', () => {
  it('maps factory methods to status and code', () => {
    expect(ApiError.notFound().status).toBe(404)
    expect(ApiError.conflict().code).toBe('CONFLICT')
    expect(ApiError.validation([{ field: 'email', message: 'bad' }]).status).toBe(422)
    expect(ApiError.validation([{ field: 'email', message: 'bad' }]).details.fieldErrors).toHaveLength(1)
  })

  it('is a single module, not a duplicated class', () => {
    expect(ApiError).toBe(AliasedApiError)
  })
})