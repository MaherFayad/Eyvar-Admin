/**
 * **A ledger's empty state asks TWO questions, and it used to ask one twice.**
 *
 * The branch in `DataTable` read:
 *
 * ```ts
 * status === 'empty' && (table.isFiltered || isLedger ? <no-match/> : <first-run/>)
 * ```
 *
 * `isLedger` OR-ed into the `isFiltered` test means **a ledger-mode table takes
 * the no-match branch whether anything is narrowing or not**, so a rider whose
 * wallet has never moved read `No movements match this search.` with an empty
 * search box, and the declared first-run — heading, body and a way back to
 * wallets — was unreachable code. `mode` was standing in for `isFiltered`; they
 * are not the same question.
 *
 * The reading it came from, `10-financials-money-flows.md` §9.2's *"a ledger is
 * NEVER first-run empty"*, was **narrowed by LR-1** in that same file: it is
 * true of a **platform** ledger and was generalised from one. **AC-427**
 * requires a party-subject ledger to render first-run, and **LR-2** puts the
 * decision on the subject's lifetime — a server fact, not a mode.
 *
 * ## Why all four cases, and not the obvious one
 *
 * The first case alone passes against a table that has simply been flipped to
 * *always* show first-run, which would be the same defect with the sign
 * reversed and would take the four Financials ledgers with it: a quiet month on
 * a wallet with years of history would announce `No money has moved through
 * this wallet` under a header carrying a real opening balance (**D-F29**). So
 * the filtered half is asserted beside it, and so is the `emptyKind="no-match"`
 * declaration that the Financials ledgers now carry — the one that says *this
 * subject has history, so an unfiltered zero here is still a narrowed empty.*
 *
 * `screens/financials/ledger-rendering.test.tsx`'s AC-427 case covers the same
 * ruling end to end through `LedgerCard`; this one covers the component, where
 * the branch actually lives.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { useIndexTable } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { DataTable, type DataColumn } from '../DataTable'

const t = createTranslator({ dictionary: EN, fallback: EN })

interface Posting {
  id: string
}

const COLUMNS: DataColumn<Posting>[] = [
  { id: 'reference', header: 'Reference', alwaysVisible: true, minWidth: 160, dataType: 'id', cell: (row) => row.id },
  { id: 'balance', header: 'Balance', width: 140, dataType: 'money', cell: () => '0.00' },
]

const BACK_TO_WALLETS = 'Back to wallets'
const FIRST_RUN = {
  heading: 'No money has moved through this wallet',
  body: 'A top-up, a refund to the wallet or a goodwill credit opens it. Nothing has yet.',
  actions: [{ label: BACK_TO_WALLETS, onClick: () => undefined }],
}
const NO_MATCH = 'No movements match this search.'

/**
 * A ledger with **zero rows**, which is the only interesting shape here. The
 * two knobs are the two questions the branch has to ask separately: is anything
 * narrowing (`query`), and has the call site declared that an unfiltered zero
 * on this table is still a narrowed empty (`emptyKind`).
 */
function Ledger({ query = '', emptyKind }: { query?: string; emptyKind?: 'no-match' }) {
  const table = useIndexTable({
    mode: 'ledger',
    urlState: false,
    initialQuery: query,
    /* 0 so `isFiltered` is true on the first render, with no timers to advance. */
    searchDebounceMs: 0,
  })
  return (
    <DataTable
      table={table}
      rows={[]}
      columns={COLUMNS}
      getRowId={(row: Posting) => row.id}
      status="empty"
      total={0}
      t={t}
      language="en"
      tableId="ledger-empty-state"
      searchPlaceholder="Search movements"
      emptyKind={emptyKind}
      firstRun={FIRST_RUN}
      noMatch={{ message: NO_MATCH }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

describe('AC-427 / LR-1 — a ledger asks "is this filtered" and "is this a ledger" separately', () => {
  it('renders the declared FIRST-RUN when a ledger is empty and nothing is narrowing', () => {
    render(<Ledger />)

    expect(screen.getByText(FIRST_RUN.heading)).toBeTruthy()
    expect(screen.getByText(FIRST_RUN.body)).toBeTruthy()
    /* §11.1 wants at least one action, and it is the whole point of the state:
       the operator is told where the money is worked instead of being told
       their empty search matched nothing. */
    expect(screen.getByRole('button', { name: BACK_TO_WALLETS })).toBeTruthy()

    expect(
      screen.queryByText(NO_MATCH),
      'told they searched for something when the box is empty',
    ).toBeNull()
  })

  it('renders NO-MATCH on the same ledger once a search is narrowing it', () => {
    render(<Ledger query="WTX-4002" />)

    expect(screen.getByText(NO_MATCH)).toBeTruthy()

    /* R8: filtered-to-zero is one grey sentence. The illustration would claim
       the data does not exist, when a search is the only reason it is absent. */
    expect(
      screen.queryByText(FIRST_RUN.heading),
      'the first-run heading over a search that simply missed',
    ).toBeNull()
    expect(screen.queryByRole('button', { name: BACK_TO_WALLETS })).toBeNull()
  })

  it('honours emptyKind="no-match" on an unfiltered ledger — LR-2, the quiet window', () => {
    render(<Ledger emptyKind="no-match" />)

    expect(screen.getByText(NO_MATCH)).toBeTruthy()
    expect(
      screen.queryByText(FIRST_RUN.heading),
      'D-F29: a quiet period claiming the subject has no history',
    ).toBeNull()
  })

  it('still defaults an index table to first-run, so the fix is scoped to the branch', () => {
    function Index() {
      const table = useIndexTable<Posting>({
        mode: 'index',
        getRowId: (row) => row.id,
        urlState: false,
      })
      return (
        <DataTable
          table={table}
          rows={[]}
          columns={COLUMNS}
          getRowId={(row: Posting) => row.id}
          status="empty"
          total={0}
          t={t}
          language="en"
          tableId="index-empty-state"
          searchPlaceholder="Search"
          firstRun={FIRST_RUN}
          noMatch={{ message: NO_MATCH }}
          error={{ message: 'e', onRetry: () => undefined }}
        />
      )
    }

    render(<Index />)
    expect(screen.getByText(FIRST_RUN.heading)).toBeTruthy()
    expect(screen.queryByText(NO_MATCH)).toBeNull()
  })
})
