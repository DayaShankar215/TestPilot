import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Checkbox } from '../forms/FormControls'

export function DataTable({
  columns,
  rows,
  loading = false,
  empty,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId = (row) => row.id,
  onRowClick,
  compact = false,
  caption,
  sortKey,
  sortDir = 'asc',
}) {
  const allSelected = rows.length > 0 && selectedIds.length === rows.length
  const someSelected = selectedIds.length > 0 && !allSelected

  const toggleAll = () => {
    if (!onSelectionChange) return
    if (allSelected) onSelectionChange([])
    else onSelectionChange(rows.map(getRowId))
  }

  const toggleRow = (rowId) => {
    if (!onSelectionChange) return
    if (selectedIds.includes(rowId)) onSelectionChange(selectedIds.filter((id) => id !== rowId))
    else onSelectionChange([...selectedIds, rowId])
  }

  return (
    <div className="table-wrap">
      <table className={cn('table', compact && 'table--compact')}>
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {selectable && (
              <th style={{ width: 44 }}>
                <Checkbox
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                  data-indeterminate={someSelected || undefined}
                />
              </th>
            )}
            {columns.map((column) => {
              const isSorted = column.sortKey && column.sortKey === sortKey
              return (
                <th
                  key={column.key}
                  style={{ width: column.width, textAlign: column.align === 'right' ? 'right' : undefined }}
                  aria-sort={
                    isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : column.sortable ? 'none' : undefined
                  }
                >
                  {column.sortable ? (
                    <button type="button" className="table__sort" onClick={() => column.onSort?.(column.sortKey)}>
                      {column.header}
                      {isSorted ? (
                        sortDir === 'asc' ? (
                          <ArrowUp size={13} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={13} aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown size={13} aria-hidden="true" opacity={0.5} />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowId = getRowId(row)
            return (
              <tr
                key={rowId}
                data-selected={selectedIds.includes(rowId)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {selectable && (
                  <td onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(rowId)}
                      onChange={() => toggleRow(rowId)}
                      aria-label={`Select row ${rowId}`}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={cn(column.align === 'right' && 'table__cell--numeric')}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {!loading && rows.length === 0 && empty}
    </div>
  )
}

export function DataTableSkeleton({ rows = 8, columns = 6 }) {
  return (
    <div className="table-wrap" aria-busy="true">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th key={index}>
                <span className="skeleton" style={{ display: 'block', width: '65%', height: 10 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }, (_, columnIndex) => (
                <td key={columnIndex}>
                  <span
                    className="skeleton"
                    style={{ display: 'block', width: columnIndex === 0 ? '80%' : '55%', height: 12 }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
