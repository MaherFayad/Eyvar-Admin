/**
 * Rate card, redesigned — `design/financials-pricing-rate-card.md` §10.
 * One test per **AC-RC-01…31**, named after it.
 *
 * The rail's ordering, the pane's contents and the empties are asserted against
 * the SHIPPED fixtures, read back from the client, so a fixture change fails
 * here rather than silently re-drawing the screen.
 */

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  disableMockLatency,
  getRouteTable,
  getSession,
  listRateCards,
  listSurgeSuspensions,
  listSurgeWindows,
  mockFailures,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import type { RateCard, SubTabRoute, SurgeSuspension } from '@/data/types'
import { fixedClock } from '@/data/mock/clock'
import { resetClock, setClockSource } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { PricingScreen } from './PricingScreen'

/** What `listRateCards` answers with, when a test needs a shape fixtures lack. */
let cardsOverride: RateCard[] | null = null
let suspensionsOverride: SurgeSuspension[] | null = null
let liveReads = 0
let listReads = 0

vi.mock('@/data/clients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/clients')>()
  return {
    ...actual,
    listRateCards: async (signal?: AbortSignal) => {
      listReads += 1
      const all = await actual.listRateCards(signal)
      return cardsOverride ?? all
    },
    getLiveRateCard: async (signal?: AbortSignal) => {
      liveReads += 1
      return actual.getLiveRateCard(signal)
    },
    listSurgeSuspensions: async (signal?: AbortSignal) => {
      const all = await actual.listSurgeSuspensions(signal)
      return suspensionsOverride ?? all
    },
  }
})

const LIVE = 'RC-2026-04-01'
const DRAFT_MODELLED = 'RC-2026-08-01'
const DRAFT_UNMODELLED = 'RC-2026-09-01'
const SUPERSEDED = 'RC-2026-01-01'

const pricingRow = (): SubTabRoute => {
  const row = getRouteTable().subTabs.find((each) => each.subTabId === 'financials-pricing')
  if (!row) throw new Error('No route-table row for financials-pricing')
  return row
}

/** AC-RC-27 — a row that declares no write actions (D17). */
const readOnlyRow = (): SubTabRoute => ({ ...pricingRow(), writePermission: null })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* AC-409's countdown is read against the clock the screen is GIVEN. The
     fixtures are dated from `EYVAR_NOW`, so the system clock would expire the
     one live suspension and make AC-RC-30's warning case unreachable. */
  setClockSource(fixedClock)
  mockFailures.clear()
  cardsOverride = null
  suspensionsOverride = null
  liveReads = 0
  listReads = 0
})

afterEach(() => {
  resetClock()
})

function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  const location = useLocation()
  onChange(`${location.pathname}${location.search}`)
  return null
}

function mount(path = '/financials/pricing?view=rate-card', row = pricingRow()) {
  let location = ''
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <Routes>
          <Route
            path="/financials/pricing"
            element={
              <>
                <PricingScreen row={row} />
                <LocationProbe onChange={(next) => (location = next)} />
              </>
            }
          />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
  return { ...utils, path: () => location }
}

const copy = (key: string) => EN[key] as string
const fill = (key: string, values: Record<string, string>) =>
  Object.entries(values).reduce((out, [name, value]) => out.replace(`{${name}}`, value), copy(key))

/** The one `Surge` card: the windows table and the district lever (D35b). */
const surgeCard = () =>
  screen.getByText(copy('fin.pricing.surge.heading')).closest('[data-slot="card"]') as HTMLElement

/** The rail, named by its heading. An `<ol>` is a list. */
const rail = () => screen.getByRole('list', { name: copy('fin.pricing.rateCard.rail.heading') })
const railRows = () => within(rail()).getAllByRole('link')
/** The detail pane, named by the version heading it carries. */
const pane = () => screen.getByRole('region', { name: /RC-\d{4}-\d{2}-\d{2}/ })
const rowFor = (version: string) =>
  screen.getByRole('link', { name: fill('fin.pricing.rateCard.rail.select', { version }) })

/** The suspensions `<table>`, reached through a header rather than a row: the
    table and the compact row cards render the same text twice. */
async function suspensionsTable(): Promise<HTMLElement> {
  const header = await screen.findByRole('columnheader', {
    name: new RegExp(copy('fin.pricing.surge.col.raisedBy')),
  })
  return header.closest('table') as HTMLElement
}

async function mounted(path?: string, row?: SubTabRoute) {
  const utils = mount(path, row)
  await waitFor(() => expect(rail()).toBeTruthy())
  return utils
}

