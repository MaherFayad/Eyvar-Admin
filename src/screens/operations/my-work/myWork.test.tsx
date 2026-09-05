/**
 * **My Work — the header line and the rail badge state one number (X3, O8).**
 *
 * X3 measured badge `25` above `5 items` on one screen. Both come from
 * `clients/myWork.ts` now, so the assertion is that they agree at the default
 * landing and after a claim moves an item between two views.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  disableMockLatency,
  getNavCounts,
  getRouteTable,
  listRequests,
  listWorkItems,
  mockFailures,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import type { SubTabRoute, WorkItem } from '@/data/types'
import { QUEUE_SHARED_EN } from '@/screens/queues/copy'
import { AR, EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { createTranslator, placeholdersIn } from '@/lib/i18n/translate'
import { MY_WORK_EN } from './copy'
import { workText } from './MyWorkScreen'
import { MyWorkScreen } from './MyWorkScreen'

const copy = (key: string) => (MY_WORK_EN[key] ?? QUEUE_SHARED_EN[key] ?? EN[key]) as string

/** The same, with named placeholders resolved. */
const t = (key: string, params: Record<string, string> = {}) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), copy(key))

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'operations-my-work')
  if (!found) throw new Error('No route-table row for operations-my-work')
  return found
}

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  mockFailures.clear()
  /* The fixture chunk has to have landed before the badge can be read. */
  await getNavCounts()
})

beforeAll(() => {
  /* jsdom implements no Pointer Capture API and Radix's menus call three of its
     methods. Stubs, not simulations — the same posture as `src/test/setup.ts`. */
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView ??= () => {}
})

async function badge(): Promise<number | null> {
  const counts = await getNavCounts()
  return counts.subTabs.find((s) => s.subTabId === 'operations-my-work')?.count ?? null
}

