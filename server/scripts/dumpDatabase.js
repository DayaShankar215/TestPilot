#!/usr/bin/env node
/**
 * Prints every row of every table in the configured database as an aligned
 * ASCII table. Useful for eyeballing what the API actually wrote.
 *
 *   npm.cmd run db:dump                    # all tables, 25 rows each
 *   npm.cmd run db:dump -- --table users   # one table (repeatable)
 *   npm.cmd run db:dump -- --rows 200      # raise the row cap
 *   npm.cmd run db:dump -- --full          # no row cap
 *   npm.cmd run db:dump -- --schema        # counts and columns only, no rows
 *   npm.cmd run db:dump -- --json          # machine-readable
 *   npm.cmd run db:dump -- --reveal        # unmask secrets (debugging only)
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { prismaTableNames } from '../prisma/tableNames.js'

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })

const args = process.argv.slice(2)
const hasFlag = (name) => args.includes(`--${name}`)
const valuesOf = (name) =>
  args.reduce((values, current, index) => (current === `--${name}` ? [...values, args[index + 1]] : values), [])

const options = {
  tables: valuesOf('table'),
  rows: Number.parseInt(valuesOf('rows')[0] ?? '25', 10),
  schemaOnly: hasFlag('schema'),
  full: hasFlag('full'),
  json: hasFlag('json'),
  reveal: hasFlag('reveal'),
}

const MAX_CELL = 40
/** Never print these by default; a database dump is not a secrets manager. */
const SECRET_COLUMNS = new Set(['passwordHash', 'token', 'tokenHash', 'csrfToken'])

function formatCell(value, column, numericHint) {
  if (!options.reveal && SECRET_COLUMNS.has(column)) {
    return { text: value === null ? 'NULL' : '<redacted>', numeric: false }
  }
  if (value === null || value === undefined) return { text: 'NULL', numeric: true }
  if (typeof value === 'boolean') return { text: value ? 'true' : 'false', numeric: true }
  if (typeof value === 'number' || typeof value === 'bigint') return { text: String(value), numeric: true }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { text: `<binary ${value.length}b>`, numeric: false }

  let text
  if (value instanceof Date) text = value.toISOString()
  else if (typeof value === 'object') text = JSON.stringify(value)
  else text = String(value)

  text = text.replace(/\r?\n/g, ' ').replace(/\t/g, ' ').replaceAll('|', '\\|')
  if (text.length > MAX_CELL) text = `${text.slice(0, MAX_CELL - 1)}…`
  return { text, numeric: numericHint ?? false }
}

function renderTable(columns, rows) {
  const cells = rows.map((row) => columns.map((column) => formatCell(row[column], column)))
  const widths = columns.map((column, index) =>
    Math.max(column.length, ...cells.map((row) => row[index].text.length), 3),
  )

  const border = (left, mid, right) => left + widths.map((width) => '─'.repeat(width + 2)).join(mid) + right
  const line = (values) => `│${values.map((value, index) => ` ${value.padEnd(widths[index])} `).join('│')}│`

  const output = [border('┌', '┬', '┐'), line(columns), border('├', '┼', '┤')]
  if (cells.length === 0) output.push(line(columns.map(() => '(no rows)')))
  else for (const row of cells) output.push(line(row.map((cell) => cell.text)))
  output.push(border('└', '┴', '┘'))

  return output.join('\n')
}

/**
 * Identifiers cannot be bound as query parameters, so they are interpolated and
 * escaped by hand. Every table name is checked against the Prisma DMMF list in
 * `main()` before it can reach these queries.
 */
const quoteIdentifier = (table) => `\`${table.replaceAll('`', '')}\``

const countRows = (table) =>
  prisma.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)}`)

const selectRows = (table, limit) =>
  prisma.$queryRawUnsafe(`SELECT * FROM ${quoteIdentifier(table)}${limit ? ` LIMIT ${limit}` : ''}`)

async function columnNamesFor(table) {
  const columns = await prisma.$queryRaw`
    SELECT COLUMN_NAME AS name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}
    ORDER BY ORDINAL_POSITION
  `
  return columns.map((column) => column.name)
}

async function readTable(table) {
  const [{ total }] = await countRows(table)
  const limit = options.full ? undefined : options.rows
  const rows = await selectRows(table, limit)
  const columns = rows.length > 0 ? Object.keys(rows[0]) : await columnNamesFor(table)
  return { table, total: Number(total), rows, columns, truncated: rows.length < Number(total) }
}

async function main() {
  const unknown = options.tables.filter((table) => !prismaTableNames.includes(table))
  if (unknown.length > 0) {
    throw new Error(
      `Unknown table(s): ${unknown.join(', ')}. Known tables: ${prismaTableNames.join(', ')}`,
    )
  }

  const targets = options.tables.length > 0 ? options.tables : prismaTableNames
  const tables = []

  for (const table of targets) {
    // Sequential on purpose: keeps memory flat on large databases.
    // eslint-disable-next-line no-await-in-loop
    tables.push(await readTable(table))
  }

  if (options.json) {
    const payload = Object.fromEntries(
      tables.map(({ table, rows }) => [
        table,
        rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              !options.reveal && SECRET_COLUMNS.has(key) && value !== null ? '<redacted>' : toPlain(value),
            ]),
          ),
        ),
      ]),
    )
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
    return
  }

  const totalRows = tables.reduce((sum, item) => sum + item.total, 0)
  const out = []

  out.push('='.repeat(96))
  out.push('TestPilot database dump')
  out.push(`Database:    ${new URL(process.env.DATABASE_URL).pathname.slice(1)}`)
  out.push(`Tables:      ${tables.length} of ${prismaTableNames.length}`)
  out.push(`Row cap:     ${options.full ? 'none' : options.rows}`)
  out.push(`Secrets:     ${options.reveal ? 'REVEALED' : 'redacted (use --reveal to override)'}`)
  out.push(`Total rows:  ${totalRows}`)
  out.push('='.repeat(96))

  for (const { table, total, rows, columns, truncated } of tables) {
    out.push('')
    out.push(`── ${table} ${'─'.repeat(Math.max(0, 88 - table.length))}`)
    out.push(
      `rows: ${total}${truncated ? ` (showing ${rows.length}${options.full ? '' : `, raise with --rows or --full`})` : ''}`,
    )
    if (!options.schemaOnly) {
      out.push(renderTable(columns, rows))
    } else {
      out.push(columns.map((column) => `  - ${column}`).join('\n'))
    }
  }

  out.push('')
  out.push('='.repeat(96))
  out.push(`Total rows across ${tables.length} table(s): ${totalRows}`)
  out.push('='.repeat(96))

  process.stdout.write(`${out.join('\n')}\n`)
}

function toPlain(value) {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return `<binary ${value.length}b>`
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'object') return JSON.parse(JSON.stringify(value))
  return value
}

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })