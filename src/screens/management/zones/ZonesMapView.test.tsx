/**
 * `ZonesMapView` — **the test that would have caught the unlicensed tile
 * fetch**, plus the four states and the keyboard path.
 *
 * The surface this replaces pulled slippy tiles from `mt1.google.com/vt/` with
 * no key and no billing account, and from CARTO's `dark_all` on the same terms.
 * Nothing in the suite could see it, because the screen chose between the map
 * and the table on `process.env.NODE_ENV` and the map was the branch tests never
 * rendered. The first test below is therefore not a formality: it renders the
 * component and asserts that **nothing in the produced DOM points at a host we
 * do not own**, in a form that fails loudly if a basemap is ever put back.
 *
 * The rest are the four states from `docs/ref/states.md`, in order, and the
 * keyboard route that `docs/ref/a11y.md` requires of a map: an operator with no
 * mouse must be able to reach every zone the picture shows.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/data/types'
import type { Zone } from '@/data/types'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { ZONES_EN } from './copy'
import { ZonesMapView } from './ZonesMapView'

/* The SHIPPED dictionary, not this screen's slice: `InfoHint` is named by
   `shell.hint.show`, and a translator that cannot see the shell's keys throws
   on a component the operator meets on this screen (X15). */
const t = createTranslator({ dictionary: EN, fallback: EN, language: 'en' })

function zone(overrides: Partial<Zone> & Pick<Zone, 'id' | 'name'>): Zone {
  return {
    city: 'Riyadh',
    demand: 10,
    supply: 4,
    failures30d: 3,
    failureRate: 30,
    demandSupplyRatio: 2.5,
    starved: false,
    captainsNeeded: 0,
    recruitmentPriority: 'watch',
    subMomentum: null,
    activeSteerOffer: null,
    recruitmentQueuedAt: null,
    ...overrides,
  }
}

const ROWS: Zone[] = [
  zone({
    id: 'ZONE-01',
    name: 'Al Narjis',
    demand: 14,
    supply: 2,
    failures30d: 11,
    failureRate: 79,
    demandSupplyRatio: 7,
    starved: true,
    captainsNeeded: 3,
    recruitmentPriority: 'recruit-now',
  }),
  zone({ id: 'ZONE-04', name: 'Al Malaz', demand: 8, supply: 6, failureRate: 25, demandSupplyRatio: 1.33 }),
]

function renderMap(props: Partial<Parameters<typeof ZonesMapView>[0]> = {}) {
  return render(
    <ZonesMapView
      zones={ROWS}
      onSteer={() => {}}
      onQueueRecruitment={() => {}}
      canWrite
      t={t}
      {...props}
    />,
  )
}

/* ───────────────────────── the licensing regression ─────────────────────── */

/**
 * **The rule this pins changed, and the change is the point of the test.**
 *
 * It used to be absolute: no `<img>`, no `<iframe>`, no external URL at all,
 * on the reasoning that *"an unlicensed basemap arrives as an <img> or an
 * <iframe> ... so the assertion can be absolute rather than a host allow-list
 * that the next provider slips past"*. That was the right shape while the
 * answer was to fetch nothing.
 *
 * The owner asked for a real basemap and chose, from the options put to them,
 * **real tiles that keep the zones**. So the rule narrows from *nothing* to
 * *nothing unlicensed* — and the allow-list the old note was wary of is now
 * exactly what is needed, because "no external URL" would forbid the licensed
 * host along with the unlicensed ones.
 *
 * The wariness is answered rather than dismissed: the list is CLOSED and every
 * entry is named, so a second provider added later fails here rather than
 * slipping past. `mt*.google.com` — the host this screen's history is about —
 * is asserted absent by name.
 */
const ALLOWED_HOSTS = ['tile.openstreetmap.org', 'www.openstreetmap.org']

