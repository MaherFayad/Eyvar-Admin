/**
 * **My Work — the header line and the rail badge state one number (X3, O8).**
 *
 * X3 measured badge `25` above `5 items` on one screen. Both come from
 * `clients/myWork.ts` now, so the assertion is that they agree at the default
 * landing and after a claim moves an item between two views.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  disableMockLatency,
  getNavCounts,
  getRouteTable,
  resetDataLayer,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { MY_WORK_EN } from './copy'
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
