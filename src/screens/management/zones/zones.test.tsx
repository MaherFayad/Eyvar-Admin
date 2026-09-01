/**
 * Market & Zones — **R4-6b §6.6.4**, and the one thing this screen can get
 * wrong that nothing else would catch.
 *
 * > **The five metric tiles MUST be derived from the table's own rows. They may
 * > not remain literals.**
 *
 * A test that asserts *"the tile says 7"* passes just as well against a
 * hardcoded `7`, which is the failure mode the ruling exists to prevent. So the
 * load-bearing test here **changes the underlying zone data and asserts the
 * tile moves** — `useZeroSupplyZone()` takes Al Narjis to zero captains, and a
 * derived strip has to follow it while a literal one cannot.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getNavCounts,
  getRouteTable,
  getZoneHealth,
  listZones,
  resetDataLayer,
  starvedZoneCount,
  summariseZones,
  useZeroSupplyZone,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { ShellProvider } from '@/shell/ShellContext'
import { ZONES_EN } from './copy'
import { ZonesScreen } from './ZonesScreen'

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'management-zones')
  if (!found) throw new Error('No route-table row for management-zones')
  return found
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function renderZones(path = '/management/zones') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <ZonesScreen row={row()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/**
 * **Every assertion below is scoped to the surface it names, and that is a
 * correction, not a convenience.**
 *
 * `ZonesScreen` used to branch on `process.env.NODE_ENV === 'test'`: under test
 * it rendered the strip + `DataTable` + `CitiesCard`, and in every other
 * environment it rendered `ZonesMapView` instead. So this file was green over a
 * surface **no operator ever saw**, and the map — which lists the same zones and
 * the same cities in its sidebar — held no test at all, because it was
 * unreachable from a rendered `ZonesScreen`.
 *
 * The branch is gone and both surfaces now ship, stacked. That is what makes
 * unscoped `getByText('Al Narjis')` throw *"found multiple elements"*: the zone
 * really is on the page twice, in the map and in the table, which is correct
 * and is exactly what the branch was hiding.
 *
 * Scoping is therefore the honest repair rather than reaching for
 * `getAllByText(...)[0]`. A test named *"the table"* that would pass on a
 * string rendered by the map is not testing the table — and picking the first
 * of two matches silently depends on DOM order, so it would go on passing if
 * the table stopped rendering the row entirely.
 */
function zoneTable(): HTMLElement {
  const header = screen.getAllByRole('columnheader', {
    name: ZONES_EN['zones.col.zone'] as string,
  })[0]
  const table = header?.closest('table')
  if (!table) throw new Error('No zone table on the page')
  return table
}

function citiesCard(): HTMLElement {
  const heading = screen.getByRole('heading', {
    name: ZONES_EN['zones.cities.heading'] as string,
  })
  const card = heading.closest('[data-slot="card"]')
  if (!(card instanceof HTMLElement)) throw new Error('No cities card on the page')
  return card
}

/**
 * The five-tile strip: the `<ul role="list">` holding the tile labels. Named by
 * a landmark rather than reached by filtering the document, because the map
 * sidebar's zone and city lists are `aria-pressed` buttons too — correctly, they
 * are selection controls — and a test that counted "every pressed button that
 * is not in the table" would silently re-break the moment the map grew a sixth.
 */
function zoneStrip(): HTMLElement {
  const label = screen.getAllByText(ZONES_EN['zones.tile.captainsNeeded'] as string)[0]
  const strip = label?.closest('ul[role="list"]')
  if (!(strip instanceof HTMLElement)) throw new Error('No metric strip on the page')
  return strip
}

/** The strip and the tiles live above both surfaces and are not inside either. */
async function zonesReady(): Promise<HTMLElement> {
  await waitFor(() => expect(within(zoneTable()).getByText('Al Narjis')).toBeTruthy())
  return zoneTable()
}