/* ═══════════════════════════════ the block ══════════════════════════════ */

describe('the master-detail block', () => {
  it('AC-RC-01 — one card holds a rail at the inline-start and a detail pane', async () => {
    await mounted()
    const card = rail().closest('[data-slot="card"]') as HTMLElement
    expect(card, 'the rail is inside a card').toBeTruthy()
    expect(card.contains(pane()), 'the pane is inside the SAME card').toBe(true)

    /* The rail is the 300px token column and carries the one hairline; jsdom
       does no layout, so the geometry itself is the Playwright capture's. */
    const railColumn = rail().parentElement as HTMLElement
    expect(railColumn.className).toContain('w-detail-rail')
    expect(railColumn.className).toContain('border-e')
    expect(card.querySelectorAll('[data-slot="card"]'), 'no card inside the card').toHaveLength(0)
  })

  it('AC-RC-02 — the rail lists every card: live, then drafts and superseded newest first', async () => {
    await mounted()
    const cards = await listRateCards()
    expect(cards).toHaveLength(4)
    expect(railRows().map((row) => row.textContent?.match(/RC-[\d-]+/)?.[0])).toEqual([
      LIVE,
      DRAFT_UNMODELLED,
      DRAFT_MODELLED,
      SUPERSEDED,
    ])
  })

  it('AC-RC-03 — each row reads version, effective range and bill delta', async () => {
    await mounted()
    const live = rowFor(LIVE)
    expect(live.textContent).toContain(LIVE)
    expect(live.textContent).toContain('1 Apr')
    expect(live.textContent).toContain(fill('fin.pricing.rateCard.rail.delta', { delta: '+5.2%' }))

    /* A card with no simulation says so, and never `0%` and never a blank. */
    const unmodelled = rowFor(DRAFT_UNMODELLED)
    expect(unmodelled.textContent).toContain(copy('fin.pricing.rateCard.rail.notModelled'))
    expect(unmodelled.textContent).not.toContain('0%')

    /* And `0%` is still a real answer where the model produced one. */
    expect(rowFor(SUPERSEDED).textContent).toContain(
      fill('fin.pricing.rateCard.rail.delta', { delta: '0%' }),
    )
  })

  it('AC-RC-04 — the live card is selected on arrival', async () => {
    await mounted()
    expect(rowFor(LIVE).getAttribute('aria-current')).toBe('page')
    expect(pane().textContent).toContain(LIVE)
  })

  it('AC-RC-04 — with no live card the newest draft is selected', async () => {
    cardsOverride = (await listRateCards()).filter((card) => card.status !== 'live')
    await mounted()
    expect(rowFor(DRAFT_UNMODELLED).getAttribute('aria-current')).toBe('page')
  })

  it('AC-RC-05 — the selected row takes the selected ground, the ink marker and aria-current', async () => {
    await mounted()
    const selected = rowFor(LIVE)
    expect(selected.className).toContain('bg-selected')
    expect(selected.getAttribute('aria-current')).toBe('page')

    const marker = (selected.closest('li') as HTMLElement).querySelector('.w-marker')
    expect(marker, 'the selected row carries the inline-start marker').toBeTruthy()
    expect(marker?.className).toContain('bg-foreground')
    expect(marker?.className).toContain('start-0')

    /* No red and no green edge anywhere on the view. */
    for (const each of document.querySelectorAll('.w-marker')) {
      expect(each.className).not.toContain('bg-destructive')
      expect(each.className).not.toContain('bg-success')
    }
    expect(railRows().filter((row) => row.className.includes('bg-selected'))).toHaveLength(1)
  })

  it('AC-RC-06 — the view issues one rate-card read and never asks for the live card', async () => {
    await mounted()
    expect(listReads, 'one list read').toBe(1)
    expect(liveReads, 'getLiveRateCard is not called from this screen').toBe(0)
  })
})

/* ═════════════════════════════ the detail pane ══════════════════════════ */

