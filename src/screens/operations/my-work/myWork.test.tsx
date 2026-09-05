/**
 * **My Work — the header line and the rail badge state one number (X3, O8).**
 *
 * X3 measured badge `25` above `5 items` on one screen. Both come from
 * `clients/myWork.ts` now, so the assertion is that they agree at the default
 * landing and after a claim moves an item between two views.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  disableMockLatency,
  getNavCounts,
  getRouteTable,
  listWorkItems,
  resetDataLayer,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { AR, EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { createTranslator, placeholdersIn } from '@/lib/i18n/translate'
import { MY_WORK_EN } from './copy'
import { workText } from './MyWorkScreen'
import { MyWorkScreen } from './MyWorkScreen'

const copy = (key: string) => (MY_WORK_EN[key] ?? EN[key]) as string

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'operations-my-work')
  if (!found) throw new Error('No route-table row for operations-my-work')
  return found
}

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  /* The fixture chunk has to have landed before the badge can be read. */
  await getNavCounts()
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
  const other = copy('myWork.meta.other')
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
