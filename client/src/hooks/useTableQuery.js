import { useCallback, useMemo, useState } from 'react'

export function useTableQuery({ defaultPageSize = 25, defaultSortBy, defaultSortDir = 'desc', filters = {} } = {}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState(defaultSortBy)
  const [sortDir, setSortDir] = useState(defaultSortDir)
  const [activeFilters, setActiveFilters] = useState(filters)

  const toggleSort = useCallback(
    (column) => {
      setPage(1)
      if (column === sortBy) {
        setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
        return
      }
      setSortBy(column)
      setSortDir('asc')
    },
    [sortBy],
  )

  const updateFilter = useCallback((key, value) => {
    setPage(1)
    setActiveFilters((current) => {
      const next = { ...current }
      if (value === '' || value === null || value === undefined) delete next[key]
      else next[key] = value
      return next
    })
  }, [])

  const resetFilters = useCallback(() => {
    setActiveFilters({})
    setSearch('')
    setPage(1)
  }, [])

  const params = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      sortBy,
      sortDir,
      ...activeFilters,
    }),
    [page, pageSize, search, sortBy, sortDir, activeFilters],
  )

  const hasActiveFilters = Boolean(search) || Object.keys(activeFilters).length > 0

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    sortBy,
    sortDir,
    toggleSort,
    filters: activeFilters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    params,
  }
}