describe('the detail pane', () => {
  it('AC-RC-36 — band C states commission, VAT and the floors as key/value rows', async () => {
    const user = userEvent.setup()
    await mounted()

    const body = pane()
    expect(within(body).getAllByText(LIVE).length).toBeGreaterThan(0)
    expect(within(body).getAllByText(copy('fin.pricing.rateCard.status.live')).length).toBe(1)
    expect(body.textContent).toContain(
      fill('fin.pricing.rateCard.effective.noEnd', { date: '1 Apr' }),
    )
    /* Two headings, one instrument. Live: 22 / 20, VAT included. */
    expect(within(body).getByText(copy('fin.pricing.rateCard.terms.heading'))).toBeTruthy()
    expect(within(body).getByText(copy('fin.pricing.rateCard.floors.heading'))).toBeTruthy()
    expect(body.textContent).toContain('22%')
    expect(body.textContent).toContain('20%')
    expect(body.textContent).toContain(copy('fin.pricing.rateCard.vat.included'))

    /* AC-RC-33 — a boolean is not set louder than a fare: the terms band's
       values are the 12px rung, and only the matrix's numerals are 14px ink. */
    const vat = within(body).getByText(copy('fin.pricing.rateCard.vat.included'))
    expect(vat.className).toContain('text-xs')
    expect(vat.className).not.toContain('font-semibold')

    /* Selecting a different card changes all three. The unmodelled draft is
       24 / 21, so a pane that kept the live figures would fail here. */
    await user.click(rowFor(DRAFT_UNMODELLED))
    await waitFor(() => expect(pane().textContent).toContain(DRAFT_UNMODELLED))
    expect(pane().textContent).toContain('24%')
    expect(pane().textContent).toContain('21%')
    expect(pane().textContent).not.toContain('22%')
  })

  it('AC-RC-34 — the class matrix is six columns of table chrome with one unit rung', async () => {
    await mounted()
    const table = within(pane()).getAllByRole('table')[0] as HTMLTableElement
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((cell) => cell.textContent?.trim())).toEqual([
      copy('fin.pricing.rateCard.col.class'),
      copy('fin.pricing.rateCard.col.base'),
      copy('fin.pricing.rateCard.col.perKm'),
      copy('fin.pricing.rateCard.col.perMin'),
      copy('fin.pricing.rateCard.col.minFare'),
      copy('fin.pricing.rateCard.col.cancelFee'),
    ])
    expect(headers[0]?.className).toContain('text-start')
    for (const header of headers.slice(1)) expect(header.className).toContain('text-end')
    /* The header strip is `ui/table.tsx`'s, at 14/500 on `bg-muted`. */
    expect(headers[0]?.getAttribute('data-slot')).toBe('table-head')
    expect(headers[0]?.className).toContain('bg-muted')
    expect(headers[0]?.className).toContain('text-sm')

    /* The unit is stated once, in the head, and never in a cell (§8.3.1). */
    const head = table.querySelector('thead') as HTMLElement
    expect(head.textContent?.match(/SAR/g) ?? []).toHaveLength(1)
    for (const cell of within(table).getAllByRole('cell')) {
      expect(cell.textContent).not.toContain('SAR')
    }
    /* A class name is translated, not the stored English. */
    expect(within(table).getByText(copy('fin.pricing.rateCard.class.economy'))).toBeTruthy()
    expect(within(table).getAllByRole('row').length).toBe(3)
  })

  it('AC-RC-40 — nothing on the view is uppercase or letter-spaced', async () => {
    await mounted()
    expect([...document.querySelectorAll('[class*="uppercase"], [class*="tracking-"]')]).toHaveLength(0)
  })

  it('AC-RC-39 — the counts sit in the rail footer, in sentence case, with drawn separators', async () => {
    await mounted()
    const footer = rail().nextElementSibling as HTMLElement
    expect(footer.tagName).toBe('P')
    expect(footer.textContent).toBe('4 rate cards · 1 live · 2 drafts · 1 superseded')
    /* AC-443 — the separator is drawn, never written into a string. */
    for (const drawn of footer.querySelectorAll('[aria-hidden="true"]')) {
      expect(drawn.textContent?.trim()).toBe('·')
    }
    /* §7 — the view row publishes nothing, so no caption rung renders. */
    expect(document.querySelector('[data-slot="view-row"]')?.textContent).not.toContain('rate cards')
  })

  it('AC-RC-10 — the impact card names both bills, a signed delta and a caption, with no arrow', async () => {
    await mounted()
    const impact = pane()
    expect(impact.textContent).toContain(copy('fin.pricing.rateCard.impact.heading'))
    expect(impact.textContent).toContain(copy('fin.pricing.rateCard.impact.before'))
    expect(impact.textContent).toContain(copy('fin.pricing.rateCard.impact.after'))
    expect(impact.textContent).toContain('21.80')
    expect(impact.textContent).toContain('22.94')
    expect(impact.textContent).toContain('+5.2%')
    expect(impact.textContent).toContain(copy('fin.pricing.rateCard.impact.change'))
    /* AC-RC-37 — one caption, absorbing the two meta lines that flanked it. */
    expect(
      within(impact).getByText(
        fill('fin.pricing.rateCard.impact.caption.past', { trips: '4,186', date: '21 Mar' }),
      ),
    ).toBeTruthy()
    /* X-RC-6 — a direction glyph cannot mirror, so none is rendered anywhere. */
    expect(document.body.textContent).not.toContain('→')
  })

  it('AC-RC-11 — the delta is neutral text, never a badge, and a negative uses U+2212', async () => {
    const cards = await listRateCards()
    const live = cards.find((card) => card.status === 'live') as RateCard
    cardsOverride = [
      { ...live, simulation: { ...live.simulation!, deltaPercent: -3.4 } },
    ]
    await mounted()

    const delta = within(pane()).getByText('−3.4%').parentElement as HTMLElement
    expect(delta.textContent).not.toContain('-3.4%')
    expect(delta.closest('[data-slot="badge"]'), 'a delta is a quantity, not a status').toBeNull()
    expect(delta.className).toContain('text-foreground')
    expect(delta.className).not.toContain('rounded-full')
  })

  it('AC-RC-12 — a card with no simulation keeps the title and states why', async () => {
    const user = userEvent.setup()
    await mounted()
    await user.click(rowFor(DRAFT_UNMODELLED))
    await waitFor(() => expect(pane().textContent).toContain(DRAFT_UNMODELLED))

    expect(within(pane()).getByText(copy('fin.pricing.rateCard.impact.heading'))).toBeTruthy()
    expect(within(pane()).getByText(copy('fin.pricing.rateCard.impact.none'))).toBeTruthy()
    expect(pane().textContent).not.toContain(copy('fin.pricing.rateCard.impact.before'))
  })

  it('AC-RC-13 — the floors card names four values and says nothing enforces them', async () => {
    await mounted()
    const body = pane()
    expect(within(body).getByText(copy('fin.pricing.rateCard.floors.heading'))).toBeTruthy()
    for (const key of ['margin', 'fee', 'support', 'reserve']) {
      expect(within(body).getByText(copy(`fin.pricing.rateCard.floors.${key}`))).toBeTruthy()
    }
    expect(within(body).getByText(copy('fin.pricing.rateCard.floors.caption'))).toBeTruthy()
    /* AC-RC-35 — four bands, three hairlines, and nothing under band D. */
    expect(body.querySelectorAll(':scope > .border-t')).toHaveLength(3)
    expect(body.lastElementChild?.textContent).toContain(
      copy('fin.pricing.rateCard.impact.heading'),
    )
    expect(body.textContent).toContain('12%')
    expect(body.textContent).toContain('2.2%')
    expect(body.textContent).toContain('3.5%')
    expect(body.textContent).toContain('9.00')
  })

  it('AC-RC-14 — only a draft carries a control, and it is disabled with its reason', async () => {
    const user = userEvent.setup()
    await mounted()

    /* Live: no control at all. */
    expect(within(pane()).queryAllByRole('button')).toHaveLength(0)

    await user.click(rowFor(SUPERSEDED))
    await waitFor(() => expect(pane().textContent).toContain(SUPERSEDED))
    expect(within(pane()).queryAllByRole('button')).toHaveLength(0)

    await user.click(rowFor(DRAFT_UNMODELLED))
    await waitFor(() => expect(pane().textContent).toContain(DRAFT_UNMODELLED))
    const approve = within(pane()).getByRole('button', {
      name: copy('fin.pricing.rateCard.approve'),
    })
    expect(approve).toBeDisabled()
    /* AC-404 / AC-405 — the refusal is a property of the draft and of who is
       reading it, so the test computes the same answer from the same two facts
       rather than hard-coding one of them. */
    const me = (await getSession()).userId
    const card = (await listRateCards()).find(
      (each) => each.version === DRAFT_UNMODELLED,
    ) as RateCard
    const reason = document.getElementById(approve.getAttribute('aria-describedby') ?? '')
    expect(reason?.textContent).toBe(
      copy(
        card.proposedByUserId === me
          ? 'fin.pricing.rateCard.approve.blocked.proposer'
          : 'fin.pricing.rateCard.approve.blocked.simulation',
      ),
    )
  })

  it('AC-RC-15 — there is no button labelled Live card', async () => {
    await mounted()
    expect(screen.queryByRole('button', { name: /live card/i })).toBeNull()
  })

  it('AC-RC-35 — Approve renders inside band A, beside the badge that explains it', async () => {
    const user = userEvent.setup()
    await mounted()
    await user.click(rowFor(DRAFT_UNMODELLED))
    await waitFor(() => expect(pane().textContent).toContain(DRAFT_UNMODELLED))
    const approve = within(pane()).getByRole('button', {
      name: copy('fin.pricing.rateCard.approve'),
    })
    const bandA = pane().querySelector(':scope > div') as HTMLElement
    expect(bandA.contains(approve), 'the control is in the identity band').toBe(true)
    expect(bandA.textContent).toContain(copy('fin.pricing.rateCard.status.draft'))
    /* AC-RC-42 — it is secondary, and the view's one fill is elsewhere. */
    expect(approve.className).not.toContain('bg-primary')
  })

  it('AC-RC-38 — the read-only condition is stated once, in the banner', async () => {
    await mounted()
    expect(document.body.textContent).not.toContain('This card prices every trip today')
    expect(document.body.textContent).not.toContain('Editing waits on the pricing owner decision')
    expect(document.querySelectorAll('[data-slot="alert"]')).toHaveLength(1)
  })

  it('AC-RC-41 — on this view the banner carries its title and no body', async () => {
    await mounted()
    const banner = document.querySelector('[data-slot="alert"]') as HTMLElement
    expect(banner.textContent).toContain(copy('fin.pricing.stageA.title'))
    expect(banner.textContent).not.toContain(copy('fin.pricing.stageA.body'))

    /* Non-vacuity: the body is kept, and rendered, on the other three views. */
    cleanup()
    mount('/financials/pricing?view=cancellation-fees')
    await waitFor(() =>
      expect(
        (document.querySelector('[data-slot="alert"]') as HTMLElement).textContent,
      ).toContain(copy('fin.pricing.stageA.body')),
    )
  })
})

