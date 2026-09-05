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
  getMetricBoard,
  getNavCounts,
  getRouteTable,
  getZoneHealth,
  listCities,
  listZones,
  resetDataLayer,
  starvedZoneCount,
  summariseZones,
  useZeroSupplyZone,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { ABSENT } from '@/lib'
import { metricSeeds } from '@/data/fixtures/metrics'
import { EN } from '@/i18n/dictionaries'
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
/**
 * **The zone LIST, which is where the table's rows went.**
 *
 * The owner removed the index table from this board: a zone is a shape on a
 * city, and a row in a grid is the one representation that cannot say where it
 * is. Every zone is still on the page, listed with its ratio and its bar, in
 * the panel floating on the map — so the tests below did not lose their subject
 * and are retargeted rather than deleted.
 *
 * **What genuinely went with the table, said once here rather than implied by
 * six edited assertions:** column sorting, the column picker, the filter menu
 * and CSV export. Those are index-table affordances and there is no index
 * table. The per-row action PAIR also went: the panel offers the two actions
 * for the SELECTED zone, once, instead of six times down a column — which is
 * the change the action test below now measures.
 *
 * Reached through the search field it owns rather than by tag, because the
 * panel is a plain `<aside>` and matching on that would also match any other
 * aside a later change adds to the screen.
 */