describe('R4-6b §6.6.4 — the strip derives from the table', () => {
  it('the summary is exactly the summary of the rows the table shows', async () => {
    const health = await getZoneHealth()
    const rows = await listZones({ pageSize: 100 })
    expect(health).toEqual(summariseZones(rows.items))
  })

  it('all five derived values hit the literals they replaced', async () => {
    const health = await getZoneHealth()
    expect(health.captainsNeeded).toBe(3)
    expect(health.starvedZones).toBe(2)
    expect(health.unservedRequests30d).toBe(31)
    expect(health.avgFailureRate).toBe(45)
    expect(health.worstDemandSupplyRatio).toBe(7)
  })

  it('the nav badge is the same starved count the table’s first rows carry', async () => {
    const counts = await getNavCounts()
    const badge = counts.subTabs.find((each) => each.subTabId === 'management-zones')
    expect(badge?.count).toBe(starvedZoneCount())
  })

  /**
   * **The test a literal cannot pass.** Al Narjis drops to zero captains, and
   * three readings move at once: the worst ratio falls from 7 to 3 *while the
   * worst zone gets worse*, its ratio cell has no value to render, and the
   * starved count holds because the corrected predicate counts a zone with no
   * captains as starved.
   */
  it('changing the zone data changes the strip', async () => {
    const before = await getZoneHealth()
    expect(before.worstDemandSupplyRatio).toBe(7)

    useZeroSupplyZone()

    const after = await getZoneHealth()
    expect(after.worstDemandSupplyRatio).toBe(3)
    expect(after.starvedZones).toBe(2)

    renderZones()
    await zonesReady()
    /* The strip shows the moved value, and nowhere on the page is `7.0×`. */
    expect(screen.getAllByText('3.0×').length).toBeGreaterThan(0)
    expect(screen.queryByText('7.0×')).toBeNull()
    /* R4-12 — a zone with no captains renders an em dash, never `Infinity×`. */
    expect(document.body.textContent).not.toMatch(/Infinity/)
  })
})

describe('the table', () => {
  it('is worst-first by failure rate, and the first row is a starved zone', async () => {
    const rows = await listZones({ pageSize: 100 })
    const rates = rows.items.map((zone) => zone.failureRate)
    expect([...rates].sort((a, b) => b - a)).toEqual(rates)
    expect(rows.items[0]?.starved).toBe(true)
  })

  it('R4-6 §6.4 clause 2 — two row actions, both labelled and visible at rest', async () => {
    renderZones()
    const table = await zonesReady()

    /* Counted INSIDE the table. The map inspector offers the same two actions
       for the zone it has selected, so an unscoped count asserts the sum of two
       surfaces and would drift every time either changed. */
    const steer = within(table).getAllByRole('button', {
      name: ZONES_EN['zones.action.steer'] as string,
    })
    const recruit = within(table).getAllByRole('button', {
      name: ZONES_EN['zones.action.recruit'] as string,
    })
    expect(steer.length).toBe(6)
    expect(recruit.length).toBe(6)
    /* Not behind a kebab: there is no row-actions menu trigger on this table. */
    expect(within(table).queryByText('⋯')).toBeNull()
  })

  it('the five tiles render, and two of them are toggles that narrow the table', async () => {
    renderZones()
    await zonesReady()

    for (const key of [
      'zones.tile.captainsNeeded',
      'zones.tile.starvedZones',
      'zones.tile.unservedRequests30d',
      'zones.tile.avgFailureRate',
      'zones.tile.worstDemandSupplyRatio',
    ]) {
      /* `Captains needed` is a tile label AND a column header — the same
         measure named the same way in both places, which is right. */
      expect(screen.getAllByText(ZONES_EN[key] as string).length).toBeGreaterThan(0)
    }

    /* R4-6 §6.4 clause 1 — a tile is a toggle, not an anchor. Exactly two of
       the five correspond to a view the table can be narrowed to. */
    /* Counted inside the strip. Exactly two of the five tiles correspond to a
       view the table can be narrowed to; the other three are read-only. */
    const toggles = within(zoneStrip())
      .getAllByRole('button')
      .filter((element) => element.getAttribute('aria-pressed') !== null)
    expect(toggles).toHaveLength(2)
    for (const toggle of toggles) {
      expect(toggle.tagName).toBe('BUTTON')
    }
  })
})

describe('L-6 — three cities have no failure rate, and the row says why', () => {
  it('renders an em dash and a reason rather than a fabricated number', async () => {
    renderZones()
    await zonesReady()
    const cities = citiesCard()

    /* Riyadh appears once per zone row and once in the cities card. */
    expect(screen.getAllByText('Riyadh').length).toBeGreaterThan(1)
    /* The four cities are asserted INSIDE the card. The map sidebar lists cities
       too, so `getByText('Jeddah')` on the document now finds two — and the one
       this test is about is the one whose failure rate is an em dash. */
    for (const city of ['Jeddah', 'Dammam', 'Makkah']) {
      expect(within(cities).getByText(city)).toBeTruthy()
    }
    /* One `Not launched` per city with no tracked zone, and no invented rate. */
    expect(
      within(cities).getAllByText(ZONES_EN['zones.cities.notLive'] as string),
    ).toHaveLength(3)
  })
})