/* ══════════════════════════════ the four states ═════════════════════════ */

describe('the block states', () => {
  it('AC-RC-43 — while the read is in flight the block is busy, with four rail rows and no spinner', () => {
    mount()
    const block = document.querySelector('[data-slot="card"][aria-busy="true"]') as HTMLElement
    expect(block, 'the whole block carries aria-busy').toBeTruthy()
    expect(block.querySelectorAll('.min-h-row-media'), 'four rail rows').toHaveLength(4)
    expect(block.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(4)
    expect(block.querySelector('[data-slot="spinner"]')).toBeNull()
    /* The pane never prompts for a selection there is nothing to make: the only
       text in the block is the rail's own strip label. */
    expect(block.textContent).toBe(copy('fin.pricing.rateCard.rail.heading'))
  })

  it('AC-RC-17 — a failed read collapses the block to one retry, and the surge cards still render', async () => {
    mockFailures.once('pricing.rateCards')
    const user = userEvent.setup()
    mount()
    await waitFor(() =>
      expect(screen.getByText(copy('fin.pricing.rateCard.error.read'))).toBeTruthy(),
    )
    expect(screen.queryByRole('list', { name: copy('fin.pricing.rateCard.rail.heading') })).toBeNull()

    /* The two cards below keep their own reads. */
    expect(
      screen.getByRole('heading', { name: copy('fin.pricing.surge.heading') }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: copy('fin.pricing.surge.suspend.confirm') }),
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: copy('fin.error.retry') }))
    await waitFor(() => expect(rail()).toBeTruthy())
  })

  it('AC-RC-18 — with no rate card the block keeps its heading, states the absence and draws no pane', async () => {
    cardsOverride = []
    mount()
    await waitFor(() =>
      expect(screen.getByText(copy('fin.pricing.rateCard.empty.body'))).toBeTruthy(),
    )
    expect(screen.getByText(copy('fin.pricing.rateCard.rail.heading'))).toBeTruthy()
    expect(screen.queryByRole('region', { name: /RC-/ })).toBeNull()
    /* AC-RC-39 — with zero cards the footer's sentence would restate the one
       above it, so no footer renders. */
    expect(document.body.textContent).not.toContain('rate cards ·')
    const block = screen
      .getByText(copy('fin.pricing.rateCard.empty.body'))
      .closest('[data-slot="card"]') as HTMLElement
    expect(block.querySelector('svg'), 'R8 — no illustration on an empty block').toBeNull()
  })

  it('AC-RC-19 — with exactly one card the rail renders normally and says nothing about one of one', async () => {
    const cards = await listRateCards()
    cardsOverride = [cards.find((card) => card.status === 'live') as RateCard]
    await mounted()
    expect(railRows()).toHaveLength(1)
    expect(rowFor(LIVE).getAttribute('aria-current')).toBe('page')
    expect(document.body.textContent).not.toMatch(/1 of 1/)
  })

  it('AC-RC-39 — with no live card the rail footer leads with it, and one banner stands', async () => {
    cardsOverride = (await listRateCards()).filter((card) => card.status !== 'live')
    await mounted()
    const footer = rail().nextElementSibling as HTMLElement
    expect(footer.textContent?.startsWith(copy('fin.pricing.rateCard.noLive'))).toBe(true)
    expect(document.querySelectorAll('[data-slot="alert"]'), 'R10 — never two banners').toHaveLength(1)
  })
})