function zonePanel(): HTMLElement {
  /* By tag, and it is the only `<aside>` this screen renders. Reaching it
     through a control it contains — the search field — was the first attempt
     and it is too clever: the field's accessible role depends on the input's
     `type`, so the helper failed with a timeout that looked like the panel not
     rendering at all rather than like a bad query. */
  const panel = document.querySelector('aside')
  if (!(panel instanceof HTMLElement)) throw new Error('No zone panel on the page')
  return panel
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

/** The strip and the tiles live above the map and are not inside it. */
async function zonesReady(): Promise<HTMLElement> {
  /* `getAllBy`, and the plural is the point: the panel opens on the worst zone,
     so `Al Narjis` is in it TWICE — once as the selection's heading and once as
     a row in the list beneath. A singular query throws "found multiple", which
     is a failure that reads like the panel is broken rather than like the query
     is too narrow. */
  await waitFor(() =>
    expect(within(zonePanel()).getAllByText('Al Narjis').length).toBeGreaterThan(0),
  )
  return zonePanel()
}

describe('R4-6b §6.6.4 — the strip derives from the zones it summarises', () => {
  it('the summary is exactly the summary of the zones the client returns', async () => {
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

  it('the nav badge is the same starved count the zones carry', async () => {
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

describe('the zone list and the panel', () => {
  it('is worst-first by failure rate, and the first zone is a starved one', async () => {
    const rows = await listZones({ pageSize: 100 })
    const rates = rows.items.map((zone) => zone.failureRate)
    expect([...rates].sort((a, b) => b - a)).toEqual(rates)
    expect(rows.items[0]?.starved).toBe(true)
  })

  /**
   * **R4-6 §6.4 clause 2 survives the table's removal, and this is the shape it
   * survives in.**
   *
   * The clause is that a row's actions are *direct, labelled and visible at
   * rest* — never behind a kebab. It used to be measured as six Steer buttons
   * and six Queue buttons down a table column. There is no column now, so the
   * count changes from six to one: the panel offers both actions for the zone
   * it has SELECTED, spelled out, with no menu to open.
   *
   * The count is deliberately exact rather than `toBeGreaterThan(0)`. One is
   * the whole claim — two directs for one selection — and a screen that grew a
   * second pair somewhere would be back to two surfaces offering the same
   * action, which is the ambiguity the clause exists to prevent.
   */
  it('R4-6 §6.4 clause 2 — two actions on the selection, labelled and visible at rest', async () => {
    renderZones()
    const panel = await zonesReady()

    const steer = within(panel).getAllByRole('button', {
      name: ZONES_EN['zones.action.steer'] as string,
    })
    const recruit = within(panel).getAllByRole('button', {
      name: ZONES_EN['zones.action.recruit'] as string,
    })
    expect(steer).toHaveLength(1)
    expect(recruit).toHaveLength(1)
    /* Not behind a kebab: there is no actions menu trigger on this panel. By
       ROLE and NAME since T9.10 — the kebab is a drawn icon, and querying its
       former text would assert nothing at all. */
    expect(within(panel).queryByRole('button', { name: EN['shell.moreActions'] })).toBeNull()
  })

  it('the five tiles render, and two of them are toggles that narrow the zones', async () => {
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

    /* R4-6 §6.4 clause 1 — a tile is a toggle, not an anchor. Counted inside
       the strip: exactly two of the five correspond to a view the zone set can
       be narrowed to; the other three are read-only. */
    const toggles = within(zoneStrip())
      .getAllByRole('button')
      .filter((element) => element.getAttribute('aria-pressed') !== null)
    expect(toggles).toHaveLength(2)
    for (const toggle of toggles) {
      expect(toggle.tagName).toBe('BUTTON')
    }
  })
})

describe('the cities table is gone, and what replaced it', () => {
  /**
   * **This is not the old assertion edited to pass.** The old one asserted that
   * a four-row `Cities` card rendered three em dashes and three `Not launched`
   * reasons. That card no longer exists, so an assertion about its contents
   * could only be deleted or inverted; what follows asserts the behaviour that
   * took its place, and the reason the card could go.
   *
   * The card carried four facts and three of them were already on the screen:
   * Riyadh's zone count is the header's own, Riyadh's failure rate is the
   * `avgFailureRate` tile, and `Riyadh` is the secondary line of every table
   * row. The fourth — coverage — is now a clause in the meta line.
   */
  it('the map surface renders no table, and no card headed Cities', async () => {
    renderZones()
    await zonesReady()

    expect(screen.queryByRole('heading', { name: 'Cities' })).toBeNull()
    /* **Zero on the map surface**, which is what O5 decided: the table is a
       second view reached by `?view=table`, not a thing stacked under a map
       nobody scrolled past. A table here would be the old defect back. */
    expect(document.querySelectorAll('table')).toHaveLength(0)
  })

  it('states coverage as a count in the meta line, derived not typed', async () => {
    renderZones()
    await zonesReady()

    /* Four cities in the fixture, one of them `active`. The line is asserted
       whole so a template that silently dropped a slot would fail here. */
    const live = listCities().filter((city) => city.active).length
    const all = listCities().length
    expect(live).toBe(1)
    expect(all).toBe(4)
    expect(screen.getByText(`2/6 starved · ${live}/${all} cities live`)).toBeTruthy()
  })

  /**
   * **L-6 itself did not go anywhere.** Legacy gates a city's failure rate on
   * `c.name === 'Riyadh'`, so three rows can never be filled whatever data
   * arrives. The computed answer still ships — as the `zones.citiesHealth`
   * metric breakdown, which is where a city-by-city comparison belongs and
   * which `data/clients/zones.test.ts` already covers — and the em-dash
   * discipline is still enforced on this screen where an operator sees it move.
   */
  it('a zone with no captains still renders an em dash, never a fabricated number', async () => {
    useZeroSupplyZone()
    renderZones()
    const panel = await zonesReady()

    expect(within(panel).getAllByText(ABSENT).length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toMatch(/Infinity/)
    expect(document.body.textContent).not.toMatch(/NaN/)
  })
})

/* ─────────────────── T7.3 — the table, back as a view ───────────────────── */

/**
 * **Owner decision O5**: a city with thirty zones is a list you query, so the
 * P1 index table returns as `?view=table` beside the map rather than under it.
 * Every assertion is scoped to the table, because the map surface lists the
 * same zones and would otherwise answer for it.
 */
describe('T7.3 — ?view=table restores the index table', () => {
  const TABLE = '/management/zones?view=table'

  async function tableReady(): Promise<HTMLElement> {
    const table = await screen.findByRole('table')
    await waitFor(() => expect(within(table).getAllByText('Al Narjis').length).toBeGreaterThan(0))
    return table
  }

  it('offers both surfaces as a switch, and the map is the one on by default', async () => {
    renderZones()
    await zonesReady()

    const map = screen.getByRole('tab', { name: ZONES_EN['zones.view.map'] as string })
    const table = screen.getByRole('tab', { name: ZONES_EN['zones.view.table'] as string })
    expect(map).toHaveAttribute('aria-selected', 'true')
    expect(table).toHaveAttribute('aria-selected', 'false')
  })

  it('renders every zone the client returns as a row', async () => {
    renderZones(TABLE)
    const table = await tableReady()

    const rows = await listZones({ pageSize: 100 })
    for (const each of rows.items) {
      expect(within(table).getByText(each.name)).toBeTruthy()
    }
    /* And the map is not also on: two surfaces answering at once is the stack
       O5 replaced. */
    expect(document.querySelector('aside')).toBeNull()
  })

  /**
   * Scoped to the table's own toolbar: the board half above it exports too, so
   * an unscoped `Export CSV` would pass on the board's button and prove nothing
   * about the table.
   */
  function tableToolbar(): HTMLElement {
    const search = screen.getByPlaceholderText(ZONES_EN['zones.search'] as string)
    let node = search.parentElement
    while (node && !within(node).queryByRole('button', { name: EN['table.columns'] as string })) {
      node = node.parentElement
    }
    if (!node) throw new Error('No table toolbar on the page')
    return node
  }

  it('carries the affordances the map cannot offer: sort, filter, columns and CSV', async () => {
    renderZones(TABLE)
    await tableReady()

    const toolbar = within(tableToolbar())
    for (const name of [
      EN['table.sort'],
      EN['table.filter'],
      EN['table.columns'],
      EN['table.export'],
    ]) {
      expect(toolbar.getByRole('button', { name: name as string })).toBeEnabled()
    }
  })

  it('R4-6 §6.4 clause 2 — both row actions are labelled on every row, never a kebab', async () => {
    renderZones(TABLE)
    const table = await tableReady()

    const rows = await listZones({ pageSize: 100 })
    expect(
      within(table).getAllByRole('button', { name: ZONES_EN['zones.action.steer'] as string }),
    ).toHaveLength(rows.items.length)
    expect(
      within(table).getAllByRole('button', { name: ZONES_EN['zones.action.recruit'] as string }),
    ).toHaveLength(rows.items.length)
  })

  /**
   * **X6 — the seeded board had no surface.** The assertion walks the fixture
   * rather than a list of names, so a metric added to `management-zones` and
   * left unrendered fails here instead of shipping unseen.
   */
  it('renders the seeded management-zones metrics as the board half (R4-6b)', async () => {
    const seeded = metricSeeds.filter((seed) => seed.subTabId === 'management-zones')
    const board = await getMetricBoard('management-zones')
    expect(board.metrics.map((each) => each.key).sort()).toEqual(
      seeded.map((each) => each.key).sort(),
    )

    renderZones(TABLE)
    await tableReady()

    for (const metric of board.metrics) {
      expect(screen.getAllByText(EN[`metric.${metric.key}`] as string).length).toBeGreaterThan(0)
    }
  })

  it('renders the citiesHealth breakdown, which is where L-6 is answered', async () => {
    const board = await getMetricBoard('management-zones')
    expect(board.breakdowns.map((each) => each.key)).toEqual(['zones.citiesHealth'])

    renderZones(TABLE)
    await tableReady()

    expect(screen.getByText(EN['breakdown.zones.citiesHealth'] as string)).toBeTruthy()
  })

  /**
   * **Two questions, two parameters.** `view` names the surface and `scope` is
   * the strip's tile toggle; one parameter could not carry both, because
   * `table` is not a zone filter and `starved` is not a surface.
   */
  it('the tile toggles narrow the table without leaving it', async () => {
    renderZones(`${TABLE}&scope=starved`)
    const table = await tableReady()

    const rows = await listZones({ pageSize: 100 })
    const starved = rows.items.filter((each) => each.starved)
    expect(starved.length).toBeGreaterThan(0)
    expect(starved.length).toBeLessThan(rows.items.length)
    expect(within(table).getAllByRole('row').length - 1).toBe(starved.length)
  })
})