describe('the map fetches nothing it is not licensed to fetch', () => {
  it('addresses only the allowed hosts, and no unlicensed tile server', () => {
    const { container } = renderMap()

    /* `xmlns="http://www.w3.org/2000/svg"` is an XML namespace, not a fetch —
       the one absolute URL an inline SVG legitimately carries. */
    const markup = container.innerHTML.replace(/xmlns="[^"]*"/g, '')
    const urls = markup.match(/https?:\/\/[^"'\s)]+/g) ?? []

    for (const url of urls) {
      const host = new URL(url).host
      expect(ALLOWED_HOSTS, `${host} is not a licensed host for this map`).toContain(host)
    }

    /* Named explicitly, because it is the specific thing this screen's history
       is about: the surface this replaced pulled `mt1.google.com/vt/` with no
       key, no billing and no terms accepted. */
    expect(markup).not.toMatch(/google/i)
    expect(markup).not.toMatch(/basemaps\.cartocdn|carto\.com/i)
    /* An iframe is still forbidden outright: nothing can be drawn on top of
       one, so a basemap in an iframe would cost the zone shading. */
    expect(container.querySelectorAll('iframe')).toHaveLength(0)
  })

  it('credits OpenStreetMap, which is the condition of using its tiles', () => {
    const { container } = renderMap()
    const credit = container.querySelector('a[href*="openstreetmap.org/copyright"]')
    expect(credit).toBeTruthy()
    expect(credit?.textContent).toMatch(/OpenStreetMap/)
  })

  it('draws the zones from our own geometry instead', () => {
    const { container } = renderMap()
    /* **One polygon per district and nothing else.** The count used to carry a
       `+ 1` blamed on the selection highlight; the selection has never been a
       second shape — it is the same polygon at a heavier stroke and a harder
       fill. The extra was the `Navigation` glyph inside the panel's `Steer
       captains` button, which lucide draws as a `<polygon>`. The button lost
       its icon to match the reference, and the phantom shape went with it. */
    expect(container.querySelectorAll('svg polygon')).toHaveLength(ROWS.length)
    expect(container.querySelector('svg[role="img"]')).toBeTruthy()
  })
})

/* ─────────────────────────────── four states ────────────────────────────── */

describe('the four states', () => {
  it('content — every zone is a button on the canvas AND a button in the list', async () => {
    renderMap()
    /* Two routes to the same zone: the marker and the list row. That pairing is
       the keyboard path, so it is asserted as a count rather than a presence. */
    expect(screen.getAllByRole('button', { name: /Al Narjis/ })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /Al Malaz/ })).toHaveLength(2)
  })

  it('loading — a map-shaped skeleton, never a spinner', () => {
    const { container } = renderMap({ status: 'loading' })
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(4)
    expect(container.querySelectorAll('svg polygon')).toHaveLength(0)
  })

  it('empty, first run — one grey sentence, and never the first-run illustration', () => {
    renderMap({ status: 'empty', zones: [] })
    expect(screen.getByText(ZONES_EN['zones.map.empty'] as string)).toBeTruthy()
    /* R8: the illustration belongs to the page-level empty, which `DataTable`
       owns. A section empty that shows one would claim the data cannot exist. */
    expect(screen.queryByRole('heading')).toBeNull()
  })

  it('every zone is reachable without a search, because there is no longer one', () => {
    renderMap()

    /* The panel lists them all, unfiltered — the reference has no field here
       and neither do we. Each district is reachable twice: as a marker on the
       canvas and as a row in the panel. */
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getAllByRole('button', { name: /Al Narjis/ })).toHaveLength(2)
  })

  it('error — states the failure and offers the retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderMap({ status: 'error', error: new ApiError({ status: 503, message: 'nope' }), onRetry })

    expect(screen.getByText(ZONES_EN['zones.map.error'] as string)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: ZONES_EN['zones.error.retry'] as string }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('error — a retry that cannot succeed is not offered (P1-8)', () => {
    /* 403 is not retryable. Pressing `Try again` would fail identically, which
       is a lie told to an operator under time pressure. */
    renderMap({ status: 'error', error: new ApiError({ status: 403, message: 'nope' }), onRetry: () => {} })

    expect(screen.getByText(ZONES_EN['zones.map.error.final'] as string)).toBeTruthy()
    expect(screen.queryByRole('button', { name: ZONES_EN['zones.error.retry'] as string })).toBeNull()
  })
})

/* ────────────────────────── keyboard and a11y ───────────────────────────── */

describe('a map an operator can drive without a mouse', () => {
  it('selects a zone from the canvas marker with the keyboard', async () => {
    const user = userEvent.setup()
    renderMap()

    const [marker] = screen.getAllByRole('button', { name: /Al Narjis/ })
    if (!marker) throw new Error('No Al Narjis marker')
    marker.focus()
    expect(document.activeElement).toBe(marker)

    await user.keyboard('{Enter}')
    expect(marker.getAttribute('aria-pressed')).toBe('true')

    /* The selection is what fills the inspector, so the two actions §11.2
       governs become reachable without ever touching the canvas with a mouse. */
    expect(screen.getByRole('heading', { name: 'Al Narjis' })).toBeTruthy()
    expect(screen.getByRole('button', { name: ZONES_EN['zones.action.steer'] as string })).toBeTruthy()
  })

  it('the marker announces the priority word, so colour carries nothing alone (§7.5)', () => {
    renderMap()
    const [marker] = screen.getAllByRole('button', { name: /Al Narjis/ })
    expect(marker?.textContent).toContain(ZONES_EN['zones.priority.recruit-now'] as string)
  })

  it('§11.2 — the inspector actions are disabled in place with a reason, never hidden', async () => {
    const user = userEvent.setup()
    renderMap({ canWrite: false })

    const [marker] = screen.getAllByRole('button', { name: /Al Narjis/ })
    if (!marker) throw new Error('No Al Narjis marker')
    await user.click(marker)

    const steer = screen.getByRole('button', { name: ZONES_EN['zones.action.steer'] as string })
    expect(steer).toBeDisabled()
    expect(steer.getAttribute('title')).toBe(ZONES_EN['zones.blocked.permission'] as string)
  })

  it('the canvas does not mirror in Arabic — rtl.md', () => {
    const { container } = renderMap()
    const svg = container.querySelector('svg[role="img"]')
    expect(svg?.closest('[dir]')?.getAttribute('dir')).toBe('ltr')
  })
})

/* ───────────────────── a zone we cannot draw says so ────────────────────── */

describe('a zone with no boundary', () => {
  it('is named rather than silently dropped from the picture', () => {
    renderMap({ zones: [...ROWS, zone({ id: 'ZONE-99', name: 'Al Aqiq' })] })

    /* It has no polygon — the count is exactly the drawable zones, and
       `Al Aqiq` is not one of them. */
    expect(document.querySelectorAll('svg polygon')).toHaveLength(ROWS.length)
    /* …and the caption says which zone that is, in words. */
    const caption = document.querySelector('figcaption')
    expect(caption?.textContent).toContain('Al Aqiq')
    /* It is still reachable in the list, because the DATA is not missing. */
    const list = screen.getByRole('list', { name: 'All zones' })
    expect(within(list).getByRole('button', { name: /Al Aqiq/ })).toBeTruthy()
  })
})