/* ═══════════════════════ keyboard and screen reader ═════════════════════ */

describe('the rail is reachable and announces itself', () => {
  it('AC-RC-21 — Tab lands on the selection, arrows move focus alone, Enter selects', async () => {
    const user = userEvent.setup()
    const { path } = await mounted(`/financials/pricing?view=rate-card&card=${DRAFT_MODELLED}`)

    /* Tab lands on the SELECTED row, not the first. */
    expect(rowFor(DRAFT_MODELLED).getAttribute('tabindex')).toBe('0')
    expect(rowFor(LIVE).getAttribute('tabindex')).toBe('-1')

    rowFor(DRAFT_MODELLED).focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(rowFor(SUPERSEDED))
    /* Focus moved; the selection and the pane did not. */
    expect(pane().textContent).toContain(DRAFT_MODELLED)
    expect(path()).toContain(`card=${DRAFT_MODELLED}`)

    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(rowFor(LIVE))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(rowFor(SUPERSEDED))

    await user.keyboard('{Enter}')
    await waitFor(() => expect(pane().textContent).toContain(SUPERSEDED))
    expect(document.activeElement, 'focus stays on the row').toBe(rowFor(SUPERSEDED))
  })

  it('AC-RC-22 — the rail is a list named by its heading and every row names the card it opens', async () => {
    await mounted()
    expect(rail().tagName).toBe('OL')
    for (const version of [LIVE, DRAFT_UNMODELLED, DRAFT_MODELLED, SUPERSEDED]) {
      expect(rowFor(version)).toBeTruthy()
    }
  })

  it('AC-RC-23 — one live region in the block, and it names the card the pane is showing', async () => {
    const user = userEvent.setup()
    await mounted()
    const block = rail().closest('[data-slot="card"]') as HTMLElement
    const regions = block.querySelectorAll('[role="status"]')
    expect(regions).toHaveLength(1)
    expect(regions[0]?.textContent).toBe(
      fill('fin.pricing.rateCard.announce', {
        version: LIVE,
        status: copy('fin.pricing.rateCard.status.live'),
      }),
    )

    await user.click(rowFor(DRAFT_MODELLED))
    await waitFor(() =>
      expect(block.querySelector('[role="status"]')?.textContent).toBe(
        fill('fin.pricing.rateCard.announce', {
          version: DRAFT_MODELLED,
          status: copy('fin.pricing.rateCard.status.draft'),
        }),
      ),
    )
    expect(block.querySelectorAll('[role="status"]')).toHaveLength(1)
  })

  it('AC-RC-24 — the selection rides ?card=, and that address opens that card', async () => {
    const user = userEvent.setup()
    const { path } = await mounted()
    await user.click(rowFor(SUPERSEDED))
    await waitFor(() => expect(path()).toContain(`card=${SUPERSEDED}`))
    expect(path()).toContain('view=rate-card')

    /* And that address, loaded cold, opens that card. */
    cleanup()
    await mounted(`/financials/pricing?view=rate-card&card=${DRAFT_MODELLED}`)
    expect(pane().textContent).toContain(DRAFT_MODELLED)
    expect(rowFor(DRAFT_MODELLED).getAttribute('aria-current')).toBe('page')
  })
})

