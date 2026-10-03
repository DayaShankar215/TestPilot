import { Prisma } from '@prisma/client'

/**
 * Table names straight from the Prisma DMMF, so the list can never drift from
 * `schema.prisma`. `dbName` is the `@@map` value when one is set.
 */
export const prismaTableNames = Prisma.dmmf.datamodel.models
  .map((model) => model.dbName ?? model.name)
  .sort((a, b) => a.localeCompare(b))

/** Field name per table, for scripts that need to select columns. */
export function columnsForTable(table) {
  const model = Prisma.dmmf.datamodel.models.find((item) => (item.dbName ?? item.name) === table)
  return model ? model.fields.map((field) => field.name) : []
}