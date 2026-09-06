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
import type {
  Paginated,
  RateCard,
  SubTabRoute,
  SurgeSuspension,
  SurgeWindow,
  Zone,
} from '@/data/types'
import { fixedClock } from '@/data/mock/clock'
import { resetClock, setClockSource } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { PricingScreen } from './PricingScreen'

/** What `listRateCards` answers with, when a test needs a shape fixtures lack. */
let cardsOverride: RateCard[] | null = null
let suspensionsOverride: SurgeSuspension[] | null = null
/* The `Surge` card's two reads, so §10.6's empties are reachable: the fixtures
   ship three windows and six districts and neither client takes a query. */
let windowsOverride: SurgeWindow[] | null = null
let zonesOverride: Zone[] | null = null
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
    listSurgeWindows: async (signal?: AbortSignal) => {
      const all = await actual.listSurgeWindows(signal)
      return windowsOverride ?? all
    },
    listZones: async (params?: Parameters<typeof actual.listZones>[0]) => {
      const page = await actual.listZones(params)
      if (zonesOverride === null) return page
      return { ...page, items: zonesOverride, total: zonesOverride.length } as Paginated<Zone>
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
  windowsOverride = null
  zonesOverride = null
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

/* ════════ what the rebuild changed, and what nothing was asserting ═══════ */

/**
 * Revision 2 of the design spec, plus **D35a / D35b / D36**. Every test below
 * covers a criterion the rebuild added or moved, and every one of them was
 * either unasserted or asserted only as a clause inside a test named after a
 * different criterion.
 *
 * **Not here, and deliberately: AC-RC-32, 44, 45 and 47.** All four are
 * computed-style criteria — the seven-rung ramp, the Arabic row *minimum*, the
 * 4/8/12/24 spacing scale, and D35a's 1px hairline on a disabled control. jsdom
 * loads no stylesheet and lays out no table, so a jsdom assertion on any of
 * them would pass against a screen with none of it. They belong to
 * `scripts/harness/fin-rate-card.mjs`, which measures them in Chromium.
 */
const suspendLabel = () => copy('fin.pricing.surge.suspend.confirm')
const districtGroup = () =>
  screen.getByRole('radiogroup', { name: copy('fin.pricing.surge.suspend.group.label') })
const suspendButton = () => within(surgeCard()).getByRole('button', { name: suspendLabel() })
const impactBand = () =>
  within(pane())
    .getByText(copy('fin.pricing.rateCard.impact.heading'))
    .closest('section') as HTMLElement

describe('band D, the one primary, and D35b', () => {
  it('AC-RC-37 — band D is three labelled figures and one caption, the delta neutral text and no arrow', async () => {
    await mounted()
    const band = impactBand()

    /* Three figures, each one LABELLED: no bare number sits in the row. */
    for (const key of ['impact.before', 'impact.after', 'impact.change']) {
      expect(
        within(band).getAllByText(copy(`fin.pricing.rateCard.${key}`)),
        `${key} is stated once`,
      ).toHaveLength(1)
    }
    expect(band.textContent).toContain('21.80')
    expect(band.textContent).toContain('22.94')

    /* One caption for the band, absorbing the two meta lines that flanked it. */
    const caption = within(band).getByText(
      fill('fin.pricing.rateCard.impact.caption.past', { trips: '4,186', date: '21 Mar' }),
    )
    expect(caption.tagName).toBe('P')
    expect(within(band).getAllByText(/Measured against/)).toHaveLength(1)

    /* R4-5 / X-RC-7 — the delta is a quantity, so it is neither a badge nor a
       pill, and no arrow stands in for the word. */
    const change = within(band).getByText('+5.2%')
    expect(change.closest('[data-slot="badge"]')).toBeNull()
    expect(band.textContent).not.toContain('→')
    expect(document.body.textContent).not.toContain('→')
  })

  it('AC-RC-42 — exactly one control on the view carries the default variant, and it is Suspend surge', async () => {
    const user = userEvent.setup()
    await mounted()

    const filled = [...document.querySelectorAll('[data-variant="default"]')]
    expect(filled).toHaveLength(1)
    expect(filled[0]).toHaveAccessibleName(suspendLabel())

    /* A draft adds the only other control on the view, and it does not claim
       the primary: `secondary`, disabled, with its refusal beside it. */
    await user.click(rowFor(DRAFT_UNMODELLED))
    await waitFor(() => expect(pane().textContent).toContain(DRAFT_UNMODELLED))
    const approve = within(pane()).getByRole('button', {
      name: copy('fin.pricing.rateCard.approve'),
    })
    expect(approve.getAttribute('data-variant')).toBe('secondary')
    expect(approve).toBeDisabled()
    expect([...document.querySelectorAll('[data-variant="default"]')]).toHaveLength(1)
  })

  it('AC-RC-48 — the Surge card carries one heading, and the district band is labelled, not headed', async () => {
    await mounted()
    const card = surgeCard()
    const headings = within(card).getAllByRole('heading')
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveAccessibleName(copy('fin.pricing.surge.heading'))

    /* The group's accessible name comes from a VISIBLE label, so a sighted
       operator and a screen-reader operator read the same word. */
    const label = within(card).getByText(copy('fin.pricing.surge.suspend.group.label'))
    expect(label.tagName).not.toMatch(/^H[1-6]$/)
    expect(districtGroup()).toHaveAccessibleName(copy('fin.pricing.surge.suspend.group.label'))
    expect(label.id).toBe(districtGroup().getAttribute('aria-labelledby'))
  })

  it('D35b — the card title and the control never carry the same string, by accessible name', async () => {
    const user = userEvent.setup()
    await mounted()
    const card = surgeCard()

    /* One element in the card answers to `Suspend surge`, and it is a button. */
    const named = within(card).getAllByRole('button', { name: suspendLabel() })
    expect(named).toHaveLength(1)
    expect(named[0]?.tagName).toBe('BUTTON')
    expect(within(card).queryAllByRole('heading', { name: suspendLabel() })).toHaveLength(0)
    expect(screen.queryAllByRole('heading', { name: suspendLabel() })).toHaveLength(0)

    /* The title is a noun phrase for the object; the button is a verb phrase
       for the act, and the two are different strings. */
    const title = within(card).getByRole('heading')
    expect(title.textContent).not.toBe(named[0]?.textContent)

    /* The instruction is stated once, on the line where it changes what the
       operator can do — the refusal — and not a second time as a subtitle. */
    expect(within(card).getAllByText(copy('fin.pricing.surge.suspend.prompt'))).toHaveLength(1)

    /* The confirmation is a second SURFACE, not a second line in this card:
       `copy.md` 5 has the dialog echo the act it confirms, and while it is open
       the card is out of the accessibility tree entirely. Closed again, the
       card still answers to the string exactly once. */
    await user.click(within(districtGroup()).getAllByRole('radio')[0] as HTMLElement)
    await user.click(suspendButton())
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: suspendLabel() })).toBeTruthy()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(within(surgeCard()).getAllByRole('button', { name: suspendLabel() })).toHaveLength(1)
  })
})

