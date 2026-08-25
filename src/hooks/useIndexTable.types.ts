/**
 * Compile-time assertions for **AC-48**. This file runs nothing; it fails
 * `npx tsc -b --noEmit` if any of the constructions below start compiling.
 *
 * `@ts-expect-error` is the assertion: it is itself an error when the line it
 * marks has **no** error. So if someone "helpfully" relaxes `LedgerTableOptions`
 * or adds a `selectedIds` to `LedgerTable`, the build breaks here and names the
 * rule, rather than a checkbox quietly appearing on a wallet ledger in Phase 1.
 *
 * A runtime test cannot make this assertion. `useIndexTable.test.ts` checks that
 * the members are absent at runtime; this checks that asking for them does not
 * type-check, which is what "structurally unable" means.
 */

import { useIndexTable } from './useIndexTable'

interface Row {
  id: string
}

/* Never called. Exported so `noUnusedLocals` stays satisfied. */
export function ledgerModeIsStructurallyUnableToSelectSortOrAct(): void {
  const ledger = useIndexTable({ mode: 'ledger' })

  // §8.3.3 / AC-48: no selection.
  // @ts-expect-error a ledger has no selection
  void ledger.selectedIds
  // @ts-expect-error a ledger has no selection count
  void ledger.selectedCount
  // @ts-expect-error a ledger cannot toggle a row
  void ledger.toggleRow
  // @ts-expect-error a ledger has no bulk bar to clear
  void ledger.clearSelection
  // @ts-expect-error a ledger has no header checkbox
  void ledger.pageSelectionState

  // §8.3.3 / AC-48: no user-controlled sorting.
  // @ts-expect-error a ledger is not user-sortable
  void ledger.sort
  // @ts-expect-error a ledger header is not a control
  void ledger.setSortField
  // @ts-expect-error a ledger header is not a control
  void ledger.setSortDirection

  // The flags are literal `false`, not `boolean` — no branch can make them true.
  const canSelect: false = ledger.canSelect
  const canSort: false = ledger.canSort
  const canRowAction: false = ledger.canRowAction
  void canSelect
  void canSort
  void canRowAction

  // ...and asking for the capability in the options is rejected too.
  // @ts-expect-error a ledger cannot declare an initial sort
  useIndexTable({ mode: 'ledger', initialSort: { field: 'date', dir: 'asc' } })
  // @ts-expect-error a ledger has no row identity because it has no selection
  useIndexTable({ mode: 'ledger', getRowId: (row: Row) => row.id })
}

/* A queue gets a checkbox column only where every bulk action is claim/assign. */
export function queueSelectionIsOptIn(): void {
  const plain = useIndexTable<Row>({ mode: 'queue', getRowId: (row) => row.id })
  // @ts-expect-error §9.3 — no bulk claim declared, so no checkbox column
  void plain.selectedIds

  const claimable = useIndexTable<Row>({ mode: 'queue', getRowId: (row) => row.id, bulkClaim: true })
  void claimable.selectedIds
  const canSelect: true = claimable.canSelect
  void canSelect
}

/* An index table has all three, which is what makes the ledger's absence meaningful. */
export function indexModeHasTheFurniture(): void {
  const index = useIndexTable<Row>({ mode: 'index', getRowId: (row) => row.id })
  void index.selectedIds
  void index.sort
  void index.setSortField
  const canSelect: true = index.canSelect
  void canSelect
}
