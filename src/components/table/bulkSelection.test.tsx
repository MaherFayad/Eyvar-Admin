/**
 * **D21 — bulk set semantics, and the escape hatch that makes them survivable.**
 *
 * The rule: a bulk command is refused if **any** selected record would be
 * refused, the refusal names the count, there is no partial apply, and the one
 * way out is `Select only the N eligible` — which changes the operator's
 * selection, visibly and by their own act, before the command becomes
 * available.
 *
 * The distinction that ruling turns on is easy to lose in a test: **narrowing
 * the selection is not a partial apply.** So the assertions below check the
 * bulk bar's own count after the narrowing, not just that the button enabled —
 * because AC-961 is that the number in the outcome toast equals the number that
 * was in the bar when the command was invoked, and the bar is where that
 * promise is kept.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '@/lib'
import { useIndexTable } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { DataTable, type BulkAction, type DataColumn } from '../DataTable'

const t = createTranslator({ dictionary: EN, fallback: EN })

interface Row {
  id: string
  name: string
  suspended: boolean
}

/* Twelve captains, three of them already suspended — D21's own worked example,
   so the counts in the acceptance criteria are the counts asserted here. */
const ROWS: Row[] = Array.from({ length: 12 }, (_, index) => ({
  id: `DRV-${100 + index}`,
  name: `Captain ${index + 1}`,
  suspended: index < 3,
}))

const COLUMNS: DataColumn<Row>[] = [
  { id: 'name', header: 'Captain', alwaysVisible: true, width: 200, cell: (row) => row.name },
]

/**
 * The harness computes the refusal the way a real screen does — from the
 * selection, against a predicate — rather than hardcoding a disabled flag.
 * A hardcoded flag would let the escape hatch pass without the selection
 * actually changing, which is the one thing these tests exist to catch.
 */
function Harness({ onRun = () => {} }: { onRun?: (ids: ReadonlySet<string>) => void }) {
  const table = useIndexTable<Row>({ mode: 'index', getRowId: (row) => row.id, urlState: false })
  const selected = ROWS.filter((row) => table.selectedIds.has(row.id))
  const blocked = selected.filter((row) => row.suspended)
  const eligible = selected.filter((row) => !row.suspended)

  const suspend: BulkAction = {
    label: 'Suspend',
    onClick: onRun,
    disabled: blocked.length > 0,
    reason:
      blocked.length === 0
        ? null
        : blocked.length === selected.length
          ? `All ${blocked.length} selected captains are already suspended.`
          : `${blocked.length} of the selected captains are already suspended.`,
    eligibleIds: new Set(eligible.map((row) => row.id)),
  }

  return (
    <DataTable
      table={table}
      rows={ROWS}
      columns={COLUMNS}
      getRowId={(row) => row.id}
      status="content"
      total={ROWS.length}
      bulkActions={[suspend]}
      t={t}
      language="en"
      tableId="bulk"
      searchPlaceholder="Search captains"
      firstRun={{ heading: 'h', body: 'b', actions: [] }}
      noMatch={{ message: 'No captains match these filters.' }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

async function select(user: ReturnType<typeof userEvent.setup>, names: string[]) {
  for (const name of names) {
    const row = screen.getByText(name).closest('tr')
    if (!row) throw new Error(`No row for ${name}`)
    const box = row.querySelector('input[type="checkbox"], [role="checkbox"]')
    if (!box) throw new Error(`No checkbox on the row for ${name}`)
    await user.click(box)
  }
}

/** Captains 1-3 are suspended; 4-12 are not. */
const BLOCKED = ['Captain 1', 'Captain 2', 'Captain 3']
const ELIGIBLE = Array.from({ length: 9 }, (_, index) => `Captain ${index + 4}`)

describe('D21 — a bulk command is refused if any selected record would be', () => {
  /**
   * **AC-958.** The sentence is the `.other` form, and it is real text above the
   * bar rather than a tooltip — asserted by finding it with `getByText`, which
   * a `title` attribute would not satisfy.
   */
  it('AC-958 — twelve selected, three blocked: disabled, with the count named', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await select(user, [...BLOCKED, ...ELIGIBLE])

    const suspend = screen.getByRole('button', { name: 'Suspend' })
    expect(suspend).toBeDisabled()
    expect(screen.getByText(/3 of the selected captains are already suspended\./)).toBeVisible()

    /* §11.2 — the control is disabled *in place*. It has not been hidden, and
       the refusal is reachable from it rather than merely near it. */
    expect(suspend.getAttribute('aria-describedby')).toBeTruthy()
    const describedBy = suspend.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(describedBy)?.textContent).toContain('already suspended')
  })

  /**
   * **AC-959**, and the criterion that separates a narrowing from a partial
   * apply. Three things must all hold after the press: the selection is nine,
   * **the bar says nine**, and nothing has run.
   */
  it('AC-959 — `Select only the 9 eligible` narrows the selection and runs nothing', async () => {
    const user = userEvent.setup()
    const onRun = vi.fn()
    render(<Harness onRun={onRun} />)
    await select(user, [...BLOCKED, ...ELIGIBLE])

    expect(screen.getByRole('group', { name: /12 selected/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select only the 9 eligible' }))

    expect(screen.getByRole('group', { name: /9 selected/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeEnabled()
    expect(onRun, 'narrowing the selection must never run the command').not.toHaveBeenCalled()

    /* AC-961 — and when it IS invoked, it acts on exactly what the bar said. */
    await user.click(screen.getByRole('button', { name: 'Suspend' }))
    expect(onRun).toHaveBeenCalledTimes(1)
    expect((onRun.mock.calls[0]?.[0] as ReadonlySet<string>).size).toBe(9)
  })

  /**
   * **AC-960.** When every target is blocked there is nothing to narrow to, so
   * the sentence changes *and the control is absent*. Both halves matter: the
   * `.other` sentence would invite the operator to believe a subset is fine,
   * and a `Select only the 0 eligible` control would be a dead end.
   */
  it('AC-960 — all three blocked: the `.all` sentence, and no escape hatch', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await select(user, BLOCKED)

    expect(screen.getByText('All 3 selected captains are already suspended.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Select only/ })).toBeNull()
  })

  /**
   * The negative twin of AC-959: with nothing blocked there is no refusal, so
   * there is no panel and no control. Without this, a bar that rendered the
   * hatch unconditionally would still pass every test above.
   */
  it('offers no escape hatch when nothing is refused', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await select(user, ELIGIBLE.slice(0, 4))

    expect(screen.getByRole('button', { name: 'Suspend' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Select only/ })).toBeNull()
    expect(screen.queryByText(/already suspended/)).toBeNull()
  })

  /**
   * `selectOnly` intersects rather than assigns. A command may report eligible
   * ids the operator never selected — a registry computing over the page, say —
   * and selecting those on their behalf is the same silent surprise the
   * all-or-nothing rule exists to prevent.
   */
  it('narrowing never adds a row the operator had not selected', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await select(user, [...BLOCKED, ...ELIGIBLE.slice(0, 2)])

    await user.click(screen.getByRole('button', { name: 'Select only the 2 eligible' }))

    expect(screen.getByRole('group', { name: /2 selected/i })).toBeInTheDocument()
  })
})
