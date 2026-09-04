/**
 * **LR-3 — a ledger's first-run empty declines the illustration, and keeps
 * everything else.**
 *
 * `10-financials-money-flows.md` **LR-3**: *"R8 permits an illustration on a
 * whole-page zero-records-ever state; it does not require one. Financials
 * declines it, because an operator never creates a posting … so the
 * illustration would sit above an action the product does not offer. The
 * heading, the body and the action stay (AC-427)."* **AC-RP-62** and
 * **AC-RP-83** were amended to the same answer for the rider and captain
 * ledgers.
 *
 * ## Why the positive half is asserted in the same test
 *
 * *"No illustration"* passes trivially against an empty state that renders
 * nothing at all — and this component spent a release rendering the WRONG empty
 * for every ledger, so "the branch renders something plausible" is exactly the
 * assumption that has already failed here once. Every case below asserts the
 * heading, the body and the action **and** the absence of the art, so the only
 * way to satisfy it is the state LR-3 actually describes.
 *
 * The illustration is identified by `DefaultIllustration`'s own `viewBox`
 * rather than by `svg`, because the toolbar above the empty state contributes
 * icons of its own — a bare `querySelector('svg')` counts three things and
 * would go green the moment any of them moved.
 */

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { useIndexTable } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { DataTable, type DataColumn } from '../DataTable'
import { LedgerCard } from '@/screens/financials/shared/LedgerCard'

const t = createTranslator({ dictionary: EN, fallback: EN })

interface Posting {
  id: string
}

const COLUMNS: DataColumn<Posting>[] = [
  {
    id: 'reference',
    header: 'Reference',
    alwaysVisible: true,
    minWidth: 160,
    dataType: 'id',
    cell: (row) => row.id,
  },
]

const HEADING = 'No money has moved through this wallet'
const BODY = 'A top-up, a refund to the wallet or a goodwill credit opens it. Nothing has yet.'
const ACTION = 'Back to wallets'

/** `DefaultIllustration`'s viewBox — the one node this rule is about. */
const ART = 'svg[viewBox="0 0 160 96"]'
const art = (root: HTMLElement) => root.querySelector(ART)

type Art = React.ReactNode | null

/* Two hooks, two components. `useIndexTable` is overloaded so that a LEDGER is
   structurally unable to sort, select or act (AC-48) — passing it a union of
   option objects asks it to be both at once and does not type-check, which is
   the overload doing its job rather than an inconvenience to work around. */
function LedgerTbl({ illustration }: { illustration?: Art }) {
  const table = useIndexTable({ mode: 'ledger', urlState: false })
  return <Body table={table} illustration={illustration} />
}

function IndexTbl({ illustration }: { illustration?: Art }) {
  const table = useIndexTable({ mode: 'index', getRowId: (row: Posting) => row.id, urlState: false })
  return <Body table={table} illustration={illustration} />
}

function Body({
  table,
  illustration,
}: {
  table: React.ComponentProps<typeof DataTable<Posting>>['table']
  illustration?: Art
}) {
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
      tableId="first-run-illustration"
      searchPlaceholder="Search postings"
      firstRun={{
        heading: HEADING,
        body: BODY,
        actions: [{ label: ACTION, onClick: () => undefined }],
        ...(illustration === undefined ? {} : { illustration }),
      }}
      noMatch={{ message: 'n' }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

/** The three things LR-3 keeps. Asserted everywhere the absence is asserted. */
function expectTheStateIsStillThere() {
  expect(screen.getByRole('heading', { name: HEADING })).toBeTruthy()
  expect(screen.getByText(BODY)).toBeTruthy()
  expect(screen.getByRole('button', { name: ACTION })).toBeTruthy()
}

describe("LR-3 — a ledger's first-run keeps heading, body and action, and drops the art", () => {
  it('renders no illustration on a ledger, and everything else', () => {
    const { container } = render(<LedgerTbl />)

    expectTheStateIsStillThere()
    expect(art(container), 'a picture above an action the product does not offer').toBeNull()
  })

  it('still renders one on an index table — AC-38 is untouched', () => {
    const { container } = render(<IndexTbl />)

    /* R8 PERMITS the illustration and AC-38 requires it here. LR-3 declines it
       for postings, and generalising that decline to every table would be the
       same over-reach in the other direction that LR-1 had to narrow. */
    expectTheStateIsStillThere()
    expect(art(container)).toBeTruthy()
  })

  it('lets a ledger overrule the default and ask for art back', () => {
    const { container } = render(
      <LedgerTbl illustration={<svg viewBox="0 0 1 1" data-testid="mine" />} />,
    )

    expectTheStateIsStillThere()
    /* The mode chooses only what happens when the caller says nothing. If this
       ever stops passing, the default has been rewritten as a rule — which is
       the defect that was removed from the branch next door. */
    expect(container.querySelector('[data-testid="mine"]')).toBeTruthy()
  })

  it('lets an INDEX table decline, which is what LR-3 needs for Financials', () => {
    const { container } = render(<IndexTbl illustration={null} />)

    /* LR-3's scope is Financials, and Financials' index tables are not ledger
       mode. Without this direction the rule could not be satisfied there at all. */
    expectTheStateIsStillThere()
    expect(art(container)).toBeNull()
  })
})

describe("LR-3 — LedgerCard's own first-run, which never mounts DataTable at all", () => {
  function Card() {
    const table = useIndexTable({ mode: 'ledger', urlState: false })
    return (
      <MemoryRouter>
        <LedgerCard
          table={table}
          ledger={null}
          status="empty"
          rows={[]}
          t={t}
          language="en"
          tableId="first-run-illustration-card"
          onRetry={() => undefined}
          /* AC-427: the subject has never had a posting, which is the one case
             that reaches this branch. */
          hasHistory={false}
          firstRun={{ heading: HEADING, body: BODY, action: { label: ACTION, onClick: () => undefined } }}
        />
      </MemoryRouter>
    )
  }

  it('renders no illustration, and no DataTable default could have reached it', () => {
    const { container } = render(<Card />)

    /* The guard in `LedgerCard` REPLACES the whole card, so `DataTable` is not
       mounted — measured: this subtree has no toolbar and no table. Every
       Financials ledger's first-run comes out of that branch, so a fix that
       lived only in `DataTable` would have left Revenue, Payouts, Cash and
       Wallets exactly as they were. */
    expect(container.querySelector('table'), 'DataTable is not mounted here').toBeNull()

    expectTheStateIsStillThere()
    expect(art(container)).toBeNull()
  })

  it('is the same three-part state the ledgers next door render', () => {
    const { container } = render(<Card />)
    const region = container.firstElementChild as HTMLElement
    expect(within(region).getByRole('heading', { name: HEADING })).toBeTruthy()
  })
})
