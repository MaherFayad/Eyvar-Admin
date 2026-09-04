/**
 * **T5.13 / §11.2 — a toolbar control that acts on nothing.** Trip Assurance's
 * `?view=absences` ships empty and offered a live search, filter, columns and
 * sort over it. The trap is the second case: `no-match` is empty too, and there
 * the filter IS the way out. The branch is on WHY the table is empty.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { useIndexTable } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { DataTable, type DataColumn } from '../DataTable'

const t = createTranslator({ dictionary: EN, fallback: EN })

interface Row {
  id: string
  name: string
  city: string
}

const COLUMNS: DataColumn<Row>[] = [
  {
    id: 'name',
    header: 'Captain',
    alwaysVisible: true,
    width: 176,
    sortField: 'name',
    cell: (row) => row.name,
  },
  {
    id: 'city',
    header: 'City',
    width: 120,
    sortField: 'city',
    filter: {
      kind: 'multi-select',
      field: 'city',
      options: [{ value: 'Riyadh', label: 'Riyadh' }],
    },
    cell: (row) => row.city,
  },
]

const CLEARED = { heading: 'Nothing at risk', body: 'No captain has missed a committed leg.' }

function Harness({
  status,
  emptyKind = 'cleared',
}: {
  status: 'content' | 'empty'
  emptyKind?: 'first-run' | 'cleared' | 'no-match'
}) {
  const table = useIndexTable<Row>({ mode: 'index', getRowId: (row) => row.id })
  return (
    <DataTable
      table={table}
      rows={status === 'content' ? [{ id: 'DRV-1', name: 'Nora Al-Harbi', city: 'Riyadh' }] : []}
      columns={COLUMNS}
      getRowId={(row) => row.id}
      status={status}
      emptyKind={emptyKind}
      total={status === 'content' ? 1 : 0}
      t={t}
      language="en"
      tableId="absences"
      searchPlaceholder="Search by captain or subs"
      firstRun={{ heading: 'h', body: 'b', actions: [] }}
      cleared={CLEARED}
      noMatch={{ message: 'No absence matches these filters.' }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

/** The four narrowing controls plus export, by their accessible names. */
function controls() {
  return {
    search: screen.getByRole('textbox', { name: 'Search by captain or subs' }),
    filter: screen.getByRole('button', { name: t('table.filter') }),
    columns: screen.getByRole('button', { name: t('table.columns.title') }),
    sort: screen.getByRole('button', { name: t('table.sort') }),
    export: screen.getByRole('button', { name: t('table.export') }),
  }
}

describe('T5.13 — a control over an empty table is disabled in place, not gone', () => {
  it('disables search, filter, columns, sort and export when nothing narrowed the table', () => {
    render(<Harness status="empty" />)

    /* In place: every one of the five is still findable by its own name. That
       is half the ruling — a control that vanishes teaches the operator it does
       not exist. */
    const c = controls()
    expect(c.search).toBeDisabled()
    expect(c.filter).toBeDisabled()
    expect(c.columns).toBeDisabled()
    expect(c.sort).toBeDisabled()
    expect(c.export).toBeDisabled()
  })

  it('points each disabled control at the empty state sentence, as real text', () => {
    render(<Harness status="empty" />)

    const sentence = screen.getByText(CLEARED.body)
    for (const control of Object.values(controls())) {
      const id = control.getAttribute('aria-describedby')
      expect(id, `${control.textContent} carries no reason`).not.toBeNull()
      expect(document.getElementById(id!)).toContainElement(sentence)
    }
  })

  it('keeps the way out live on a no-match empty and disables only export', () => {
    render(<Harness status="empty" emptyKind="no-match" />)

    /* The filter is what emptied it, so the filter has to still come off. */
    const c = controls()
    expect(c.search).toBeEnabled()
    expect(c.filter).toBeEnabled()
    expect(c.columns).toBeEnabled()
    expect(c.sort).toBeEnabled()
    expect(c.export).toBeDisabled()
  })

  it('leaves every control live once there is a row', () => {
    render(<Harness status="content" />)

    const c = controls()
    expect(c.search).toBeEnabled()
    expect(c.filter).toBeEnabled()
    expect(c.columns).toBeEnabled()
    expect(c.sort).toBeEnabled()
    expect(c.export).toBeEnabled()
  })
})
