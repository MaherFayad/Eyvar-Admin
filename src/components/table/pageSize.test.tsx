/**
 * **T6.3 — the page-size control, and the preference behind it.** `ui.pageSize`
 * shipped validated, versioned and round-tripped with no reader, so the only
 * proof it is wired is that a table's ROW COUNT moves and is still moved after
 * a re-mount. A test that asserted the store's value would pass on the version
 * that had no consumer.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { useIndexTable } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { DataTable, type DataColumn } from '../DataTable'
import { TABLE_PAGE_SIZES, setTablePageSize } from './pageSize'

const t = createTranslator({ dictionary: EN, fallback: EN })

interface Row {
  id: string
  name: string
}

/** More than two pages at the largest offered size, so every option is real. */
const ALL: Row[] = Array.from({ length: 240 }, (_, index) => ({
  id: `R-${index + 1}`,
  name: `Row ${index + 1}`,
}))

const COLUMNS: DataColumn<Row>[] = [
  { id: 'name', header: 'Name', alwaysVisible: true, width: 200, cell: (row) => row.name },
]

/** The page the client would have returned, sliced by the table's own size. */
function Harness({ declared }: { declared?: number }) {
  const table = useIndexTable<Row>({
    mode: 'index',
    getRowId: (row) => row.id,
    ...(declared === undefined ? {} : { pageSize: declared }),
  })
  const start = (table.page - 1) * table.pageSize
  return (
    <DataTable
      table={table}
      rows={ALL.slice(start, start + table.pageSize)}
      columns={COLUMNS}
      getRowId={(row) => row.id}
      status="content"
      total={ALL.length}
      t={t}
      language="en"
      tableId="page-size"
      searchPlaceholder="Search rows"
      firstRun={{ heading: 'h', body: 'b', actions: [] }}
      noMatch={{ message: 'No rows match these filters.' }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

function renderedRows(): number {
  return document.querySelectorAll('tbody tr').length
}

function sizeToggle(size: number): HTMLElement {
  return screen.getByRole('radio', {
    name: t('table.pageSize.option', { count: String(size) }),
  })
}

afterEach(() => {
  /* The store is module state shared by every table in the process. */
  setTablePageSize(TABLE_PAGE_SIZES[0]!)
})

describe('T6.3 — the page size is the operator’s, and it holds', () => {
  it('renders the default page size until the operator says otherwise', () => {
    render(<Harness />)
    expect(renderedRows()).toBe(25)
  })

  it('changes the number of rows on screen when the operator picks another size', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(sizeToggle(50))

    expect(renderedRows()).toBe(50)
    expect(screen.getByText(t('table.showing', { from: '1', to: '50', total: '240' }))).toBeInTheDocument()
  })

  it('survives a re-mount, which is the whole point of a preference', async () => {
    const user = userEvent.setup()
    const first = render(<Harness />)
    await user.click(sizeToggle(100))
    expect(renderedRows()).toBe(100)

    first.unmount()
    render(<Harness />)

    expect(renderedRows()).toBe(100)
    expect(sizeToggle(100)).toHaveAttribute('aria-checked', 'true')
  })

  it('lets a screen that declares its own size keep it — class 1 beats class 2', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(sizeToggle(50))
    screen.getByText(t('table.showing', { from: '1', to: '50', total: '240' }))

    render(<Harness declared={10} />)

    /* Two tables mounted: the declared one renders 10 rows of its own. */
    expect(document.querySelectorAll('tbody')[1]!.querySelectorAll('tr')).toHaveLength(10)
  })
})