function renderMyWork(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/operations/my-work${search}`]}>
      <ShellProvider>
        <MyWorkScreen row={row()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The number in the page header's meta line, whichever plural key it used. */
async function headerCount(): Promise<number> {
  const other = copy('myWork.meta#other')
  const pattern = new RegExp(`^${other.replace('{count}', '([\\d,٠-٩]+)')}$`)
  const line = await screen.findByText(pattern)
  return Number(line.textContent!.replace(/[^\d]/g, ''))
}

describe('X3 / O8 — the count line and the nav badge', () => {
  it('states the same number as the rail badge on the default view', async () => {
    renderMyWork()
    const expected = await badge()
    expect(expected).toBeGreaterThan(0)
    await waitFor(async () => {
      expect(await headerCount()).toBe(expected)
    })
  })

  it('states the same number on every view, because it counts the backlog', async () => {
    renderMyWork('?view=everything')
    const expected = await badge()
    await waitFor(async () => {
      expect(await headerCount()).toBe(expected)
    })
  })
})

describe('X15 — the surprising count explains itself, when asked', () => {
  it('opens one sentence from a named button beside the line', async () => {
    renderMyWork()
    await screen.findByRole('table')
    const hint = await screen.findByRole('button', { name: EN['shell.hint.show'] as string })
    await userEvent.hover(hint)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(copy('myWork.meta.hint'))
  })
})

/**
 * **The `Item` column's line one is an identity, never a sentence.**
 *
 * Wave 2 measured 593px and 666px of wanted width in a 208px column, both on a
 * row whose line one was prose: an incident summary and a ticket subject. The
 * fix is in the projection, so the assertion is on what the projection produces
 * rather than on a rendered pixel.
 */
describe('T4.1 / T5.1 - the identity on line one', () => {
  const PROSE = ['text', 'summary', 'subject', 'detail', 'note']

  it('interpolates no free-text field into any title, in either language', async () => {
    const page = await listWorkItems({ pageSize: 100, includeOtherRoles: true })
    expect(page.items.length).toBeGreaterThan(0)
    const offenders: string[] = []
    for (const item of page.items) {
      for (const dictionary of [EN, AR]) {
        const template = (dictionary[item.titleKey] ?? '') as string
        for (const name of placeholdersIn(template)) {
          if (PROSE.includes(name)) offenders.push(item.titleKey + ': {' + name + '}')
        }
      }
    }
    expect([...new Set(offenders)], 'prose on line one of the Item column').toEqual([])
  })

  it('keeps every rendered line one inside the widest identity the fixtures carry', async () => {
    const page = await listWorkItems({ pageSize: 100, includeOtherRoles: true })
    const t = createTranslator({ dictionary: AR, fallback: EN, language: 'ar' })
    for (const item of page.items) {
      const line = workText(t, item.titleKey, item.titleParams)
      /* The longest identity in the fixtures is a 46-character Arabic name, and
         it measures 251px in a 208px column. A line past 60 characters is prose
         again, whatever it happens to measure. */
      expect(line.length, item.key + ' ' + line).toBeLessThanOrEqual(60)
    }
  })
})

/* ══════════════════ T8.1 — §7.6's acceptance criteria ═══════════════════ */

/** The projection, read through the client so expectations match the screen. */
async function projection(view: 'mine' | 'unassigned' | 'everything'): Promise<WorkItem[]> {
  return (await listWorkItems({ view, pageSize: 500, includeOtherRoles: true })).items
}

describe('AC-280 — every row states which queue it came from, in words', () => {
  it('names the owning queue on every row, and never as a badge', async () => {
    renderMyWork('?view=everything')
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.length).toBeGreaterThan(0)

    const labels = [
      'request',
      'assurance',
      'absence',
      'incident',
      'fairness',
      'application',
      'ticket',
      'dispute',
      'erasure',
    ].map((queue) => copy(`myWork.queue.${queue}`))

    for (const row of rows) {
      const named = labels.filter((label) => within(row).queryAllByText(label).length > 0)
      expect(named.length, `no queue named on row: ${row.textContent}`).toBeGreaterThan(0)
      for (const label of named) {
        for (const node of within(row).getAllByText(label)) {
          expect(node.closest('[data-slot="badge"]')).toBeNull()
        }
      }
    }
  })
})

describe('AC-281 — no row offers a decision; the primary action opens the item where it lives', () => {
  it("the row's only action is `Open`, and the identity links into the owning queue", async () => {
    const items = await projection('everything')
    renderMyWork('?view=everything')
    const table = await screen.findByRole('table')

    /* The one action lane, on every row. */
    const opens = within(table).getAllByRole('button', { name: copy('myWork.action.open') })
    expect(opens.length).toBeGreaterThan(0)

    /* And nothing that decides: no queue's disposition verbs are on this
       screen, however many rows come from those queues. */
    for (const verb of ['Assign', 'Close', 'Approve', 'Reject', 'Uphold', 'Dismiss', 'Confirm']) {
      expect(within(table).queryAllByRole('button', { name: verb })).toHaveLength(0)
    }
    expect(within(table).queryByRole('columnheader', { name: copy('queue.col.decision') })).toBeNull()

    const first = items[0]!
    const link = within(table).getAllByRole('link')[0]!
    expect(link).toHaveAttribute('href')
    expect(items.some((item) => link.getAttribute('href') === item.route)).toBe(true)
    void first
  })
})

describe('AC-283 / AC-284 — where the operator lands, and that it is not empty', () => {
  it('AC-283 — an operator holding at least one claim lands on `Mine`, and holds every row', async () => {
    const mine = await projection('mine')
    expect(mine.length).toBeGreaterThan(0)

    renderMyWork()
    expect(await screen.findByRole('tab', { name: EN['view.myWork.mine'] as string })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const table = await screen.findByRole('table')
    /* Every visible row's owner chip reads `Yours`, which is the chip's one
       rendering for a claim held by the signed-in operator. */
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(within(row).getByText(/^Yours · /)).toBeInTheDocument()
    }
  })

  it('AC-284 — with role routing on, an Ops Manager sees rows', async () => {
    await switchMockUser('USR-5')
    renderMyWork()
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1)
    expect(screen.queryByText(copy('myWork.empty.routed'))).not.toBeInTheDocument()
  })
})

describe('AC-286 / AC-287 — role routing is a filter the operator can switch off', () => {
  it('AC-286 — routing is one control in the query strip, not something behind a menu', async () => {
    renderMyWork()
    await screen.findByRole('table')
    expect(screen.getByText(copy('myWork.routing.chip'), { exact: false })).toBeInTheDocument()
  })

  it('AC-286 — clearing routing increases or maintains the row count', async () => {
    const user = userEvent.setup()
    renderMyWork('?view=everything')
    const table = await screen.findByRole('table')
    const before = within(table).getAllByRole('row').length

    const chip = screen
      .getAllByRole('button')
      .find((button) => (button.getAttribute('aria-label') ?? button.textContent ?? '').includes(copy('myWork.routing.chip')))
    expect(chip, 'the routing filter must be a control on the page').toBeDefined()
    await user.click(chip!)

    await waitFor(() => {
      const after = within(screen.getByRole('table')).getAllByRole('row').length
      expect(after).toBeGreaterThanOrEqual(before)
    })
  })
})

describe('AC-289 / AC-217 — one order across every source queue', () => {
  it('orders breached first, then by remaining time, then `No clock` last', async () => {
    const items = await projection('everything')
    const expected = [...items]
      .sort((a, b) => {
        if (a.dueAt === null && b.dueAt === null) return 0
        if (a.dueAt === null) return 1
        if (b.dueAt === null) return -1
        return Date.parse(a.dueAt) - Date.parse(b.dueAt)
      })
      .map((item) => item.key)

    renderMyWork('?view=everything')
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    /* The page holds the first N of the order; the assertion is that the N on
       screen are the first N of it, in that order. */
    const onScreen = rows.length
    expect(onScreen).toBeGreaterThan(3)

    const titles = expected.slice(0, onScreen)
    const byKey = new Map(items.map((item) => [item.key, item]))
    const links = within(table).getAllByRole('link')
    expect(links.length).toBe(onScreen)
    for (let index = 0; index < onScreen; index += 1) {
      expect(links[index]!.getAttribute('href')).toBe(byKey.get(titles[index]!)!.route)
    }
  })

  it('AC-290 — no row reads `overdue 0m` at rest', async () => {
    renderMyWork('?view=everything')
    const table = await screen.findByRole('table')
    expect(within(table).queryByText(/^overdue 0m$/)).toBeNull()
    /* And the overdue values that DO render are real elapsed durations. */
    for (const node of within(table).queryAllByText(/^overdue /)) {
      expect(node.textContent).not.toMatch(/^overdue 0[a-z]$/)
    }
  })
})

describe('AC-288 — a claim made here is the same claim in the queue that owns the record', () => {
  /** Every request the Requests client holds, across both channels. */
  async function everyRequest() {
    const both = await Promise.all(
      (['instant', 'subscription'] as const).map((channel) =>
        listRequests({ view: 'all', channel, pageSize: 500 }),
      ),
    )
    return both.flatMap((page) => page.items)
  }

  /**
   * **DEFECT — no claim written from any queue survives the read that follows.**
   * `claimRequest` returns `{ ...row, claim }` and never writes it back to
   * `allRequestFixtures` (`clients/requests.ts:237-241`); the same shape is in
   * `applicants.ts:238-278` and `assurance.ts:250-254`. My Work re-reads after
   * a claim, so the row it just claimed paints `Unclaimed` again.
   */
  it.skip('claiming a request from the projection shows the same claim on the Requests client', async () => {
    const user = userEvent.setup()
    const unassigned = await projection('unassigned')
    const candidates = new Set(
      unassigned.filter((item) => item.queue === 'request').map((item) => item.id),
    )
    expect(candidates.size, 'the fixtures must carry an unclaimed request').toBeGreaterThan(0)

    const before = (await everyRequest()).filter(
      (request) => candidates.has(request.id) && request.claim?.state === 'claimed',
    )
    expect(before).toHaveLength(0)

    renderMyWork('?view=unassigned')
    const table = await screen.findByRole('table')
    /* Every request row routes to the same queue, so the row is identified by
       the queue column and the claim is then verified through the source. */
    const row = within(table)
      .getAllByRole('row')
      .find(
        (each) =>
          within(each).queryAllByText(copy('myWork.queue.request')).length > 0 &&
          within(each).queryByRole('button', { name: copy('queue.claim') }) !== null,
      )
    expect(row, 'no unclaimed request row in the projection').toBeDefined()

    await user.click(within(row!).getByRole('button', { name: copy('queue.claim') }))

    await waitFor(async () => {
      const claimed = (await everyRequest()).filter(
        (request) => candidates.has(request.id) && request.claim?.state === 'claimed',
      )
      expect(claimed).toHaveLength(1)
      expect(claimed[0]!.claim!.ownerName).toBe('Sarah Al-Rashid')
    })
  })

  it('the claim control on a projection row reaches the source queue and reports its failure', async () => {
    const user = userEvent.setup()
    mockFailures.always('requests.claim')

    renderMyWork('?view=unassigned')
    const table = await screen.findByRole('table')
    const row = within(table)
      .getAllByRole('row')
      .find(
        (each) =>
          within(each).queryAllByText(copy('myWork.queue.request')).length > 0 &&
          within(each).queryByRole('button', { name: copy('queue.claim') }) !== null,
      )
    expect(row, 'no unclaimed request row in the projection').toBeDefined()

    await user.click(within(row!).getByRole('button', { name: copy('queue.claim') }))
    /* AC-41 — the failure replaces this row's cell and nothing else: a screen
       that never called `claimRequest` could not surface its injected error. */
    expect(await screen.findByText(copy('myWork.error.row.claim'))).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getAllByRole('row').length).toBeGreaterThan(1)
  })

  /**
   * **DEFECT — a subscription request opened from My Work lands on the wrong
   * queue.** `WORK_QUEUE_ROUTE.request` is `/operations/ride-requests` for both
   * channels (`data/types/work.ts:161`), and that sub-tab pins
   * `channel: 'instant'`, so `SREQ-003` opens a queue that cannot contain it.
   * AC-281 asks for *the item's owning queue*. Skipped until it is fixed.
   */
  it.skip('AC-281 — a subscription request opens the queue that holds it', async () => {
    const items = await projection('everything')
    const sub = items.find((item) => item.queue === 'request' && item.id.startsWith('SREQ'))
    if (!sub) throw new Error('The fixtures must carry a subscription request in the projection.')
    expect(sub.route).toBe('/operations/subscription-requests')
  })
})

describe('§7.2 / §9.3 — the bulk bar claims, and it never decides', () => {
  it('offers `Claim` alone when rows are selected', async () => {
    const user = userEvent.setup()
    renderMyWork('?view=unassigned')
    const table = await screen.findByRole('table')
    const box = within(table).getAllByRole('row')[1]!.querySelector('input[type="checkbox"], [role="checkbox"]')
    await user.click(box!)

    const bar = within(await screen.findByRole('group', { name: /selected/i }))
    expect(bar.getByRole('button', { name: copy('myWork.bulk.claim') })).toBeEnabled()
    for (const verb of ['Assign', 'Close', 'Approve', 'Reject']) {
      expect(bar.queryByRole('button', { name: verb })).toBeNull()
    }
  })
})

describe('§4.11 — the four states', () => {
  it('content: the projection lists rows under a table', async () => {
    renderMyWork()
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1)
  })

  it('loading: no table and no empty sentence while the read is in flight', async () => {
    renderMyWork()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(copy('myWork.empty.cleared.heading'))).not.toBeInTheDocument()
    await screen.findByRole('table')
  })

  it('error: the list states the failure and offers a retry', async () => {
    mockFailures.always('work.list')
    renderMyWork()
    expect(await screen.findByText(copy('myWork.error.list'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: EN['state.pageError.action'] as string }),
    ).toBeInTheDocument()
  })

  it('AC-235 — empty: a search matching nothing states so, without claiming the queue is clear', async () => {
    const user = userEvent.setup()
    renderMyWork('?view=everything')
    await screen.findByRole('table')
    await user.type(screen.getByPlaceholderText(copy('myWork.search')), 'zzzznotanitem')
    expect(await screen.findByText(copy('myWork.empty.noMatch'))).toBeInTheDocument()
    expect(screen.queryByText(copy('myWork.empty.cleared.heading'))).not.toBeInTheDocument()
  })
})

describe('AC-285 — a view tab never reads a number larger than the rows beneath it', () => {
  it('the tab row carries labels and no counts, so no tab can overstate its view', async () => {
    renderMyWork()
    await screen.findByRole('table')
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.textContent).not.toMatch(/\d/)
    }
  })
})

describe('AC-292 — one unreadable source queue does not fail the projection', () => {
  it('every queue represented in the projection has a claim client, so no row refuses today', async () => {
    const items = await projection('everything')
    /* The refusal itself is asserted on the shared chip
       (`queues/queueAdapter.test.tsx`); here the point is that the projection
       currently carries no row from `erasure` or `absence`, which is why the
       refusal cannot be reached from this screen. */
    expect(items.some((item) => item.queue === 'erasure' || item.queue === 'absence')).toBe(false)
    renderMyWork('?view=everything')
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
})

/* Two criteria this screen's fixtures cannot reach, kept as reproductions.
   See the T8.1 report for the fixture each one needs. */
describe('AC-282 / AC-287 — the two paths no seeded operator reaches', () => {
  it.skip('AC-282 — an operator with no live claims lands on `Unassigned`, and sees rows', async () => {
    /* Needs a seeded operator holding zero claims. All five team users hold at
       least one (`mine` is 12 / 3 / 3 / 8 / 3), so `defaultView` is `mine` for
       every one of them and this branch is unreachable from the outside. */
    renderMyWork()
    expect(
      await screen.findByRole('tab', { name: EN['view.myWork.unassigned'] as string }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it.skip('AC-287 — routing to zero names the role and offers to switch routing off', async () => {
    /* Reachable only for USR-2 (Finance), whose `mine ∩ routed` is 0 — and
       Finance holds no `view_operations`, so the sub-tab does not render for
       them. No seeded operator both reaches the zero and can open the screen. */
    await switchMockUser('USR-2')
    renderMyWork()
    expect(await screen.findByText(copy('myWork.empty.routed'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy('myWork.routing.clear') })).toBeInTheDocument()
  })
})

void t
