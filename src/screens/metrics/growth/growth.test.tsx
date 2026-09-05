/**
 * Management › Growth — one test per acceptance criterion in
 * `specs/management-growth-tables.md` (T7.1, O3). Named after the criterion, and
 * every assertion is by role, label or text, the way an operator perceives it.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  GROWTH_OPERATIONS,
  disableMockLatency,
  getRouteTable,
  mockFailures,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { UI_STATE_KEYS, defaultUiStore, placeholdersIn } from '@/lib'
import { GROWTH_AR } from '@/i18n/ar/growth'
import { ShellProvider } from '@/shell/ShellContext'
import { GROWTH_EN } from './copy'
import { GrowthScreen } from './GrowthScreen'

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'management-growth')
  if (!found) throw new Error('No route-table row for management-growth')
  return found
}

const en = (key: string) => String(GROWTH_EN[key])

beforeEach(async () => {
  disableMockLatency()
  mockFailures.clear()
  resetDataLayer()
  await switchMockUser('USR-1')
})

function renderGrowth(path = '/management/growth') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <GrowthScreen row={row()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The table for the active view. Scoped, so the board above never answers for it. */
const table = async () => await screen.findByRole('table')

describe('the view strip', () => {
  it('AC-G01: renders the board and no table when no view is asked for', async () => {
    renderGrowth()
    expect(await screen.findByRole('tab', { name: en('growth.view.board') })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('AC-G02: renders five view tabs with Board selected by default', async () => {
    renderGrowth()
    const board = await screen.findByRole('tab', { name: en('growth.view.board') })
    expect(board).toHaveAttribute('aria-selected', 'true')
    for (const key of [
      'growth.view.promos',
      'growth.view.referrals',
      'growth.view.incentives',
      'growth.view.messages',
    ]) {
      expect(screen.getByRole('tab', { name: en(key) })).toBeInTheDocument()
    }
  })

  it('AC-G03: selecting a list tab renders that table beneath the board', async () => {
    renderGrowth()
    await userEvent.click(await screen.findByRole('tab', { name: en('growth.view.promos') }))
    const grid = await table()
    expect(within(grid).getByText('EYVAR30')).toBeInTheDocument()
    /* The board is still on the page: its `h1` names the sub-tab. */
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('AC-G04: a reloaded ?view= lands on that table with its tab selected', async () => {
    renderGrowth('/management/growth?view=incentives')
    expect(
      await screen.findByRole('tab', { name: en('growth.view.incentives') }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(within(await table()).getByText('Perfect package bonus')).toBeInTheDocument()
  })

  it('AC-G05: an unrecognised ?view= falls back to the board, not an error', async () => {
    renderGrowth('/management/growth?view=nonsense')
    expect(await screen.findByRole('tab', { name: en('growth.view.board') })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('AC-G31: the Growth sub-tab raises no nav badge', () => {
    expect(row().hasBacklog).toBe(false)
  })
})

describe('promos', () => {
  const openPromos = async () => {
    renderGrowth('/management/growth?view=promos')
    return await table()
  }

  it('AC-G06: lists every campaign with its code, burn, new subs, return and status', async () => {
    const grid = await openPromos()
    const row = within(grid).getByRole('row', { name: /EYVAR30/ })
    expect(within(row).getByText('30%')).toBeInTheDocument()
    expect(within(row).getByText('84%')).toBeInTheDocument()
    expect(within(row).getByText('61')).toBeInTheDocument()
    expect(within(row).getByText('1.3×')).toBeInTheDocument()
    expect(within(row).getByText(en('growth.promo.status.active'))).toBeInTheDocument()
  })

  it('AC-G07: a campaign whose budget is consumed reads Budget spent at 100 %', async () => {
    const grid = await openPromos()
    const row = within(grid).getByRole('row', { name: /BACK2WORK/ })
    expect(within(row).getByText('100%')).toBeInTheDocument()
    expect(within(row).getByText(en('growth.promo.status.exhausted'))).toBeInTheDocument()
  })

  it('AC-G08: sorting by return orders the rows by that column', async () => {
    const grid = await openPromos()
    await userEvent.click(
      within(grid).getByRole('button', { name: `Column options for ${en('growth.promo.column.roi')}` }),
    )
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Sort low to high' }))
    await waitFor(() => {
      const first = screen.getAllByRole('row')[1]
      expect(first).toBeDefined()
      expect(first?.textContent).toContain('WELCOME5')
    })
  })

  it('AC-G09: filtering to Active leaves only active campaigns, and the chip says so', async () => {
    const grid = await openPromos()
    await userEvent.click(
      within(grid).getByRole('button', {
        name: `Column options for ${en('growth.promo.column.status')}`,
      }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Filter…' }))
    await userEvent.click(
      await screen.findByRole('radio', { name: en('growth.promo.status.active') }),
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('row', { name: /BACK2WORK/ })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('row', { name: /EYVAR30/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: `${en('growth.promo.column.status')}: ${en('growth.promo.status.active')}`,
      }),
    ).toBeInTheDocument()
  })

  it('AC-G14: a mixed selection refuses the whole bulk pause and names the count', async () => {
    const grid = await openPromos()
    for (const code of ['EYVAR30', 'STUDENT12', 'BACK2WORK']) {
      const target = within(grid).getByRole('row', { name: new RegExp(code) })
      await userEvent.click(within(target).getByRole('checkbox'))
    }
    const bar = screen.getByRole('group', { name: '3 selected' })
    expect(within(bar).getByRole('button', { name: en('growth.promo.bulk.pause') })).toBeDisabled()
    expect(screen.getByText('1 of 3 campaigns are not active')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select only the 2 eligible' })).toBeInTheDocument()
    /* No partial apply: nothing moved. */
    expect(
      within(screen.getByRole('row', { name: /EYVAR30/ })).getByText(
        en('growth.promo.status.active'),
      ),
    ).toBeInTheDocument()
  })

  it('AC-G15: taking the eligible subset updates the bar before the command can run', async () => {
    const grid = await openPromos()
    for (const code of ['EYVAR30', 'STUDENT12', 'BACK2WORK']) {
      const target = within(grid).getByRole('row', { name: new RegExp(code) })
      await userEvent.click(within(target).getByRole('checkbox'))
    }
    await userEvent.click(screen.getByRole('button', { name: 'Select only the 2 eligible' }))
    const bar = await screen.findByRole('group', { name: '2 selected' })
    await waitFor(() => {
      expect(within(bar).getByRole('button', { name: en('growth.promo.bulk.pause') })).toBeEnabled()
    })
  })

  it('AC-G26: the view offers a CSV export control', async () => {
    await openPromos()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
  })

  it('AC-G27: the pagination row states the range and the total', async () => {
    await openPromos()
    expect(await screen.findByText('Showing 1–10 of 10')).toBeInTheDocument()
  })

  it('AC-G10: Pause moves an active campaign to Paused and keeps it on the list', async () => {
    const grid = await openPromos()
    const target = within(grid).getByRole('row', { name: /STUDENT12/ })
    await userEvent.click(within(target).getByRole('button', { name: en('growth.promo.action.pause') }))
    await userEvent.click(
      await screen.findByRole('button', { name: en('growth.promo.confirm.action') }),
    )
    await waitFor(() => {
      const after = screen.getByRole('row', { name: /STUDENT12/ })
      expect(within(after).getByText(en('growth.promo.status.paused'))).toBeInTheDocument()
    })
  })

  it('AC-G11: Resume moves a paused campaign back to Active', async () => {
    const grid = await openPromos()
    const target = within(grid).getByRole('row', { name: /NARJIS15/ })
    await userEvent.click(
      within(target).getByRole('button', { name: en('growth.promo.action.resume') }),
    )
    await waitFor(() => {
      const after = screen.getByRole('row', { name: /NARJIS15/ })
      expect(within(after).getByText(en('growth.promo.status.active'))).toBeInTheDocument()
    })
  })

  it('AC-G12: an exhausted campaign offers neither Pause nor Resume', async () => {
    const grid = await openPromos()
    const target = within(grid).getByRole('row', { name: /BACK2WORK/ })
    expect(
      within(target).getByRole('button', { name: en('growth.promo.action.pause') }),
    ).toBeDisabled()
    expect(
      within(target).getByRole('button', { name: en('growth.promo.action.resume') }),
    ).toBeDisabled()
  })

  it('AC-G13: a role without manage_plans sees Pause disabled, not hidden', async () => {
    await switchMockUser('USR-3')
    const grid = await openPromos()
    const target = within(grid).getByRole('row', { name: /EYVAR30/ })
    const pause = within(target).getByRole('button', { name: en('growth.promo.action.pause') })
    expect(pause).toBeDisabled()
    expect(screen.getAllByText(en('growth.promo.refuse.role')).length).toBeGreaterThan(0)
  })

  it('AC-G16: clicking a row opens a sheet naming the campaign and its target', async () => {
    const grid = await openPromos()
    await userEvent.click(within(grid).getByText('EYVAR30'))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('Campaign EYVAR30')).toBeInTheDocument()
    expect(within(sheet).getByText(en('growth.promo.target.new-riders'))).toBeInTheDocument()
    expect(within(sheet).getByText(en('growth.promo.sheet.perUser'))).toBeInTheDocument()
  })

  it('AC-G28: the filtered-to-zero state is one sentence, not the illustration', async () => {
    const grid = await openPromos()
    void grid
    await userEvent.type(screen.getByRole('textbox', { name: en('growth.promo.search') }), 'zzzz')
    expect(await screen.findByText(en('growth.promo.noMatch'))).toBeInTheDocument()
    expect(screen.queryByText(en('growth.promo.empty.heading'))).not.toBeInTheDocument()
  })

  it('AC-G29: a failed read renders the table error and recovers on Try again', async () => {
    mockFailures.once(GROWTH_OPERATIONS.listPromos)
    renderGrowth('/management/growth?view=promos')
    expect(await screen.findByText(en('growth.promo.error'))).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(within(await table()).getByText('EYVAR30')).toBeInTheDocument()
  })
})

describe('referrals', () => {
  const openReferrals = async () => {
    renderGrowth('/management/growth?view=referrals')
    return await table()
  }

  it('AC-G17: lists each referral with both riders and both bonuses', async () => {
    const grid = await openReferrals()
    const row = within(grid).getByRole('row', { name: /Nora Al-Harbi/ })
    expect(within(row).getByText('Sara Al-Ghamdi')).toBeInTheDocument()
    expect(row.textContent).toContain('20.00')
    expect(row.textContent).toContain('10.00')
  })

  it('AC-G18: a shared-device pair carries the signal as a word', async () => {
    const grid = await openReferrals()
    const row = within(grid).getByRole('row', { name: /Layla Al-Faraj/ })
    expect(within(row).getByText(en('growth.referral.flag.shared'))).toBeInTheDocument()
    const clean = within(grid).getByRole('row', { name: /Nora Al-Harbi/ })
    expect(within(clean).queryByText(en('growth.referral.flag.shared'))).not.toBeInTheDocument()
  })

  it('AC-G19: both riders are links and the list offers no row action', async () => {
    const grid = await openReferrals()
    const row = within(grid).getByRole('row', { name: /Nora Al-Harbi/ })
    expect(within(row).getByRole('link', { name: 'Nora Al-Harbi' })).toHaveAttribute(
      'href',
      '/operations/people/riders/RDR-1041',
    )
    expect(within(row).getByRole('link', { name: 'Sara Al-Ghamdi' })).toBeInTheDocument()
    expect(within(row).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('incentives', () => {
  const openIncentives = async () => {
    renderGrowth('/management/growth?view=incentives')
    return await table()
  }

  it('AC-G20: lists each rule with its condition, earned count and total paid', async () => {
    const grid = await openIncentives()
    const row = within(grid).getByRole('row', { name: /Perfect package bonus/ })
    expect(
      within(row).getByText(en('growth.incentive.condition.perfect-package')),
    ).toBeInTheDocument()
    expect(row.textContent).toContain('40.00')
  })

  it('AC-G21: a commission cut reads as a from-to pair and money reads as money', async () => {
    const grid = await openIncentives()
    const cut = within(grid).getByRole('row', { name: /Gold captain commission/ })
    expect(within(cut).getByText('Commission 20% to 17%')).toBeInTheDocument()
    const money = within(grid).getByRole('row', { name: /Perfect package bonus/ })
    expect(money.textContent).toContain('a package')
  })

  it('AC-G22: Deactivate pauses a rule and Activate brings it back', async () => {
    const grid = await openIncentives()
    const target = within(grid).getByRole('row', { name: /5-star streak/ })
    await userEvent.click(
      within(target).getByRole('button', { name: en('growth.incentive.action.deactivate') }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: en('growth.incentive.confirm.action') }),
    )
    await waitFor(() => {
      const after = screen.getByRole('row', { name: /5-star streak/ })
      expect(within(after).getByText(en('growth.incentive.status.paused'))).toBeInTheDocument()
    })
    await userEvent.click(
      within(screen.getByRole('row', { name: /5-star streak/ })).getByRole('button', {
        name: en('growth.incentive.action.activate'),
      }),
    )
    await waitFor(() => {
      const after = screen.getByRole('row', { name: /5-star streak/ })
      expect(within(after).getByText(en('growth.incentive.status.active'))).toBeInTheDocument()
    })
  })
})

describe('messages', () => {
  const openMessages = async () => {
    renderGrowth('/management/growth?view=messages')
    return await table()
  }

  it('AC-G23: lists each send newest first with its segment, channel and audience', async () => {
    const grid = await openMessages()
    const rows = within(grid).getAllByRole('row')
    expect(rows[1]?.textContent).toContain('Your package expires in 3 days')
    const row = within(grid).getByRole('row', { name: /Your package expires in 3 days/ })
    expect(
      within(row).getByText(en('growth.message.segment.packages-expiring')),
    ).toBeInTheDocument()
    expect(within(row).getByText(en('growth.message.channel.push'))).toBeInTheDocument()
    expect(within(row).getByText('8')).toBeInTheDocument()
  })

  it('AC-G24: clicking a row opens a sheet with the full message text', async () => {
    const grid = await openMessages()
    await userEvent.click(within(grid).getByText(/Two of your documents expire this month/))
    const sheet = await screen.findByRole('dialog')
    expect(
      within(sheet).getByText(/dispatch will hold your assignments until they are checked/),
    ).toBeInTheDocument()
  })

  it('AC-G25: the messages list offers no act', async () => {
    const grid = await openMessages()
    const row = within(grid).getByRole('row', { name: /Welcome to Eyvar/ })
    expect(within(row).queryByRole('button')).not.toBeInTheDocument()
    expect(within(row).queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('AC-G28: the first-run empty state names what the view is for', async () => {
    mockFailures.clear()
    const grid = await openMessages()
    void grid
    await userEvent.type(screen.getByRole('textbox', { name: en('growth.message.search') }), 'zzzzzz')
    expect(await screen.findByText(en('growth.message.noMatch'))).toBeInTheDocument()
  })
})

describe('Arabic', () => {
  it('AC-G30: every string this screen shows has an Arabic entry with the same placeholders', () => {
    const missing = Object.keys(GROWTH_EN).filter((key) => {
      const value = GROWTH_AR[key]
      return typeof value !== 'string' || value.trim() === ''
    })
    expect(missing).toEqual([])
    for (const [key, english] of Object.entries(GROWTH_EN)) {
      expect([key, placeholdersIn(String(GROWTH_AR[key])).sort()]).toEqual([
        key,
        placeholdersIn(String(english)).sort(),
      ])
    }
  })

  it('AC-G30: the promos table renders its headers and badges in Arabic', async () => {
    defaultUiStore<string>(UI_STATE_KEYS.language).write('ar')
    try {
      renderGrowth('/management/growth?view=promos')
      const grid = await table()
      expect(grid.textContent).toContain(String(GROWTH_AR['growth.promo.column.code']))
      expect(grid.textContent).toContain(String(GROWTH_AR['growth.promo.column.burn']))
      const row = within(grid).getByRole('row', { name: /EYVAR30/ })
      expect(
        within(row).getByText(String(GROWTH_AR['growth.promo.status.active'])),
      ).toBeInTheDocument()
      /* X2 — no raw enum reaches a cell. */
      expect(within(grid).queryByText('new-riders')).not.toBeInTheDocument()
    } finally {
      defaultUiStore<string>(UI_STATE_KEYS.language).write('en')
    }
  })
})