/* ═════════════════════════════════ surge ════════════════════════════════ */

describe('surge windows, suspend and suspensions', () => {
  it('AC-RC-25 — the windows table is five columns, with day names, an en dash and a multiplier', async () => {
    await mounted()
    const windows = await listSurgeWindows()
    const card = surgeCard()
    const headers = within(card).getAllByRole('columnheader')
    expect(headers.map((cell) => cell.textContent?.trim())).toEqual([
      copy('fin.pricing.surge.col.window'),
      copy('fin.pricing.surge.col.days'),
      copy('fin.pricing.surge.col.hours'),
      copy('fin.pricing.surge.col.multiplier'),
      copy('fin.pricing.surge.col.state'),
    ])
    /* F-RC-3 — every day renders through its key, not the raw legacy string. */
    expect(within(card).getAllByText(copy('fin.pricing.surge.day.sun')).length).toBeGreaterThan(0)
    /* An en dash, never a hyphen and never an em dash. */
    expect(card.textContent).toContain('7–9')
    expect(card.textContent).not.toContain('7-9')
    expect(card.textContent).toContain(`${windows[0]?.multiplier}×`)
    expect(headers[2]?.className).toContain('text-end')
    expect(headers[3]?.className).toContain('text-end')
  })

  it('AC-RC-46 — the windows and the district lever are one card titled Surge', async () => {
    await mounted()
    const card = surgeCard()
    expect(
      screen.getByRole('heading', { name: copy('fin.pricing.surge.heading') }),
    ).toBeTruthy()
    /* D35b — the button's label is not also a heading, and it is said once. */
    expect(
      screen.queryByRole('heading', { name: copy('fin.pricing.surge.suspend.confirm') }),
    ).toBeNull()
    const said = card.textContent?.match(/Suspend surge/g) ?? []
    expect(said).toHaveLength(1)
    /* AC-RC-48 — the group is labelled by a visible label, not a heading. */
    const group = within(card).getByRole('radiogroup', {
      name: copy('fin.pricing.surge.suspend.group.label'),
    })
    expect(within(card).getByText(copy('fin.pricing.surge.suspend.group.label')).tagName).toBe(
      'SPAN',
    )
    expect(card.contains(group), 'one card holds both bands').toBe(true)
  })

  it('AC-RC-26 — one single-select district group, and one filled button on the view', async () => {
    const user = userEvent.setup()
    await mounted()
    const group = screen.getByRole('radiogroup', {
      name: copy('fin.pricing.surge.suspend.group.label'),
    })
    const chips = within(group).getAllByRole('radio')
    expect(chips.length).toBeGreaterThan(1)

    const primary = screen.getByRole('button', { name: copy('fin.pricing.surge.suspend.confirm') })
    expect(primary, 'disabled until a district is chosen').toBeDisabled()
    expect(screen.getByText(copy('fin.pricing.surge.suspend.prompt'))).toBeTruthy()

    await user.click(chips[0] as HTMLElement)
    expect(primary).toBeEnabled()
    /* X-RC-5 — the chosen chip takes the toggle's own on-state, not the brand. */
    expect(chips[0]?.getAttribute('data-state')).toBe('on')
    expect(chips[0]?.className).not.toContain('bg-primary')
    /* Single select: choosing a second releases the first. */
    await user.click(chips[1] as HTMLElement)
    expect(chips[0]?.getAttribute('data-state')).toBe('off')

    /* R3 — one primary on the whole view. */
    const filled = [...document.querySelectorAll('button')].filter((button) =>
      /(^|\s)bg-primary(\s|$)/.test(button.className),
    )
    expect(filled).toHaveLength(1)
    expect(filled[0]?.textContent).toBe(copy('fin.pricing.surge.suspend.confirm'))
  })

  it('AC-RC-27 — without write permission the primary is disabled and the reason is visible text', async () => {
    await mounted('/financials/pricing?view=rate-card', readOnlyRow())
    const primary = screen.getByRole('button', { name: copy('fin.pricing.surge.suspend.confirm') })
    expect(primary).toBeDisabled()
    expect(primary.getAttribute('title'), 'never a tooltip').toBeNull()
    const reason = document.getElementById(primary.getAttribute('aria-describedby') ?? '')
    /* A row that declares no write key has no permission to ask for, so the
       refusal does not invent one — and it is not about paying a captain. */
    expect(reason?.textContent).toBe(copy('fin.blocked.write'))
    expect(reason?.textContent).not.toContain('captain')
  })

  it('AC-RC-27 — a permission refusal on Pricing names the permission Pricing gates on', async () => {
    /* Non-vacuity: the shipped row names `manage_plans` and the default Owner
       session holds it, so the refusal is unreachable until an operator who
       does not hold it is signed in. */
    expect(pricingRow().writePermission).toBe('manage_plans')
    const owner = await getSession()
    expect(owner.permissions).toContain('manage_plans')

    const support = await switchMockUser('USR-4')
    expect(support.permissions).not.toContain('manage_plans')
    await mounted()
    const primary = screen.getByRole('button', { name: copy('fin.pricing.surge.suspend.confirm') })
    expect(primary).toBeDisabled()
    const reason = document.getElementById(primary.getAttribute('aria-describedby') ?? '')
    expect(reason?.textContent).toBe(
      fill('fin.pricing.blocked.permission', {
        permission: EN['account.permission.manage_plans'] as string,
      }),
    )
    /* The defect this replaces: there is no captain and no payout here. */
    expect(reason?.textContent).not.toBe(copy('fin.payout.blocked.permission'))
  })

  it('AC-RC-28 — the confirmation names the chosen district and waits for a reason', async () => {
    const user = userEvent.setup()
    await mounted()
    const group = screen.getByRole('radiogroup', {
      name: copy('fin.pricing.surge.suspend.group.label'),
    })
    const chip = within(group).getAllByRole('radio')[0] as HTMLElement
    const district = chip.textContent as string
    await user.click(chip)
    /* The chosen chip is pressed; the screen does not read its own UI back. */
    expect(chip.getAttribute('data-state')).toBe('on')

    await user.click(screen.getByRole('button', { name: copy('fin.pricing.surge.suspend.confirm') }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(fill('fin.pricing.surge.suspend.title', { zone: district })))
      .toBeTruthy()
    expect(
      within(dialog).getByRole('button', { name: copy('fin.pricing.surge.suspend.confirm') }),
    ).toBeDisabled()
  })

  it('AC-RC-29 — suspensions is a queue table with no checkbox, no row actions and a district filter', async () => {
    await mounted()
    const rows = await listSurgeSuspensions()
    expect(rows.length).toBeGreaterThan(1)
    const table = await suspensionsTable()
    expect(within(table).queryAllByRole('checkbox')).toHaveLength(0)
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((cell) => cell.textContent?.trim())).toEqual([
      copy('fin.pricing.surge.col.district'),
      copy('fin.pricing.surge.col.reason'),
      copy('fin.pricing.surge.col.raisedBy'),
      copy('fin.pricing.surge.col.started'),
      copy('fin.pricing.surge.col.suspensionState'),
    ])
    /* R2-4 / D8-b — a suspension has no row action and no kebab. */
    const kebab = new RegExp(copy('table.rowActions').replace('{row}', '.*'))
    expect(within(table).queryAllByRole('button', { name: kebab })).toHaveLength(0)
    /* X-RC-11 — the narrowing is the column's own filter, never a segment row. */
    expect(within(table).queryAllByRole('tab')).toHaveLength(0)
    expect(
      within(headers[0] as HTMLElement).getByRole('button'),
      'the District header opens its own menu',
    ).toBeTruthy()
  })

  it('AC-RC-30 — a running suspension is In force in warning, an expired one is Ended in neutral', async () => {
    await mounted()
    const table = await suspensionsTable()
    const inForce = within(table).getAllByText(copy('fin.pricing.surge.state.inForce'))
    const ended = within(table).getAllByText(copy('fin.pricing.surge.state.ended'))
    expect(inForce).toHaveLength(1)
    expect(ended.length).toBeGreaterThan(1)
    expect(inForce[0]?.getAttribute('data-tone')).toBe('warning')
    expect(ended[0]?.getAttribute('data-tone')).toBe('neutral')

    /* R14 — `Running` belongs to the surge-window table and to nothing else. */
    const windowsCard = surgeCard()
    for (const badge of document.querySelectorAll('[data-slot="badge"]')) {
      expect(badge.getAttribute('data-tone')).not.toBe('critical')
      if (badge.textContent === copy('fin.pricing.surge.enabled')) {
        expect(windowsCard.contains(badge)).toBe(true)
      }
    }
  })

  it('AC-RC-31 — with no suspension ever raised the card says so and draws no illustration', async () => {
    /* Non-vacuity: the fixtures DO carry suspensions, so the sentence below is
       absent until the list this screen is given is genuinely empty. */
    expect((await listSurgeSuspensions()).length).toBeGreaterThan(0)
    suspensionsOverride = []
    await mounted()
    await waitFor(() =>
      expect(screen.getByText(copy('fin.pricing.surge.suspensions.empty'))).toBeTruthy(),
    )
    expect(
      screen.getAllByText(copy('fin.pricing.surge.suspensions.heading')).length,
    ).toBeGreaterThan(0)
    const empty = screen
      .getByText(copy('fin.pricing.surge.suspensions.empty'))
      .closest('div') as HTMLElement
    expect(empty.querySelector('svg'), 'R8 — no illustration').toBeNull()
  })
})