/* ═══════════ the write gate names the permission this sub-tab wants ══════ */

/**
 * The regression this pins. `useWriteGate` handed every Financials sub-tab
 * `fin.payout.blocked.permission` — *"You cannot pay a captain…"* — under a
 * control that suspends surge on a screen with no captain and no payout.
 *
 * The refusal is only reachable by signing in an operator who does not hold
 * `manage_plans`: the default `USR-1` is an Owner with all twenty keys, and
 * every role holding `view_finance` holds `manage_plans` in its baseline. So
 * each test below states its positive twin — the same control, the same
 * render, with the permission present — because a gate no operator can fail is
 * a gate that cannot be tested (`shell/permissions.ts:37`).
 */
describe('AC-RC-27 — a blocked control names the permission its own sub-tab wants', () => {
  const pricingRefusal = () =>
    fill('fin.pricing.blocked.permission', {
      permission: EN['account.permission.manage_plans'] as string,
    })

  it('AC-RC-27 — holding manage_plans, a district arms the primary and no permission is named', async () => {
    const user = userEvent.setup()
    const owner = await getSession()
    expect(owner.permissions, 'the default session is the positive twin').toContain('manage_plans')

    await mounted()
    const primary = suspendButton()
    expect(primary).toBeDisabled()
    /* Disabled for the reason the SCREEN owns, not for a permission. */
    const before = document.getElementById(primary.getAttribute('aria-describedby') ?? '')
    expect(before?.textContent).toBe(copy('fin.pricing.surge.suspend.prompt'))

    await user.click(within(districtGroup()).getAllByRole('radio')[0] as HTMLElement)
    expect(primary).toBeEnabled()
    expect(document.body.textContent).not.toContain(pricingRefusal())
    expect(document.body.textContent).not.toContain('permission')
  })

  it('AC-RC-27 — without manage_plans the refusal names manage_plans, and no district lifts it', async () => {
    const user = userEvent.setup()
    const support = await switchMockUser('USR-4')
    expect(support.permissions).not.toContain('manage_plans')
    expect(pricingRow().writePermission, 'Pricing gates on manage_plans').toBe('manage_plans')

    await mounted()
    const primary = suspendButton()
    expect(primary).toBeDisabled()
    expect(primary.getAttribute('title'), 'a refusal is text, never a tooltip').toBeNull()

    const reason = document.getElementById(primary.getAttribute('aria-describedby') ?? '')
    expect(reason?.textContent).toBe(pricingRefusal())
    /* It quotes the permission's LABEL, never the bare key (D17 clause 1). */
    expect(reason?.textContent).toContain(EN['account.permission.manage_plans'] as string)
    expect(reason?.textContent).not.toContain('manage_plans')

    /* And it is the GATE talking, not the screen: choosing a district is still
       possible and still refuses, with the same sentence. */
    const chip = within(districtGroup()).getAllByRole('radio')[0] as HTMLElement
    await user.click(chip)
    expect(chip.getAttribute('data-state')).toBe('on')
    expect(primary).toBeDisabled()
    expect(
      document.getElementById(primary.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe(pricingRefusal())
  })

  it('AC-RC-27 — the same refusal reaches Approve, and the captain sentence is nowhere on the view', async () => {
    const user = userEvent.setup()
    /* Non-vacuity: the payout sentence is a live key with a captain in it, so
       an assertion that it is absent is an assertion about this screen. */
    expect(copy('fin.payout.blocked.permission')).toContain('captain')

    await switchMockUser('USR-4')
    await mounted()
    await user.click(rowFor(DRAFT_UNMODELLED))
    await waitFor(() => expect(pane().textContent).toContain(DRAFT_UNMODELLED))

    const approve = within(pane()).getByRole('button', {
      name: copy('fin.pricing.rateCard.approve'),
    })
    expect(approve).toBeDisabled()
    const reason = document.getElementById(approve.getAttribute('aria-describedby') ?? '')
    expect(reason?.textContent).toBe(pricingRefusal())

    expect(document.body.textContent).not.toContain('captain')
    expect(document.body.textContent).not.toContain(copy('fin.payout.blocked.permission'))
  })
})

/* ══════════ the Surge card's four states, and one read per band ══════════ */

describe('AC-RC-49 — one failed read never blanks the other band', () => {
  it('AC-RC-49 — a failed windows read errors inside the card and the district band still renders', async () => {
    const user = userEvent.setup()
    mockFailures.once('pricing.surgeWindows')
    await mounted()

    const card = surgeCard()
    expect(within(card).getByText(copy('fin.pricing.surge.error.windows'))).toBeTruthy()
    expect(
      within(card).queryByRole('columnheader', { name: copy('fin.pricing.surge.col.window') }),
    ).toBeNull()
    /* The lever is not blanked by a read it does not depend on. */
    expect(
      within(card).getByRole('radiogroup', {
        name: copy('fin.pricing.surge.suspend.group.label'),
      }),
    ).toBeTruthy()
    expect(suspendButton()).toBeTruthy()

    await user.click(within(card).getByRole('button', { name: copy('fin.error.retry') }))
    await waitFor(() =>
      expect(
        within(surgeCard()).getByRole('columnheader', {
          name: copy('fin.pricing.surge.col.window'),
        }),
      ).toBeTruthy(),
    )
  })

  it('AC-RC-49 — a failed districts read errors and the windows table still renders', async () => {
    mockFailures.once('zones.list')
    await mounted()

    const card = surgeCard()
    expect(within(card).getByText(copy('fin.pricing.surge.error.districts'))).toBeTruthy()
    /* §10.6 — the primary is not rendered where there is nothing to choose. */
    expect(within(card).queryByRole('button', { name: suspendLabel() })).toBeNull()
    expect(
      within(card).getByRole('columnheader', { name: copy('fin.pricing.surge.col.window') }),
    ).toBeTruthy()
    expect(within(card).getAllByText(copy('fin.pricing.surge.day.sun')).length).toBeGreaterThan(0)
  })

  it('§10.6 — with no window set the card says so in words and keeps the district band', async () => {
    /* Non-vacuity: the fixtures ship three windows. */
    expect((await listSurgeWindows()).length).toBe(3)
    windowsOverride = []
    await mounted()

    const card = surgeCard()
    expect(within(card).getByText(copy('fin.pricing.surge.empty'))).toBeTruthy()
    expect(within(card).queryAllByRole('table')).toHaveLength(0)
    expect(card.querySelector('svg'), 'R8 — no illustration on an empty band').toBeNull()
    expect(suspendButton()).toBeTruthy()
  })

  it('§10.6 — with no district tracked the card says so and renders no primary', async () => {
    zonesOverride = []
    await mounted()

    const card = surgeCard()
    expect(within(card).getByText(copy('fin.pricing.surge.suspend.district.empty'))).toBeTruthy()
    expect(within(card).queryByRole('radiogroup')).toBeNull()
    expect(within(card).queryByRole('button', { name: suspendLabel() })).toBeNull()
    /* The windows the operator cannot suspend are still stated. */
    expect(
      within(card).getByRole('columnheader', { name: copy('fin.pricing.surge.col.window') }),
    ).toBeTruthy()
  })

  it('§10.6 — while the two reads are in flight the bands are busy, with no spinner', () => {
    mount()
    const busy = [...document.querySelectorAll('[aria-busy="true"]')]
    expect(busy.length).toBeGreaterThan(0)
    expect(document.querySelector('[data-slot="spinner"]')).toBeNull()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(4)
    /* Nothing promises a chip that has not arrived. */
    expect(screen.queryAllByRole('radiogroup')).toHaveLength(0)
  })

  it('§10.6 — a failed suspensions read renders the table error and the Surge card still stands', async () => {
    mockFailures.once('pricing.surgeSuspensions')
    await mounted()
    await waitFor(() => expect(screen.getByText(copy('fin.error.read'))).toBeTruthy())
    expect(screen.getByRole('button', { name: EN['state.pageError.action'] as string })).toBeTruthy()
    expect(surgeCard()).toBeTruthy()
    expect(rail()).toBeTruthy()
  })
})

/* ═════════════ the copy the rebuild applied, on the surface ═════════════ */

describe('the applied copy sheet', () => {
  it('no retired string reaches the surface, and its replacement does', async () => {
    const user = userEvent.setup()
    await mounted()

    const retired = [
      /* §3.6 / §6 — the pane footer, both halves said elsewhere. */
      'This card prices every trip today',
      'Editing waits on the pricing owner decision',
      /* §4.2 — the panel that said everything twice. */
      'Choose a district, then confirm.',
      /* §3.2 — `consumer` is not a word this product uses of a person. */
      'Consumer prices',
      /* §3.4 — a refusal stated where it could not be acted on. */
      'cannot be approved',
      /* §3.5 — the half that only defined its own heading. */
      'Guardrails a card is checked against',
      /* §4.1 — the operator is addressed as `you`, not as a department. */
      'Windows are set by pricing',
    ]
    for (const gone of retired) {
      expect(document.body.textContent, `retired: ${gone}`).not.toContain(gone)
    }

    for (const key of [
      'fin.pricing.rateCard.stat.riderPrices',
      'fin.pricing.rateCard.floors.caption',
      'fin.pricing.surge.readOnly',
    ]) {
      expect(document.body.textContent, `replacement: ${key}`).toContain(copy(key))
    }

    /* §3.4's replacement renders on the card it is about, and only there. */
    await user.click(rowFor(DRAFT_UNMODELLED))
    await waitFor(() => expect(pane().textContent).toContain(DRAFT_UNMODELLED))
    expect(within(pane()).getByText(copy('fin.pricing.rateCard.impact.none'))).toBeTruthy()
  })

  it('no em dash reaches the surface, in a string or in a fixture', async () => {
    const user = userEvent.setup()
    await mounted()
    /* Non-vacuity: the two suspension reasons that carried one are on screen. */
    const table = await suspensionsTable()
    expect(table.textContent).toContain('Stadium event')
    expect(document.body.textContent, 'X14 — no U+2014 anywhere').not.toContain('—')

    /* The confirmation carried the third one, and it named `zone` in prose. */
    await user.click(within(districtGroup()).getAllByRole('radio')[0] as HTMLElement)
    await user.click(suspendButton())
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).not.toContain('—')
    expect(dialog.textContent).not.toContain('zone')
    expect(dialog.textContent).toContain('district')
    /* §4.3 — the consequence states its magnitude, and the reason's helper
       text stops carrying a duration that is not a constraint on a reason. */
    expect(dialog.textContent).toContain('12 hours')
    expect(within(dialog).getByText(copy('fin.pricing.surge.suspend.reason.help'))).toBeTruthy()
    expect(dialog.textContent).not.toContain('Up to 12 hours')
  })

  it('D36 — five money columns state SAR once, and no column label repeats the unit', async () => {
    await mounted()
    const table = within(pane()).getAllByRole('table')[0] as HTMLElement
    const head = table.querySelector('thead') as HTMLElement
    for (const header of within(table).getAllByRole('columnheader')) {
      expect(header.textContent, 'the unit is not repeated per label').not.toContain('SAR')
    }
    expect(head.textContent?.match(/SAR/g) ?? []).toHaveLength(1)
    /* The rung is `aria-hidden`, so the caption is where a screen-reader
       operator is told the unit instead. */
    const rung = within(head).getByText('SAR').closest('[aria-hidden="true"]')
    expect(rung, 'a colspan rung announces poorly, so it is hidden').toBeTruthy()
    const caption = table.querySelector('caption') as HTMLElement
    expect(caption.textContent).toContain('All figures in SAR.')
  })
})

/* ═════════════════════════ the keyboard paths ═══════════════════════════ */

describe('the keyboard reaches every act on the view', () => {
  it('§12.1 — Tab out of the rail lands on the district field, since a live pane holds no control', async () => {
    const user = userEvent.setup()
    await mounted()
    expect(
      within(pane()).queryAllByRole('button'),
      'a live pane holds nothing focusable',
    ).toHaveLength(0)

    rowFor(LIVE).focus()
    await user.tab()
    const chips = within(districtGroup()).getAllByRole('radio')
    expect(document.activeElement, 'the next stop is the first district chip').toBe(chips[0])

    await user.keyboard('{Enter}')
    expect(chips[0]?.getAttribute('data-state')).toBe('on')
    await user.tab()
    expect(document.activeElement).toBe(suspendButton())
  })

  it('§12.2 — Escape closes the confirmation and writes nothing', async () => {
    const user = userEvent.setup()
    await mounted()
    const before = (await listSurgeSuspensions()).length
    await user.click(within(districtGroup()).getAllByRole('radio')[0] as HTMLElement)

    const primary = suspendButton()
    primary.focus()
    /* The primary is reached and fired from the keyboard alone. */
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: suspendLabel() })).toBeDisabled()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    /* Nothing was written: the log is the length it was. */
    expect((await listSurgeSuspensions()).length).toBe(before)
    /* And the district survives the dismissal, so the operator does not start
       the act again from nothing. */
    expect(within(districtGroup()).getAllByRole('radio')[0]?.getAttribute('data-state')).toBe('on')
  })

  /**
   * **FAILING, and it is the product that is wrong.** Closing the confirmation
   * leaves `document.activeElement` on `<body>`: the operator's place in the
   * page is gone and the next `Tab` restarts at the top of the document.
   *
   * Reproduced by both routes out of the dialog — `Escape` and `Cancel` — and
   * it survives an 8-second `waitFor`, so it is not a timing artefact. It is
   * also not a jsdom limit: the identical assertion passes at
   * `operations/requests/requests.test.tsx:541`, over `ConfirmDialog`, whose
   * own comment records the same defect being fixed — *"it could not while
   * `ConfirmDialog` unmounted itself on close."*
   * `ConfirmMoneyDialog.tsx:153` still renders `<Dialog open>` and is unmounted
   * by its parent, where `components/ConfirmDialog.tsx:164` renders
   * `open={request !== null}`. Not fixed here: shared file, engineer's call.
   */
  it('§12.2 — focus returns to the control that opened the confirmation', async () => {
    const user = userEvent.setup()
    await mounted()
    await user.click(within(districtGroup()).getAllByRole('radio')[0] as HTMLElement)

    suspendButton().focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(document.activeElement, 'Escape returns focus to the trigger').toBe(suspendButton()),
    )

    /* The same, by the dialog's own dismissal control. */
    suspendButton().focus()
    await user.click(suspendButton())
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: copy('queue.confirm.cancel') }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(document.activeElement, 'Cancel returns focus to the trigger').toBe(suspendButton()),
    )
  })
})

/* ════════════════════ the pane's four bands, in order ═══════════════════ */

describe('the pane is four bands and stops', () => {
  it('AC-RC-35 — four bands in the order identity, prices, terms, impact, and nothing below the fourth', async () => {
    await mounted()
    /* The live region is band-independent; the four bands are what is left. */
    const bands = [...pane().children].filter((child) => child.getAttribute('role') !== 'status')
    expect(bands).toHaveLength(4)

    const [identity, prices, terms, impact] = bands as HTMLElement[]
    expect(identity?.textContent).toContain(LIVE)
    expect(identity?.textContent).toContain(copy('fin.pricing.rateCard.status.live'))
    expect(within(prices as HTMLElement).getByRole('table')).toBeTruthy()
    expect(terms?.textContent).toContain(copy('fin.pricing.rateCard.terms.heading'))
    expect(terms?.textContent).toContain(copy('fin.pricing.rateCard.floors.heading'))
    expect(impact?.textContent).toContain(copy('fin.pricing.rateCard.impact.heading'))

    /* Three hairlines: one under each change of subject, none under the last. */
    expect(pane().querySelectorAll(':scope > .border-t')).toHaveLength(3)
    expect(identity?.className).not.toContain('border-t')
    /* §6 — the orphan footer that used to sit under band D is gone. */
    expect(pane().lastElementChild).toBe(impact)
  })

  it('AC-RC-36 — both halves of band C are the same instrument: key/value rows, never a cluster', async () => {
    await mounted()
    const terms = within(pane())
      .getByText(copy('fin.pricing.rateCard.terms.heading'))
      .closest('div') as HTMLElement
    const lists = terms.querySelectorAll('dl')
    expect(lists, 'two halves, two lists').toHaveLength(2)
    /* Three rows beside four, each one a label and its single value. A
       label-over-figure cluster is what revision 1 put beside this list. */
    expect(lists[0]?.querySelectorAll('dt')).toHaveLength(3)
    expect(lists[1]?.querySelectorAll('dt')).toHaveLength(4)
    for (const list of lists) {
      expect(list.querySelectorAll('dt').length).toBe(list.querySelectorAll('dd').length)
    }
    /* One caption for the band, not one per column. */
    expect(within(terms).getAllByText(copy('fin.pricing.rateCard.floors.caption'))).toHaveLength(1)
  })
})
